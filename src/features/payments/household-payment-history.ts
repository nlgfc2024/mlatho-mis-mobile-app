import type { AccessProfile, AccessRole } from "@/src/features/access-profile/api";

import { accessRoleHasRight } from "../access-profile/permissions.ts";
import { isImisAdministratorRole } from "../access-profile/roles.ts";

export const PAYMENT_FOLLOW_UP_PERMISSION = 180003;

export type HouseholdPaymentTransaction = {
  id?: string | null;
  uuid?: string | null;
  householdUuid?: string | null;
  transactionReference?: string | null;
  amount?: number | null;
  paymentWindow?: string | null;
  paymentWindowStart?: string | null;
  paymentWindowEnd?: string | null;
  paidAt?: string | null;
  status?: string | null;
  provider?: string | null;
  paymentPhoneNumber?: string | null;
  registeredPaymentName?: string | null;
  recipientName?: string | null;
  paymentChannel?: string | null;
  failureReason?: string | null;
  reversalStatus?: string | null;
  reversalReference?: string | null;
  processingDate?: string | null;
  lastStatusUpdate?: string | null;
  synchronizedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type PaymentHistoryFilters = {
  dateFrom: string | null;
  dateTo: string | null;
  status: string | null;
  paymentCycle: string | null;
  provider: string | null;
  phoneNumber: string;
};

export const emptyPaymentHistoryFilters: PaymentHistoryFilters = {
  dateFrom: null,
  dateTo: null,
  status: null,
  paymentCycle: null,
  provider: null,
  phoneNumber: "",
};

export function normalizePaymentPhoneNumber(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.startsWith("255")) return digits.slice(3);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function isPreviousPaymentNumber(
  transactionPhoneNumber: string | null | undefined,
  activePhoneNumber: string | null | undefined,
) {
  const transactionNumber = normalizePaymentPhoneNumber(transactionPhoneNumber);
  const activeNumber = normalizePaymentPhoneNumber(activePhoneNumber);

  return Boolean(transactionNumber && activeNumber && transactionNumber !== activeNumber);
}

function paymentTimestamp(payment: HouseholdPaymentTransaction) {
  if (!payment.paidAt) return null;
  const timestamp = new Date(payment.paidAt).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function applyPaymentHistoryFilters(
  payments: HouseholdPaymentTransaction[],
  filters: PaymentHistoryFilters,
) {
  const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00.000`).getTime() : null;
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).getTime() : null;
  const phoneQuery = normalizePaymentPhoneNumber(filters.phoneNumber);

  return payments.filter((payment) => {
    const paidAt = paymentTimestamp(payment);

    if (from !== null && (paidAt === null || paidAt < from)) return false;
    if (to !== null && (paidAt === null || paidAt > to)) return false;
    if (filters.status && payment.status !== filters.status) return false;
    if (filters.paymentCycle && payment.paymentWindow !== filters.paymentCycle) return false;
    if (filters.provider && payment.provider !== filters.provider) return false;
    if (
      phoneQuery &&
      !normalizePaymentPhoneNumber(payment.paymentPhoneNumber).includes(phoneQuery)
    ) {
      return false;
    }

    return true;
  });
}

export function paymentHistoryFilterCount(filters: PaymentHistoryFilters) {
  return [
    filters.dateFrom,
    filters.dateTo,
    filters.status,
    filters.paymentCycle,
    filters.provider,
    filters.phoneNumber.trim() || null,
  ].filter(Boolean).length;
}

export type PaymentFollowUpPayload = {
  transactionUuid: string;
  transactionReference: string | null;
  status: string;
  remarks: string;
  createdAt: string;
  createdBy: {
    id: string;
    reference: string | null;
    username: string | null;
    name: string | null;
    roleId: string;
    roleName: string | null;
  };
};

export function parsePaymentFollowUpPayload(
  value: string | null | undefined,
): PaymentFollowUpPayload | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<PaymentFollowUpPayload>;
    if (
      typeof parsed.transactionUuid !== "string" ||
      typeof parsed.remarks !== "string" ||
      typeof parsed.createdAt !== "string"
    ) {
      return null;
    }

    return {
      transactionUuid: parsed.transactionUuid,
      transactionReference:
        typeof parsed.transactionReference === "string" ? parsed.transactionReference : null,
      status: typeof parsed.status === "string" ? parsed.status : "in_progress",
      remarks: parsed.remarks,
      createdAt: parsed.createdAt,
      createdBy: {
        id: parsed.createdBy?.id ?? "",
        reference: parsed.createdBy?.reference ?? null,
        username: parsed.createdBy?.username ?? null,
        name: parsed.createdBy?.name ?? null,
        roleId: parsed.createdBy?.roleId ?? "",
        roleName: parsed.createdBy?.roleName ?? null,
      },
    };
  } catch {
    return null;
  }
}

export function canAddPaymentFollowUp({
  accessProfile,
  activeRole,
}: {
  accessProfile: AccessProfile | null | undefined;
  activeRole: AccessRole | null | undefined;
}) {
  if (!accessProfile || !activeRole || activeRole.isBlocked) return false;

  const roleIsAssigned = accessProfile.user?.iUser?.roles?.some(
    (role) => role?.id === activeRole.id && !role.isBlocked,
  );
  if (!roleIsAssigned) return false;

  return (
    isImisAdministratorRole(activeRole) ||
    accessRoleHasRight(activeRole, PAYMENT_FOLLOW_UP_PERMISSION)
  );
}
