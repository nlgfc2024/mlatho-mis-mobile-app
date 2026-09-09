import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { PropsWithChildren } from "react";

import { clientPersister, queryClient } from "@/src/lib/query-client";

export function QueryProvider({ children }: PropsWithChildren) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: clientPersister,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
