import {
  ANDROID_FILES_PATH,
  IOS_DOCUMENT_PATH,
  type DB,
  isSQLCipher,
  open,
} from "@op-engineering/op-sqlite";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { SECURE_STORAGE_KEYS } from "@/src/lib/secure-storage";

export const POWERSYNC_DATABASE_FILENAME = "powersync.db";

const MIGRATION_DATABASE_FILENAME = "powersync-encryption-migration.db";
const PLAINTEXT_BACKUP_FILENAME = "powersync-plaintext-backup.db";
const DATABASE_KEY_BYTES = 32;

const databaseDirectory = Platform.select({
  ios: IOS_DOCUMENT_PATH,
  android: ANDROID_FILES_PATH,
});

if (!databaseDirectory) {
  throw new Error("Encrypted PowerSync storage is only available on iOS and Android.");
}

const encryptionKeyOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

function databaseFile(filename: string) {
  return new File(`file://${databaseDirectory}/${filename}`);
}

function deleteIfPresent(filename: string) {
  const file = databaseFile(filename);
  if (file.exists) file.delete();
}

function deleteDatabaseFiles(filename: string) {
  deleteIfPresent(filename);
  deleteDatabaseSidecars(filename);
}

function deleteDatabaseSidecars(filename: string) {
  deleteIfPresent(`${filename}-shm`);
  deleteIfPresent(`${filename}-wal`);
}

function moveDatabaseFile(sourceFilename: string, destinationFilename: string) {
  databaseFile(sourceFilename).moveSync(databaseFile(destinationFilename));
}

function closeQuietly(database: DB | null) {
  try {
    database?.close();
  } catch {
    // The original database error is more useful than a secondary close error.
  }
}

function openDatabase(filename: string, encryptionKey?: string) {
  return open({
    name: filename,
    location: databaseDirectory,
    ...(encryptionKey ? { encryptionKey } : {}),
  });
}

function assertReadable(database: DB) {
  database.executeSync("SELECT count(*) AS table_count FROM sqlite_master");
}

function isEncryptedDatabaseReadable(filename: string, encryptionKey: string) {
  if (!databaseFile(filename).exists) return false;

  let database: DB | null = null;
  try {
    database = openDatabase(filename, encryptionKey);
    assertReadable(database);
    return true;
  } catch {
    return false;
  } finally {
    closeQuietly(database);
  }
}

function assertPlaintextDatabaseReadable(filename: string) {
  let database: DB | null = null;
  try {
    database = openDatabase(filename);
    assertReadable(database);
  } finally {
    closeQuietly(database);
  }
}

function readPragma(database: DB, pragma: "application_id" | "user_version") {
  const result = database.executeSync(`PRAGMA ${pragma}`);
  const value = result.rows?.[0]?.[pragma];
  return typeof value === "number" ? value : 0;
}

function exportPlaintextDatabase(encryptionKey: string) {
  deleteDatabaseFiles(MIGRATION_DATABASE_FILENAME);

  let plaintextDatabase: DB | null = null;
  try {
    plaintextDatabase = openDatabase(POWERSYNC_DATABASE_FILENAME);
    assertReadable(plaintextDatabase);
    plaintextDatabase.executeSync("PRAGMA wal_checkpoint(TRUNCATE)");

    const applicationId = readPragma(plaintextDatabase, "application_id");
    const userVersion = readPragma(plaintextDatabase, "user_version");

    plaintextDatabase.executeSync("ATTACH DATABASE ? AS encrypted KEY ?", [
      `${databaseDirectory}/${MIGRATION_DATABASE_FILENAME}`,
      encryptionKey,
    ]);
    try {
      plaintextDatabase.executeSync("SELECT sqlcipher_export('encrypted')");
      plaintextDatabase.executeSync(`PRAGMA encrypted.application_id = ${applicationId}`);
      plaintextDatabase.executeSync(`PRAGMA encrypted.user_version = ${userVersion}`);
    } finally {
      plaintextDatabase.executeSync("DETACH DATABASE encrypted");
    }
  } finally {
    closeQuietly(plaintextDatabase);
  }

  if (!isEncryptedDatabaseReadable(MIGRATION_DATABASE_FILENAME, encryptionKey)) {
    deleteDatabaseFiles(MIGRATION_DATABASE_FILENAME);
    throw new Error("PowerSync database encryption migration could not be verified.");
  }
}

