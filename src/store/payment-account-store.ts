export function extractPaymentDetails(jsonString: string | null | undefined) {
  if (!jsonString) return null;

  try {
    const data = JSON.parse(jsonString);

    if (data && data.payment_account) {
      const { uuid, household_id, account_number, account_provider, account_name } =
        data.payment_account;

      return {
        uuid: uuid ?? null,
        houseHoldId: household_id ?? null,
        accountNumber: account_number ?? null,
        accountProvider: account_provider ?? null,
        accountName: account_name ?? null,
      };
    }
  } catch (error) {
    console.error("Failed to parse payment_account JSON:", error);
  }

  return null;
}
