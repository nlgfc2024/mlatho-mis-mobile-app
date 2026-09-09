// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import { nextPageCursor } from "../src/sync/graphql-pagination.ts";

test("returns the next Relay cursor while more pages remain", () => {
  assert.equal(
    nextPageCursor({ endCursor: "cursor-2", hasNextPage: true }, "cursor-1", "Villages"),
    "cursor-2",
  );
});

test("returns null after the final Relay page", () => {
  assert.equal(
    nextPageCursor({ endCursor: "cursor-final", hasNextPage: false }, "cursor-1", "Villages"),
    null,
  );
});

test("rejects a non-advancing Relay cursor instead of looping forever", () => {
  assert.throws(
    () => nextPageCursor({ endCursor: "cursor-1", hasNextPage: true }, "cursor-1", "Villages"),
    /Villages pagination did not advance/,
  );
  assert.throws(
    () => nextPageCursor({ endCursor: null, hasNextPage: true }, null, "Villages"),
    /Villages pagination did not advance/,
  );
});
