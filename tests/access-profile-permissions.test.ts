// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  accessProfileHasPermission,
  accessRoleHasRight,
  canUseAccessModule,
  getAccessRoleRightIds,
} from "../src/features/access-profile/permissions.ts";
import { isImisAdministratorRole } from "../src/features/access-profile/roles.ts";

const activeRole = {
  id: "role-1",
  uuid: "role-uuid-1",
  name: "Clerk",
  isSystem: 0,
  isBlocked: false,
  rights: {
    edges: [
      { node: { rightId: 159001 } },
      { node: { rightId: 170002 } },
      { node: { rightId: 170002 } },
    ],
  },
};

const accessProfile = {
  user: { iUser: { roles: [activeRole] } },
  myModulesPermissions: {
    modulePermsList: [
      {
        moduleName: "individual",
        permissions: [
          { permsName: "gql_individual_search_perms", permsValue: 159001 },
          { permsName: "gql_group_search_perms", permsValue: 180001 },
          { permsName: "gql_individual_update_perms", permsValue: 159003 },
        ],
      },
      {
        moduleName: "ticket",
        permissions: [
          { permsName: "gql_query_tickets_perms", permsValue: 170001 },
          { permsName: "gql_mutation_create_ticket_perms", permsValue: 170002 },
        ],
      },
    ],
  },
};

test("normalizes and deduplicates the active role's right IDs", () => {
  assert.deepEqual([...getAccessRoleRightIds(activeRole)], [159001, 170002]);
  assert.equal(accessRoleHasRight(activeRole, 170002), true);
  assert.equal(accessRoleHasRight({ ...activeRole, isBlocked: true }, 170002), false);
});

test("identifies IMIS administrators by exact normalized name or stable system flag", () => {
  assert.equal(
    isImisAdministratorRole({ ...activeRole, name: "  imis ADMINISTRATOR ", isSystem: 0 }),
    true,
  );
  assert.equal(isImisAdministratorRole({ ...activeRole, name: "Clerk", isSystem: 64 }), true);
  assert.equal(
    isImisAdministratorRole({ ...activeRole, name: "Scheme Administrator", isSystem: 0 }),
    false,
  );
  assert.equal(
    isImisAdministratorRole({
      ...activeRole,
      name: "IMIS Administrator",
      isSystem: 64,
      isBlocked: true,
    }),
    false,
  );
});

test("intersects the current user's module permissions with the active role rights", () => {
  assert.equal(
    canUseAccessModule({ accessProfile, activeRole, moduleNames: ["Individual"] }),
    true,
  );
  assert.equal(
    canUseAccessModule({
      accessProfile,
      activeRole,
      moduleNames: ["individual"],
      operation: "write",
    }),
    false,
  );
  assert.equal(
    canUseAccessModule({
      accessProfile,
      activeRole,
      moduleNames: ["ticket"],
      operation: "write",
    }),
    true,
  );
});

test("checks exact current-user permissions for permission-sensitive sync", () => {
  assert.equal(accessProfileHasPermission(accessProfile, ["gql_individual_search_perms"]), true);
  assert.equal(accessProfileHasPermission(accessProfile, ["gql_group_search_perms"]), false);
  assert.equal(accessProfileHasPermission(accessProfile, ["gql_group_update_perms"]), false);

  const groupRole = {
    ...activeRole,
    id: "role-2",
    rights: { edges: [{ node: { rightId: 180001 } }] },
  };
  assert.equal(
    accessProfileHasPermission(
      {
        ...accessProfile,
        user: { iUser: { roles: [activeRole, groupRole] } },
      },
      ["gql_group_search_perms"],
    ),
    true,
  );
});

test("can require an exact permission within a shared backend module", () => {
  assert.equal(
    canUseAccessModule({
      accessProfile,
      activeRole,
      moduleNames: ["individual"],
      permissionNames: ["gql_individual_search_perms"],
    }),
    true,
  );
  assert.equal(
    canUseAccessModule({
      accessProfile,
      activeRole,
      moduleNames: ["individual"],
      permissionNames: ["gql_group_search_perms"],
    }),
    false,
  );
  assert.equal(
    canUseAccessModule({
      accessProfile,
      activeRole,
      moduleNames: ["missing-module"],
      permissionNames: ["gql_group_search_perms"],
    }),
    false,
  );
});

test("denies unassigned roles but preserves app-local modules absent from the catalogue", () => {
  assert.equal(
    canUseAccessModule({
      accessProfile,
      activeRole: { ...activeRole, id: "role-2" },
      moduleNames: ["ticket"],
    }),
    false,
  );
  assert.equal(canUseAccessModule({ accessProfile, activeRole, moduleNames: ["training"] }), true);
});

test("allows every user to read training and communication regardless of role rights", () => {
  const restrictedProfile = {
    ...accessProfile,
    myModulesPermissions: {
      modulePermsList: [
        {
          moduleName: "training",
          permissions: [{ permsName: "gql_query_training_perms", permsValue: 180001 }],
        },
        {
          moduleName: "communication",
          permissions: [{ permsName: "gql_query_communication_perms", permsValue: 180002 }],
        },
      ],
    },
  };

  assert.equal(
    canUseAccessModule({
      accessProfile: restrictedProfile,
      activeRole,
      moduleNames: ["training"],
    }),
    true,
  );
  assert.equal(
    canUseAccessModule({
      accessProfile: restrictedProfile,
      activeRole,
      moduleNames: ["communication"],
    }),
    true,
  );
  assert.equal(
    canUseAccessModule({
      accessProfile: restrictedProfile,
      activeRole,
      moduleNames: ["training"],
      operation: "write",
    }),
    false,
  );
});

test("gives an assigned IMIS administrator unrestricted module and permission access", () => {
  const administratorRole = {
    ...activeRole,
    name: "  imis ADMINISTRATOR ",
    isSystem: 64,
    rights: { edges: [] },
  };
  const administratorProfile = {
    user: { iUser: { roles: [administratorRole] } },
    myModulesPermissions: { modulePermsList: [] },
  };

  assert.equal(
    canUseAccessModule({
      accessProfile: administratorProfile,
      activeRole: administratorRole,
      moduleNames: ["unlisted-module"],
      permissionNames: ["unlisted_write_permission"],
      operation: "write",
    }),
    true,
  );
  assert.equal(
    accessProfileHasPermission(administratorProfile, ["unlisted_sync_permission"]),
    true,
  );
  assert.equal(
    canUseAccessModule({
      accessProfile: administratorProfile,
      activeRole: { ...administratorRole, id: "unassigned-role" },
      moduleNames: ["unlisted-module"],
    }),
    false,
  );
  assert.equal(
    canUseAccessModule({
      accessProfile: administratorProfile,
      activeRole: { ...administratorRole, isBlocked: true },
      moduleNames: ["unlisted-module"],
    }),
    false,
  );
});
