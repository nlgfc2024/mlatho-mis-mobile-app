// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import { goBackOrReplace } from "../src/lib/navigation.ts";

test("goes back when navigation history exists", () => {
  const actions: string[] = [];
  const router = {
    canGoBack: () => true,
    back: () => actions.push("back"),
    replace: (href: string) => actions.push(`replace:${href}`),
  };

  goBackOrReplace(router, "/dashboard");

  assert.deepEqual(actions, ["back"]);
});

test("replaces with the fallback when navigation history is empty", () => {
  const actions: string[] = [];
  const router = {
    canGoBack: () => false,
    back: () => actions.push("back"),
    replace: (href: string) => actions.push(`replace:${href}`),
  };

  goBackOrReplace(router, "/dashboard");

  assert.deepEqual(actions, ["replace:/dashboard"]);
});
