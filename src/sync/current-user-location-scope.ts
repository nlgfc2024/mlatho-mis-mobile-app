import type { PageInfo } from "@/src/graphql/graphql";
import { gql } from "graphql-request";

import { graphqlClient } from "@/src/lib/graphql-client";
import { usersCollection } from "@/src/powersync/collections";
import { nextPageCursor } from "@/src/sync/graphql-pagination";

export type SyncLocation = {
  id: string;
  legacyId?: number | null;
  uuid: string;
  name?: string | null;
  code?: string | null;
  parent?: SyncLocation | null;
};

type UserDistrict = {
  uuid?: string | null;
  code?: string | null;
  name?: string | null;
  parent?: {
    uuid?: string | null;
    code?: string | null;
    name?: string | null;
  } | null;
};

type UserDistrictsResponse = {
  userDistricts?: (UserDistrict | null)[] | null;
};

type LocationsResponse = {
  locations?: {
    pageInfo: PageInfo;
    edges: ({ node?: SyncLocation | null } | null)[];
  } | null;
};

export type CurrentUserLocationScope = {
  userId: string;
  scopeKey: string;
  districtUuids: string[];
  regions: SyncLocation[];
  districts: SyncLocation[];
};

const PAGE_SIZE = 100;

/**
 * The authenticated backend user determines the district authorization scope.
 * The parent fields are available on the deployed API even though older local
 * schema snapshots only exposed `parent.id` on this lightweight type.
 */
export const GET_USER_DISTRICTS = gql`
  query GetUserDistricts {
    userDistricts {
      uuid
      code
      name
      parent {
        uuid
        code
        name
      }
    }
  }
`;

const GET_ASSIGNED_DISTRICT_DETAILS = gql`
  query GetAssignedDistrictDetails($after: String, $first: Int!, $regionUuids: [String]!) {
    locations(
      type: "D"
      parent_Uuid_In: $regionUuids
      orderBy: ["uuid"]
      after: $after
      first: $first
    ) {
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
      edges {
        node {
          id
          legacyId
          uuid
          name
          code
          parent {
            id
            legacyId
            uuid
            name
            code
          }
        }
      }
    }
  }
`;

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

async function getAuthenticatedUserReference() {
  const users = await usersCollection.toArrayWhenReady();
  const currentUser = users.find((user) => Boolean(user.isLoggedIn) && !user.deletedAt);
  const userReference = currentUser?.reference ?? currentUser?.id;

  if (!userReference) {
    throw new Error("Location sync requires an authenticated local user.");
  }

  return String(userReference);
}

function stableScopeHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createLocationScopeKey(userId: string, districtUuids: string[]) {
  const normalizedDistricts = unique(
    districtUuids.map((uuid) => uuid.trim()).filter(Boolean),
  ).sort();
  return `user-districts-${stableScopeHash(`${userId}:${normalizedDistricts.join(",")}`)}`;
}

export function filterAssignedDistrictLocations(
  locations: SyncLocation[],
  assignedDistrictUuids: string[],
) {
  const assigned = new Set(assignedDistrictUuids);
  return locations.filter((location) => assigned.has(location.uuid));
}

async function fetchDistrictDetails(regionUuids: string[]) {
  const locations: SyncLocation[] = [];
  let endCursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response: LocationsResponse = await graphqlClient.request<LocationsResponse>(
      GET_ASSIGNED_DISTRICT_DETAILS,
      {
        after: endCursor,
        first: PAGE_SIZE,
        regionUuids,
      },
    );

    if (!response.locations?.pageInfo) {
      throw new Error("Invalid assigned district details response from the server.");
    }

    for (const edge of response.locations.edges ?? []) {
      const node = edge?.node;
      if (node?.id && node.uuid) locations.push(node);
    }

    hasNextPage = response.locations.pageInfo.hasNextPage;
    endCursor = nextPageCursor(response.locations.pageInfo, endCursor, "Assigned districts");
  }

  return locations;
}

export async function fetchCurrentUserLocationScope(): Promise<CurrentUserLocationScope> {
  const [userId, response] = await Promise.all([
    getAuthenticatedUserReference(),
    graphqlClient.request<UserDistrictsResponse>(GET_USER_DISTRICTS),
  ]);

  const assignments = (response.userDistricts ?? []).filter((district): district is UserDistrict =>
    Boolean(district?.uuid),
  );
  const districtUuids = unique(
    assignments.map((district) => district.uuid?.trim() ?? "").filter(Boolean),
  ).sort();
  const regionUuids = unique(
    assignments.map((district) => district.parent?.uuid?.trim() ?? "").filter(Boolean),
  ).sort();

  if (districtUuids.length === 0) {
    return {
      userId,
      scopeKey: createLocationScopeKey(userId, []),
      districtUuids: [],
      regions: [],
      districts: [],
    };
  }

  if (regionUuids.length === 0 || assignments.some((district) => !district.parent?.uuid)) {
    throw new Error("One or more assigned districts are missing their parent region.");
  }

  const candidateDistricts = await fetchDistrictDetails(regionUuids);
  const districts = filterAssignedDistrictLocations(candidateDistricts, districtUuids);
  const resolvedDistrictUuids = new Set(districts.map((district) => district.uuid));
  const unresolvedDistrictUuids = districtUuids.filter((uuid) => !resolvedDistrictUuids.has(uuid));

  if (unresolvedDistrictUuids.length > 0) {
    throw new Error(
      `Unable to resolve ${unresolvedDistrictUuids.length} assigned district(s) from locations.`,
    );
  }

  const regionsByUuid = new Map<string, SyncLocation>();
  for (const district of districts) {
    const region = district.parent;
    if (!region?.id || !region.uuid) {
      throw new Error(`Assigned district ${district.uuid} is missing its full parent region.`);
    }
    regionsByUuid.set(region.uuid, region);
  }

  return {
    userId,
    scopeKey: createLocationScopeKey(userId, districtUuids),
    districtUuids,
    regions: Array.from(regionsByUuid.values()),
    districts,
  };
}
