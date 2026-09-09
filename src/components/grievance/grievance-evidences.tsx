import type { FormValues } from "@/src/form/schema";
import { useStore } from "@tanstack/react-form";
import { FileMusic, FilePlay } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text, useColorScheme, View } from "react-native";

import EvidenceImagePreview from "./evidence-image-preview";

type EvidenceKey = keyof FormValues["evidence"];

const evidenceSections: { key: EvidenceKey; label: string }[] = [
  { key: "images", label: "images" },
  { key: "videos", label: "videos" },
  { key: "audios", label: "audios" },
];

const GrievanceEvidences = ({ form }: { form: any }) => {
  const { t } = useTranslation();
  const evidence = useStore(form.store, (state: any) => (state.values as FormValues).evidence);
  const sectionsWithEvidence = evidenceSections.filter(({ key }) => evidence[key].length > 0);

  if (sectionsWithEvidence.length === 0) {
    return null;
  }

  return (
    <View className="flex flex-col gap-4">
      {sectionsWithEvidence.map(({ key, label }) => (
        <View key={key} className="gap-2">
          <Text className="text-sm font-bold text-gray-950 dark:text-gray-50">{t(label)}</Text>

          <View className="flex flex-row flex-wrap gap-2">
            {evidence[key].map((media, index) =>
              key === "images" ? (
                <EvidenceImagePreview key={`${media?.uri}-${index}`} image={media} size="medium" />
              ) : (
                <EvidenceMediaPlaceholder key={index} type={key} />
              ),
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

function EvidenceMediaPlaceholder({ type }: { type: Exclude<EvidenceKey, "images"> }) {
  const Icon = type === "videos" ? FilePlay : FileMusic;
  const isDark = useColorScheme() === "dark";

  return (
    <View className="h-20 w-20 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
      <Icon size={22} color={isDark ? "#9ca3af" : "#6a7282"} />
    </View>
  );
}

export default GrievanceEvidences;
