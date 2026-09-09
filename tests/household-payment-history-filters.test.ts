// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPaymentHistoryFilters,
  canAddPaymentFollowUp,
  emptyPaymentHistoryFilters,
  isPreviousPaymentNumber,
  parsePaymentFollowUpPayload,
  paymentHistoryFilterCount,
} from "../src/features/payments/household-payment-history.ts";

const payments = [
  {
    uuid: "payment-1",
    paymentWindow: "May - June 2026",
    paidAt: "2026-06-27T09:14:00.000Z",
    status: "received",
    provider: "M-Pesa",
    paymentPhoneNumber: "0712 345 678",
  },
  {
    uuid: "payment-2",
    paymentWindow: "March - April 2026",
    paidAt: "2026-04-29T10:38:00.000Z",
    status: "rejected",
    provider: "Airtel Money",
    paymentPhoneNumber: "+255 684 220 144",
  },
];

test("filters payment history by every supported transaction field", () => {
  assert.deepEqual(
    applyPaymentHistoryFilters(payments, {
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
      status: "rejected",
      paymentCycle: "March - April 2026",
      provider: "Airtel Money",
      phoneNumber: "684220",
    }).map((payment) => payment.uuid),
    ["payment-2"],
  );
});

test("counts active filters and resets to the complete history", () => {
  assert.equal(
    paymentHistoryFilterCount({
      ...emptyPaymentHistoryFilters,
      status: "received",
      phoneNumber: "0712",
    }),
    2,
  );
  assert.equal(applyPaymentHistoryFilters(payments, emptyPaymentHistoryFilters).length, 2);
});

test("identifies a transaction made to a previously active payment number", () => {
  assert.equal(isPreviousPaymentNumber("+255 684 220 144", "0684 220 144"), false);
  assert.equal(isPreviousPaymentNumber("0684 220 144", "0712 345 678"), true);
});

test("parses append-only follow-up payloads and rejects incomplete payloads", () => {
  const payload = parsePaymentFollowUpPayload(
    JSON.stringify({
      transactionUuid: "payment-1",
      transactionReference: "TX-001",
      status: "in_progress",
      remarks: "Provider contacted.",
      createdAt: "2026-07-23T09:00:00.000Z",
      createdBy: { id: "user-1", roleId: "role-1" },
    }),
  );

  assert.equal(payload?.remarks, "Provider contacted.");
  assert.equal(
    parsePaymentFollowUpPayload(JSON.stringify({ remarks: "Missing transaction" })),
    null,
  );
});

test("grants follow-up access only when the assigned role owns the payment permission", () => {
  const role = {
    id: "role-1",
    uuid: "uuid-1",
    isSystem: 0,
    isBlocked: false,
    rights: { edges: [{ node: { rightId: 180003 } }] },
  };
  const accessProfile = {
    user: { iUser: { roles: [role] } },
    myModulesPermissions: {
      modulePermsList: [
        {
          moduleName: "Individual",
          permissions: [{ permsName: "Update", permsValue: 180003 }],
        },
      ],
    },
  };

  assert.equal(canAddPaymentFollowUp({ accessProfile, activeRole: role }), true);
  assert.equal(
    canAddPaymentFollowUp({
      accessProfile,
      activeRole: { ...role, id: "unassigned-role" },
    }),
    false,
  );
  assert.equal(
    canAddPaymentFollowUp({
      accessProfile,
      activeRole: { ...role, rights: { edges: [] } },
    }),
    false,
  );

  const administratorRole = {
    ...role,
    name: "IMIS Administrator",
    isSystem: 64,
    rights: { edges: [] },
  };
  assert.equal(
    canAddPaymentFollowUp({
      accessProfile: { user: { iUser: { roles: [administratorRole] } } },
      activeRole: administratorRole,
    }),
    true,
  );
});
