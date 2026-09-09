import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  type UseMutationResult,
  useIsRestoring,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { gql } from "graphql-request";
import React, { type PropsWithChildren, createContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState } from "react-native";

import { getDashboardGroupsForRole } from "@/src/components/dashboard/dashboard-groups";
import {
  ACCESS_PROFILE_QUERY_KEY,
  type AccessProfile,
  type AccessRole,
  fetchAccessProfile,
} from "@/src/features/access-profile/api";
import { graphql } from "@/src/graphql";
import { type AuthenticateMutation } from "@/src/graphql/graphql";
import { getActiveDashboardGroup, setActiveDashboardGroup } from "@/src/lib/active-dashboard";
import { authenticateBiometric } from "@/src/lib/biometric-auth";
import { clearExpiredSession } from "@/src/lib/expired-session";
import { graphqlClient } from "@/src/lib/graphql-client";
import { localStorage } from "@/src/lib/local-storage";
import { SECURE_STORAGE_KEYS, secureStorage } from "@/src/lib/secure-storage";
import { usersCollection } from "@/src/powersync/collections";
import { firstRawUuid } from "@/src/powersync/grievance-sync";
import { disconnectPowerSync, setupPowerSync } from "@/src/powersync/system";
import { getSessionTokenState } from "@/src/startup/session-token";
import { isTokenExpiredError } from "@/src/utils/graphql-errors";

type CollectionUser = NonNullable<ReturnType<typeof usersCollection.get>>;

type LoginPayload = {
  username: string;
  password: string;
};

export type SessionUser = CollectionUser & {
  id: string;
  fullName: string | null;
};

type AuthenticationState = {
  user: SessionUser | null;
  isReady: boolean;
  sessionIssue: "expired" | "invalid" | null;
  isBiometricEnabled: boolean;
  isBiometricLocked: boolean;
  biometricLabel: string | null;
};

type SessionContextType = AuthenticationState & {
  accessProfile: AccessProfile | null;
  activeRole: AccessRole | null;
  isAccessProfileLoading: boolean;
  accessProfileError: Error | null;
  refetchAccessProfile: () => Promise<unknown>;
  switchRole: (roleId: string) => void;
  login: UseMutationResult<AuthenticateMutation, Error, LoginPayload>;
  logout: UseMutationResult<unknown, Error, unknown>;
  location: UseMutationResult<unknown, Error, Record<string, number | string>>;
  biometricUnlock: UseMutationResult<void, Error, void>;
  enableBiometricAuthentication: UseMutationResult<void, Error, void>;
  disableBiometricAuthentication: UseMutationResult<void, Error, void>;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);
const ACTIVE_ROLE_STORAGE_PREFIX = "v1.access-profile.active-role";

const AuthenticateQuery = graphql(`
  mutation Authenticate($username: String!, $password: String!) {
    tokenAuth(username: $username, password: $password) {
      token
      refreshExpiresIn
    }
  }
`);

const GET_AUTHENTICATED_USER = gql`
  query GetAuthenticatedUser {
    user {
      id
      username
      email
      lastName
      otherNames
      phone
      iUser {
        id
        uuid
        language {
          code
          name
        }
      }
      officer {
        uuid
      }
    }
  }
`;

function toFullName(user: { firstName?: string | null; lastName?: string | null } | null) {
  if (!user) return null;
  const joined = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return joined || null;
}

function toSessionUser(record: CollectionUser | undefined | null): SessionUser | null {
  if (!record) return null;
  return {
    ...record,
    id: String(record.id),
    fullName: toFullName(record),
  };
}

function roleMatchesId(role: AccessRole, roleId: string) {
  if (role.id === roleId) return true;

  // Relay Node IDs are base64 values such as "RoleGQLType:12", while the
  // deprecated iUser.roleId field is the underlying integer.
  try {
    const decodedId = globalThis.atob(role.id);
    return decodedId.slice(decodedId.lastIndexOf(":") + 1) === roleId;
  } catch {
    return false;
  }
}

