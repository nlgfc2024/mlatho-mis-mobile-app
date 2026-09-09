import type { HouseholdMember } from "@/src/utils/household-member";
import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-form";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { ArrowLeft, ChevronLeft } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";

import {
  MemberDateField,
  MemberIdentityFields,
  MemberIdentityScanField,
  MemberReviewSummary,
  MemberSegmentedField,
  MemberSelectField,
  MemberSwitchField,
  MemberTextField,
  getMemberDocumentScanAspectRatio,
  getVisibleFieldError,
  type ReviewRow,
} from "@/src/components/case-management/household-member-form-fields";
import Headline from "@/src/components/ui/headline";
import StepperDot from "@/src/components/ui/stepper-dot";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { useAppForm } from "@/src/form";
import {
  CURRENT_IN_SCHOOL_VALUES,
  DISABILITY_LEVEL_OPTIONS,
  DISABILITY_OPTIONS,
  EDUCATION_OPTIONS,
  GENDER_VALUES,
  IDENTITY_TYPE_OPTIONS,
  MINOR_DOCUMENT_TYPE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  formatDateLabel,
  getHouseholdMemberStepAt,
  getHouseholdMemberStepFields,
  getHouseholdMemberStepValidationError,
  getHouseholdMemberVisibleSteps,
  householdMemberDefaultValues,
  householdMemberFormSchema,
  isAdultFromBirthday,
  isHouseholdMemberStepValid,
  isMinorFromBirthday,
  type HouseholdMemberFormValues,
} from "@/src/form/household-member";
import { createLocalMemberUuid } from "@/src/lib/household-case-management";
import { goBackOrReplace } from "@/src/lib/navigation";
import { householdMembersCollection, householdsCollection } from "@/src/powersync/collections";
import { enqueueHouseholdChangeRequest } from "@/src/powersync/mutations";
import { translateMemberOption } from "@/src/utils/household-member";

type MemberGender = (typeof GENDER_VALUES)[number];

type HouseholdRouteItem = {
  id?: number | string | null;
  uuid?: string | null;
  reference?: string | null;
  headName?: string | null;
  representativeName?: string | null;
  groupCode?: string | null;
  status?: string | null;
};

function parseHouseholdParam(value: string | undefined) {
  try {
    return value ? (JSON.parse(value) as HouseholdRouteItem) : null;
  } catch {
    return null;
  }
}

function parseMemberParam(value: string | undefined) {
  try {
    return value ? (JSON.parse(value) as HouseholdMember) : null;
  } catch {
    return null;
  }
}

function isOption<T extends readonly string[]>(
  options: T,
  value: string | null | undefined,
): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

function splitFullName(fullName: string | null | undefined, storedMiddleName?: string | null) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? "";
  const lastName = parts.pop() ?? "";
  const middleName = storedMiddleName?.trim() || parts.join(" ");

  return {
    firstName,
    middleName,
    lastName,
  };
}

function normalizeIdentityType(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "national id" || normalized === "nida") return "National ID / NIDA";
  if (normalized === "driver license" || normalized === "driving license") return "Driving License";
  if (normalized === "birth certificate") return "Birth Certificate";
  if (
    normalized === "bima ya afya" ||
    normalized === "health insurance" ||
    normalized === "health insurance card"
  )
    return "Bima ya afya";

  return isOption(IDENTITY_TYPE_OPTIONS, value) ? value : "";
}

function normalizeDocumentType(value: string | null | undefined) {
  const normalizedIdentityType = normalizeIdentityType(value);
  if (normalizedIdentityType) return normalizedIdentityType;

  return isOption(MINOR_DOCUMENT_TYPE_OPTIONS, value) ? value : "";
}

function getStepTitle(
  step: { id: string; title: string },
  values: HouseholdMemberFormValues,
  t: TFunction,
) {
  if (step.id === "identity" && isMinorFromBirthday(values.birthday)) {
    return t("minor_document");
  }

  switch (step.id) {
    case "personal":
      return t("personal_information");
    case "identity":
      return t("identity_information");
    case "education":
      return t("education");
    case "disability":
      return t("disability");
    case "review":
      return t("review");
    default:
      return step.title;
  }
}

