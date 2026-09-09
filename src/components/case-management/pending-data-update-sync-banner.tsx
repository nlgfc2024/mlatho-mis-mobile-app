import { and, eq, isNull, useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { gql } from "graphql-request";
import { useTranslation } from "react-i18next";

import PendingSyncBanner from "@/src/components/ui/pending-sync-banner";
import { useHandleExpiredToken } from "@/src/hooks/use-handle-expired-token";
import { graphqlClient } from "@/src/lib/graphql-client";
import { getHouseholdChangeTitle } from "@/src/lib/household-case-management";
import {
  householdChangeRequestsCollection,
  paymentAccountsCollection,
} from "@/src/powersync/collections";
import { remoteSyncMetadata } from "@/src/powersync/remote-sync";

const SYNC_PAYMENT_ACCOUNT = gql`
  mutation SyncPaymentAccount(
    $accountProvider: String
    $accountNumber: String
    $accountName: String
    $householdId: String
    $clientMutationId: String
  ) {
    createTicket(
      input: {
        title: $accountProvider
        category: "PaymentAccount"
        description: $accountName
        flags: $accountNumber
        channel: $householdId
        clientMutationId: $clientMutationId
      }
    ) {
      internalId
      clientMutationId
    }
  }
`;

const SYNC_HOUSEHOLD_CHANGE = gql`
  mutation SyncHouseholdChange(
    $title: String
    $category: String!
    $flags: String
    $channel: String
    $description: String
    $clientMutationId: String
  ) {
    createTicket(
      input: {
        title: $title
        category: $category
        flags: $flags
        channel: $channel
        description: $description
        clientMutationId: $clientMutationId
      }
    ) {
      internalId
      clientMutationId
    }
  }
`;

export default function PendingDataUpdateSyncBanner() {
  const { t } = useTranslation();
  const handleIfExpired = useHandleExpiredToken();

  const { data: paymentUpdates = [] } = useLiveQuery((q) =>
    q
      .from({ account: paymentAccountsCollection })
      .where(({ account }) => isNull(account.synchronizedAt)),
  );

  const { data: householdUpdates = [] } = useLiveQuery((q) =>
    q
      .from({ request: householdChangeRequestsCollection })
      .where(({ request }) => and(eq(request.status, "Pending"), isNull(request.deletedAt))),
  );

  const pendingPaymentCount = paymentUpdates.length;
  const pendingHouseholdCount = householdUpdates.length;
  const pendingCount = pendingPaymentCount + pendingHouseholdCount;

  const mutation = useMutation({
    mutationKey: ["SynchronizePaymentAccounts"],
    mutationFn: async () => {
      await Promise.all([
        ...paymentUpdates.map(async (account) => {
          await graphqlClient.request(SYNC_PAYMENT_ACCOUNT, {
            accountProvider: account.accountProvider,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            householdId: account.houseHoldId,
            clientMutationId: Crypto.randomUUID(),
          });

          const tx = paymentAccountsCollection.update(
            account.id,
            { metadata: remoteSyncMetadata() },
            (draft) => {
              draft.synchronizedAt = new Date().toISOString();
            },
          );
          await tx.isPersisted.promise;
        }),
        ...householdUpdates.map(async (request) => {
          await graphqlClient.request(SYNC_HOUSEHOLD_CHANGE, {
            title: getHouseholdChangeTitle(request.type as any),
            category: "HouseholdCaseManagement",
            flags: request.type,
            channel: request.householdUuid,
            description: JSON.stringify({
              type: request.type,
              householdUuid: request.householdUuid,
              memberUuid: request.memberUuid,
              payload: request.payload,
              requestedAt: request.createdAt,
            }),
            clientMutationId: request.id.toString(),
          });

          const tx = householdChangeRequestsCollection.update(
            request.id,
            { metadata: remoteSyncMetadata() },
            (draft) => {
              draft.status = "Synchronized";
              draft.synchronizedAt = new Date().toISOString();
            },
          );
          await tx.isPersisted.promise;
        }),
      ]);
    },
    onSuccess: () => {
      console.log("Successfully synchronized payment accounts...");
    },
    onError: async (error) => {
      if (await handleIfExpired(error)) return;
      console.error("[Data Update Sync] Failed:", error);
    },
  });

  if (!pendingCount) {
    return null;
  }

  return (
    <PendingSyncBanner
      message={t("case_update_not_synced_count", { count: pendingCount })}
      isSyncing={mutation.isPending}
      onSync={() => mutation.mutate()}
    />
  );
}
