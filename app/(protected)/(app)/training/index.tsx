import { useLiveQuery } from "@tanstack/react-db";
import { ScrollView, View } from "react-native";

import TrainingMeshBackground from "@/src/components/training/training-mesh-background";
import TrainingOverviewCard from "@/src/components/training/training-overview-card";
import UpcomingTrainingsList from "@/src/components/training/upcoming-trainings-list";
import { PullToRefresh } from "@/src/components/ui/pull-to-refresh";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { useSyncRefresh } from "@/src/hooks/use-sync-refresh";
import { trainingsCollection } from "@/src/powersync/collections";

export default function TrainingScreen() {
  const { data: trainings = [] } = useLiveQuery((q) => q.from({ training: trainingsCollection }));
  const { refreshing, refresh } = useSyncRefresh();
  const countStatus = (status: string) =>
    trainings.filter((training) => training.status?.trim().toLowerCase() === status).length;

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <PullToRefresh refreshing={refreshing} onRefresh={refresh}>
        <ScrollView contentContainerClassName="gap-6 pb-4">
          <View className="overflow-hidden">
            <TrainingMeshBackground />
            <TrainingOverviewCard
              total={trainings.length}
              planned={countStatus("planned")}
              submitted={countStatus("submitted")}
              approved={countStatus("approved")}
              ongoing={countStatus("ongoing")}
              completed={countStatus("completed")}
            />
          </View>
          <UpcomingTrainingsList />
        </ScrollView>
      </PullToRefresh>
    </StyledSafeAreaView>
  );
}
