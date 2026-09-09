// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPaymentNumberChangeAuditPayload,
  getPaymentAccountChangeReasons,
  isMnoPaymentNumberChange,
  isPaymentAccountIdentifierChange,
  resolveRegisteredPaymentName,
  shouldShowPaymentPhoneUpdateLink,
} from "../src/lib/payment-phone-update.ts";

test("shows the separate phone-update link only when a phone update is required", () => {
  assert.equal(shouldShowPaymentPhoneUpdateLink(true), true);
  assert.equal(shouldShowPaymentPhoneUpdateLink(false), false);
});

test("detects a change to an existing MNO payment number", () => {
  assert.equal(
    isMnoPaymentNumberChange({
      initialAccountType: "MNO",
      initialAccountNumber: "0755123456",
      nextAccountNumber: "0755987654",
    }),
    true,
  );
});

test("does not treat a bank account, new registration, or unchanged number as an MNO change", () => {
  assert.equal(
    isMnoPaymentNumberChange({
      initialAccountType: "BANK",
      initialAccountNumber: "0123456789",
      nextAccountNumber: "9876543210",
    }),
    false,
  );
  assert.equal(
    isMnoPaymentNumberChange({
      initialAccountType: "MNO",
      initialAccountNumber: "",
      nextAccountNumber: "0755987654",
    }),
    false,
  );
  assert.equal(
    isMnoPaymentNumberChange({
      initialAccountType: "MNO",
      initialAccountNumber: " 0755123456 ",
      nextAccountNumber: "0755123456",
    }),
    false,
  );
});

test("detects identifier changes for both MNO and bank accounts", () => {
  assert.equal(
    isPaymentAccountIdentifierChange({
      initialAccountType: "MNO",
      initialProvider: "M-PESA",
      initialAccountNumber: "0755123456",
      nextAccountType: "MNO",
      nextProvider: "Airtel Money",
      nextAccountNumber: "0785123456",
    }),
    true,
  );
  assert.equal(
    isPaymentAccountIdentifierChange({
      initialAccountType: "BANK",
      initialProvider: "CRDB",
      initialAccountNumber: "0123456789",
      nextAccountType: "BANK",
      nextProvider: "NMB",
      nextAccountNumber: "9876543210",
    }),
    true,
  );
  assert.equal(
    isPaymentAccountIdentifierChange({
      initialAccountType: "BANK",
      initialProvider: "CRDB",
      initialAccountNumber: "0123456789",
      nextAccountType: "BANK",
      nextProvider: "CRDB",
      nextAccountNumber: "0123456789",
    }),
    false,
  );
});

test("returns account-type-specific suggested reasons", () => {
  assert.equal(getPaymentAccountChangeReasons("MNO")[0], "SIM card lost");
  assert.equal(
    getPaymentAccountChangeReasons("BANK")[0],
    "Bank account closed or inactive",
  );
  assert.equal(getPaymentAccountChangeReasons("MNO").at(-1), "Other");
  assert.equal(getPaymentAccountChangeReasons("BANK").at(-1), "Other");
});

test("uses the household head as the default registered payment name", () => {
  assert.equal(
    resolveRegisteredPaymentName({
      currentAccountName: null,
      routeAccountName: "Account name",
      hasRoutePaymentRegistration: false,
      householdHeadName: " Asha Juma ",
    }),
    "Asha Juma",
  );
});

test("preserves an existing registered payment name instead of the household head", () => {
  assert.equal(
    resolveRegisteredPaymentName({
      currentAccountName: " Payment Recipient ",
      routeAccountName: null,
      hasRoutePaymentRegistration: true,
      householdHeadName: "Household Head",
    }),
    "Payment Recipient",
  );
});

test("builds a complete audit record and marks payment history as preserved", () => {
  const payload = buildPaymentNumberChangeAuditPayload({
    previous: {
      provider: "M-PESA",
      accountNumber: "0755123456",
      registeredName: "Asha Juma",
    },
    next: {
      provider: "Airtel Money",
      accountNumber: " 0785123456 ",
      registeredName: "Asha Juma",
    },
    reason: "Mobile network change",
    remarks: "Recipient retained ownership.",
    changedAt: "2026-07-23T10:30:00.000Z",
    changedBy: {
      id: "user-1",
      reference: "ref-1",
      username: "field.officer",
      name: "Field Officer",
    },
    paymentCount: 3,
  });

  assert.deepEqual(
    {
      previousNumber: payload.previousNumber,
      newNumber: payload.newNumber,
      reason: payload.reason,
      remarks: payload.remarks,
      changedAt: payload.changedAt,
      changedBy: payload.changedBy,
      paymentHistory: payload.paymentHistory,
    },
    {
      previousNumber: "0755123456",
      newNumber: "0785123456",
      reason: "Mobile network change",
      remarks: "Recipient retained ownership.",
      changedAt: "2026-07-23T10:30:00.000Z",
      changedBy: {
        id: "user-1",
        reference: "ref-1",
        username: "field.officer",
        name: "Field Officer",
      },
      paymentHistory: { count: 3, preserved: true },
    },
  );
});
