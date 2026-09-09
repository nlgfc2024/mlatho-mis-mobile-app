import { ColumnType, type RowType, type Table } from "@powersync/common";
import type { StandardSchemaV1 } from "@standard-schema/spec";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function keepPowerSyncTableColumns<TTable extends Table>(
  table: TTable,
  value: Record<string, unknown>,
) {
  const allowedColumns = new Set(["id", ...table.columns.map((column) => column.name)]);

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => allowedColumns.has(key)),
  ) as Record<string, unknown>;
}

export function createPowerSyncTableSchema<TTable extends Table>(
  table: TTable,
): StandardSchemaV1<any, RowType<TTable>> {
  const columns = table.columns.map((column) => ({
    name: column.name,
    type: column.type ?? ColumnType.TEXT,
  }));
  const columnNames = new Set(columns.map((column) => column.name));

  return {
    "~standard": {
      version: 1,
      vendor: "tasaf-powersync",
      validate(value) {
        if (!isRecord(value)) {
          return { issues: [{ message: "Value must be an object" }] };
        }

        const issues: StandardSchemaV1.Issue[] = [];
        const sanitized: Record<string, unknown> = {};

        if (typeof value.id === "string") {
          sanitized.id = value.id;
        } else {
          issues.push({ message: "id field must be a string", path: ["id"] });
        }

        for (const column of columns) {
          if (!(column.name in value)) continue;

          const columnValue = value[column.name];
          if (columnValue == null) {
            sanitized[column.name] = columnValue;
            continue;
          }

          if (column.type === ColumnType.TEXT) {
            if (typeof columnValue === "string") {
              sanitized[column.name] = columnValue;
            } else {
              issues.push({
                message: `${column.name} must be a string or null`,
                path: [column.name],
              });
            }
            continue;
          }

          if (typeof columnValue === "number") {
            sanitized[column.name] = columnValue;
          } else {
            issues.push({
              message: `${column.name} must be a number or null`,
              path: [column.name],
            });
          }
        }

        for (const key of Object.keys(value)) {
          if (key === "id" || columnNames.has(key) || key.startsWith("_")) continue;

          issues.push({
            message: `Could not find schema for ${key} column.`,
            path: [key],
          });
        }

        if (issues.length > 0) {
          return { issues };
        }

        return { value: sanitized as RowType<TTable> };
      },
    },
  };
}
