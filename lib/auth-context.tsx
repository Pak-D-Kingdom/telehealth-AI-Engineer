"use client";

import React, { createContext, useCallback, useContext } from "react";
import useSWR from "swr";
import { apiFetcher, apiRequest, type ApiError } from "@/lib/api-client";
import type { AdminUser, ApiResponse } from "@/lib/api-types";

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

type SessionResponse = ApiResponse<{ user: AdminUser }>;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, mutate } = useSWR<SessionResponse, ApiError>(
    "/api/auth/me",
    apiFetcher,
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    },
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await apiRequest<SessionResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      await mutate(session, { revalidate: false });
    },
    [mutate],
  );

  const logout = useCallback(async () => {
    await apiRequest<void>("/api/auth/logout", { method: "POST" });
    await mutate(undefined, { revalidate: false });
  }, [mutate]);

  const user = data?.data.user ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
