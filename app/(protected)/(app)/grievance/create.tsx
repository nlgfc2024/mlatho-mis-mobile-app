import ErrorIcon from "@expo/material-symbols/error.xml";
import { AlertDialog, Host, Icon, Text as JCText, Row, TextButton } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { useStore } from "@tanstack/react-form";
import { onlineManager, useMutation } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";

import GrievanceComplaintFormSection from "@/src/components/grievance/grievance-complaint-form-section";
import GrievanceConfirmationFormSection from "@/src/components/grievance/grievance-confirmation-form-section";
import GrievanceDetailsFormSection from "@/src/components/grievance/grievance-details-form-section";
import GrievanceEvidenceFormSection from "@/src/components/grievance/grievance-evidence-form-section";
import StepperDot from "@/src/components/ui/stepper-dot";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { useAppForm } from "@/src/form";
import { grievanceFormOptions } from "@/src/form/grievance";
import { grievanceReporterFields } from "@/src/form/grievance-mode";
import { FormValues } from "@/src/form/schema";
import { cleanErrorMessage } from "@/src/lib/clean-error-message";
import { normalizeGrievanceEvidence } from "@/src/lib/grievance-evidence";
import {
  districtsCollection,
  householdMembersCollection,
  regionsCollection,
  villagesCollection,
  wardsCollection,
} from "@/src/powersync/collections";
import {
  firstRawUuid,
  resolveReporterIdFromHouseholdMembers,
} from "@/src/powersync/grievance-sync";
import { createLocalGrievance } from "@/src/powersync/mutations";
import { waitForCollection } from "@/src/powersync/remote-sync";
import { useSession } from "@/src/providers/session-context";
import { isPaymentRelatedCategory, resetGrievanceStore } from "@/src/store/grievance-store";
import { runSyncLogicInternal } from "@/src/tasks/background-upload-task-definition";

const FLOW_STEPS = ["complaint", "details", "evidence", "confirmation"] as const;

function locationLegacyId(
  collection: { get: (id: string) => { legacyId?: number | null } | undefined },
  id: string | number | null | undefined,
) {
  if (id === null || id === undefined || id === "") return null;
  return collection.get(String(id))?.legacyId ?? id;
}

type ResultDialog = { kind: "success" } | { kind: "error"; message: string | null };

