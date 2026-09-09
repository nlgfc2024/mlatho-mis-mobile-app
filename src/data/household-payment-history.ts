import type { HouseholdPaymentTransaction } from "@/src/features/payments/household-payment-history";

export type HouseholdPaymentHistoryDisplay = HouseholdPaymentTransaction & {
  uuid: string;
  amount: number;
  paymentWindow: string;
  paidAt: string;
  status: string;
};

const PLACEHOLDER_PAYMENT_HISTORY = [
  {
    key: "2026-may-june",
    amount: 90_000,
    paymentWindow: "May - June 2026",
    paymentWindowStart: "2026-05-01",
    paymentWindowEnd: "2026-06-30",
    paidAt: "2026-06-27T09:14:00.000Z",
    status: "received",
    transactionReference: "MP2606270914001",
    provider: "M-Pesa",
    paymentPhoneNumber: "0712 345 678",
    registeredPaymentName: "Asha Juma",
    recipientName: "Asha Juma",
    paymentChannel: "Mobile money",
    failureReason: null,
    reversalStatus: "Not reversed",
    reversalReference: null,
    processingDate: "2026-06-27T09:12:00.000Z",
    lastStatusUpdate: "2026-06-27T09:15:00.000Z",
  },
  {
    key: "2026-march-april",
    amount: 80_000,
    paymentWindow: "March - April 2026",
    paymentWindowStart: "2026-03-01",
    paymentWindowEnd: "2026-04-30",
    paidAt: "2026-04-29T10:38:00.000Z",
    status: "received",
    transactionReference: "AM2604291038007",
    provider: "Airtel Money",
    paymentPhoneNumber: "0684 220 144",
    registeredPaymentName: "Asha Juma",
    recipientName: "Asha Juma",
    paymentChannel: "Mobile money",
    failureReason: null,
    reversalStatus: "Not reversed",
    reversalReference: null,
    processingDate: "2026-04-29T10:35:00.000Z",
    lastStatusUpdate: "2026-04-29T10:39:00.000Z",
  },
  {
    key: "2026-january-february",
    amount: 70_000,
    paymentWindow: "January - February 2026",
    paymentWindowStart: "2026-01-01",
    paymentWindowEnd: "2026-02-28",
    paidAt: "2026-02-27T08:05:00.000Z",
    status: "rejected",
    transactionReference: "AM2602270805012",
    provider: "Airtel Money",
    paymentPhoneNumber: "0684 220 144",
    registeredPaymentName: "Asha Juma",
    recipientName: "Asha Juma",
    paymentChannel: "Mobile money",
    failureReason: "Recipient number was inactive",
    reversalStatus: "Not applicable",
    reversalReference: null,
    processingDate: "2026-02-27T08:03:00.000Z",
    lastStatusUpdate: "2026-02-27T08:06:00.000Z",
  },
] as const;

/**
 * Temporary household payment data for the detail screen.
 * Replace this fallback with payment API results when that integration is available.
 */
export function getPlaceholderHouseholdPaymentHistory(
  householdUuid: string,
): HouseholdPaymentHistoryDisplay[] {
  const householdKey = householdUuid || "unknown-household";

  return PLACEHOLDER_PAYMENT_HISTORY.map(({ key, ...payment }) => ({
    ...payment,
    uuid: `placeholder-${householdKey}-${key}`,
  }));
}
