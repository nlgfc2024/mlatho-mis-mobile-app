// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import { getPlaceholderHouseholdPaymentHistory } from "../src/data/household-payment-history.ts";

test("creates stable placeholder payment history for a household", () => {
  const firstResult = getPlaceholderHouseholdPaymentHistory("household-123");
  const secondResult = getPlaceholderHouseholdPaymentHistory("household-123");

  assert.deepEqual(firstResult, secondResult);
  assert.equal(firstResult.length, 3);
  assert.ok(firstResult.every((payment) => payment.uuid.includes("household-123")));
});

test("keeps placeholder payment row identities unique per household", () => {
  const firstHousehold = getPlaceholderHouseholdPaymentHistory("household-123");
  const secondHousehold = getPlaceholderHouseholdPaymentHistory("household-456");

  assert.notEqual(firstHousehold[0].uuid, secondHousehold[0].uuid);
});

test("returns payment rows newest first with a non-zero total", () => {
  const payments = getPlaceholderHouseholdPaymentHistory("household-123");
  const paidAtTimes = payments.map((payment) => new Date(payment.paidAt).getTime());

  assert.deepEqual(
    paidAtTimes,
    [...paidAtTimes].sort((first, second) => second - first),
  );
  assert.equal(
    payments.reduce((total, payment) => total + payment.amount, 0),
    240_000,
  );
});
