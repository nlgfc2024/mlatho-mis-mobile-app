import { type AccessRole } from "./types.ts";

export const IMIS_ADMINISTRATOR_SYSTEM_ROLE = 64;

function normalizeRoleName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Identifies the unrestricted openIMIS administrator role. */
export function isImisAdministratorRole(role: AccessRole | null | undefined) {
  if (!role || role.isBlocked) return false;

  return (
    role.isSystem === IMIS_ADMINISTRATOR_SYSTEM_ROLE ||
    (Boolean(role.name) && normalizeRoleName(role.name ?? "") === "imisadministrator")
  );
}