function replacePlaintextDatabase(encryptionKey: string) {
  deleteDatabaseFiles(PLAINTEXT_BACKUP_FILENAME);
  moveDatabaseFile(POWERSYNC_DATABASE_FILENAME, PLAINTEXT_BACKUP_FILENAME);
  deleteDatabaseSidecars(POWERSYNC_DATABASE_FILENAME);

  try {
    moveDatabaseFile(MIGRATION_DATABASE_FILENAME, POWERSYNC_DATABASE_FILENAME);
    if (!isEncryptedDatabaseReadable(POWERSYNC_DATABASE_FILENAME, encryptionKey)) {
      throw new Error("The migrated PowerSync database is not readable with its encryption key.");
    }
  } catch (error) {
    deleteDatabaseFiles(POWERSYNC_DATABASE_FILENAME);
    moveDatabaseFile(PLAINTEXT_BACKUP_FILENAME, POWERSYNC_DATABASE_FILENAME);
    throw error;
  }

  deleteDatabaseFiles(PLAINTEXT_BACKUP_FILENAME);
}

function recoverInterruptedMigration(encryptionKey: string) {
  const databaseExists = databaseFile(POWERSYNC_DATABASE_FILENAME).exists;
  const backupExists = databaseFile(PLAINTEXT_BACKUP_FILENAME).exists;

  if (!backupExists) return;

  if (databaseExists && isEncryptedDatabaseReadable(POWERSYNC_DATABASE_FILENAME, encryptionKey)) {
    deleteDatabaseFiles(PLAINTEXT_BACKUP_FILENAME);
    deleteDatabaseFiles(MIGRATION_DATABASE_FILENAME);
    return;
  }

  deleteDatabaseFiles(POWERSYNC_DATABASE_FILENAME);
  moveDatabaseFile(PLAINTEXT_BACKUP_FILENAME, POWERSYNC_DATABASE_FILENAME);
  deleteDatabaseFiles(MIGRATION_DATABASE_FILENAME);
}

export function getOrCreatePowerSyncEncryptionKey() {
  const storedKey = SecureStore.getItem(
    SECURE_STORAGE_KEYS.POWERSYNC_DATABASE_ENCRYPTION_KEY,
    encryptionKeyOptions,
  );

  if (storedKey) {
    if (!/^[0-9a-f]{64}$/i.test(storedKey)) {
      throw new Error("The stored PowerSync database encryption key is invalid.");
    }
    return storedKey;
  }

  const key = Array.from(Crypto.getRandomBytes(DATABASE_KEY_BYTES), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  SecureStore.setItem(
    SECURE_STORAGE_KEYS.POWERSYNC_DATABASE_ENCRYPTION_KEY,
    key,
    encryptionKeyOptions,
  );

  return key;
}

/**
 * Converts databases created by the old Quick SQLite adapter to SQLCipher.
 * All work is synchronous because PowerSync opens its adapter in its constructor.
 */
export function prepareEncryptedPowerSyncDatabase(encryptionKey: string) {
  if (!isSQLCipher()) {
    throw new Error(
      "OP-SQLite was built without SQLCipher. Rebuild the native app before opening PowerSync.",
    );
  }

  recoverInterruptedMigration(encryptionKey);

  if (!databaseFile(POWERSYNC_DATABASE_FILENAME).exists) {
    deleteDatabaseFiles(MIGRATION_DATABASE_FILENAME);
    return;
  }

  if (isEncryptedDatabaseReadable(POWERSYNC_DATABASE_FILENAME, encryptionKey)) {
    deleteDatabaseFiles(MIGRATION_DATABASE_FILENAME);
    return;
  }

  try {
    assertPlaintextDatabaseReadable(POWERSYNC_DATABASE_FILENAME);
  } catch (error) {
    throw new Error(
      "The existing PowerSync database is neither valid plaintext nor readable with this device's encryption key.",
      { cause: error },
    );
  }

  exportPlaintextDatabase(encryptionKey);
  replacePlaintextDatabase(encryptionKey);
}

export const POWERSYNC_DATABASE_LOCATION = databaseDirectory;
