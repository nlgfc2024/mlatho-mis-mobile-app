import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "http://102.223.8.148/api/graphql",
  documents: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  ignoreNoDocuments: true,
  generates: {
    "./src/graphql/": {
      preset: "client",
      config: {
        documentMode: "string",
        namingConvention: {
          enumValues: "keep",
        },
      },
    },
  },
};

export default config;