function isAllowedDocumentType(value: string, isAdult: boolean, isMinor: boolean) {
  if (!isAdult && !isMinor) return false;
  if (!value) return true;
  if (isAdult) return isOption(IDENTITY_TYPE_OPTIONS, value);
  if (isMinor) return isOption(MINOR_DOCUMENT_TYPE_OPTIONS, value);

  return false;
}

function memberToFormValues(member: HouseholdMember): HouseholdMemberFormValues {
  const { firstName, middleName, lastName } = splitFullName(member.fullName, member.middleName);
  const currentSchoolLevel = member.currentSchoolLevel?.toLowerCase();

  return {
    firstName,
    middleName,
    lastName,
    relationship: isOption(RELATIONSHIP_OPTIONS, member.relationship) ? member.relationship : "",
    birthday: member.dateOfBirth ?? "",
    gender: isOption(GENDER_VALUES, member.gender) ? member.gender : "",
    education: isOption(EDUCATION_OPTIONS, member.education) ? member.education : "",
    currentInSchool: isOption(CURRENT_IN_SCHOOL_VALUES, currentSchoolLevel)
      ? currentSchoolLevel
      : "no",
    premNumber: member.premNumber ?? "",
    isDisabled: Boolean(member.isDisabled),
    disability: isOption(DISABILITY_OPTIONS, member.disability) ? member.disability : "",
    disabilityLevel: isOption(DISABILITY_LEVEL_OPTIONS, member.disabilityLevel)
      ? member.disabilityLevel
      : "",
    identityType: normalizeDocumentType(member.identityType),
    identityNumber: member.identityNumber ?? "",
    identityScanUri: member.identityScanUri ?? null,
    phoneNumber: member.phoneNumber ?? "",
  };
}

