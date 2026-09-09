// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  canViewCoordinationActivity,
  coordinationActivities,
  countActiveCoordinationFilters,
  emptyCoordinationFilters,
  filterCoordinationActivities,
  getActivitiesForDate,
  getMonthGridDates,
  getVisibleCoordinationActivities,
  getWeekDates,
  shiftCalendarAnchor,
} from "../src/data/coordination.ts";

const unscopedUser = {
  userId: "user-1",
  roleName: "Clerk",
  department: null,
  regionId: null,
  districtId: null,
  wardId: null,
  villageId: null,
};

test("coordination seed data covers every required type, status, and detail field", () => {
  assert.deepEqual(
    new Set(coordinationActivities.map((activity) => activity.type)),
    new Set(["communication", "training", "departmental"]),
  );
  assert.deepEqual(
    new Set(coordinationActivities.map((activity) => activity.status)),
    new Set(["upcoming", "ongoing", "completed", "cancelled", "overdue"]),
  );

  for (const activity of coordinationActivities) {
    assert.ok(activity.title);
    assert.ok(activity.department);
    assert.match(activity.startDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(activity.startTime, /^\d{2}:\d{2}$/);
    assert.ok(activity.location);
    assert.ok(activity.responsiblePerson);
    assert.ok(activity.responsibleRole);
  }
});

test("role, department, responsibility, and location scopes are enforced", () => {
  const globalActivity = coordinationActivities.find((activity) => activity.id === "coord-001");
  const departmentActivity = coordinationActivities.find((activity) => activity.id === "coord-009");
  const roleActivity = coordinationActivities.find((activity) => activity.id === "coord-010");
  const locationActivity = coordinationActivities.find((activity) => activity.id === "coord-004");
  const assignedActivity = coordinationActivities.find((activity) => activity.id === "coord-014");

  assert.equal(canViewCoordinationActivity(globalActivity, unscopedUser), true);
  assert.equal(canViewCoordinationActivity(departmentActivity, unscopedUser), false);
  assert.equal(canViewCoordinationActivity(roleActivity, unscopedUser), false);
  assert.equal(canViewCoordinationActivity(locationActivity, unscopedUser), false);
  assert.equal(canViewCoordinationActivity(assignedActivity, unscopedUser), false);

  assert.equal(
    canViewCoordinationActivity(departmentActivity, {
      ...unscopedUser,
      department: "Monitoring and Evaluation",
    }),
    true,
  );
  assert.equal(
    canViewCoordinationActivity(roleActivity, { ...unscopedUser, roleName: "Manager" }),
    true,
  );
  assert.equal(
    canViewCoordinationActivity(locationActivity, {
      ...unscopedUser,
      regionId: "region-morogoro",
    }),
    true,
  );
  assert.equal(
    canViewCoordinationActivity(assignedActivity, {
      ...unscopedUser,
      userId: "demo-coordinator",
    }),
    true,
  );

  assert.equal(
    canViewCoordinationActivity(assignedActivity, {
      ...unscopedUser,
      roleName: "IMIS Administrator",
    }),
    true,
  );
});

test("visible activity workflow returns only permitted records in schedule order", () => {
  const visible = getVisibleCoordinationActivities(unscopedUser);
  assert.ok(visible.length > 0);
  assert.equal(
    visible.some((activity) => activity.id === "coord-009"),
    false,
  );
  assert.equal(
    visible.some((activity) => activity.id === "coord-004"),
    false,
  );
  for (let index = 1; index < visible.length; index += 1) {
    assert.ok(
      `${visible[index - 1].startDate}T${visible[index - 1].startTime}` <=
        `${visible[index].startDate}T${visible[index].startTime}`,
    );
  }
});

test("filters combine type, status, department, location, and overlapping date range", () => {
  const filters = {
    ...emptyCoordinationFilters,
    type: "training",
    status: "upcoming",
    department: "Livelihoods",
    location: "Morogoro Ward Office",
    dateFrom: "2026-08-12",
    dateTo: "2026-08-12",
  };
  const filtered = filterCoordinationActivities(coordinationActivities, filters);

  assert.deepEqual(
    filtered.map((activity) => activity.id),
    ["coord-007"],
  );
  assert.equal(countActiveCoordinationFilters(filters), 6);
});

test("calendar helpers support day, week, month, multi-day, and multiple activities", () => {
  const augustGrid = getMonthGridDates("2026-08-05");
  assert.equal(augustGrid.length, 42);
  assert.equal(augustGrid[0], "2026-07-26");
  assert.equal(augustGrid[41], "2026-09-05");

  assert.deepEqual(getWeekDates("2026-08-05"), [
    "2026-08-03",
    "2026-08-04",
    "2026-08-05",
    "2026-08-06",
    "2026-08-07",
    "2026-08-08",
    "2026-08-09",
  ]);
  assert.equal(shiftCalendarAnchor("2026-08-05", "day", 1), "2026-08-06");
  assert.equal(shiftCalendarAnchor("2026-08-05", "week", -1), "2026-07-29");
  assert.equal(shiftCalendarAnchor("2026-08-05", "month", 1), "2026-09-05");
  assert.equal(shiftCalendarAnchor("2026-01-31", "month", 1), "2026-02-28");

  const augustFifth = getActivitiesForDate(coordinationActivities, "2026-08-05");
  assert.ok(augustFifth.length >= 2);
  const secondTrainingDay = getActivitiesForDate(coordinationActivities, "2026-08-12");
  assert.ok(secondTrainingDay.some((activity) => activity.id === "coord-007"));
});
