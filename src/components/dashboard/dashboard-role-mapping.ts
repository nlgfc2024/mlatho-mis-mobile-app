export type TemporaryDashboardGroupId =
  | "field_operations"
  | "grm"
  | "programme_operations"
  | "communication_feed"
  | "payment_monitoring"
  | "executive_me";

/**
 * Temporary assignments for the roles exposed by the current access-profile
 * service. Keep these explicit so every active role has one deterministic
 * startup dashboard until dashboards are derived from role-scoped permissions.
 */
export const TEMPORARY_ROLE_DASHBOARD_ASSIGNMENTS: Record<string, TemporaryDashboardGroupId> = {
  "enrolment officer": "programme_operations",
  "enrollment officer": "programme_operations",
  manager: "executive_me",
  accountant: "payment_monitoring",
  clerk: "field_operations",
  "medical officer": "programme_operations",
  "scheme administrator": "programme_operations",
  "imis administrator": "executive_me",
  receptionist: "communication_feed",
  "coordination officer (maker)": "communication_feed",
  "claim administrator": "grm",
  "claim contributor": "grm",
  "grievance officer": "grm",
  "grm officer": "grm",
};

/**
 * Stable openIMIS system-role flags. Role names remain the first choice because
 * legacy flag 16 is shared by medical and claim-administrator roles.
 */
export const SYSTEM_ROLE_DASHBOARD_ASSIGNMENTS: Record<number, TemporaryDashboardGroupId> = {
  1: "programme_operations",
  2: "executive_me",
  4: "payment_monitoring",
  8: "field_operations",
  16: "programme_operations",
  32: "programme_operations",
  64: "executive_me",
  128: "communication_feed",
  512: "grm",
};

export function normalizeDashboardRoleName(roleName: string) {
  return roleName.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

const ROLE_PRIMARY_TILE_MATCHERS: readonly {
  pattern: RegExp;
  tileId: RolePrimaryTileId;
}[] = [
  { pattern: /\bcommunication\b|\breceptionist\b/, tileId: "communication" },
  { pattern: /\bcoordination\b|\bcoordinator\b/, tileId: "coordination" },
  { pattern: /\bgrievance\b|\bgrm\b|\bclaim\b/, tileId: "grievance" },
  { pattern: /\bpayment\b|\baccountant\b|\bfinance\b/, tileId: "payments" },
  { pattern: /\btraining\b|\bfacilitator\b/, tileId: "training" },
  { pattern: /\benrolment\b|\benrollment\b/, tileId: "targeting" },
];

type RolePrimaryTileId =
  | "communication"
  | "coordination"
  | "grievance"
  | "payments"
  | "training"
  | "targeting";

export function getPrimaryDashboardTileForRole(
  roleName: string | null | undefined,
): RolePrimaryTileId | null {
  if (!roleName?.trim()) return null;
  const normalizedRoleName = normalizeDashboardRoleName(roleName);
  return (
    ROLE_PRIMARY_TILE_MATCHERS.find(({ pattern }) => pattern.test(normalizedRoleName))?.tileId ??
    null
  );
}

/**
 * Keep the role's own module at the front while retaining the user's saved
 * ordering for every other quick action. Roles without a dedicated module use
 * the dashboard's configured primary tile. Payments is always placed last,
 * including for payment-focused roles.
 */
export function prioritizeDashboardTileIds<T extends string>(
  tileIds: T[],
  roleName: string | null | undefined,
  fallbackTileId?: T,
): T[] {
  const roleTileId = getPrimaryDashboardTileForRole(roleName) as T | null;
  const primaryTileId =
    roleTileId && tileIds.includes(roleTileId)
      ? roleTileId
      : fallbackTileId && tileIds.includes(fallbackTileId)
        ? fallbackTileId
        : null;

  const prioritizedTileIds = primaryTileId
    ? [primaryTileId, ...tileIds.filter((id) => id !== primaryTileId)]
    : tileIds;
  const paymentTileId = prioritizedTileIds.find((id) => id === "payments");

  if (!paymentTileId) return prioritizedTileIds;
  return [...prioritizedTileIds.filter((id) => id !== paymentTileId), paymentTileId];
}

export function dashboardRoleNamesMatch(assignedRoleName: string, activeRoleName: string) {
  const normalizeRoleAlias = (roleName: string) => {
    const normalizedRoleName = normalizeDashboardRoleName(roleName);
    return normalizedRoleName === "grm officer" ? "grievance officer" : normalizedRoleName;
  };

  return normalizeRoleAlias(assignedRoleName) === normalizeRoleAlias(activeRoleName);
}

export function getTemporaryDashboardForRole(
  roleName: string | null | undefined,
  systemRoleFlag?: number | null,
) {
  const namedDashboard = roleName?.trim()
    ? TEMPORARY_ROLE_DASHBOARD_ASSIGNMENTS[normalizeDashboardRoleName(roleName)]
    : null;
  if (namedDashboard) return namedDashboard;
  if (!systemRoleFlag) return null;
  return SYSTEM_ROLE_DASHBOARD_ASSIGNMENTS[systemRoleFlag] ?? null;
}
