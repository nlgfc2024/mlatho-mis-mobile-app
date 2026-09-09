import type { TFunction } from "i18next";

export function getDateLocale(language?: string) {
  return language?.startsWith("sw") ? "sw-TZ" : "en-US";
}

export function translateStatus(t: TFunction, status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase();

  switch (normalized) {
    case "all":
      return t("all");
    case "active":
      return t("active");
    case "inactive":
      return t("inactive");
    case "pending":
      return t("pending");
    case "synchronized":
      return t("synchronized");
    case "resolved":
      return t("resolved");
    case "received":
      return t("received");
    case "open":
    case "opened":
      return t("open");
    case "in progress":
    case "in_progress":
      return t("in_progress");
    case "closed":
      return t("closed");
    case "present":
      return t("present");
    case "absent":
      return t("absent");
    default:
      return status ?? t("unknown");
  }
}

export function translateTheme(t: TFunction, theme: string) {
  switch (theme) {
    case "light":
      return t("theme_light");
    case "dark":
      return t("theme_dark");
    case "system":
      return t("theme_system");
    default:
      return theme;
  }
}

export function translateDeactivationReason(t: TFunction, reason: string) {
  switch (reason) {
    case "Moved out of household":
      return t("reason_moved_out_of_household");
    case "Deceased":
      return t("reason_deceased");
    case "Duplicate member record":
      return t("reason_duplicate_member_record");
    case "No longer eligible":
      return t("reason_no_longer_eligible");
    case "Incorrectly added to household":
      return t("reason_incorrectly_added_to_household");
    case "Requested removal":
      return t("reason_requested_removal");
    case "PMT status changed to non-poor":
      return t("reason_pmt_status_changed_non_poor");
    case "Moved out of program area":
      return t("reason_moved_out_of_program_area");
    case "Duplicate household record":
      return t("reason_duplicate_household_record");
    case "Household dissolved":
      return t("reason_household_dissolved");
    case "Incorrectly added to program":
      return t("reason_incorrectly_added_to_program");
    default:
      return reason;
  }
}

export function translatePaymentNumberChangeReason(t: TFunction, reason: string) {
  switch (reason) {
    case "SIM card lost":
      return t("reason_sim_card_lost");
    case "SIM card blocked or inactive":
      return t("reason_sim_card_blocked_or_inactive");
    case "Incorrect number previously registered":
      return t("reason_incorrect_number_previously_registered");
    case "Change of payment recipient":
      return t("reason_change_of_payment_recipient");
    case "Mobile network change":
      return t("reason_mobile_network_change");
    case "Registered owner deceased":
      return t("reason_registered_owner_deceased");
    case "Fraud or security concern":
      return t("reason_fraud_or_security_concern");
    case "Bank account closed or inactive":
      return t("reason_bank_account_closed_or_inactive");
    case "Incorrect account number previously registered":
      return t("reason_incorrect_account_number_previously_registered");
    case "Bank or provider change":
      return t("reason_bank_or_provider_change");
    case "Other":
      return t("other");
    default:
      return reason;
  }
}

export function translateHouseholdChangeTitle(t: TFunction, type: string) {
  switch (type) {
    case "household_details_update":
      return t("household_details_updated");
    case "household_address_change":
      return t("household_address_changed");
    case "household_deactivated":
      return t("household_deactivated");
    case "payment_phone_updated":
      return t("payment_phone_updated");
    case "member_added":
      return t("household_member_added");
    case "member_updated":
      return t("household_member_updated");
    case "member_deactivated":
      return t("household_member_deactivated");
    default:
      return type;
  }
}
