import type { HouseholdPaymentHistoryRecord } from "@/src/powersync/schema";
import { gql } from "graphql-request";

import { PageInfo } from "@/src/graphql/types";
import { graphqlClient } from "@/src/lib/graphql-client";
import {
  getHouseholdRepresentativeName,
  parseHouseholdMembers,
} from "@/src/lib/household-case-management";
import { getHouseholdSyncKey, ensureVillageScopedSyncMetadata } from "@/src/onboarding/state";
import {
  householdMembersCollection,
  householdPaymentHistoryCollection,
  householdsCollection,
  paymentAccountsCollection,
  syncMetadataCollection,
} from "@/src/powersync/collections";
import { upsertRemoteRecord, waitForCollection } from "@/src/powersync/remote-sync";
import { extractPaymentDetails } from "@/src/store/payment-account-store";
import { createSyncProgressPublisher } from "@/src/sync/update-status";
import { getGraphQLErrorMessage } from "@/src/utils/graphql-errors";

type VillageLike = {
  id: number | string;
  uuid?: string | null;
  reference?: string | null;
  name?: string | null;
};

interface Group {
  id: string;
  uuid: string;
  code?: string | null;
  head?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  jsonExt?: string | null;
  isDeleted?: boolean | null;
  dateCreated?: string | null;
  dateUpdated?: string | null;
  groupindividuals?: {
    edges: ({
      node?: {
        individual?: {
          uuid?: string | null;
          firstName?: string | null;
          lastName?: string | null;
          benefitconsumptionSet?: {
            edges: ({
              node?: {
                id: string;
                uuid?: string | null;
                code?: string | null;
                amount?: string | number | null;
                dateDue?: string | null;
                dateCreated?: string | null;
                dateUpdated?: string | null;
                status?: string | null;
                type?: string | null;
                receipt?: string | null;
                jsonExt?: string | null;
                payrollbenefitconsumptionSet?: {
                  edges: ({
                    node?: {
                      payroll?: {
                        name?: string | null;
                        paymentMethod?: string | null;
                        paymentCycle?: {
                          code?: string | null;
                          startDate?: string | null;
                          endDate?: string | null;
                        } | null;
                      } | null;
                    } | null;
                  } | null)[];
                } | null;
              } | null;
            } | null)[];
          } | null;
        } | null;
      } | null;
    } | null)[];
  } | null;
}

interface GraphQlResponse {
  group?: {
    pageInfo: PageInfo;
    edges: ({ node?: Group | null } | null)[];
  } | null;
}

const PAGE_SIZE = 100;

function toPaymentAmount(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value) return null;

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function formatPaymentWindow({
  code,
  startDate,
  endDate,
  fallback,
}: {
  code?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  fallback?: string | null;
}) {
  if (code?.trim()) return code.trim();
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  if (fallback?.trim()) return fallback.trim();
  return "Unknown payment window";
}

