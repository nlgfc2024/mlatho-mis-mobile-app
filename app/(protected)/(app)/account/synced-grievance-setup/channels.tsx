import { useLiveQuery } from "@tanstack/react-db";
import { useTranslation } from "react-i18next";

import {
  LocationHierarchyHeader,
  LocationHierarchyList,
} from "@/src/components/account/location-hierarchy-list";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { translateStatus } from "@/src/i18n/helpers";
import { grievanceChannelsCollection } from "@/src/powersync/collections";

function isDeleted(record: { deletedAt?: string | null; isDeleted?: number | null }) {
  return Boolean(record.deletedAt || record.isDeleted);
}

export default function GrievanceChannelsScreen() {
  const { t } = useTranslation();
  const { data: channels = [], isLoading } = useLiveQuery((q) =>
    q.from({ channel: grievanceChannelsCollection }).orderBy(({ channel }) => channel.name, "asc"),
  );

  const visibleChannels = channels.filter((channel) => !isDeleted(channel));

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white">
      <LocationHierarchyHeader title={t("grievance_channels")} />
      <LocationHierarchyList
        emptyMessage={t("no_grievance_channels_synchronized")}
        isLoading={isLoading}
        data={visibleChannels}
        keyExtractor={(channel) => String(channel.id)}
        toItem={(channel) => ({
          id: channel.id,
          name: channel.name ?? t("unnamed_channel"),
          countLabel: translateStatus(t, channel.isActive === 0 ? "inactive" : "active"),
        })}
      />
    </StyledSafeAreaView>
  );
}
