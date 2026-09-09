// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  filterTrainings,
  getTrainingFilterOptions,
  getUpcomingTrainings,
  toTraining,
} from "../src/data/trainings.ts";

const rows = [
  {
    id: "training-2",
    title: "  Financial literacy  ",
    description: "  Budgeting and responsible borrowing  ",
    venue: "Ward office",
    code: "TR-002",
    status: "APPROVED",
    paaReference: "PAA-22",
    categoryId: "category-1",
    categoryName: "Finance",
    levelId: "level-1",
    levelName: "Village",
    locationId: "location-1",
    locationName: "Kihonda",
    startDatetime: "2026-09-02T08:00:00Z",
    endDatetime: "2026-09-02T16:00:00Z",
    dateCreated: "2026-08-01T10:00:00Z",
    synchronizedAt: "2026-08-12T10:00:00Z",
  },
  {
    id: "training-1",
    title: "Agriculture basics",
    description: "Improved seed and soil practices",
    venue: "Village hall",
    code: "TR-001",
    status: "planned",
    paaReference: "PAA-11",
    categoryId: "category-2",
    categoryName: "Agriculture",
    levelId: "level-1",
    levelName: "Village",
    locationId: "location-2",
    locationName: "Mtipa",
    startDatetime: "2026-08-20T08:00:00Z",
    endDatetime: null,
    dateCreated: null,
    synchronizedAt: "2026-08-12T10:00:00Z",
  },
];

const trainings = rows.map(toTraining);

test("maps local training rows back to the GraphQL training shape", () => {
  assert.deepEqual(trainings[0], {
    id: "training-2",
    title: "Financial literacy",
    description: "Budgeting and responsible borrowing",
    venue: "Ward office",
    code: "TR-002",
    status: "approved",
    paaReference: "PAA-22",
    category: { id: "category-1", name: "Finance" },
    level: { id: "level-1", name: "Village" },
    location: { id: "location-1", name: "Kihonda" },
    startDatetime: "2026-09-02T08:00:00Z",
    endDatetime: "2026-09-02T16:00:00Z",
    dateCreated: "2026-08-01T10:00:00Z",
  });
});

test("sorts upcoming cached trainings by start time", () => {
  assert.deepEqual(
    getUpcomingTrainings(trainings).map((training) => training.id),
    ["training-1", "training-2"],
  );
});

test("filters and derives options from synced training fields", () => {
  assert.deepEqual(
    filterTrainings(
      trainings,
      {
        status: null,
        location: "Kihonda",
        category: "Finance",
        level: "Village",
        dateFrom: "2026-09-01",
        dateTo: "2026-09-03",
      },
      "responsible borrowing",
    ).map((training) => training.id),
    ["training-2"],
  );

  assert.deepEqual(getTrainingFilterOptions(trainings), {
    status: ["approved", "planned"],
    location: ["Kihonda", "Mtipa"],
    category: ["Agriculture", "Finance"],
    level: ["Village"],
  });
});
