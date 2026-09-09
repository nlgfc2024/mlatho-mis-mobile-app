import "@/src/components/ui/scroll-indicator-defaults";
import "../global.css";

import { PowerSyncContext } from "@powersync/react-native";
import { onlineManager } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SyncStatusToast } from "@/src/components/sync/sync-status-toast";
import { STORAGE_KEYS } from "@/src/constants/storage";
import { useScreenCaptureProtection } from "@/src/hooks/use-screen-capture-protection";
import i18n from "@/src/i18n";
import {
  LOCAL_STORAGE_HYDRATE_KEYS,
  LOCAL_STORAGE_HYDRATE_PREFIXES,
  localStorage,
} from "@/src/lib/local-storage";
import { SECURE_STORAGE_HYDRATE_KEYS, secureStorage } from "@/src/lib/secure-storage";
import { db as powerSyncDb, initializePowerSyncDatabase } from "@/src/powersync/system";
import PreferenceProvider, { usePreferences } from "@/src/providers/preference-context";
import { QueryProvider } from "@/src/providers/query-provider";
import { SessionProvider, useSession } from "@/src/providers/session-context";
import {
  getStartupNetworkState,
  subscribeToStartupNetwork,
  useStartupNetworkState,
} from "@/src/startup/network-state";
import { StartupGate, useStartup } from "@/src/startup/startup-context";
import { StartupScreen } from "@/src/startup/startup-screen";
import {
  registerBackgroundSyncAsync,
  restorePersistedSyncSession,
  runSyncLogicInternal,
  setSyncConnectivity,
} from "@/src/tasks/background-upload-task-definition";

onlineManager.setEventListener((setOnline) => {
  const update = () => {
    const network = getStartupNetworkState();
    if (network.resolved) setOnline(network.online);
  };
  const unsubscribe = subscribeToStartupNetwork(update);
  update();
  return unsubscribe;
});

type InfrastructureState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; error: Error };

export default function RootLayout() {
  const [infrastructure, setInfrastructure] = useState<InfrastructureState>({
    status: "loading",
  });
  const [infrastructureAttempt, setInfrastructureAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      secureStorage.hydrate(SECURE_STORAGE_HYDRATE_KEYS),
      localStorage.hydrate(LOCAL_STORAGE_HYDRATE_KEYS),
      localStorage.hydratePrefixes(LOCAL_STORAGE_HYDRATE_PREFIXES),
      initializePowerSyncDatabase(),
    ]).then(
      async () => {
        const storedLanguage = localStorage.getString(STORAGE_KEYS.APP_LANGUAGE);
        if (storedLanguage === "en" || storedLanguage === "sw") {
          await i18n.changeLanguage(storedLanguage);
        }
        if (!cancelled) setInfrastructure({ status: "ready" });
      },
      (error: unknown) => {
        if (!cancelled) {
          setInfrastructure({
            status: "error",
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [infrastructureAttempt]);

  useEffect(() => {
    if (infrastructure.status !== "ready") return;

    void restorePersistedSyncSession();
    void registerBackgroundSyncAsync().catch((error) => {
      console.warn("Background sync registration failed", error);
    });
  }, [infrastructure.status]);

  if (infrastructure.status !== "ready") {
    return (
      <>
        <ScreenCaptureProtection keyName="tasaf-startup" />
        <StartupScreen
          errorKind={infrastructure.status === "error" ? "local-data" : undefined}
          loadingReason="local-data"
          onRetry={
            infrastructure.status === "error"
              ? () => {
                  setInfrastructure({ status: "loading" });
                  setInfrastructureAttempt((attempt) => attempt + 1);
                }
              : undefined
          }
        />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <PowerSyncContext.Provider value={powerSyncDb}>
      <QueryProvider>
        <SafeAreaProvider>
          <PreferenceProvider>
            <ScreenCapturePreferenceController />
            <SessionProvider>
              <StartupGate>
                <RootNavigator />
                <ProtectedRuntime />
                <StatusBar style="auto" />
              </StartupGate>
            </SessionProvider>
          </PreferenceProvider>
        </SafeAreaProvider>
      </QueryProvider>
    </PowerSyncContext.Provider>
  );
}

function ScreenCaptureProtection({ keyName }: { keyName?: string }) {
  useScreenCaptureProtection(keyName);
  return null;
}

function ScreenCapturePreferenceController() {
  const { screenshotsAllowed } = usePreferences();
  if (screenshotsAllowed) return null;
  return <ScreenCaptureProtection />;
}

function RootNavigator() {
  const { destination } = useStartup();
  const isProtected = destination === "setup" || destination === "dashboard";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={destination === "login"}>
        <Stack.Screen name="index" />
      </Stack.Protected>

      <Stack.Protected guard={destination === "biometric"}>
        <Stack.Screen name="biometric-lock" />
      </Stack.Protected>

      <Stack.Protected guard={isProtected}>
        <Stack.Screen name="(protected)" />
      </Stack.Protected>
    </Stack>
  );
}

let lastStartupSyncUser: string | null = null;

function ProtectedRuntime() {
  const { destination } = useStartup();
  if (destination !== "setup" && destination !== "dashboard") return null;

  return (
    <>
      <ForegroundSyncController />
      <SyncStatusToast />
    </>
  );
}

function ForegroundSyncController() {
  const { user } = useSession();
  const network = useStartupNetworkState();
  const previousOnlineRef = useRef<boolean | null>(null);
  const userReference = user?.reference ?? user?.id ?? null;

  useEffect(() => {
    if (!network.resolved) return;

    setSyncConnectivity(network.online);
    const previousOnline = previousOnlineRef.current;
    previousOnlineRef.current = network.online;

    if (!userReference) {
      lastStartupSyncUser = null;
      return;
    }
    if (!network.online) return;
    if (lastStartupSyncUser !== userReference) {
      lastStartupSyncUser = userReference;
      void runSyncLogicInternal("App Startup");
    } else if (previousOnline === false) {
      void runSyncLogicInternal("Network Recovery");
    }
  }, [network.online, network.resolved, userReference]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" || !userReference) return;
      const currentNetwork = getStartupNetworkState();
      if (currentNetwork.resolved && currentNetwork.online) {
        void runSyncLogicInternal("App Foreground");
      }
    });

    return () => subscription.remove();
  }, [userReference]);

  return null;
}
