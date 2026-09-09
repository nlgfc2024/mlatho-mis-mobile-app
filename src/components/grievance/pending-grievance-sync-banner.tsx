import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import PendingSyncBanner from "@/src/components/ui/pending-sync-banner";
import { needsGrievanceUpload } from "@/src/powersync/grievance-sync";
import { runSyncLogicOrThrow } from "@/src/tasks/background-upload-task-definition";

export default function PendingGrievanceSyncBanner({
  grievance,
}: {
  grievance: Record<string, unknown> & { id: string };
}) {
  const { t } = useTranslation();
  const shouldSync = needsGrievanceUpload(grievance);

  const mutation = useMutation({
    mutationKey: ["SyncPendingGrievance", grievance.id],
    mutationFn: async () => {
      if (!shouldSync) return;
      await runSyncLogicOrThrow("Manual Grievance Retry");
    },
    onSuccess: () => {
      console.log("Successfully synchronized...");
    },
    onError: (error) => {
      console.log(error);
    },
  });

  if (!shouldSync) {
    return null;
  }

  return (
    <PendingSyncBanner
      message={t("grievance_not_synced")}
      isSyncing={mutation.isPending}
      onSync={() => mutation.mutate()}
    />
  );
}
