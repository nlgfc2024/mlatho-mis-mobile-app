import { OPSqliteOpenFactory } from "@powersync/op-sqlite";
import { PowerSyncDatabase } from "@powersync/react-native";

import { Connector, canConnectPowerSync } from "./connector";
import {
  getOrCreatePowerSyncEncryptionKey,
  POWERSYNC_DATABASE_FILENAME,
  POWERSYNC_DATABASE_LOCATION,
  prepareEncryptedPowerSyncDatabase,
} from "./encryption";
import { AppSchema } from "./schema";

const encryptionKey = getOrCreatePowerSyncEncryptionKey();
prepareEncryptedPowerSyncDatabase(encryptionKey);

const databaseFactory = new OPSqliteOpenFactory({
  dbFilename: POWERSYNC_DATABASE_FILENAME,
  dbLocation: POWERSYNC_DATABASE_LOCATION,
  sqliteOptions: {
    encryptionKey,
  },
});

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: databaseFactory,
});

let databaseReadyPromise: Promise<void> | null = null;
let setupPromise: Promise<void> | null = null;

/**
 * Opens the encrypted local database without waiting for a remote connection.
 * Local readiness is mandatory for routing; remote connectivity is not.
 */
export const initializePowerSyncDatabase = async () => {
  if (!databaseReadyPromise) {
    const initialization = db.waitForReady();
    databaseReadyPromise = initialization;
    void initialization.catch(() => {
      if (databaseReadyPromise === initialization) databaseReadyPromise = null;
    });
  }

  await databaseReadyPromise;
};

export const setupPowerSync = async () => {
  await initializePowerSyncDatabase();

  if (!canConnectPowerSync()) {
    return;
  }

  if (db.connected || db.connecting) {
    return;
  }

  if (!setupPromise) {
    const connection = db.connect(new Connector());
    setupPromise = connection;
    void connection.then(
      () => {
        if (setupPromise === connection) setupPromise = null;
      },
      () => {
        if (setupPromise === connection) setupPromise = null;
      },
    );
  }

  await setupPromise;
};

export async function waitForPowerSyncUploads(options?: {
  timeoutMs?: number;
  isOnline?: () => boolean;
}) {
  if (!canConnectPowerSync()) return;

  const timeoutMs = options?.timeoutMs ?? 30_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (options?.isOnline && !options.isOnline()) {
      throw new Error("Device went offline while PowerSync was uploading.");
    }

    const pendingTransaction = await db.getNextCrudTransaction();
    const flow = db.currentStatus.dataFlowStatus;
    if (!pendingTransaction && !flow.uploading) return;

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw (
    db.currentStatus.dataFlowStatus.uploadError ??
    new Error("PowerSync upload did not finish before the background execution window ended.")
  );
}

export const disconnectPowerSync = async () => {
  setupPromise = null;

  if (db.connected || db.connecting) {
    await db.disconnect();
  }
};
