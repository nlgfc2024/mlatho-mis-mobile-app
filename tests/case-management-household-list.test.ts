// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  filterAndSortHouseholds,
  type HouseholdListOptions,
} from "../src/utils/case-management-household-list.ts";

const households = [
  {
    id: "with-payment",
    groupCode: "HH-001",
    headName: "Asha",
    representativeName: "Asha",
    address: "Dodoma",
    accountNumber: "0712345678",
    hasPaymentDetails: true,
    needsPaymentDataUpdate: false,
    memberCount: 5,
  },
  {
    id: "without-payment",
    groupCode: "HH-002",
    headName: "Baraka",
    representativeName: "Baraka",
    address: "Morogoro",
    accountNumber: "Account number",
    hasPaymentDetails: false,
    needsPaymentDataUpdate: false,
    memberCount: 2,
  },
  {
    id: "phone-update",
    groupCode: "HH-003",
    headName: "Neema",
    representativeName: "Neema",
    address: "Arusha",
    accountNumber: "0755000000",
    hasPaymentDetails: true,
    needsPaymentDataUpdate: true,
    memberCount: 5,
  },
];

function options(
  paymentFilter: HouseholdListOptions["paymentFilter"],
  memberSort: HouseholdListOptions["memberSort"] = "default",
): HouseholdListOptions {
  return { paymentFilter, memberSort };
}

test("filters households by whether payment details exist", () => {
  assert.deepEqual(
    filterAndSortHouseholds(households, "", options("with-payment-details")).map(
      (household) => household.id,
    ),
    ["with-payment", "phone-update"],
  );
  assert.deepEqual(
    filterAndSortHouseholds(households, "", options("without-payment-details")).map(
      (household) => household.id,
    ),
    ["without-payment"],
  );
});

test("keeps the phone-update filter and combines filtering with search", () => {
  assert.deepEqual(
    filterAndSortHouseholds(households, "neema", options("phone-update-required")).map(
      (household) => household.id,
    ),
    ["phone-update"],
  );
});

test("sorts by member count in both directions with name as the tie breaker", () => {
  assert.deepEqual(
    filterAndSortHouseholds(households, "", options("all", "member-count-asc")).map(
      (household) => household.id,
    ),
    ["without-payment", "with-payment", "phone-update"],
  );
  assert.deepEqual(
    filterAndSortHouseholds(households, "", options("all", "member-count-desc")).map(
      (household) => household.id,
    ),
    ["with-payment", "phone-update", "without-payment"],
  );
});
