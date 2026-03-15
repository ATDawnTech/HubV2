/**
 * Auth hook — provides the current user's token and helpers to set/clear it.
 *
 * In local development the token is auto-fetched from GET /v1/dev/token via
 * TanStack Query. In other environments this hook is a thin localStorage wrapper
 * until SAML SSO is implemented (Epic 4).
 */

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/axios";
import { config } from "@/lib/config";

interface DevTokenResponse {
  token: string;
  employee_id: string;
  expires_in: number;
}

function parseEmployeeIdFromToken(jwt: string | null): string | null {
  if (!jwt) return null;
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]!));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(
    () => localStorage.getItem("adthub_token"),
  );
  const [employeeId, setEmployeeIdState] = useState<string | null>(
    () => localStorage.getItem("adthub_employee_id") ?? parseEmployeeIdFromToken(localStorage.getItem("adthub_token")),
  );

  const setToken = useCallback((newToken: string) => {
    localStorage.setItem("adthub_token", newToken);
    setTokenState(newToken);
  }, []);

  const setEmployeeId = useCallback((id: string) => {
    localStorage.setItem("adthub_employee_id", id);
    setEmployeeIdState(id);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem("adthub_token");
    localStorage.removeItem("adthub_employee_id");
    setTokenState(null);
    setEmployeeIdState(null);
  }, []);

  // In local env, fetch a dev token via TanStack Query if none is stored.
  const devTokenQuery = useQuery({
    queryKey: ["auth", "dev-token"],
    queryFn: async (): Promise<DevTokenResponse> => {
      const res = await apiClient.get<DevTokenResponse>("/v1/dev/token");
      return res.data;
    },
    enabled: config.environment === "local" && token === null,
    staleTime: Infinity,
    retry: 1,
  });

  // Persist the dev token + employee_id to localStorage when the query resolves.
  useEffect(() => {
    if (devTokenQuery.data) {
      setToken(devTokenQuery.data.token);
      setEmployeeId(devTokenQuery.data.employee_id);
    }
  }, [devTokenQuery.data, setToken, setEmployeeId]);

  // Backfill: if we have a token but employee_id wasn't persisted yet, save it now.
  useEffect(() => {
    if (token && !localStorage.getItem("adthub_employee_id")) {
      const parsed = parseEmployeeIdFromToken(token);
      if (parsed) setEmployeeId(parsed);
    }
  }, [token, setEmployeeId]);

  return {
    token,
    employeeId,
    isLoading: devTokenQuery.isPending && devTokenQuery.fetchStatus !== "idle",
    error: devTokenQuery.isError ? "Could not fetch dev token from /v1/dev/token." : null,
    setToken,
    clearToken,
  };
}
