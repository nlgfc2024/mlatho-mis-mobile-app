import { gql } from "graphql-request";

import { graphqlClient } from "@/src/lib/graphql-client";

export type TargetedMemberLocation = {
  id: string;
  uuid?: string | null;
  code?: string | null;
  name?: string | null;
  type?: string | null;
  parent?: TargetedMemberLocation | null;
};

export type TargetedMemberUser = {
  username?: string | null;
};

export type TargetedMemberGroup = {
  id: string;
};

export type TargetedMember = {
  id: string;
  isDeleted?: boolean | null;
  dateCreated?: string | null;
  dateUpdated?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  jsonExt?: unknown;
  version?: number | null;
  tf4No?: string | null;
  interviewKey?: string | null;
  userUpdated?: TargetedMemberUser | null;
  location?: TargetedMemberLocation | null;
  groupindividuals?: {
    edges: {
      node?: {
        group?: TargetedMemberGroup | null;
      } | null;
    }[];
  } | null;
};

export type TargetedMembersPageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
};

type TargetedMemberEdge = {
  node?: TargetedMember | null;
};

export type TargetedMembersConnection = {
  totalCount?: number | null;
  pageInfo: TargetedMembersPageInfo;
  edges: TargetedMemberEdge[];
};

export type GetTargetedMembersResponse = {
  individual?: TargetedMembersConnection | null;
};

export type GetTargetedMembersVariables = {
  first?: number;
  after?: string | null;
};

export type GetTargetedMemberDetailResponse = {
  individual?: TargetedMembersConnection | null;
};

export type GetTargetedMemberDetailVariables = {
  id: string;
};

const GET_TARGETED_MEMBERS = gql`
  query GetTargetedMembers($first: Int = 10, $after: String) {
    individual(isDeleted: false, first: $first, after: $after, orderBy: ["lastName"]) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        node {
          id
          isDeleted
          dateCreated
          dateUpdated
          firstName
          lastName
          dob
          jsonExt
          version
          tf4No
          interviewKey
          userUpdated {
            username
          }
          location {
            id
            uuid
            code
            name
            type
            parent {
              id
              uuid
              code
              name
              type
              parent {
                id
                uuid
                code
                name
                type
                parent {
                  id
                  uuid
                  code
                  name
                  type
                }
              }
            }
          }
        }
      }
    }
  }
`;

const GET_TARGETED_MEMBER_DETAIL = gql`
  query GetTargetedMemberDetail($id: ID!) {
    individual(id: $id) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        node {
          id
          isDeleted
          dateCreated
          dateUpdated
          firstName
          lastName
          dob
          jsonExt
          version
          tf4No
          interviewKey
          userUpdated {
            username
          }
          location {
            id
            uuid
            code
            name
            type
            parent {
              id
              uuid
              code
              name
              type
              parent {
                id
                uuid
                code
                name
                type
                parent {
                  id
                  uuid
                  code
                  name
                  type
                }
              }
            }
          }
          groupindividuals(isDeleted: false) {
            edges {
              node {
                group {
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`;

export function getTargetedMembers(variables: GetTargetedMembersVariables) {
  return graphqlClient.request<GetTargetedMembersResponse, GetTargetedMembersVariables>(
    GET_TARGETED_MEMBERS,
    variables,
  );
}

export function getTargetedMemberDetail(variables: GetTargetedMemberDetailVariables) {
  return graphqlClient.request<GetTargetedMemberDetailResponse, GetTargetedMemberDetailVariables>(
    GET_TARGETED_MEMBER_DETAIL,
    variables,
  );
}
