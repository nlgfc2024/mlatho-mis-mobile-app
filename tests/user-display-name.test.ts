// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import { getUserDisplayName } from "../src/lib/user-display-name.ts";

test("uses other names followed by last name for the dashboard identity", () => {
  assert.equal(
    getUserDisplayName({ otherNames: "Asha Neema", lastName: "Mushi" }),
    "Asha Neema Mushi",
  );
});

test("normalizes name whitespace and skips missing parts", () => {
  assert.equal(
    getUserDisplayName({ otherNames: "  Asha   Neema ", lastName: " Mushi " }),
    "Asha Neema Mushi",
  );
  assert.equal(getUserDisplayName({ otherNames: null, lastName: "Mushi" }), "Mushi");
});

test("falls back to the stored identity when profile names are unavailable", () => {
  assert.equal(
    getUserDisplayName({ otherNames: null, lastName: null, fallback: "field.officer" }),
    "field.officer",
  );
});
