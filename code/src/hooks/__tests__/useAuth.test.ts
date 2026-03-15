/**
 * Tests for useAuth.
 *
 * Focuses on:
 * 1. parseEmployeeIdFromToken — private but tested via hook initial state
 * 2. localStorage initialisation on mount
 * 3. setToken / setEmployeeId / clearToken state mutations
 * 4. Dev token auto-fetch is disabled outside local environment
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/config", () => ({
  config: { environment: "prod", apiBaseUrl: "" },
}));

vi.mock("@/lib/axios", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

/** Build a minimal JWT with the given sub claim. */
function makeJwt(sub: string): string {
  const payload = btoa(JSON.stringify({ sub }));
  return `header.${payload}.sig`;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Initial state from localStorage
// ---------------------------------------------------------------------------

describe("useAuth — initial state", () => {
  it("returns null token and employeeId when localStorage is empty", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    expect(result.current.token).toBeNull();
    expect(result.current.employeeId).toBeNull();
  });

  it("reads token from localStorage on mount", () => {
    localStorage.setItem("adthub_token", "my_token");
    localStorage.setItem("adthub_employee_id", "emp_123");
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    expect(result.current.token).toBe("my_token");
    expect(result.current.employeeId).toBe("emp_123");
  });

  it("parses employeeId from JWT when adthub_employee_id is absent", () => {
    const jwt = makeJwt("emp_from_jwt");
    localStorage.setItem("adthub_token", jwt);
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    expect(result.current.employeeId).toBe("emp_from_jwt");
  });

  it("prefers stored adthub_employee_id over JWT sub when both exist", () => {
    const jwt = makeJwt("emp_from_jwt");
    localStorage.setItem("adthub_token", jwt);
    localStorage.setItem("adthub_employee_id", "emp_stored");
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    expect(result.current.employeeId).toBe("emp_stored");
  });

  it("returns null employeeId for a malformed JWT", () => {
    localStorage.setItem("adthub_token", "not.a.jwt");
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    // Malformed base64 → parseEmployeeIdFromToken returns null → falls back to null
    expect(result.current.employeeId).toBeNull();
  });

  it("returns null employeeId for a JWT with no sub claim", () => {
    const payload = btoa(JSON.stringify({ iss: "adthub" })); // no sub
    localStorage.setItem("adthub_token", `h.${payload}.s`);
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    expect(result.current.employeeId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setToken
// ---------------------------------------------------------------------------

describe("useAuth — setToken", () => {
  it("updates token state and persists to localStorage", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    act(() => { result.current.setToken("new_token"); });
    expect(result.current.token).toBe("new_token");
    expect(localStorage.getItem("adthub_token")).toBe("new_token");
  });
});

// ---------------------------------------------------------------------------
// clearToken
// ---------------------------------------------------------------------------

describe("useAuth — clearToken", () => {
  it("clears token and employeeId from state and localStorage", () => {
    localStorage.setItem("adthub_token", "tok");
    localStorage.setItem("adthub_employee_id", "emp_1");
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    act(() => { result.current.clearToken(); });
    expect(result.current.token).toBeNull();
    expect(result.current.employeeId).toBeNull();
    expect(localStorage.getItem("adthub_token")).toBeNull();
    expect(localStorage.getItem("adthub_employee_id")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Dev token auto-fetch disabled outside local environment
// ---------------------------------------------------------------------------

describe("useAuth — dev token fetch", () => {
  it("does not fetch dev token when environment is prod", async () => {
    const { apiClient } = await import("@/lib/axios");
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => !result.current.isLoading);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("isLoading is false when environment is prod (query is disabled)", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(false);
  });

  it("error is null when no fetch occurs", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    expect(result.current.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Backfill: stores employeeId parsed from token when absent from localStorage
// ---------------------------------------------------------------------------

describe("useAuth — backfill employeeId from JWT", () => {
  it("persists parsed employeeId to localStorage when adthub_employee_id is missing", async () => {
    const jwt = makeJwt("emp_backfill");
    localStorage.setItem("adthub_token", jwt);

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });

    await waitFor(() => !!localStorage.getItem("adthub_employee_id"));
    expect(localStorage.getItem("adthub_employee_id")).toBe("emp_backfill");
    expect(result.current.employeeId).toBe("emp_backfill");
  });

  it("does not overwrite adthub_employee_id when it is already set", async () => {
    const jwt = makeJwt("emp_from_jwt");
    localStorage.setItem("adthub_token", jwt);
    localStorage.setItem("adthub_employee_id", "emp_stored");

    renderHook(() => useAuth(), { wrapper: makeWrapper() });

    // Wait a tick for effects to run
    await new Promise((r) => setTimeout(r, 10));
    expect(localStorage.getItem("adthub_employee_id")).toBe("emp_stored");
  });
});