function buildReviewRows(values: HouseholdMemberFormValues, t: TFunction): ReviewRow[] {
  const fullName = [values.firstName, values.middleName, values.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

  const rows: ReviewRow[] = [
    { label: t("full_name"), value: fullName || t("not_provided") },
    {
      label: t("relationship"),
      value: translateMemberOption(t, values.relationship) || t("not_provided"),
    },
    {
      label: t("birthday"),
      value: values.birthday ? formatDateLabel(values.birthday) : t("not_provided"),
    },
    { label: t("gender"), value: translateMemberOption(t, values.gender) || t("not_provided") },
  ];

  if (isAdultFromBirthday(values.birthday)) {
    rows.push(
      {
        label: t("id_type"),
        value: translateMemberOption(t, values.identityType) || t("not_provided"),
      },
      { label: t("id_number"), value: values.identityNumber.trim() || t("not_provided") },
      { label: t("id_scan"), value: values.identityScanUri ? t("captured") : t("not_provided") },
    );
  } else if (isMinorFromBirthday(values.birthday)) {
    rows.push(
      {
        label: t("document_type"),
        value: translateMemberOption(t, values.identityType) || t("not_provided"),
      },
      { label: t("document_number"), value: values.identityNumber.trim() || t("not_provided") },
      {
        label: t("document_scan"),
        value: values.identityScanUri ? t("captured") : t("not_provided"),
      },
    );
  }

  rows.push(
    {
      label: t("education"),
      value: translateMemberOption(t, values.education) || t("not_provided"),
    },
    {
      label: t("current_in_school"),
      value: translateMemberOption(t, values.currentInSchool) || t("not_provided"),
    },
    ...(values.premNumber.trim()
      ? [{ label: t("prem_number"), value: values.premNumber.trim() }]
      : []),
    { label: t("disability_status"), value: values.isDisabled ? t("yes") : t("no") },
  );

  if (values.isDisabled) {
    rows.push(
      {
        label: t("disability_type"),
        value: translateMemberOption(t, values.disability) || t("not_provided"),
      },
      {
        label: t("disability_level"),
        value: translateMemberOption(t, values.disabilityLevel) || t("not_provided"),
      },
    );
  }

  if (values.phoneNumber.trim()) {
    rows.push({ label: t("phone_number"), value: values.phoneNumber.trim() });
  }

  return rows;
}

type HouseholdMemberFormScreenProps = {
  mode: "create" | "edit";
};

export default function HouseholdMemberFormScreen({ mode }: HouseholdMemberFormScreenProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { id, uuid, household, memberUuid, member } = useLocalSearchParams<{
    id?: string;
    uuid?: string;
    household?: string;
    memberUuid?: string;
    member?: string;
  }>();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);

  const item = useMemo(() => parseHouseholdParam(household), [household]);
  const routeMember = useMemo(() => parseMemberParam(member), [member]);
  const isEditing = mode === "edit";
  const relationshipSelectOptions = useMemo(
    () =>
      RELATIONSHIP_OPTIONS.map((value) => ({
        label: translateMemberOption(t, value) ?? value,
        value,
      })),
    [t],
  );
  const educationSelectOptions = useMemo(
    () =>
      EDUCATION_OPTIONS.map((value) => ({
        label: translateMemberOption(t, value) ?? value,
        value,
      })),
    [t],
  );
  const disabilitySelectOptions = useMemo(
    () =>
      DISABILITY_OPTIONS.map((value) => ({
        label: translateMemberOption(t, value) ?? value,
        value,
      })),
    [t],
  );
  const disabilityLevelSelectOptions = useMemo(
    () =>
      DISABILITY_LEVEL_OPTIONS.map((value) => ({
        label: translateMemberOption(t, value) ?? value,
        value,
      })),
    [t],
  );
  const identityTypeSelectOptions = useMemo(
    () =>
      IDENTITY_TYPE_OPTIONS.map((value) => ({
        label: translateMemberOption(t, value) ?? value,
        value,
      })),
    [t],
  );
  const minorDocumentTypeSelectOptions = useMemo(
    () =>
      MINOR_DOCUMENT_TYPE_OPTIONS.map((value) => ({
        label: translateMemberOption(t, value) ?? value,
        value,
      })),
    [t],
  );
  const genderSegmentOptions = useMemo(
    () => [
      { label: t("male"), value: GENDER_VALUES[0] },
      { label: t("female"), value: GENDER_VALUES[1] },
    ],
    [t],
  );
  const currentInSchoolSegmentOptions = useMemo(
    () => [
      { label: t("no"), value: CURRENT_IN_SCHOOL_VALUES[0] },
      { label: t("primary"), value: CURRENT_IN_SCHOOL_VALUES[1] },
      { label: t("secondary"), value: CURRENT_IN_SCHOOL_VALUES[2] },
    ],
    [t],
  );
  const resolvedMemberUuid = isEditing ? (memberUuid ?? id ?? routeMember?.uuid ?? "") : "";
  const loadedMemberUuidRef = useRef<string | null>(isEditing ? (routeMember?.uuid ?? null) : null);
  const initialFormValues = useMemo(
    () =>
      isEditing && routeMember ? memberToFormValues(routeMember) : householdMemberDefaultValues,
    [isEditing, routeMember],
  );

  const memberQuery = useLiveQuery(
    (q) =>
      q
        .from({ member: householdMembersCollection })
        .where(({ member }) => eq(member.uuid, resolvedMemberUuid || "__new_household_member__"))
        .orderBy(({ member }) => member.id, "asc")
        .limit(1),
    [resolvedMemberUuid],
  );
  const existingMember = isEditing ? (memberQuery.data?.[0] ?? routeMember ?? null) : null;

  const saveMember = async (data: HouseholdMemberFormValues) => {
    if (!uuid) return;

    const now = new Date().toISOString();
    const firstName = data.firstName.trim();
    const middleName = data.middleName.trim();
    const lastName = data.lastName.trim();
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const shouldStoreDisability = data.isDisabled;
    const isAdultMember = isAdultFromBirthday(data.birthday);
    const isMinorMember = isMinorFromBirthday(data.birthday);
    const hasDocumentDetails = Boolean(
      data.identityType.trim() || data.identityNumber.trim() || data.identityScanUri?.trim(),
    );
    const shouldStoreIdentity = isAdultMember || (isMinorMember && hasDocumentDetails);
    const currentSchoolLevel = data.currentInSchool === "no" ? null : data.currentInSchool;
    const gender = data.gender as MemberGender;
    const memberFields = {
      fullName,
      middleName,
      relationship: data.relationship,
      gender,
      dateOfBirth: data.birthday,
      education: data.education,
      isDisabled: data.isDisabled ? 1 : 0,
      disability: shouldStoreDisability ? data.disability || null : null,
      disabilityLevel: shouldStoreDisability ? data.disabilityLevel || null : null,
      currentSchoolLevel,
      premNumber: currentSchoolLevel ? data.premNumber.trim() || null : null,
      identityType: shouldStoreIdentity ? data.identityType || null : null,
      identityNumber: shouldStoreIdentity ? data.identityNumber.trim() || null : null,
      identityScanUri: shouldStoreIdentity ? data.identityScanUri : null,
      phoneNumber: data.phoneNumber.trim() || null,
      updatedAt: now,
    };

    try {
      if (isEditing) {
        if (!existingMember) {
          Alert.alert(t("error"), t("member_not_found_try_again"));
          return;
        }

        const memberTx = householdMembersCollection.update(existingMember.id, (draft) => {
          Object.assign(draft, memberFields);
        });
        await memberTx.isPersisted.promise;

        if (existingMember.isHead) {
          const tx = householdsCollection.update(uuid, (draft) => {
            draft.headName = fullName;
            draft.updatedAt = now;
          });
          await tx.isPersisted.promise;
        }

        if (existingMember.isRepresentative) {
          const tx = householdsCollection.update(uuid, (draft) => {
            draft.representativeName = fullName;
            draft.updatedAt = now;
          });
          await tx.isPersisted.promise;
        }

        const changeTx = enqueueHouseholdChangeRequest({
          householdUuid: uuid,
          memberUuid: existingMember.uuid ?? existingMember.id,
          type: "member_updated",
          payload: {
            memberUuid: existingMember.uuid ?? existingMember.id,
            ...memberFields,
            firstName,
            middleName,
            lastName,
            previous: {
              fullName: existingMember.fullName,
              middleName: existingMember.middleName,
              relationship: existingMember.relationship,
              gender: existingMember.gender,
              dateOfBirth: existingMember.dateOfBirth,
              education: existingMember.education,
              isDisabled: existingMember.isDisabled,
              disability: existingMember.disability,
              disabilityLevel: existingMember.disabilityLevel,
              currentSchoolLevel: existingMember.currentSchoolLevel,
              premNumber: existingMember.premNumber,
              identityType: existingMember.identityType,
              identityNumber: existingMember.identityNumber,
              identityScanUri: existingMember.identityScanUri,
              phoneNumber: existingMember.phoneNumber,
            },
          },
        });
        await changeTx.isPersisted.promise;

        Alert.alert(t("saved"), t("household_member_updated_successfully"), [
          { text: t("ok"), onPress: () => goBackOrReplace(router, "/case-management") },
        ]);
        return;
      }

      const newMemberUuid = createLocalMemberUuid();
      const member = {
        id: newMemberUuid,
        uuid: newMemberUuid,
        householdUuid: uuid,
        ...memberFields,
        avatarUri: null,
        isHead: 0,
        isRepresentative: 0,
        isActive: 1,
        deactivationReason: null,
        synchronizedAt: null,
        createdAt: now,
        deletedAt: null,
      };

      const memberTx = householdMembersCollection.insert(member);
      await memberTx.isPersisted.promise;

      const changeTx = enqueueHouseholdChangeRequest({
        householdUuid: uuid,
        memberUuid: newMemberUuid,
        type: "member_added",
        payload: {
          ...member,
          firstName,
          middleName,
          lastName,
        },
      });
      await changeTx.isPersisted.promise;

      Alert.alert(t("saved"), t("household_member_added_successfully"), [
        { text: t("ok"), onPress: () => goBackOrReplace(router, "/case-management") },
      ]);
    } catch (error) {
      console.error("[Household Member] Failed:", error);
      Alert.alert(t("error"), t("failed_save_household_member"));
    }
  };

  const form = useAppForm({
    defaultValues: initialFormValues,
    validators: {
      onChange: ({ value }) =>
        getHouseholdMemberStepValidationError(value, getHouseholdMemberStepAt(value, activeStep)),
      onSubmit: ({ formApi }) => formApi.parseValuesWithSchema(householdMemberFormSchema),
    },
    onSubmit: async ({ value }) => {
      const result = householdMemberFormSchema.safeParse(value);
      if (!result.success) return;

      await saveMember(result.data);
    },
  });

  const values = useStore(form.store, (state) => state.values);
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const isAdult = isAdultFromBirthday(values.birthday);
  const isMinor = isMinorFromBirthday(values.birthday);
  const visibleSteps = useMemo(() => getHouseholdMemberVisibleSteps(values), [values]);
  const activeStepConfig = getHouseholdMemberStepAt(values, activeStep);
  const activeStepTitle = getStepTitle(activeStepConfig, values, t);
  const isCurrentStepValid = useMemo(
    () => isHouseholdMemberStepValid(values, activeStepConfig),
    [activeStepConfig, values],
  );
  const isLastStep = activeStep === visibleSteps.length - 1;

  useEffect(() => {
    void form.validate("change");
  }, [activeStep, form]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveStep((current) => Math.min(current, Math.max(visibleSteps.length - 1, 0)));
  }, [visibleSteps.length]);

  useEffect(() => {
    if (!isEditing) {
      if (loadedMemberUuidRef.current) {
        form.reset(householdMemberDefaultValues);
        setActiveStep(0);
      }

      loadedMemberUuidRef.current = null;
      return;
    }

    const existingMemberUuid = existingMember?.uuid ?? existingMember?.id ?? null;
    if (!existingMember || loadedMemberUuidRef.current === existingMemberUuid) return;

    form.reset(memberToFormValues(existingMember));
    setActiveStep(0);
    loadedMemberUuidRef.current = existingMemberUuid;
  }, [existingMember, form, isEditing]);

  useEffect(() => {
    if (values.isDisabled || (!values.disability && !values.disabilityLevel)) return;

    form.setFieldValue("disability", "", { dontValidate: true });
    form.setFieldValue("disabilityLevel", "", { dontValidate: true });
    void form.validate("change");
  }, [form, values.disability, values.disabilityLevel, values.isDisabled]);

  useEffect(() => {
    if (!values.identityType && !values.identityNumber && !values.identityScanUri) return;

    if (isAllowedDocumentType(values.identityType, isAdult, isMinor)) return;

    form.setFieldValue("identityType", "", { dontValidate: true });
    form.setFieldValue("identityNumber", "", { dontValidate: true });
    form.setFieldValue("identityScanUri", null, { dontValidate: true });
    void form.validate("change");
  }, [form, isAdult, isMinor, values.identityNumber, values.identityScanUri, values.identityType]);

  useEffect(() => {
    if (values.currentInSchool !== "no" || !values.premNumber) return;

    form.setFieldValue("premNumber", "", { dontValidate: true });
    void form.validate("change");
  }, [form, values.currentInSchool, values.premNumber]);

  const goBackOneStep = () => {
    if (activeStep === 0) {
      goBackOrReplace(router, "/case-management");
      return;
    }

    setActiveStep((current) => current - 1);
  };

  const markCurrentStepTouched = () => {
    for (const field of getHouseholdMemberStepFields(activeStepConfig)) {
      form.setFieldMeta(field, (previous) => ({
        ...previous,
        isTouched: true,
      }));
    }
  };

  const handlePrimaryPress = async () => {
    if (isSubmitting) return;

    markCurrentStepTouched();
    await form.validate("change");

    const currentStep = getHouseholdMemberStepAt(form.state.values, activeStep);
    if (!isHouseholdMemberStepValid(form.state.values, currentStep)) return;

    const currentVisibleSteps = getHouseholdMemberVisibleSteps(form.state.values);
    if (activeStep < currentVisibleSteps.length - 1) {
      setActiveStep((current) => current + 1);
      return;
    }

    await form.handleSubmit();
  };

  if (!item || !uuid) {
    return (
      <StyledSafeAreaView
        edges={["bottom"]}
        className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950"
      >
        <Text className="text-lg text-red-600 dark:text-red-400">{t("household_data_not_found")}</Text>
        <Pressable
          onPress={() => goBackOrReplace(router, "/case-management")}
          className="mt-6 rounded-lg bg-emerald-700 px-6 py-3"
        >
          <Text className="font-medium text-white">{t("go_back")}</Text>
        </Pressable>
      </StyledSafeAreaView>
    );
  }

  if (isEditing && memberQuery.data && !existingMember) {
    return (
      <StyledSafeAreaView
        edges={["bottom"]}
        className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950"
      >
        <Text className="text-lg text-red-600 dark:text-red-400">{t("member_data_not_found")}</Text>
        <Pressable
          onPress={() => goBackOrReplace(router, "/case-management")}
          className="mt-6 rounded-lg bg-emerald-700 px-6 py-3"
        >
          <Text className="font-medium text-white">{t("go_back")}</Text>
        </Pressable>
      </StyledSafeAreaView>
    );
  }
  const primaryLabel = isLastStep ? (isEditing ? t("save_changes") : t("add_member")) : t("next");
  const primaryDisabled = !isCurrentStepValid || isSubmitting;
  const reviewRows = buildReviewRows(values, t);
  const identityTypeOptions = isAdult ? identityTypeSelectOptions : minorDocumentTypeSelectOptions;
  const identityTypePlaceholder = isAdult ? t("select_id_type") : t("select_document_type");
  const identityNumberPlaceholder = isAdult ? t("enter_id_number") : t("enter_document_number");
  const identityNumberAccessibilityLabel = isAdult ? t("id_number") : t("document_number");
  const scanSubject = isAdult
    ? t("identity")
    : translateMemberOption(t, values.identityType) || t("document");
  const scanAspectRatio = getMemberDocumentScanAspectRatio(values.identityType);

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? t("edit_member") : t("add_member"),
          headerBackVisible: activeStep === 0,
          headerLeft:
            activeStep === 0
              ? undefined
              : () => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("previous_step")}
                    hitSlop={12}
                    onPress={goBackOneStep}
                    className="size-10 items-center justify-center rounded-full active:bg-white/10"
                  >
                    <ChevronLeft size={24} color="#ffffff" />
                  </Pressable>
                ),
        }}
      />

      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="flex flex-1 flex-col gap-5 pt-4">
            <View className="px-4">
              <Text selectable className="text-base font-bold text-gray-950 dark:text-gray-50">
                {item.headName}
              </Text>
              <Text selectable className="text-sm font-normal text-gray-600 dark:text-gray-400">
                {item.groupCode}
              </Text>
            </View>

            <View className="flex flex-row items-center justify-between px-4">
              <View className="flex flex-row gap-2">
                {visibleSteps.map((step, index) => (
                  <StepperDot key={step.title} isActive={index === activeStep} />
                ))}
              </View>

              <Text className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {t("step")}{" "}
                <Text className="font-medium text-gray-950 dark:text-gray-50">{activeStep + 1}</Text>{" "}
                {t("of")}{" "}
                <Text className="font-medium text-gray-950 dark:text-gray-50">
                  {visibleSteps.length}
                </Text>
              </Text>
            </View>

            <View className="flex-1">
              <View className="px-4">
                <Headline>{activeStepTitle}</Headline>
              </View>

              <ScrollView
                className="flex-1"
                keyboardShouldPersistTaps="handled"
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 16,
                  paddingBottom: 16,
                  gap: 20,
                }}
              >
                {activeStepConfig.id === "personal" && (
                  <View className="gap-4">
                    <form.Field name="gender">
                      {(field) => (
                        <MemberSegmentedField
                          label={t("gender")}
                          value={field.state.value}
                          options={genderSegmentOptions}
                          onChange={field.handleChange}
                          error={getVisibleFieldError(field.state.meta)}
                          hideLabel
                        />
                      )}
                    </form.Field>

                    <form.Field name="firstName">
                      {(field) => (
                        <MemberTextField
                          label={t("first_name")}
                          value={field.state.value}
                          onChangeText={field.handleChange}
                          onBlur={field.handleBlur}
                          placeholder={t("enter_first_name")}
                          autoCapitalize="words"
                          error={getVisibleFieldError(field.state.meta)}
                        />
                      )}
                    </form.Field>

                    <form.Field name="middleName">
                      {(field) => (
                        <MemberTextField
                          label={t("middle_name")}
                          value={field.state.value}
                          onChangeText={field.handleChange}
                          onBlur={field.handleBlur}
                          placeholder={t("enter_middle_name")}
                          autoCapitalize="words"
                          error={getVisibleFieldError(field.state.meta)}
                        />
                      )}
                    </form.Field>

                    <form.Field name="lastName">
                      {(field) => (
                        <MemberTextField
                          label={t("last_name")}
                          value={field.state.value}
                          onChangeText={field.handleChange}
                          onBlur={field.handleBlur}
                          placeholder={t("enter_last_name")}
                          autoCapitalize="words"
                          error={getVisibleFieldError(field.state.meta)}
                        />
                      )}
                    </form.Field>

                    <form.Field name="relationship">
                      {(field) => (
                        <MemberSelectField
                          label={t("relationship")}
                          value={field.state.value}
                          options={relationshipSelectOptions}
                          onChange={field.handleChange}
                          placeholder={t("select_relationship")}
                          error={getVisibleFieldError(field.state.meta)}
                        />
                      )}
                    </form.Field>

                    <form.Field name="birthday">
                      {(field) => (
                        <MemberDateField
                          label={t("birthday")}
                          value={field.state.value}
                          onChange={field.handleChange}
                          onBlur={field.handleBlur}
                          error={getVisibleFieldError(field.state.meta)}
                        />
                      )}
                    </form.Field>
                  </View>
                )}

                {activeStepConfig.id === "education" && (
                  <View className="gap-4">
                    <form.Field name="education">
                      {(field) => (
                        <MemberSelectField
                          label={t("education")}
                          value={field.state.value}
                          options={educationSelectOptions}
                          onChange={field.handleChange}
                          placeholder={t("select_education")}
                          error={getVisibleFieldError(field.state.meta)}
                        />
                      )}
                    </form.Field>

                    <form.Field name="currentInSchool">
                      {(field) => (
                        <MemberSegmentedField
                          label={t("current_in_school")}
                          value={field.state.value}
                          options={currentInSchoolSegmentOptions}
                          onChange={field.handleChange}
                          error={getVisibleFieldError(field.state.meta)}
                        />
                      )}
                    </form.Field>

                    {values.currentInSchool !== "no" && (
                      <form.Field name="premNumber">
                        {(field) => (
                          <MemberTextField
                            label={t("prem_number")}
                            value={field.state.value}
                            onChangeText={field.handleChange}
                            onBlur={field.handleBlur}
                            placeholder={t("enter_prem_number")}
                            autoCapitalize="characters"
                            error={getVisibleFieldError(field.state.meta)}
                          />
                        )}
                      </form.Field>
                    )}
                  </View>
                )}

                {activeStepConfig.id === "disability" && (
                  <View className="gap-4">
                    <form.Field name="isDisabled">
                      {(field) => (
                        <MemberSwitchField
                          label={t("is_disabled")}
                          value={field.state.value}
                          onChange={field.handleChange}
                          error={getVisibleFieldError(field.state.meta)}
                        />
                      )}
                    </form.Field>

                    {values.isDisabled && (
                      <>
                        <form.Field name="disability">
                          {(field) => (
                            <MemberSelectField
                              label={t("disability")}
                              value={field.state.value}
                              options={disabilitySelectOptions}
                              onChange={field.handleChange}
                              placeholder={t("select_disability")}
                              error={getVisibleFieldError(field.state.meta)}
                            />
                          )}
                        </form.Field>

                        <form.Field name="disabilityLevel">
                          {(field) => (
                            <MemberSelectField
                              label={t("disability_level")}
                              value={field.state.value}
                              options={disabilityLevelSelectOptions}
                              onChange={field.handleChange}
                              placeholder={t("select_disability_level")}
                              error={getVisibleFieldError(field.state.meta)}
                            />
                          )}
                        </form.Field>
                      </>
                    )}
                  </View>
                )}

                {activeStepConfig.id === "identity" && (
                  <View className="gap-4">
                    <form.Field name="identityType">
                      {(typeField) => (
                        <form.Field name="identityNumber">
                          {(numberField) => (
                            <MemberIdentityFields
                              typeValue={typeField.state.value}
                              typeOptions={identityTypeOptions}
                              onTypeChange={typeField.handleChange}
                              typeError={getVisibleFieldError(typeField.state.meta)}
                              typePlaceholder={identityTypePlaceholder}
                              numberValue={numberField.state.value}
                              onNumberChangeText={numberField.handleChange}
                              onNumberBlur={numberField.handleBlur}
                              numberError={getVisibleFieldError(numberField.state.meta)}
                              numberPlaceholder={identityNumberPlaceholder}
                              numberAccessibilityLabel={identityNumberAccessibilityLabel}
                            />
                          )}
                        </form.Field>
                      )}
                    </form.Field>

                    <form.Field name="identityScanUri">
                      {(field) => (
                        <MemberIdentityScanField
                          value={field.state.value}
                          onChange={field.handleChange}
                          error={getVisibleFieldError(field.state.meta)}
                          scanSubject={scanSubject}
                          aspectRatio={scanAspectRatio}
                        />
                      )}
                    </form.Field>
                  </View>
                )}

                {activeStepConfig.id === "review" && (
                  <View className="gap-5">
                    <form.Field name="phoneNumber">
                      {(field) => (
                        <MemberTextField
                          label={t("phone_number")}
                          value={field.state.value}
                          onChangeText={field.handleChange}
                          onBlur={field.handleBlur}
                          placeholder={t("optional_phone_number")}
                          keyboardType="phone-pad"
                          error={getVisibleFieldError(field.state.meta)}
                        />
                      )}
                    </form.Field>

                    <MemberReviewSummary rows={reviewRows} />
                  </View>
                )}
              </ScrollView>
            </View>

            <View className="flex flex-row items-stretch justify-between gap-4 px-4">
              {activeStep > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("back")}
                  disabled={isSubmitting}
                  onPress={goBackOneStep}
                  className={`aspect-square items-center justify-center rounded-full border border-gray-100 bg-gray-100 dark:border-gray-800 dark:bg-gray-800 ${
                    isSubmitting ? "opacity-50" : "active:bg-pressed-control"
                  }`}
                >
                  <ArrowLeft size={20} color={isDark ? "#d1d5db" : "#364153"} strokeWidth={2.25} />
                </Pressable>
              )}

              <View className="min-w-0 flex-1">
                <Host style={{ width: "100%", height: 44 }}>
                  <Button
                    modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
                    enabled={!primaryDisabled}
                    colors={{ containerColor: "#0d542b", contentColor: "#ffffff" }}
                    onClick={handlePrimaryPress}
                  >
                    <JCText>{isSubmitting ? t("submitting") : primaryLabel}</JCText>
                  </Button>
                </Host>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </StyledSafeAreaView>
    </>
  );
}