function parsePaymentMetadata(value: string | null | undefined) {
  if (!value) return {} as Record<string, unknown>;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function metadataText(metadata: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function extractPaymentHistory(
  group: Group,
  paymentAccount?: {
    accountProvider?: string | null;
    accountNumber?: string | null;
    accountName?: string | null;
  } | null,
): HouseholdPaymentHistoryRecord[] {
  const rows: HouseholdPaymentHistoryRecord[] = [];

  for (const groupIndividual of group.groupindividuals?.edges ?? []) {
    const individual = groupIndividual?.node?.individual;
    const benefits = individual?.benefitconsumptionSet?.edges ?? [];

    for (const [index, benefitEdge] of benefits.entries()) {
      const benefit = benefitEdge?.node;
      if (!benefit) continue;

      const amount = toPaymentAmount(benefit.amount);
      if (amount === null) continue;

      const payrollBenefit = benefit.payrollbenefitconsumptionSet?.edges?.[0]?.node;
      const payroll = payrollBenefit?.payroll;
      const cycle = payroll?.paymentCycle;
      const metadata = parsePaymentMetadata(benefit.jsonExt);

      const id =
        benefit.uuid ?? `${group.uuid}-${individual?.uuid ?? "member"}-${benefit.id}-${index}`;
      const timestamp = new Date().toISOString();
      const existing = householdPaymentHistoryCollection.get(id);
      const recipientName =
        [individual?.firstName, individual?.lastName].filter(Boolean).join(" ").trim() ||
        [group.head?.firstName, group.head?.lastName].filter(Boolean).join(" ").trim() ||
        null;

      rows.push({
        id,
        uuid: id,
        householdUuid: group.uuid,
        transactionReference:
          metadataText(metadata, "transactionReference", "transactionNo", "reference") ??
          benefit.receipt ??
          benefit.code ??
          id,
        amount,
        paymentWindow: formatPaymentWindow({
          code: cycle?.code,
          startDate: cycle?.startDate,
          endDate: cycle?.endDate,
          fallback: benefit.dateDue ?? benefit.type,
        }),
        paymentWindowStart: cycle?.startDate ?? null,
        paymentWindowEnd: cycle?.endDate ?? null,
        paidAt:
          metadataText(metadata, "paidAt", "paymentDate", "receivedDate") ??
          benefit.dateDue ??
          cycle?.endDate ??
          null,
        status: benefit.status ?? null,
        provider:
          existing?.provider ??
          metadataText(metadata, "provider", "mno", "paymentProvider") ??
          paymentAccount?.accountProvider ??
          null,
        paymentPhoneNumber:
          existing?.paymentPhoneNumber ??
          metadataText(metadata, "paymentPhoneNumber", "phoneNumber", "paymentNumber") ??
          paymentAccount?.accountNumber ??
          null,
        registeredPaymentName:
          existing?.registeredPaymentName ??
          metadataText(metadata, "registeredPaymentName", "registeredName", "accountName") ??
          paymentAccount?.accountName ??
          null,
        recipientName:
          existing?.recipientName ??
          metadataText(metadata, "recipientName", "beneficiaryName") ??
          recipientName,
        paymentChannel:
          metadataText(metadata, "paymentChannel", "channel") ??
          payroll?.paymentMethod ??
          payroll?.name ??
          null,
        failureReason:
          metadataText(metadata, "failureReason", "rejectionReason", "rejectedReason") ?? null,
        reversalStatus: metadataText(metadata, "reversalStatus") ?? null,
        reversalReference: metadataText(metadata, "reversalReference", "reversalRef") ?? null,
        processingDate:
          metadataText(metadata, "processingDate", "processedAt") ?? benefit.dateCreated ?? null,
        lastStatusUpdate:
          metadataText(metadata, "lastStatusUpdate", "statusUpdatedAt") ??
          benefit.dateUpdated ??
          null,
        synchronizedAt: timestamp,
        createdAt: benefit.dateCreated ?? existing?.createdAt ?? timestamp,
        updatedAt: benefit.dateUpdated ?? timestamp,
        deletedAt: null,
      });
    }
  }

  return rows;
}

const GET_LOCATION_GROUPS = gql`
  query GetLocationGroups($after: String, $first: Int, $villageId: String) {
    group(
      isDeleted: false
      parentLocation: $villageId
      parentLocationLevel: 3
      first: $first
      after: $after
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        node {
          id
          uuid
          code
          isDeleted
          dateCreated
          dateUpdated
          head {
            firstName
            lastName
          }
          jsonExt
          groupindividuals(first: 50, isDeleted: false) {
            edges {
              node {
                individual {
                  uuid
                  firstName
                  lastName
                  benefitconsumptionSet(first: 50, isDeleted: false) {
                    edges {
                      node {
                        id
                        uuid
                        code
                        amount
                        dateDue
                        dateCreated
                        dateUpdated
                        status
                        type
                        receipt
                        jsonExt
                        payrollbenefitconsumptionSet(first: 5, isDeleted: false) {
                          edges {
                            node {
                              payroll {
                                name
                                paymentMethod
                                paymentCycle {
                                  code
                                  startDate
                                  endDate
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function upsertHouseholdRelatedRows(node: Group) {
  const paymentDetails = extractPaymentDetails(node.jsonExt);

  if (
    paymentDetails?.uuid &&
    paymentDetails.accountProvider &&
    paymentDetails.accountNumber &&
    paymentDetails.accountName
  ) {
    const timestamp = new Date().toISOString();

    await upsertRemoteRecord(paymentAccountsCollection, {
      id: paymentDetails.uuid,
      uuid: paymentDetails.uuid,
      houseHoldId: paymentDetails.houseHoldId ?? node.uuid,
      accountProvider: paymentDetails.accountProvider,
      accountNumber: paymentDetails.accountNumber,
      accountName: paymentDetails.accountName,
      isActive: 1,
      synchronizedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    });
  }

  await waitForCollection(householdPaymentHistoryCollection);
  const paymentHistory = extractPaymentHistory(node, paymentDetails);
  for (const payment of paymentHistory) {
    await upsertRemoteRecord(householdPaymentHistoryCollection, payment);
  }

  const householdMembers = parseHouseholdMembers(node.jsonExt, node.uuid);
  for (const member of householdMembers) {
    await upsertRemoteRecord(householdMembersCollection, {
      ...member,
      id: member.id,
      uuid: member.uuid,
      householdUuid: member.householdUuid,
      fullName: member.fullName,
      middleName: member.middleName ?? null,
      dateOfBirth: member.dateOfBirth ?? null,
      gender: member.gender ?? "unknown",
      relationship: member.relationship ?? null,
      education: member.education ?? null,
      isDisabled: member.isDisabled ? 1 : 0,
      disability: member.disability ?? null,
      disabilityLevel: member.disabilityLevel ?? null,
      currentSchoolLevel: member.currentSchoolLevel ?? null,
      premNumber: member.premNumber ?? null,
      avatarUri: member.avatarUri ?? null,
      identityType: member.identityType ?? null,
      identityNumber: member.identityNumber ?? null,
      identityScanUri: member.identityScanUri ?? null,
      phoneNumber: member.phoneNumber ?? null,
      isHead: member.isHead ? 1 : 0,
      isRepresentative: member.isRepresentative ? 1 : 0,
      isActive: member.isActive === 0 ? 0 : 1,
      deactivationReason: member.deactivationReason ?? null,
      synchronizedAt: member.synchronizedAt ?? new Date().toISOString(),
      createdAt: member.createdAt ?? new Date().toISOString(),
      updatedAt: member.updatedAt ?? new Date().toISOString(),
      deletedAt: member.deletedAt ?? null,
    });
  }
}

export async function syncVillageHouseholds(
  village: VillageLike,
  userReference?: number | string | null,
) {
  const syncKey = getHouseholdSyncKey(village.id, userReference);
  const villageUuid = village.uuid ?? village.reference;
  let endCursor: string | null = null;
  let syncedCount = 0;
  const progressOptions = {
    module: "households",
    locationId: String(village.id),
    userId: userReference ? String(userReference) : null,
  };
  const publishProgress = createSyncProgressPublisher(syncKey, progressOptions);

  if (!villageUuid) {
    throw new Error("Selected village is missing its remote UUID.");
  }

  try {
    await ensureVillageScopedSyncMetadata(village.id, userReference);
    await waitForCollection(syncMetadataCollection);
    await waitForCollection(householdsCollection);

    const metadata = syncMetadataCollection.get(syncKey);
    endCursor = metadata?.cursor ?? null;
    syncedCount = metadata?.syncedCount ?? 0;
    await publishProgress(endCursor, syncedCount, { force: true });

    let hasNextPage = true;

    while (hasNextPage) {
      const response = await graphqlClient.request<GraphQlResponse>(GET_LOCATION_GROUPS, {
        after: endCursor,
        first: PAGE_SIZE,
        villageId: villageUuid,
      });

      if (!response?.group?.pageInfo) {
        throw new Error("Invalid households response from the server.");
      }

      for (const edge of response.group.edges ?? []) {
        const node = edge?.node;
        if (!node?.id || !node.uuid) continue;

        const headName = [node.head?.firstName, node.head?.lastName]
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(" ")
          .trim();
        const resolvedHeadName = headName || "Unnamed household";
        const representativeName = getHouseholdRepresentativeName(node.jsonExt, resolvedHeadName);
        const timestamp = new Date().toISOString();
        const existing = householdsCollection.get(node.uuid);

        await upsertRemoteRecord(householdsCollection, {
          id: node.uuid,
          headName: resolvedHeadName,
          representativeName,
          groupCode: node.code ?? node.uuid,
          address: existing?.address ?? null,
          caseStatus: node.isDeleted ? "inactive" : "active",
          deactivationReason: existing?.deactivationReason ?? null,
          deactivatedAt: existing?.deactivatedAt ?? null,
          villageId: String(village.id),
          uuid: node.uuid,
          reference: node.id,
          synchronizedAt: timestamp,
          createdAt: node.dateCreated ?? timestamp,
          updatedAt: node.dateUpdated ?? timestamp,
          deletedAt: node.isDeleted ? timestamp : null,
        });

        await upsertHouseholdRelatedRows(node);
        syncedCount += 1;
        await publishProgress(endCursor, syncedCount);
      }

      hasNextPage = response.group.pageInfo.hasNextPage;
      endCursor = response.group.pageInfo.endCursor ?? null;

      await publishProgress(endCursor, syncedCount, { force: true });
    }

    await publishProgress(null, syncedCount, { force: true, status: "completed" });
  } catch (error) {
    await publishProgress(endCursor, syncedCount, {
      error: getGraphQLErrorMessage(error, "Households sync failed."),
      force: true,
      status: "error",
    });
    throw error;
  }
}
