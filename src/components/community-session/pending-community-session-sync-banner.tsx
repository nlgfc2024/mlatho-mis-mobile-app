import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { gql } from "graphql-request";
import { useTranslation } from "react-i18next";

import PendingSyncBanner from "@/src/components/ui/pending-sync-banner";

import { useHandleExpiredToken } from "@/src/hooks/use-handle-expired-token";
import { graphqlClient } from "@/src/lib/graphql-client";
import { attendanceSessionsCollection } from "@/src/powersync/collections";
import { remoteSyncMetadata } from "@/src/powersync/remote-sync";

const CREATE_ATTENDANCE = gql`
  mutation CreateAttendance(
    $title: String
    $category: String!
    $priority: String
    $incidentDate: Date
    $flags: String
    $channel: String
    $description: String
    $clientMutationId: String
  ) {
    createTicket(
      input: {
        title: $title
        category: $category
        priority: $priority
        channel: $channel
        dateOfIncident: $incidentDate
        flags: $flags
        description: $description
        clientMutationId: $clientMutationId
      }
    ) {
      internalId
      clientMutationId
    }
  }
`;

export default function PendingCommunitySessionsSyncBanner() {
  const { t } = useTranslation();
  const handleIfExpired = useHandleExpiredToken();

  const { data = [] } = useLiveQuery((q) =>
    q
      .from({ attendance: attendanceSessionsCollection })
      .where(({ attendance }) => eq(attendance.status, "Pending")),
  );

  const mutation = useMutation({
    mutationKey: ["SynchronizeCommunitySessions"],
    mutationFn: async () => {
      if (!data?.length) return;

      await Promise.all(
        data.map(async (attendance) => {
          await graphqlClient.request(CREATE_ATTENDANCE, {
            title: attendance.type,
            date: attendance.date,
            status: "Synchronized",
            category: attendance.notes,
            villageId: attendance.villageId,
            clientMutationId: Crypto.randomUUID(),
          });

          const tx = attendanceSessionsCollection.update(
            attendance.id,
            { metadata: remoteSyncMetadata() },
            (draft) => {
              draft.status = "Synchronized";
              draft.synchronizedAt = new Date().toISOString();
            },
          );
          await tx.isPersisted.promise;
        }),
      );
    },
    onSuccess: () => {
      console.log("Successfully synchronized...");
    },
    onError: async (error) => {
      if (await handleIfExpired(error)) return;
      console.error("[Community Session Sync] Failed:", error);
    },
  });

  if (!data.length) {
    return null;
  }

  return (
    <PendingSyncBanner
      message={t("attendance_not_synced_count", {
        count: data.length,
        formattedCount: data.length,
      })}
      isSyncing={mutation.isPending}
      onSync={() => mutation.mutate()}
    />
  );
}
