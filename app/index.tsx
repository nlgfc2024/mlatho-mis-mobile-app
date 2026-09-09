import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import LanguageSwitcher from "@/src/components/language-switcher";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { useAppForm } from "@/src/form";
import { loginFormOptions } from "@/src/form/login";
import { useSession } from "@/src/providers/session-context";
import { getLoginErrorMessage } from "@/src/utils/graphql-errors";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login, isReady, sessionIssue } = useSession();

  const form = useAppForm({
    ...loginFormOptions,
    onSubmit: async ({ value }) => {
      try {
        await login.mutateAsync({
          username: value.username,
          password: value.password,
        });
      } catch {
        // React Query exposes the error for the message rendered below.
      }
    },
  });

  if (!isReady) {
    return null;
  }

  const loginErrorMessage = login.isError ? getLoginErrorMessage(login.error) : null;

  return (
    <StyledSafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex flex-1 flex-col gap-5">
            <View className="flex flex-row items-center justify-end gap-2">
              <LanguageSwitcher />
            </View>

            <View className="flex flex-1 flex-col justify-center gap-10">
              <View className="flex flex-row items-center justify-center">
                <Image className="size-30" source={require("@/assets/images/logo.png")} />
              </View>

              <View className="flex flex-col gap-6">
                <form.AppField name={"username"}>
                  {(field) => <field.UsernameField />}
                </form.AppField>
                <form.AppField name={"password"}>
                  {(field) => <field.PasswordField />}
                </form.AppField>

                {sessionIssue && !loginErrorMessage ? (
                  <View className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 dark:border-amber-950/40 dark:bg-amber-950/40">
                    <Text selectable className="text-sm text-amber-800 dark:text-amber-200">
                      {sessionIssue === "expired"
                        ? t("session_expired_message")
                        : t("session_invalid_message")}
                    </Text>
                  </View>
                ) : null}

                {loginErrorMessage && (
                  <View className="rounded-2xl border border-red-50 bg-red-50 px-4 py-3 dark:border-red-950/40 dark:bg-red-950/40">
                    <Text className="text-sm text-red-600 dark:text-red-300">
                      {loginErrorMessage}
                    </Text>
                  </View>
                )}

                <View className="flex flex-row items-center justify-end">
                  <Link href={"/(auth)"} asChild>
                    <Pressable>
                      <Text className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {t("forget_password")}
                      </Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View className="flex-none p-4 pt-2">
          <form.AppForm>
            <form.SubscribeButton label={t("login")} />
          </form.AppForm>
        </View>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
}
