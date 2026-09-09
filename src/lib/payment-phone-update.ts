export const MNO_PAYMENT_NUMBER_CHANGE_REASONS = [
  "SIM card lost",
  "SIM card blocked or inactive",
  "Incorrect number previously registered",
  "Change of payment recipient",
  "Mobile network change",
  "Registered owner deceased",
  "Fraud or security concern",
  "Other",
] as const;

export const BANK_PAYMENT_ACCOUNT_CHANGE_REASONS = [
  "Bank account closed or inactive",
  "Incorrect account number previously registered",
  "Change of payment recipient",
  "Bank or provider change",
  "Registered owner deceased",
  "Fraud or security concern",
  "Other",
] as const;

export type PaymentAccountChangeReason =
  | (typeof MNO_PAYMENT_NUMBER_CHANGE_REASONS)[number]
  | (typeof BANK_PAYMENT_ACCOUNT_CHANGE_REASONS)[number];

export type MnoPaymentNumberChangeReason = (typeof MNO_PAYMENT_NUMBER_CHANGE_REASONS)[number];

export function shouldShowPaymentPhoneUpdateLink(needsPaymentDataUpdate: boolean) {
  return needsPaymentDataUpdate;
}

export function resolveRegisteredPaymentName({
  currentAccountName,
  routeAccountName,
  hasRoutePaymentRegistration,
  householdHeadName,
}: {
  currentAccountName?: string | null;
  routeAccountName?: string | null;
  hasRoutePaymentRegistration: boolean;
  householdHeadName?: string | null;
}) {
  return (
    currentAccountName?.trim() ||
    (hasRoutePaymentRegistration ? routeAccountName?.trim() : "") ||
    householdHeadName?.trim() ||
    ""
  );
}

export function isMnoPaymentNumberChange({
  initialAccountType,
  initialAccountNumber,
  nextAccountNumber,
}: {
  initialAccountType: "MNO" | "BANK";
  initialAccountNumber: string;
  nextAccountNumber: string;
}) {
  const previousNumber = initialAccountNumber.trim();

  return (
    initialAccountType === "MNO" &&
    previousNumber.length > 0 &&
    previousNumber !== nextAccountNumber.trim()
  );
}

export function isPaymentAccountIdentifierChange({
  initialAccountType,
  initialProvider,
  initialAccountNumber,
  nextAccountType,
  nextProvider,
  nextAccountNumber,
}: {
  initialAccountType: "MNO" | "BANK";
  initialProvider: string;
  initialAccountNumber: string;
  nextAccountType: "MNO" | "BANK";
  nextProvider: string;
  nextAccountNumber: string;
}) {
  const previousNumber = initialAccountNumber.trim();

  if (!previousNumber) return false;

  return (
    initialAccountType !== nextAccountType ||
    initialProvider.trim() !== nextProvider.trim() ||
    previousNumber !== nextAccountNumber.trim()
  );
}

export function getPaymentAccountChangeReasons(accountType: "MNO" | "BANK") {
  return accountType === "MNO"
    ? MNO_PAYMENT_NUMBER_CHANGE_REASONS
    : BANK_PAYMENT_ACCOUNT_CHANGE_REASONS;
}

export type PaymentNumberAuditActor = {
  id: string;
  reference: string | null;
  username: string | null;
  name: string | null;
};

export function buildPaymentNumberChangeAuditPayload({
  previous,
  next,
  reason,
  remarks,
  changedAt,
  changedBy,
  paymentCount,
}: {
  previous: {
    provider: string;
    accountNumber: string;
    registeredName: string;
  };
  next: {
    provider: string;
    accountNumber: string;
    registeredName: string;
  };
  reason: PaymentAccountChangeReason;
  remarks?: string | null;
  changedAt: string;
  changedBy: PaymentNumberAuditActor;
  paymentCount: number;
}) {
  const previousNumber = previous.accountNumber.trim();
  const newNumber = next.accountNumber.trim();

  return {
    previousNumber,
    newNumber,
    reason,
    remarks: remarks?.trim() || null,
    changedAt,
    changedBy,
    previous: {
      ...previous,
      accountNumber: previousNumber,
    },
    new: {
      ...next,
      accountNumber: newNumber,
    },
    paymentHistory: {
      count: paymentCount,
      preserved: true,
    },
  };
}