export function SessionProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isRestoringQueries = useIsRestoring();
  const appStateRef = React.useRef(AppState.currentState);
  const isBiometricPromptActiveRef = React.useRef(false);
  const invalidatingSessionRef = React.useRef<string | null>(null);
  const accessExpiryRef = React.useRef<Error | null>(null);
  const pendingSessionIssueRef = React.useRef<"expired" | "invalid" | null>(null);
  const [roleSelection, setRoleSelection] = useState<{
    userReference: string;
    roleId: string;
  } | null>(null);

  const [authenticationState, setAuthenticationState] = useState<AuthenticationState>({
    user: null,
    isReady: false,
    sessionIssue: null,
    isBiometricEnabled: false,
    isBiometricLocked: false,
    biometricLabel: null,
  });

  // Reactively read the logged-in user from the local PowerSync users
  // collection. `isLoggedIn` is stored as 1/0 because the column is integer.
  const { data: rows = [], isReady: isUserCollectionReady } = useLiveQuery((q) =>
    q.from({ user: usersCollection }).where(({ user }) => eq(user.isLoggedIn, 1)),
  );

  const loggedInRow = rows[0] ?? null;

  const userReference = authenticationState.user?.reference ?? null;
  const activeRoleStorageKey = userReference
    ? `${ACTIVE_ROLE_STORAGE_PREFIX}.${userReference}`
    : null;
  const accessProfileQuery = useQuery({
    queryKey: [ACCESS_PROFILE_QUERY_KEY, userReference],
    queryFn: fetchAccessProfile,
    enabled: Boolean(userReference),
    staleTime: 5 * 60 * 1000,
    networkMode: "offlineFirst",
    retry: (failureCount, error) => !isTokenExpiredError(error) && failureCount < 2,
  });
  const accessProfile = accessProfileQuery.data ?? null;
  const availableRoles = React.useMemo(
    () =>
      accessProfile?.user?.iUser?.roles?.filter((role): role is AccessRole =>
        Boolean(role?.id && !role.isBlocked),
      ) ?? [],
    [accessProfile],
  );
  const activeRole = React.useMemo(() => {
    if (!userReference || availableRoles.length === 0) return null;

    const selectedRoleId =
      roleSelection?.userReference === userReference ? roleSelection.roleId : null;
    const persistedRoleId = activeRoleStorageKey
      ? localStorage.getString(activeRoleStorageKey)
      : null;
    const serverRoleId = accessProfile?.user?.iUser?.roleId;
    const preferredRoleIds = [
      selectedRoleId,
      persistedRoleId,
      serverRoleId == null ? null : String(serverRoleId),
    ];

    for (const roleId of preferredRoleIds) {
      if (!roleId) continue;
      const role = availableRoles.find((candidate) => roleMatchesId(candidate, roleId));
      if (role) return role;
    }
    return availableRoles[0];
  }, [
    accessProfile?.user?.iUser?.roleId,
    activeRoleStorageKey,
    availableRoles,
    roleSelection,
    userReference,
  ]);

  React.useEffect(() => {
    const grantedDashboards = getDashboardGroupsForRole(activeRole?.name, activeRole?.isSystem);
    if (
      grantedDashboards.length > 0 &&
      !grantedDashboards.some((group) => group.id === getActiveDashboardGroup())
    ) {
      setActiveDashboardGroup(grantedDashboards[0].id);
    }
  }, [activeRole]);

  const switchRole = React.useCallback(
    (roleId: string) => {
      if (!userReference) throw new Error("Sign in before switching roles.");
      const role = availableRoles.find((candidate) => candidate.id === roleId);
      if (!role) throw new Error("The selected role is not available to this user.");

      setRoleSelection({ userReference, roleId });
      if (activeRoleStorageKey) {
        void localStorage.setString(activeRoleStorageKey, roleId);
      }
    },
    [activeRoleStorageKey, availableRoles, userReference],
  );

  React.useEffect(() => {
    if (!isUserCollectionReady) return;

    const dbUser = toSessionUser(loggedInRow);
    const storedToken = secureStorage.getString(SECURE_STORAGE_KEYS.SESSION_AUTH_TOKEN);
    const tokenState = getSessionTokenState(storedToken);
    const invalidIssue =
      dbUser && tokenState === "expired"
        ? "expired"
        : dbUser && tokenState === "missing"
          ? "invalid"
          : !dbUser && storedToken
            ? "invalid"
            : null;

    if (invalidIssue) {
      const invalidationKey = `${dbUser?.reference ?? "orphan"}:${tokenState}`;
      pendingSessionIssueRef.current = invalidIssue;

      if (invalidatingSessionRef.current !== invalidationKey) {
        invalidatingSessionRef.current = invalidationKey;
        setAuthenticationState((state) => ({ ...state, user: null, isReady: false }));
        void clearExpiredSession().finally(() => {
          invalidatingSessionRef.current = null;
          setAuthenticationState((state) => ({
            ...state,
            user: null,
            isReady: true,
            sessionIssue: pendingSessionIssueRef.current,
            isBiometricEnabled: false,
            isBiometricLocked: false,
          }));
        });
      }
      return;
    }

    const isBiometricEnabled = secureStorage.getBoolean(SECURE_STORAGE_KEYS.BIOMETRIC_AUTH_ENABLED);
    const biometricUserReference = secureStorage.getString(
      SECURE_STORAGE_KEYS.BIOMETRIC_AUTH_USER_REFERENCE,
    );
    const shouldLockWithBiometrics = Boolean(
      dbUser?.isLoggedIn &&
      isBiometricEnabled &&
      (!biometricUserReference || biometricUserReference === dbUser.reference),
    );
    if (dbUser) pendingSessionIssueRef.current = null;

    setAuthenticationState((state) => ({
      ...state,
      isReady: true,
      user: dbUser,
      sessionIssue: dbUser ? null : pendingSessionIssueRef.current,
      isBiometricEnabled: shouldLockWithBiometrics,
      isBiometricLocked: shouldLockWithBiometrics
        ? state.isBiometricLocked || state.user?.reference !== dbUser?.reference
        : false,
    }));
  }, [isUserCollectionReady, loggedInRow]);

  React.useEffect(() => {
    const error = accessProfileQuery.error;
    if (!error || !isTokenExpiredError(error) || accessExpiryRef.current === error) return;

    accessExpiryRef.current = error;
    pendingSessionIssueRef.current = "expired";
    setAuthenticationState((state) => ({ ...state, isReady: false }));
    void clearExpiredSession().finally(() => {
      accessExpiryRef.current = null;
    });
  }, [accessProfileQuery.error]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (isBiometricPromptActiveRef.current) return;
      if (!previousAppState.match(/inactive|background/) || nextAppState !== "active") return;

      setAuthenticationState((state) => {
        if (!state.user?.isLoggedIn || !state.isBiometricEnabled || state.isBiometricLocked) {
          return state;
        }

        return {
          ...state,
          isBiometricLocked: true,
        };
      });
    });

    return () => subscription.remove();
  }, []);

  const login = useMutation<AuthenticateMutation, Error, LoginPayload>({
    mutationKey: ["login"],
    mutationFn: async (payload) => {
      return await graphqlClient.request(AuthenticateQuery, {
        username: payload.username,
        password: payload.password,
      });
    },
    onSuccess: async (data) => {
      if (!data?.tokenAuth?.token) {
        throw new Error("Authentication failed");
      }
      const authToken = data.tokenAuth.token;
      pendingSessionIssueRef.current = null;
      await secureStorage.setString(SECURE_STORAGE_KEYS.SESSION_AUTH_TOKEN, authToken);

      await setupPowerSync().catch((error) => {
        console.error("PowerSync setup failed after login", error);
      });

      const response = await graphqlClient.request(
        GET_AUTHENTICATED_USER,
        {},
        { authorization: `Bearer ${authToken}` },
      );
      const currentUser = response.user;
      if (!currentUser?.id) {
        throw new Error("Authentication response missing user id.");
      }

      const reference = String(currentUser.id);
      const nowIso = new Date().toISOString();

      // Mark any previously logged-in users as logged out. We iterate the
      // collection because `usersCollection` doesn't support a bulk update.
      const allUsers = await usersCollection.toArrayWhenReady();
      for (const existing of allUsers) {
        if (existing.id !== reference && existing.isLoggedIn) {
          const tx = usersCollection.update(existing.id, {}, (draft) => {
            draft.isLoggedIn = 0;
            draft.authToken = null;
            draft.updatedAt = nowIso;
          });
          await tx.isPersisted.promise;
        }
      }

      const language =
        typeof currentUser?.iUser?.language === "object" && currentUser.iUser.language
          ? JSON.stringify(currentUser.iUser.language)
          : ((currentUser?.iUser?.language as string | undefined) ?? null);
      const userUuid = firstRawUuid(
        currentUser.id,
        currentUser?.iUser?.uuid,
        currentUser?.officer?.uuid,
      );

      const baseFields = {
        uuid: userUuid,
        username: currentUser.username ?? null,
        email: currentUser.email ?? null,
        phone: currentUser.phone ?? null,
        // The local users table predates the backend's `otherNames` naming.
        // Store it in `firstName` so `toFullName` preserves the complete name.
        firstName: currentUser.otherNames ?? null,
        lastName: currentUser.lastName ?? null,
        authToken,
        language,
        lastLogin: nowIso,
        isLoggedIn: 1,
        updatedAt: nowIso,
      };

      if (usersCollection.has(reference)) {
        const tx = usersCollection.update(reference, {}, (draft) => {
          Object.assign(draft, baseFields);
        });
        await tx.isPersisted.promise;
      } else {
        const tx = usersCollection.insert({
          id: reference,
          reference,
          hasLocation: 0,
          regionId: null,
          districtId: null,
          wardId: null,
          villageId: null,
          createdAt: nowIso,
          deletedAt: null,
          ...baseFields,
        });
        await tx.isPersisted.promise;
      }

      const persistedRecord = usersCollection.get(reference);
      setAuthenticationState((state) => ({
        ...state,
        user: toSessionUser(persistedRecord ?? null),
        isReady: true,
        sessionIssue: null,
        isBiometricLocked: false,
      }));
    },
  });

  const logout = useMutation<unknown, Error, unknown>({
    mutationKey: ["logout"],
    mutationFn: async () => {
      await secureStorage.remove(SECURE_STORAGE_KEYS.SESSION_AUTH_TOKEN);
      await secureStorage.remove(SECURE_STORAGE_KEYS.BIOMETRIC_AUTH_ENABLED);
      await secureStorage.remove(SECURE_STORAGE_KEYS.BIOMETRIC_AUTH_USER_REFERENCE);

      await disconnectPowerSync().catch((error) => {
        console.error("PowerSync disconnect failed", error);
      });

      const reference = authenticationState.user?.reference;
      if (!reference) {
        throw new Error("Logout is failed");
      }

      if (usersCollection.has(reference)) {
        const tx = usersCollection.update(reference, {}, (draft) => {
          draft.authToken = null;
          draft.isLoggedIn = 0;
          draft.updatedAt = new Date().toISOString();
        });
        await tx.isPersisted.promise;
      }
      queryClient.removeQueries({
        queryKey: [ACCESS_PROFILE_QUERY_KEY, reference],
        exact: true,
      });
    },
    onSuccess: () => {
      pendingSessionIssueRef.current = null;
      setAuthenticationState((state) => ({
        ...state,
        user: null,
        isReady: true,
        sessionIssue: null,
        isBiometricEnabled: false,
        isBiometricLocked: false,
        biometricLabel: null,
      }));
    },
  });

  const biometricUnlock = useMutation<void, Error, void>({
    mutationKey: ["biometric-unlock"],
    mutationFn: async () => {
      isBiometricPromptActiveRef.current = true;

      const availability = await authenticateBiometric({
        promptMessage: t("unlock_tasaf"),
        promptSubtitle: t("confirm_identity"),
        promptDescription: t("biometric_continue_prompt"),
      }).finally(() => {
        isBiometricPromptActiveRef.current = false;
      });

      setAuthenticationState((state) => ({
        ...state,
        biometricLabel: availability.label,
      }));
    },
    onSuccess: () => {
      setAuthenticationState((state) => ({
        ...state,
        isReady: true,
        isBiometricEnabled: true,
        isBiometricLocked: false,
      }));
    },
  });

  const enableBiometricAuthentication = useMutation<void, Error, void>({
    mutationKey: ["enable-biometric-authentication"],
    mutationFn: async () => {
      const reference = authenticationState.user?.reference;
      if (!reference) {
        throw new Error(t("sign_in_before_enabling_biometric"));
      }

      isBiometricPromptActiveRef.current = true;

      const availability = await authenticateBiometric({
        promptMessage: t("enable_biometric_unlock"),
        promptSubtitle: t("confirm_identity"),
        promptDescription: t("biometric_required_prompt"),
      }).finally(() => {
        isBiometricPromptActiveRef.current = false;
      });

      await secureStorage.setBoolean(SECURE_STORAGE_KEYS.BIOMETRIC_AUTH_ENABLED, true);
      await secureStorage.setString(SECURE_STORAGE_KEYS.BIOMETRIC_AUTH_USER_REFERENCE, reference);

      setAuthenticationState((state) => ({
        ...state,
        biometricLabel: availability.label,
      }));
    },
    onSuccess: () => {
      setAuthenticationState((state) => ({
        ...state,
        isBiometricEnabled: true,
        isBiometricLocked: false,
      }));
    },
  });

  const disableBiometricAuthentication = useMutation<void, Error, void>({
    mutationKey: ["disable-biometric-authentication"],
    mutationFn: async () => {
      await secureStorage.remove(SECURE_STORAGE_KEYS.BIOMETRIC_AUTH_ENABLED);
      await secureStorage.remove(SECURE_STORAGE_KEYS.BIOMETRIC_AUTH_USER_REFERENCE);
    },
    onSuccess: () => {
      setAuthenticationState((state) => ({
        ...state,
        isBiometricEnabled: false,
        isBiometricLocked: false,
        biometricLabel: null,
      }));
    },
  });

  const location = useMutation<unknown, Error, Record<string, number | string>>({
    mutationKey: ["location"],
    mutationFn: async (payload) => {
      const reference = authenticationState.user?.reference;
      if (!reference || !usersCollection.has(reference)) {
        throw new Error("Sign in before updating the working location.");
      }

      const nowIso = new Date().toISOString();
      const tx = usersCollection.update(reference, {}, (draft) => {
        draft.regionId = String(payload.regionId ?? "");
        draft.districtId = String(payload.districtId ?? "");
        draft.wardId = String(payload.wardId ?? "");
        draft.villageId = String(payload.villageId ?? "");
        draft.hasLocation = 1;
        draft.updatedAt = nowIso;
      });
      await tx.isPersisted.promise;
    },
    onError: (error) => {
      console.log(error);
    },
  });

  return (
    <SessionContext.Provider
      value={{
        ...authenticationState,
        isReady: authenticationState.isReady && !isTokenExpiredError(accessProfileQuery.error),
        accessProfile,
        activeRole,
        isAccessProfileLoading:
          !accessProfile && (isRestoringQueries || accessProfileQuery.isPending),
        accessProfileError: accessProfileQuery.error,
        refetchAccessProfile: async () => await accessProfileQuery.refetch(),
        switchRole,
        login,
        logout,
        location,
        biometricUnlock,
        enableBiometricAuthentication,
        disableBiometricAuthentication,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = React.useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
