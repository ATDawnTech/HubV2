/**
 * Tests for useImpersonation.
 *
 * Tests cover:
 * 1. isImpersonating derived from localStorage
 * 2. startImpersonation — saves current tokens, fetches test user token, persists it
 * 3. stopImpersonation — restores original tokens, clears impersonation keys
 * 4. Error handling in stopImpersonation (unassignAllMyRoles failure is best-effort)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockApiGet = vi.fn();
vi.mock("@/lib/axios", () => ({
  apiClient: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

const mockUnassignAllMyRoles = vi.fn();
vi.mock("@/services/role.service", () => ({
  roleService: { unassignAllMyRoles: () => mockUnassignAllMyRoles() },
}));

// Mock window.location.reload so tests don't actually reload
const mockReload = vi.fn();
Object.defineProperty(window, "location", {
  value: { ...window.location, reload: mockReload },
  writable: true,
});

import { useImpersonation } from "../useImpersonation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// isImpersonating
// ---------------------------------------------------------------------------

describe("useImpersonation — isImpersonating", () => {
  it("is false when adthub_original_token is not set", () => {
    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    expect(result.current.isImpersonating).toBe(false);
  });

  it("is true when adthub_original_token is present in localStorage", () => {
    localStorage.setItem("adthub_original_token", "original_jwt");
    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    expect(result.current.isImpersonating).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// originalEmployeeId
// ---------------------------------------------------------------------------

describe("useImpersonation — originalEmployeeId", () => {
  it("is null when not impersonating", () => {
    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    expect(result.current.originalEmployeeId).toBeNull();
  });

  it("returns the stored original employee ID when impersonating", () => {
    localStorage.setItem("adthub_original_token", "original_jwt");
    localStorage.setItem("adthub_original_employee_id", "emp_real_user");
    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    expect(result.current.originalEmployeeId).toBe("emp_real_user");
  });
});

// ---------------------------------------------------------------------------
// startImpersonation
// ---------------------------------------------------------------------------

describe("useImpersonation — startImpersonation", () => {
  it("saves current token and employee_id to original keys before switching", async () => {
    localStorage.setItem("adthub_token", "real_token");
    localStorage.setItem("adthub_employee_id", "emp_real");
    mockApiGet.mockResolvedValue({ data: { token: "test_token", employee_id: "emp_role_tester" } });

    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    await act(async () => { await result.current.startImpersonation(); });

    expect(localStorage.getItem("adthub_original_token")).toBe("real_token");
    expect(localStorage.getItem("adthub_original_employee_id")).toBe("emp_real");
  });

  it("saves the test user token and employee_id returned by the API", async () => {
    localStorage.setItem("adthub_token", "real_token");
    localStorage.setItem("adthub_employee_id", "emp_real");
    mockApiGet.mockResolvedValue({ data: { token: "test_token", employee_id: "emp_role_tester" } });

    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    await act(async () => { await result.current.startImpersonation(); });

    expect(localStorage.getItem("adthub_token")).toBe("test_token");
    expect(localStorage.getItem("adthub_employee_id")).toBe("emp_role_tester");
  });

  it("calls window.location.reload after switching", async () => {
    mockApiGet.mockResolvedValue({ data: { token: "test_token", employee_id: "emp_role_tester" } });

    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    await act(async () => { await result.current.startImpersonation(); });

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("calls the dev token endpoint with the test employee ID", async () => {
    mockApiGet.mockResolvedValue({ data: { token: "test_token", employee_id: "emp_role_tester" } });

    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    await act(async () => { await result.current.startImpersonation(); });

    expect(mockApiGet).toHaveBeenCalledWith(
      "/v1/dev/token",
      { params: { employee_id: "emp_role_tester" } },
    );
  });

  it("does not save original keys when no current token exists", async () => {
    mockApiGet.mockResolvedValue({ data: { token: "test_token", employee_id: "emp_role_tester" } });

    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    await act(async () => { await result.current.startImpersonation(); });

    // No current token existed, so original_token should not be set
    expect(localStorage.getItem("adthub_original_token")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// stopImpersonation
// ---------------------------------------------------------------------------

describe("useImpersonation — stopImpersonation", () => {
  beforeEach(() => {
    // Set up impersonation state
    localStorage.setItem("adthub_original_token", "real_token");
    localStorage.setItem("adthub_original_employee_id", "emp_real");
    localStorage.setItem("adthub_token", "test_token");
    localStorage.setItem("adthub_employee_id", "emp_role_tester");
    mockUnassignAllMyRoles.mockResolvedValue(undefined);
  });

  it("restores original token and employee_id", async () => {
    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    await act(async () => { await result.current.stopImpersonation(); });

    expect(localStorage.getItem("adthub_token")).toBe("real_token");
    expect(localStorage.getItem("adthub_employee_id")).toBe("emp_real");
  });

  it("removes the original token and employee_id keys after restoring", async () => {
    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    await act(async () => { await result.current.stopImpersonation(); });

    expect(localStorage.getItem("adthub_original_token")).toBeNull();
    expect(localStorage.getItem("adthub_original_employee_id")).toBeNull();
  });

  it("calls window.location.reload after restoring", async () => {
    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    await act(async () => { await result.current.stopImpersonation(); });

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("calls unassignAllMyRoles before restoring identity", async () => {
    const order: string[] = [];
    mockUnassignAllMyRoles.mockImplementation(async () => { order.push("unassign"); });
    mockReload.mockImplementation(() => { order.push("reload"); });

    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    await act(async () => { await result.current.stopImpersonation(); });

    expect(order[0]).toBe("unassign");
    expect(order[1]).toBe("reload");
  });

  it("continues restoring identity even when unassignAllMyRoles throws", async () => {
    mockUnassignAllMyRoles.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useImpersonation(), { wrapper: makeWrapper() });
    await act(async () => { await result.current.stopImpersonation(); });

    // Identity should be restored despite the error
    expect(localStorage.getItem("adthub_token")).toBe("real_token");
    expect(localStorage.getItem("adthub_original_token")).toBeNull();
    expect(mockReload).toHaveBeenCalled();
  });
});
