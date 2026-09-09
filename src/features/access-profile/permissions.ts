import { isImisAdministratorRole } from "./roles.ts";
import { type AccessModulePermission, type AccessProfile, type AccessRole } from "./types.ts";

export type AccessOperation = "any" | "write";

const UNIVERSALLY_READABLE_MODULES = new Set(["training", "communication"]);

function normalizeAccessName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function isAssignedActiveRole(accessProfile: AccessProfile | null | undefined, role: AccessRole) {
  return Boolean(
    !role.isBlocked &&
    accessProfile?.user?.iUser?.roles?.some(
      (assignedRole) => assignedRole?.id === role.id && !assignedRole.isBlocked,
    ),
  );
}

export function getAccessRoleRightIds(role: AccessRole | null | undefined) {
  const rightIds = new Set<number>();
  if (!role || role.isBlocked) return rightIds;

  for (const edge of role.rights?.edges ?? []) {
    const rightId = Number(edge?.node?.rightId);
    if (Number.isInteger(rightId) && rightId > 0) rightIds.add(rightId);
  }

  return rightIds;
}

export function accessRoleHasRight(role: AccessRole | null | undefined, rightId: number) {
  return getAccessRoleRightIds(role).has(rightId);
}

function isWritePermission(permissionName: string | null | undefined) {
  if (!permissionName) return false;
  const normalized = normalizeAccessName(permissionName);
  return [
    "mutation",
    "create",
    "update",
    "delete",
    "edit",
    "add",
    "remove",
    "replace",
    "upload",
    "approve",
    "process",
  ].some((keyword) => normalized.includes(keyword));
}

function matchesModule(modulePermission: AccessModulePermission, moduleNames: string[]) {
  const moduleName = modulePermission.moduleName;
  if (!moduleName) return false;
  const normalizedModuleName = normalizeAccessName(moduleName);
  return moduleNames.some((candidate) => normalizeAccessName(candidate) === normalizedModuleName);
}

function matchesPermission(permissionName: string | null | undefined, permissionNames: string[]) {
  if (!permissionName) return false;
  const normalizedPermissionName = normalizeAccessName(permissionName);
  return permissionNames.some(
    (candidate) => normalizeAccessName(candidate) === normalizedPermissionName,
  );
}

/**
 * Checks the permission list returned by `myModulesPermissions`. This reflects
 * what the backend will authorize for the signed-in user, independently of the
 * client-side active-role selection.
 */
export function accessProfileHasPermission(
  accessProfile: AccessProfile | null | undefined,
  permissionNames: string[],
) {
  if (!accessProfile || permissionNames.length === 0) return false;

  if (accessProfile.user?.iUser?.roles?.some(isImisAdministratorRole)) return true;

  const assignedRightIds = new Set<number>();
  for (const role of accessProfile.user?.iUser?.roles ?? []) {
    for (const rightId of getAccessRoleRightIds(role)) assignedRightIds.add(rightId);
  }

  return (accessProfile.myModulesPermissions?.modulePermsList ?? []).some((modulePermission) =>
    modulePermission?.permissions?.some((permission) => {
      const rightId = Number(permission?.permsValue);
      return (
        matchesPermission(permission?.permsName, permissionNames) &&
        Number.isInteger(rightId) &&
        assignedRightIds.has(rightId)
      );
    }),
  );
}

/**
 * Checks an operation against the current user's module permissions and the
 * active role's right IDs. The intersection keeps client-side role switching
 * scoped to rights granted to the selected role.
 *
 * Modules that are not represented in the current-user response are app-local
 * and continue to use the dashboard's role allow-list.
 */
export function canUseAccessModule({
  accessProfile,
  activeRole,
  moduleNames,
  permissionNames,
  operation = "any",
}: {
  accessProfile: AccessProfile | null | undefined;
  activeRole: AccessRole | null | undefined;
  moduleNames: string[];
  permissionNames?: string[];
  operation?: AccessOperation;
}) {
  const isUniversallyReadable = moduleNames.some((moduleName) =>
    UNIVERSALLY_READABLE_MODULES.has(normalizeAccessName(moduleName)),
  );
  if (operation === "any" && isUniversallyReadable) return true;

  if (!accessProfile || !activeRole || !isAssignedActiveRole(accessProfile, activeRole)) {
    return false;
  }

  // The backend's IMIS administrator role is unrestricted. Keep the same
  // semantics in client-side visibility checks even when its rights catalogue
  // is incomplete or a module is app-local.
  if (isImisAdministratorRole(activeRole)) return true;

  const matchingModules = (accessProfile.myModulesPermissions?.modulePermsList ?? []).filter(
    (modulePermission): modulePermission is AccessModulePermission =>
      Boolean(modulePermission && matchesModule(modulePermission, moduleNames)),
  );

  if (matchingModules.length === 0) return !permissionNames?.length;

  const roleRightIds = getAccessRoleRightIds(activeRole);
  return matchingModules.some((modulePermission) =>
    modulePermission.permissions?.some((permission) => {
      if (permissionNames?.length && !matchesPermission(permission?.permsName, permissionNames)) {
        return false;
      }
      const rightId = Number(permission?.permsValue);
      if (!Number.isInteger(rightId) || !roleRightIds.has(rightId)) return false;
      return operation === "any" || isWritePermission(permission?.permsName);
    }),
  );
}
