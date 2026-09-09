import { useCallback, useState } from "react";

import { runSyncLogicInternal } from "@/src/tasks/background-upload-task-definition";

/**
 * Pull-to-refresh state wired to the app's sync pipeline: uploads pending
 * grievances and attachments, pulls backend ticket updates, and runs the
 * PowerSync upload. Live queries pick up the refreshed rows automatically.
 */
export function useSyncRefresh(onSynced?: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await runSyncLogicInternal("Pull to refresh");
      await onSynced?.();
    } finally {
      setRefreshing(false);
    }
  }, [onSynced]);

  return { refreshing, refresh };
}
