import { GraphQLClient } from "graphql-request";

import { SECURE_STORAGE_KEYS, secureStorage } from "@/src/lib/secure-storage";
import { env } from "@/src/utils/env";

export const graphqlClient = new GraphQLClient(env.GRAPHQL_URL, {
  method: "POST",
  credentials: "include",
  headers: () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "*/*",
    };
    const authToken = secureStorage.getString(SECURE_STORAGE_KEYS.SESSION_AUTH_TOKEN);
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    return headers;
  },
});
