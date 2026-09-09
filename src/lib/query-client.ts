import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

import { asyncClientStorage } from "./local-storage";

// 2. Create the persister
export const clientPersister = createAsyncStoragePersister({
  storage: asyncClientStorage,
  throttleTime: 1000, // Optimize writes to happen at most once per second
});

// 3. Configure the QueryClient with garbage collection times
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (time data remains in memory)
    },
  },
});
