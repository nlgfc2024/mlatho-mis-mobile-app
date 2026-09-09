// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  getPlaceholderMobileNumber,
  getPlaceholderPaymentDataUpdateIds,
  isMobileMoneyAccount,
  isMobileMoneyProvider,
  needsPaymentDataUpdate,
} from "../src/lib/payment-data-update.ts";

test("recognizes supported mobile-money providers", () => {
  assert.equal(isMobileMoneyProvider("M-PESA"), true);
  assert.equal(isMobileMoneyProvider("VODACOM (M-PESA)"), true);
  assert.equal(isMobileMoneyProvider(" Airtel Money "), true);
  assert.equal(isMobileMoneyProvider("CRDB"), false);
});

test("recognizes a Tanzanian mobile number when the provider is unavailable", () => {
  assert.equal(
    isMobileMoneyAccount({ accountProvider: null, accountNumber: "0712 345 678" }),
    true,
  );
  assert.equal(
    isMobileMoneyAccount({ accountProvider: null, accountNumber: "123456789012" }),
    false,
  );
});

test("creates a stable placeholder flag for mobile-money accounts", () => {
  const firstResult = needsPaymentDataUpdate({ accountProvider: "MIXX", seed: "household-6" });
  const secondResult = needsPaymentDataUpdate({ accountProvider: "MIXX", seed: "household-6" });

  assert.equal(firstResult, secondResult);
});

test("distributes placeholder flags across mobile-money accounts", () => {
  const results = Array.from({ length: 100 }, (_, index) =>
    needsPaymentDataUpdate({ accountProvider: "M-PESA", seed: `household-${index}` }),
  );
  const flaggedCount = results.filter(Boolean).length;

  assert.ok(flaggedCount > 0);
  assert.ok(flaggedCount < results.length);
});

test("never applies the placeholder flag to bank accounts", () => {
  assert.equal(
    needsPaymentDataUpdate({
      accountProvider: "NMB",
      seed: "household-6",
    }),
    false,
  );
});

test("guarantees placeholder results for a small eligible household list", () => {
  const flaggedIds = getPlaceholderPaymentDataUpdateIds(
    Array.from({ length: 5 }, (_, index) => ({
      id: `household-${index}`,
      accountProvider: "VODACOM (M-PESA)",
      accountNumber: `071234567${index}`,
      seed: `seed-${index}`,
    })),
  );

  assert.ok(flaggedIds.size >= 3);
});

test("does not manufacture update flags for bank accounts", () => {
  const flaggedIds = getPlaceholderPaymentDataUpdateIds([
    {
      id: "bank-household",
      accountProvider: "NMB",
      accountNumber: "123456789012",
      seed: "bank-household",
    },
  ]);

  assert.equal(flaggedIds.size, 0);
});

test("creates placeholder entries when payment-account data is unavailable", () => {
  const flaggedIds = getPlaceholderPaymentDataUpdateIds(
    Array.from({ length: 5 }, (_, index) => ({
      id: `unconfigured-household-${index}`,
      accountProvider: null,
      accountNumber: null,
      seed: `unconfigured-seed-${index}`,
      allowSynthetic: true,
    })),
  );

  assert.equal(flaggedIds.size, 3);
});

test("generates a stable Tanzanian placeholder mobile number", () => {
  const firstNumber = getPlaceholderMobileNumber("household-without-account");
  const secondNumber = getPlaceholderMobileNumber("household-without-account");

  assert.equal(firstNumber, secondNumber);
  assert.match(firstNumber, /^071\d{7}$/);
});
