import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { Permission } from "@/features/admin-settings/types/role.types";

// ---------------------------------------------------------------------------
// Mocks — must be declared before the static import below
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ employeeId: "emp_test" }),
}));

const mockGetMyEffectivePermissions = vi.fn();

vi.mock("@/services/role.service", () => ({
  roleService: {
    getMyEffectivePermissions: () => mockGetMyEffectivePermissions(),
    getRoleAssignments: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/features/admin-settings/hooks/useRoles", () => ({
  useRoles: () => ({ data: { roles: [] } }),
}));

import { usePermissions } from "@/hooks/usePermissions";

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function p(module: string, action: string): Permission {
  return { module, action };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePermissions — non-impersonating (real user)", () => {
  beforeEach(() => {
    localStorage.removeItem("adthub_original_token");
    mockGetMyEffectivePermissions.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hasPermission always returns true when not impersonating", async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() });

    await waitFor(() => !result.current.isLoading);
    expect(result.current.hasPermission("admin", "manage_roles")).toBe(true);
    expect(result.current.hasPermission("employees", "view_module")).toBe(true);
  });

  it("hasAnyPermissionInModule always returns true when not impersonating", async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() });

    await waitFor(() => !result.current.isLoading);
    expect(result.current.hasAnyPermissionInModule("admin")).toBe(true);
  });

  it("isImpersonating is false", async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() });

    expect(result.current.isImpersonating).toBe(false);
  });
});

describe("usePermissions — impersonating test user", () => {
  beforeEach(() => {
    localStorage.setItem("adthub_original_token", "original_jwt_token");
  });

  afterEach(() => {
    localStorage.removeItem("adthub_original_token");
    vi.clearAllMocks();
  });

  it("hasPermission returns false when test user has no permissions", async () => {
    mockGetMyEffectivePermissions.mockResolvedValue([]);

    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() });

    await waitFor(() => !result.current.isLoading);
    expect(result.current.hasPermission("admin", "manage_roles")).toBe(false);
    expect(result.current.hasPermission("employees", "view_module")).toBe(false);
  });

  it("hasPermission returns true for a granted permission", async () => {
    mockGetMyEffectivePermissions.mockResolvedValue([
      p("employees", "view_module"),
      p("admin", "manage_roles"),
    ]);

    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.hasPermission("employees", "view_module")).toBe(true);
      expect(result.current.hasPermission("admin", "manage_roles")).toBe(true);
    });
  });

  it("hasPermission returns false for a permission not in the granted list", async () => {
    mockGetMyEffectivePermissions.mockResolvedValue([p("employees", "view_module")]);

    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() });

    await waitFor(() => !result.current.isLoading);
    expect(result.current.hasPermission("admin", "manage_roles")).toBe(false);
  });

  it("hasAnyPermissionInModule returns true when at least one permission in module is granted", async () => {
    mockGetMyEffectivePermissions.mockResolvedValue([p("admin", "view_module")]);

    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() });

    await waitFor(() => result.current.hasAnyPermissionInModule("admin") === true);
  });

  it("hasAnyPermissionInModule returns false when no permissions in module are granted", async () => {
    mockGetMyEffectivePermissions.mockResolvedValue([p("employees", "view_module")]);

    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() });

    await waitFor(() => !result.current.isLoading);
    expect(result.current.hasAnyPermissionInModule("admin")).toBe(false);
  });

  it("isImpersonating is true", async () => {
    mockGetMyEffectivePermissions.mockResolvedValue([]);

    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() });

    expect(result.current.isImpersonating).toBe(true);
  });
});
