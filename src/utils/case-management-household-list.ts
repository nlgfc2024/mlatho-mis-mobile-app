export type HouseholdPaymentFilter =
  | "all"
  | "with-payment-details"
  | "without-payment-details"
  | "phone-update-required";

export type HouseholdMemberSort = "default" | "member-count-asc" | "member-count-desc";

export type HouseholdListOptions = {
  paymentFilter: HouseholdPaymentFilter;
  memberSort: HouseholdMemberSort;
};

export const DEFAULT_HOUSEHOLD_LIST_OPTIONS: HouseholdListOptions = {
  paymentFilter: "all",
  memberSort: "default",
};

type FilterableHousehold = {
  groupCode: string | null;
  headName: string | null;
  representativeName: string | null;
  address: string | null;
  accountNumber: string;
  hasPaymentDetails: boolean;
  needsPaymentDataUpdate: boolean;
  memberCount: number;
};

export function filterAndSortHouseholds<T extends FilterableHousehold>(
  households: T[],
  search: string,
  options: HouseholdListOptions,
) {
  const term = search.trim().toLowerCase();
  const matchingHouseholds = households.filter((household) => {
    if (options.paymentFilter === "with-payment-details" && !household.hasPaymentDetails) {
      return false;
    }
    if (options.paymentFilter === "without-payment-details" && household.hasPaymentDetails) {
      return false;
    }
    if (options.paymentFilter === "phone-update-required" && !household.needsPaymentDataUpdate) {
      return false;
    }

    const searchableValues = [
      household.groupCode,
      household.headName,
      household.representativeName,
      household.address,
      household.accountNumber,
    ];

    return searchableValues.some((value) => value?.toLowerCase().includes(term));
  });

  if (options.memberSort === "default") return matchingHouseholds;

  const direction = options.memberSort === "member-count-asc" ? 1 : -1;
  return [...matchingHouseholds].sort((first, second) => {
    const memberCountDifference = (first.memberCount - second.memberCount) * direction;
    if (memberCountDifference !== 0) return memberCountDifference;

    return (first.headName ?? "").localeCompare(second.headName ?? "", undefined, {
      sensitivity: "base",
    });
  });
}