export default function FileGrievanceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const [resultDialog, setResultDialog] = useState<ResultDialog | null>(null);

  const mutation = useMutation<void, Error, FormValues>({
    mutationKey: ["CreateGrievance"],
    networkMode: "always",
    mutationFn: async ({ details, evidence, complaint }) => {
      const incidentDate = new Date(details.dateOfIncident).toISOString();
      const hasPaymentWindow = isPaymentRelatedCategory(details.category);
      const normalizedEvidence = normalizeGrievanceEvidence(evidence);
      const reporter = grievanceReporterFields(complaint);
      const householdId = reporter.householdId;
      if (householdId) await waitForCollection(householdMembersCollection);
      const members = householdId ? await householdMembersCollection.toArrayWhenReady() : [];
      const reporterId = householdId
        ? resolveReporterIdFromHouseholdMembers(members, householdId)
        : null;
      const attendingStaffId = firstRawUuid(user?.reference, user?.id, user?.uuid);
      const regionId = locationLegacyId(regionsCollection, user?.regionId);
      const districtId = locationLegacyId(districtsCollection, user?.districtId);
      const wardId = locationLegacyId(wardsCollection, user?.wardId);
      const villageId = locationLegacyId(villagesCollection, user?.villageId);

      const tx = createLocalGrievance({
        title: details.type,
        reporterId,
        reporterType: reporter.reporterType,
        attendingStaffId,
        reporterName: reporter.reporterName,
        reporterPhone: reporter.reporterPhone,
        type: details.type,
        category: details.category,
        priority: details.priority,
        flag: details.flag || null,
        channel: details.channel || null,
        incidentDate: incidentDate,
        description: details.description,
        userId: attendingStaffId,
        paymentWindowPeriod: hasPaymentWindow ? details.paymentWindowPeriod || null : null,
        paymentWindowYear: hasPaymentWindow ? (details.paymentWindowYear ?? null) : null,
        eventLocationId: villageId,
        regionId,
        districtId,
        wardId,
        villageId,
        evidenceImages: normalizedEvidence.images,
        evidenceVideos: normalizedEvidence.videos,
        evidenceAudios: normalizedEvidence.audios,
      });
      await tx.isPersisted.promise;

      if (onlineManager.isOnline()) {
        // The grievance is already durable in the offline queue. Start an
        // immediate best-effort sync without making the create flow wait for
        // every background sync step (or surface a transient sync failure as
        // a submission failure).
        void runSyncLogicInternal("Grievance Created");
      }
    },
    onSuccess: () => {
      form.reset();
      resetGrievanceStore();
      setResultDialog({ kind: "success" });
    },
    onError: (error) => {
      setResultDialog({
        kind: "error",
        message: cleanErrorMessage(error.message),
      });
    },
  });

  const form = useAppForm({
    ...grievanceFormOptions,
    onSubmit: ({ value, formApi }) => {
      const currentSectionIndex = FLOW_STEPS.indexOf(value.section);
      const isLastStep = currentSectionIndex === FLOW_STEPS.length - 1;
      if (!isLastStep) {
        formApi.setFieldValue("section", FLOW_STEPS[currentSectionIndex + 1]);
      } else {
        mutation.mutate(value);
      }
    },
  });

  // Watch the section to derive the current step index
  const section = useStore(form.store, (state) => state.values.section);

  // Derived state for Stepper (Fixes the bug where stepper wasn't updating)
  const currentStepIndex = useMemo(() => {
    const index = FLOW_STEPS.indexOf(section);
    return index === -1 ? 0 : index;
  }, [section]);

  return (
    <>
      <Stack.Header style={{ color: "#ffffff", backgroundColor: "#0d542b" }} />
      <Stack.Title>{t("grievance")}</Stack.Title>

      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="flex flex-1 flex-col gap-5 px-4 pt-4">
            <View className="flex-1">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row gap-2">
                  {FLOW_STEPS.map((item, index) => (
                    <StepperDot key={item} isActive={index === currentStepIndex} />
                  ))}
                </View>

                <Text className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  {t("step")}{" "}
                  <Text className="font-medium text-gray-950 dark:text-gray-50">
                    {currentStepIndex + 1}
                  </Text>{" "}
                  {t("of")}{" "}
                  <Text className="font-medium text-gray-950 dark:text-gray-50">
                    {FLOW_STEPS.length}
                  </Text>
                </Text>
              </View>

              <View className="flex-1">
                {section === "complaint" && (
                  <GrievanceComplaintFormSection form={form} title={t("complainant")} />
                )}
                {section === "details" && (
                  <GrievanceDetailsFormSection form={form} title={t("basic_details")} />
                )}
                {section === "evidence" && (
                  <GrievanceEvidenceFormSection form={form} title={t("evidence")} />
                )}
                {section === "confirmation" && (
                  <GrievanceConfirmationFormSection form={form} title={t("confirmation")} />
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </StyledSafeAreaView>

      {resultDialog && (
        <Host matchContents>
          {resultDialog.kind === "success" ? (
            <AlertDialog
              modifiers={[fillMaxWidth(0.92)]}
              properties={{
                dismissOnBackPress: false,
                dismissOnClickOutside: false,
                usePlatformDefaultWidth: false,
              }}
            >
              <AlertDialog.Title>
                <JCText style={{ textAlign: "left" }} modifiers={[fillMaxWidth()]}>
                  {t("grievance_was_filed")}
                </JCText>
              </AlertDialog.Title>
              <AlertDialog.Text>
                <JCText style={{ textAlign: "left" }} modifiers={[fillMaxWidth()]}>
                  {t("grievance_submitted_success")}
                </JCText>
              </AlertDialog.Text>
              <AlertDialog.ConfirmButton>
                <TextButton
                  onClick={() => {
                    setResultDialog(null);
                    router.replace("/(protected)/(app)/grievance");
                  }}
                >
                  <JCText>{t("close")}</JCText>
                </TextButton>
              </AlertDialog.ConfirmButton>
              <AlertDialog.DismissButton>
                <TextButton onClick={() => setResultDialog(null)}>
                  <JCText>{t("file_new_grievance")}</JCText>
                </TextButton>
              </AlertDialog.DismissButton>
            </AlertDialog>
          ) : (
            <AlertDialog
              modifiers={[fillMaxWidth(0.92)]}
              properties={{ usePlatformDefaultWidth: false }}
              onDismissRequest={() => setResultDialog(null)}
            >
              <AlertDialog.Icon>
                <Row modifiers={[fillMaxWidth()]}>
                  <Icon
                    source={ErrorIcon}
                    size={28}
                    tint="#dc2626"
                    contentDescription={t("grievance_was_not_filed")}
                  />
                </Row>
              </AlertDialog.Icon>
              <AlertDialog.Title>
                <JCText style={{ textAlign: "left" }} modifiers={[fillMaxWidth()]}>
                  {t("grievance_was_not_filed")}
                </JCText>
              </AlertDialog.Title>
              <AlertDialog.Text>
                <JCText style={{ textAlign: "left" }} modifiers={[fillMaxWidth()]}>
                  {resultDialog.message ?? t("something_went_wrong")}
                </JCText>
              </AlertDialog.Text>
              <AlertDialog.ConfirmButton>
                <TextButton onClick={() => setResultDialog(null)}>
                  <JCText>{t("close")}</JCText>
                </TextButton>
              </AlertDialog.ConfirmButton>
            </AlertDialog>
          )}
        </Host>
      )}
    </>
  );
}
