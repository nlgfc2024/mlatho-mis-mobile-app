import { gql } from "graphql-request";

export const MUTATE_INDIVIDUAL_JSON = gql`
  mutation UpdateIndividual($input: UpdateIndividualMutationInput!) {
    updateIndividual(input: $input) {
      clientMutationId
    }
  }
`;
