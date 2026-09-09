import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";

import {
  attachmentsCollection,
  attendanceSessionsCollection,
  grievancesCollection,
  householdChangeRequestsCollection,
  householdMembersCollection,
  householdsCollection,
  paymentAccountsCollection,
  pwpSessionsCollection,
  targetedMembersCollection,
} from "@/src/powersync/collections";
import { needsGrievanceUpload } from "@/src/powersync/grievance-sync";
import { getRecordSyncState } from "@/src/powersync/sync-state";
import { useSession } from "@/src/providers/session-context";

import { type DashboardStat } from "./dashboard-groups";
import DashboardStatsRow from "./dashboard-stats-row";

type MaybeDeletedRecord = {
  deletedAt?: string | null;
  isDeleted?: boolean | number | null;
};

type SyncableRecord = {
  $synced?: boolean;
  status?: string | null;
  synchronizedAt?: string | null;
};

function isDeleted(record: MaybeDeletedRecord) {
  return Boolean(record.deletedAt || record.isDeleted);
}

function isPendingStatus(status?: string | null) {
  return status?.trim().toLowerCase() === "pending";
}

function isPendingUpload(record: SyncableRecord) {
  return getRecordSyncState(record) === "pending_upload";
}

function toScopedId(value?: string | number | null) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

export default function FieldOperationsStats({ stats }: { stats: DashboardStat[] }) {
  const { user } = useSession();
  const activeVillageId = toScopedId(user?.villageId);

  const { data: householdRows = [] } = useLiveQuery(
    (q) => {
      if (!activeVillageId) return undefined;
      return q
        .from({ household: householdsCollection })
        .where(({ household }) => eq(household.villageId, activeVillageId));
    },
    [activeVillageId],
  );

  const { data: householdMembers = [] } = useLiveQuery((q) =>
    q.from({ member: householdMembersCollection }),
  );

  const { data: targetedMembers = [] } = useLiveQuery(
    (q) => {
      if (!activeVillageId) return undefined;
      return q
        .from({ member: targetedMembersCollection })
        .where(({ member }) => eq(member.villageId, activeVillageId));
    },
    [activeVillageId],
  );

  const { data: grievanceRows = [] } = useLiveQuery(
    (q) => {
      if (!activeVillageId) return undefined;
      return q
        .from({ grievance: grievancesCollection })
        .where(({ grievance }) => eq(grievance.villageId, activeVillageId));
    },
    [activeVillageId],
  );

  const { data: householdChangeRequests = [] } = useLiveQuery((q) =>
    q.from({ request: householdChangeRequestsCollection }),
  );

  const { data: paymentAccounts = [] } = useLiveQuery((q) =>
    q.from({ account: paymentAccountsCollection }),
  );

  const { data: pwpSessions = [] } = useLiveQuery(
    (q) => {
      if (!activeVillageId) return undefined;
      return q
        .from({ session: pwpSessionsCollection })
        .where(({ session }) => eq(session.villageId, activeVillageId));
    },
    [activeVillageId],
  );

  const { data: attendanceSessions = [] } = useLiveQuery(
    (q) => {
      if (!activeVillageId) return undefined;
      return q
        .from({ session: attendanceSessionsCollection })
        .where(({ session }) => eq(session.villageId, activeVillageId));
    },
    [activeVillageId],
  );

  const { data: attachments = [] } = useLiveQuery((q) =>
    q.from({ attachment: attachmentsCollection }),
  );

  const liveStats = useMemo(() => {
    const activeHouseholds = householdRows.filter((household) => !isDeleted(household));
    const activeHouseholdUuids = new Set(
      activeHouseholds.map((household) => toScopedId(household.uuid)).filter(Boolean),
    );

    const activeBeneficiaries = householdMembers.filter((member) => {
      const householdUuid = toScopedId(member.householdUuid);
      return (
        !isDeleted(member) &&
        member.isActive !== 0 &&
        Boolean(householdUuid && activeHouseholdUuids.has(householdUuid))
      );
    });

    const activeTargetedMembers = targetedMembers.filter((member) => !isDeleted(member));
    const visibleGrievances = grievanceRows.filter((grievance) => !isDeleted(grievance));

    const pendingHouseholdUpdates = householdChangeRequests.filter((request) => {
      const householdUuid = toScopedId(request.householdUuid);
      return (
        !isDeleted(request) &&
        isPendingStatus(request.status) &&
        Boolean(householdUuid && activeHouseholdUuids.has(householdUuid))
      );
    });

    const pendingPaymentUpdates = paymentAccounts.filter((account) => {
      const householdUuid = toScopedId(account.houseHoldId);
      return (
        !isDeleted(account) &&
        isPendingUpload(account) &&
        Boolean(householdUuid && activeHouseholdUuids.has(householdUuid))
      );
    });

    const pendingPwpSessions = pwpSessions.filter(
      (session) => !isDeleted(session) && isPendingStatus(session.status),
    );
    const pendingAttendanceSessions = attendanceSessions.filter(
      (session) => !isDeleted(session) && isPendingStatus(session.status),
    );
    const pendingAttachments = attachments.filter(
      (attachment) => !isDeleted(attachment) && isPendingUpload(attachment),
    );
    const pendingGrievances = visibleGrievances.filter(needsGrievanceUpload);

    const pendingFieldTasks =
      pendingHouseholdUpdates.length +
      pendingPaymentUpdates.length +
      pendingPwpSessions.length +
      pendingAttendanceSessions.length;

    return {
      households: activeHouseholds.length,
      beneficiaries: activeBeneficiaries.length,
      pending_field_tasks: pendingFieldTasks,
      verification_tasks: activeTargetedMembers.length,
      grievances: visibleGrievances.length,
      pending_sync: pendingFieldTasks + pendingGrievances.length + pendingAttachments.length,
    };
  }, [
    attachments,
    attendanceSessions,
    grievanceRows,
    householdChangeRequests,
    householdMembers,
    householdRows,
    paymentAccounts,
    pwpSessions,
    targetedMembers,
  ]);

  const realStats = useMemo(
    () =>
      stats.map((stat) => ({
        ...stat,
        value:
          stat.id in liveStats
            ? formatCount(liveStats[stat.id as keyof typeof liveStats])
            : stat.value,
      })),
    [liveStats, stats],
  );

  return <DashboardStatsRow stats={realStats} />;
}
