import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { gql } from "graphql-request";
import { useTranslation } from "react-i18next";

import PendingSyncBanner from "@/src/components/ui/pending-sync-banner";

import { useHandleExpiredToken } from "@/src/hooks/use-handle-expired-token";
import { graphqlClient } from "@/src/lib/graphql-client";
import { pwpSessionsCollection } from "@/src/powersync/collections";
import { remoteSyncMetadata } from "@/src/powersync/remote-sync";

const SYNC_PWP_SESSION = gql`
  mutation SyncPwpSession(
    $date: String
    $notes: String
    $villageId: String
    $clientMutationId: String
  ) {
    createTicket(
      input: {
        title: $date
        category: "PWP"
        description: $notes
        flags: $villageId
        clientMutationId: $clientMutationId
      }
    ) {
      internalId
      clientMutationId
    }
  }
`;

export default function PendingPwpSyncBanner() {
  const { t } = useTranslation();
  const handleIfExpired = useHandleExpiredToken();

  const { data = [] } = useLiveQuery((q) =>
    q
      .from({ session: pwpSessionsCollection })
      .where(({ session }) => eq(session.status, "Pending")),
  );

  const mutation = useMutation({
    mutationKey: ["SynchronizePwpSessions"],
    mutationFn: async () => {
      if (!data?.length) return;

      await Promise.all(
        data.map(async (session) => {
          await graphqlClient.request(SYNC_PWP_SESSION, {
            date: session.date,
            notes: session.notes,
            villageId: String(session.villageId),
            clientMutationId: Crypto.randomUUID(),
          });

          const tx = pwpSessionsCollection.update(
            session.id,
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
      console.log("Successfully synchronized PWP sessions...");
    },
    onError: async (error) => {
      if (await handleIfExpired(error)) return;
      console.error("[PWP Sync] Failed:", error);
    },
  });

  if (!data.length) {
    return null;
  }

  return (
    <PendingSyncBanner
      message={t("session_not_synced_count", {
        count: data.length,
        formattedCount: data.length,
      })}
      isSyncing={mutation.isPending}
      onSync={() => mutation.mutate()}
    />
  );
}
