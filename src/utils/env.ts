import * as z from "zod";

const envSchema = z.object({
  BASE_URL: z.url(),
  API_URL: z.url(),
  GRAPHQL_URL: z.url(),
  POWERSYNC_URL: z.url().optional(),
  DATABASE_NAME: z.string(),
});

export const env = envSchema.parse({
  BASE_URL: process.env.EXPO_PUBLIC_BASE_URL,
  API_URL: process.env.EXPO_PUBLIC_API_URL,
  GRAPHQL_URL: process.env.EXPO_PUBLIC_GRAPHQL_URL,
  POWERSYNC_URL: process.env.EXPO_PUBLIC_POWERSYNC_URL,
  DATABASE_NAME: process.env.EXPO_PUBLIC_DATABASE_NAME,
});
