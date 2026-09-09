import { gql } from "graphql-request";

import { graphqlClient } from "@/src/lib/graphql-client";

import { type AccessProfile } from "./types";

export type { AccessDistrict, AccessModulePermission, AccessProfile, AccessRole } from "./types";

export const ACCESS_PROFILE_QUERY_KEY = "access-profile.v4";

export const AccessProfileQuery = gql`
  query GetCurrentUser {
    user {
      username
      otherNames
      lastName
      iUser {
        roleId
        healthFacilityId
        roles {
          id
          uuid
          name
          isSystem
          isBlocked
          rights {
            edges {
              node {
                rightId
              }
            }
          }
        }
      }
    }
  
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

export const GET_CURRENT_USER_MODULES_PERMISSIONS = gql`
  query GetCurrentUserModulesPermissions {
    myModulesPermissions {
      modulePermsList {
        moduleName
        permissions {
          permsName
          permsValue
        }
      }
    }
  }
`;

export async function fetchAccessProfile() {
  const [accessProfile, permissions] = await Promise.all([
    graphqlClient.request<AccessProfile>(AccessProfileQuery),
    graphqlClient.request<Pick<AccessProfile, "myModulesPermissions">>(
      GET_CURRENT_USER_MODULES_PERMISSIONS,
    ),
  ]);

  return {
    ...accessProfile,
    myModulesPermissions: permissions.myModulesPermissions ?? null,
  };
}
