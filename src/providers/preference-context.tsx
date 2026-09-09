import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import React, { createContext, type PropsWithChildren, useEffect, useState } from "react";
import { Uniwind } from "uniwind";

import { STORAGE_KEYS } from "@/src/constants/storage";
import i18n from "@/src/i18n";
import { localStorage } from "@/src/lib/local-storage";

export type Theme = "light" | "dark" | "system";
export type Language = "en" | "sw";

export interface Preferences {
  theme: Theme;
  language: Language;
  notifications: boolean;
  screenshotsAllowed: boolean;
}

type UpdateLanguage = { language: Language };
type UpdateTheme = { theme: Theme };
type UpdateNotification = { notifications: boolean };
type UpdateScreenshotsAllowed = { screenshotsAllowed: boolean };

export interface PreferenceContextType extends Preferences {
  themeMutation: UseMutationResult<void, Error, UpdateTheme>;
  languageMutation: UseMutationResult<void, Error, UpdateLanguage>;
  notificationMutation: UseMutationResult<void, Error, UpdateNotification>;
  screenshotsAllowedMutation: UseMutationResult<void, Error, UpdateScreenshotsAllowed>;
}

const PreferenceContext = createContext<PreferenceContextType | undefined>(undefined);

function getStoredPreferences(): Preferences {
  return {
    notifications: localStorage.getBoolean(STORAGE_KEYS.APP_NOTIFICATIONS) ?? true,
    screenshotsAllowed: localStorage.getBoolean(STORAGE_KEYS.APP_SCREENSHOTS_ALLOWED) ?? false,
    theme: (localStorage.getString(STORAGE_KEYS.APP_THEME) as Theme) ?? "system",
    language: (localStorage.getString(STORAGE_KEYS.APP_LANGUAGE) as Language) ?? "en",
  };
}

export default function PreferenceProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState<Preferences>(() => getStoredPreferences());

  useEffect(() => {
    Uniwind.setTheme(preferences.theme);
    i18n.changeLanguage(preferences.language);
  }, [preferences.language, preferences.theme]);

  const themeMutation = useMutation<void, Error, UpdateTheme>({
    mutationKey: ["UpdateTheme"],
    mutationFn: async ({ theme }) => {
      await localStorage.setString(STORAGE_KEYS.APP_THEME, theme);
      setPreferences((state) => ({ ...state, theme }));
      Uniwind.setTheme(theme);
    },
  });

  const languageMutation = useMutation<void, Error, UpdateLanguage>({
    mutationKey: ["UpdateLanguage"],
    mutationFn: async ({ language }) => {
      await localStorage.setString(STORAGE_KEYS.APP_LANGUAGE, language);
      setPreferences((state) => ({ ...state, language }));
      i18n.changeLanguage(language);
    },
  });

  const notificationMutation = useMutation<void, Error, UpdateNotification>({
    mutationKey: ["UpdateNotification"],
    mutationFn: async ({ notifications }) => {
      await localStorage.setBoolean(STORAGE_KEYS.APP_NOTIFICATIONS, notifications);
      setPreferences((state) => ({ ...state, notifications }));
    },
  });

  const screenshotsAllowedMutation = useMutation<void, Error, UpdateScreenshotsAllowed>({
    mutationKey: ["UpdateScreenshotsAllowed"],
    mutationFn: async ({ screenshotsAllowed }) => {
      await localStorage.setBoolean(STORAGE_KEYS.APP_SCREENSHOTS_ALLOWED, screenshotsAllowed);
      setPreferences((state) => ({ ...state, screenshotsAllowed }));
    },
  });

  return (
    <PreferenceContext.Provider
      value={{
        ...preferences,
        themeMutation,
        languageMutation,
        notificationMutation,
        screenshotsAllowedMutation,
      }}
    >
      {children}
    </PreferenceContext.Provider>
  );
}

export function usePreferences() {
  const context = React.useContext(PreferenceContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferenceProvider");
  }
  return context;
}
