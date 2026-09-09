import type { GrievanceEvidence, GrievanceEvidenceAsset } from "@/src/lib/grievance-evidence";
import { AudioLines, FileMusic, Image, Video, type LucideIcon } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text, useColorScheme, View } from "react-native";

import { getGrievanceEvidenceCount } from "@/src/lib/grievance-evidence";

import EvidenceImagePreview from "./evidence-image-preview";
import EvidenceVideoPreview from "./evidence-video-preview";

type EvidenceKey = keyof GrievanceEvidence;

const evidenceSections: { key: EvidenceKey; label: string; icon: LucideIcon }[] = [
  { key: "images", label: "images", icon: Image },
  { key: "videos", label: "videos", icon: Video },
  { key: "audios", label: "audios", icon: AudioLines },
];

interface ComponentProps {
  evidence: GrievanceEvidence;
}

const GrievanceEvidenceSummary: React.FC<ComponentProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const evidenceCount = getGrievanceEvidenceCount(evidence);
  const sectionsWithEvidence = evidenceSections.filter(({ key }) => evidence[key].length > 0);

  if (evidenceCount === 0) {
    return null;
  }

  return (
    <View className="mt-6 border-b border-gray-200 pb-5 dark:border-gray-800">
      <View className="flex flex-col gap-4">
        {sectionsWithEvidence.map(({ key, label, icon: Icon }) => (
          <View key={key} className="gap-2">
            <View className="flex flex-row items-center gap-1.5">
              <Icon size={16} strokeWidth={2.25} color={isDark ? "#9ca3af" : "#6a7282"} />
              <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t(label)} ({evidence[key].length})
              </Text>
            </View>

            <View className="flex flex-row flex-wrap gap-2">
              {evidence[key].map((asset, index) => (
                <EvidenceThumbnail key={`${asset.uri}-${index}`} asset={asset} type={key} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

function EvidenceThumbnail({ asset, type }: { asset: GrievanceEvidenceAsset; type: EvidenceKey }) {
  const isDark = useColorScheme() === "dark";

  if (type === "images") {
    return <EvidenceImagePreview image={asset} size="medium" />;
  }

  if (type === "videos") {
    return <EvidenceVideoPreview video={asset} size="medium" />;
  }

  return (
    <View className="h-20 w-20 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
      <FileMusic size={22} color={isDark ? "#9ca3af" : "#6a7282"} />
    </View>
  );
}

export default GrievanceEvidenceSummary;
