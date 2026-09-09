// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import { Table, column } from "@powersync/common";

import {
  createPowerSyncTableSchema,
  keepPowerSyncTableColumns,
} from "../src/powersync/collection-schema.ts";

test("keeps only declared columns before PowerSync serialization", () => {
  const table = new Table({
    name: column.text,
    syncedCount: column.integer,
  });

  assert.deepEqual(
    keepPowerSyncTableColumns(table, {
      id: "regions",
      name: "Regions",
      syncedCount: 2,
      _metadata: JSON.stringify({ intent: "remote-sync" }),
      _deleted: 0,
    }),
    {
      id: "regions",
      name: "Regions",
      syncedCount: 2,
    },
  );
});

test("strips PowerSync internal metadata from collection rows", () => {
  const table = new Table({
    name: column.text,
    syncedCount: column.integer,
  });
  const schema = createPowerSyncTableSchema(table);

  const result = schema["~standard"].validate({
    id: "regions",
    name: "Regions",
    syncedCount: 2,
    _metadata: JSON.stringify({ intent: "remote-sync" }),
    _deleted: 0,
  });

  assert.deepEqual(result, {
    value: {
      id: "regions",
      name: "Regions",
      syncedCount: 2,
    },
  });
});

test("reports invalid declared column types", () => {
  const table = new Table({
    name: column.text,
    syncedCount: column.integer,
  });
  const schema = createPowerSyncTableSchema(table);

  const result = schema["~standard"].validate({
    id: "regions",
    name: 12,
    syncedCount: "2",
  });

  assert.deepEqual(result, {
    issues: [
      { message: "name must be a string or null", path: ["name"] },
      { message: "syncedCount must be a number or null", path: ["syncedCount"] },
    ],
  });
});

test("reports unexpected non-internal columns", () => {
  const table = new Table({
    name: column.text,
  });
  const schema = createPowerSyncTableSchema(table);

  const result = schema["~standard"].validate({
    id: "regions",
    name: "Regions",
    typoedName: "Region",
  });

  assert.deepEqual(result, {
    issues: [{ message: "Could not find schema for typoedName column.", path: ["typoedName"] }],
  });
});
