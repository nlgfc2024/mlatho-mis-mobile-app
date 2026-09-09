// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import { ClientError } from "graphql-request";

import {
  getGraphQLErrorMessage,
  getLoginErrorMessage,
  isTokenExpiredError,
} from "../src/utils/graphql-errors.ts";

test("normalizes expired signature GraphQL errors", () => {
  const error = new ClientError(
    {
      status: 401,
      headers: {},
      errors: [{ message: "Signature has expired" }],
    },
    { query: "query GetGrievanceCategories { grievanceCategories { edges { node { id } } } }" },
  );

  assert.equal(isTokenExpiredError(error), true);
  assert.equal(
    getGraphQLErrorMessage(error, "Sync failed"),
    "Session expired. Please log in again.",
  );
});

test("normalizes persisted raw expired signature strings", () => {
  const rawMessage =
    'Signature has expired: {"response":{"errors":[{"message":"Signature has expired"}],"status":401},"request":{"query":"query GetGrievanceCategories"}}';

  assert.equal(isTokenExpiredError(rawMessage), true);
  assert.equal(
    getGraphQLErrorMessage(rawMessage, "Sync failed"),
    "Session expired. Please log in again.",
  );
});

test("keeps concise non-auth messages and falls back for noisy errors", () => {
  assert.equal(
    getGraphQLErrorMessage("Invalid regions response from the server.", "Sync failed"),
    "Invalid regions response from the server.",
  );
  assert.equal(getGraphQLErrorMessage("x".repeat(200), "Sync failed"), "Sync failed");
});

test("maps the authentication API credential error code", () => {
  const error = new ClientError(
    {
      status: 200,
      headers: {},
      errors: [{ message: "INCORRECT_CREDENTIALS" }],
    },
    {
      query:
        "mutation Authenticate($username: String!, $password: String!) { tokenAuth(username: $username, password: $password) { token } }",
    },
  );

  assert.equal(getLoginErrorMessage(error), "The username or password is incorrect.");
});
