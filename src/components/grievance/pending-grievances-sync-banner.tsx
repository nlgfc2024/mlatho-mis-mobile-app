import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import PendingSyncBanner from "@/src/components/ui/pending-sync-banner";
import { useHandleExpiredToken } from "@/src/hooks/use-handle-expired-token";
import { grievancesCollection } from "@/src/powersync/collections";
import { needsGrievanceUpload } from "@/src/powersync/grievance-sync";
import { runSyncLogicOrThrow } from "@/src/tasks/background-upload-task-definition";

export default function PendingGrievancesSyncBanner() {
  const { t } = useTranslation();
  const handleIfExpired = useHandleExpiredToken();

  const { data = [] } = useLiveQuery((q) =>
    q
      .from({ grievance: grievancesCollection })
      .where(({ grievance }) => eq(grievance.status, "Pending")),
  );
  const pendingUploads = data.filter(needsGrievanceUpload);

  const mutation = useMutation({
    mutationKey: ["SyncPendingGrievances"],
    mutationFn: async () => {
      if (!pendingUploads.length) return;
      await runSyncLogicOrThrow("Manual Grievances Retry");
    },
    onSuccess: () => {
      console.log("Successfully synchronized...");
    },
    onError: async (error) => {
      if (await handleIfExpired(error)) return;
      console.error("[Grievance Sync] Failed:", error);
    },
  });

  if (!pendingUploads.length) {
    return null;
  }

  return (
    <PendingSyncBanner
      message={t("grievance_not_synced_count", {
        count: pendingUploads.length,
        formattedCount: pendingUploads.length,
      })}
      isSyncing={mutation.isPending}
      onSync={() => mutation.mutate()}
    />
  );
}
