const MOBILE_MONEY_PROVIDER_MARKERS = [
  "m-pesa",
  "mpesa",
  "vodacom",
  "mixx",
  "tigo pesa",
  "yas",
  "airtel money",
  "halopesa",
  "halo pesa",
  "halotel",
  "t-pesa",
  "tpesa",
  "ttcl",
  "mobile money",
  "mobile_money",
];

const PLACEHOLDER_FLAG_RATE = 0.3;
const MINIMUM_PLACEHOLDER_FLAGS = 3;

export function isMobileMoneyProvider(provider: string | null | undefined) {
  const normalized = provider?.trim().toLowerCase() ?? "";
  return MOBILE_MONEY_PROVIDER_MARKERS.some((marker) => normalized.includes(marker));
}

export function isMobilePhoneNumber(accountNumber: string | null | undefined) {
  const digits = accountNumber?.replace(/\D/g, "") ?? "";
  return /^(?:255|0)?[67]\d{8}$/.test(digits);
}

export function isMobileMoneyAccount({
  accountProvider,
  accountNumber,
}: {
  accountProvider: string | null | undefined;
  accountNumber: string | null | undefined;
}) {
  return isMobileMoneyProvider(accountProvider) || isMobilePhoneNumber(accountNumber);
}

function placeholderRandomValue(seed: string) {
  // Keep placeholder flags stable between renders while distributing them like random values.
  let hash = 2_166_136_261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0) / 4_294_967_296;
}

export function needsPaymentDataUpdate({
  accountProvider,
  accountNumber,
  seed,
}: {
  accountProvider: string | null | undefined;
  accountNumber?: string | null | undefined;
  seed: string;
}) {
  return (
    isMobileMoneyAccount({ accountProvider, accountNumber }) &&
    placeholderRandomValue(seed) < PLACEHOLDER_FLAG_RATE
  );
}

type PlaceholderCandidate = {
  id: string;
  accountProvider: string | null | undefined;
  accountNumber: string | null | undefined;
  seed: string;
  allowSynthetic?: boolean;
};

export function getPlaceholderPaymentDataUpdateIds(candidates: PlaceholderCandidate[]) {
  const mobileCandidates = candidates.filter((candidate) => isMobileMoneyAccount(candidate));
  const syntheticCandidates = candidates.filter(
    (candidate) => candidate.allowSynthetic && !isMobileMoneyAccount(candidate),
  );
  const eligibleCandidates = [...mobileCandidates, ...syntheticCandidates];
  const selectedIds = new Set(
    mobileCandidates
      .filter((candidate) => needsPaymentDataUpdate(candidate))
      .map((candidate) => candidate.id),
  );
  const minimumCount = Math.min(MINIMUM_PLACEHOLDER_FLAGS, eligibleCandidates.length);

  if (selectedIds.size < minimumCount) {
    const fallbackCandidates = [...eligibleCandidates].sort(
      (first, second) => placeholderRandomValue(first.seed) - placeholderRandomValue(second.seed),
    );

    for (const candidate of fallbackCandidates) {
      selectedIds.add(candidate.id);
      if (selectedIds.size >= minimumCount) break;
    }
  }

  return selectedIds;
}

export function getPlaceholderMobileNumber(seed: string) {
  const subscriberNumber = Math.floor(placeholderRandomValue(seed) * 10_000_000)
    .toString()
    .padStart(7, "0");

  return `071${subscriberNumber}`;
}
