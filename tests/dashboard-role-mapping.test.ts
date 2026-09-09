// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  dashboardRoleNamesMatch,
  getPrimaryDashboardTileForRole,
  getTemporaryDashboardForRole,
  normalizeDashboardRoleName,
  prioritizeDashboardTileIds,
} from "../src/components/dashboard/dashboard-role-mapping.ts";

test("assigns a temporary dashboard to every access-profile role", () => {
  const expectedAssignments = {
    "Enrolment Officer": "programme_operations",
    Manager: "executive_me",
    Accountant: "payment_monitoring",
    Clerk: "field_operations",
    "Medical Officer": "programme_operations",
    "Scheme Administrator": "programme_operations",
    "IMIS Administrator": "executive_me",
    Receptionist: "communication_feed",
    "Coordination Officer (maker)": "communication_feed",
    "Claim Administrator": "grm",
    "Claim Contributor": "grm",
    "Grievance Officer": "grm",
    "GRM Officer": "grm",
  };

  for (const [role, dashboard] of Object.entries(expectedAssignments)) {
    assert.equal(getTemporaryDashboardForRole(role), dashboard, role);
  }

  assert.equal(getTemporaryDashboardForRole("Enrollment Officer"), "programme_operations");
  assert.equal(getTemporaryDashboardForRole("Jukumu lililotafsiriwa", 4), "payment_monitoring");
  assert.equal(getTemporaryDashboardForRole(null, 64), "executive_me");
});

test("normalizes role whitespace and casing without broadening unrelated roles", () => {
  assert.equal(dashboardRoleNamesMatch("Accountant", "  ACCOUNTANT  "), true);
  assert.equal(dashboardRoleNamesMatch("Grievance Officer", "GRM Officer"), true);
  assert.equal(dashboardRoleNamesMatch("Payment Officer", "Enrolment Officer"), false);
  assert.equal(
    dashboardRoleNamesMatch("Coordination Officer (maker)", "Coordination Officer (checker)"),
    false,
  );
  assert.equal(normalizeDashboardRoleName("  Programme   Manager "), "programme manager");
});

test("puts each role's own module first while always keeping payments last", () => {
  const savedOrder = ["quick_information", "training", "communication", "coordination"];

  assert.deepEqual(
    prioritizeDashboardTileIds(savedOrder, "Communication Officer", "communication"),
    ["communication", "quick_information", "training", "coordination"],
  );
  assert.deepEqual(
    prioritizeDashboardTileIds(savedOrder, "Coordination Officer (maker)", "communication"),
    ["coordination", "quick_information", "training", "communication"],
  );
  assert.deepEqual(prioritizeDashboardTileIds(savedOrder, "Staff", "communication"), [
    "communication",
    "quick_information",
    "training",
    "coordination",
  ]);

  const savedOrderWithPayments = ["payments", "quick_information", "training", "communication"];
  assert.deepEqual(prioritizeDashboardTileIds(savedOrderWithPayments, "Accountant", "payments"), [
    "quick_information",
    "training",
    "communication",
    "payments",
  ]);
  assert.deepEqual(
    prioritizeDashboardTileIds(savedOrderWithPayments, "Communication Officer", "payments"),
    ["communication", "quick_information", "training", "payments"],
  );
});

test("recognizes primary modules for other operational roles", () => {
  assert.equal(getPrimaryDashboardTileForRole("Grievance Officer"), "grievance");
  assert.equal(getPrimaryDashboardTileForRole("Accountant"), "payments");
  assert.equal(getPrimaryDashboardTileForRole("Training Facilitator"), "training");
  assert.equal(getPrimaryDashboardTileForRole("Enrolment Officer"), "targeting");
  assert.equal(getPrimaryDashboardTileForRole("Programme Manager"), null);
});
