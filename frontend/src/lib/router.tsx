/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { RequirePermission } from "@/components/guards/RequirePermission";
import { AdminSettingsPage } from "@/features/admin-settings";
import { DashboardPage } from "@/features/dashboard";
import {
  EmployeeDetailPage,
  EmployeeListPage,
  OffboardingHubPage,
} from "@/features/employees";
import { TemplateListPage, CanvasEditorPage } from "@/features/test-nodes";
import { AssetListPage, AssetCategoryListPage } from "@/features/assets";
import { AccountSettingsPage } from "@/features/account";
import { ComingSoonPage } from "@/components/ui/ComingSoonPage";
import { NotFoundPage } from "@/components/ui/NotFoundPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { AuthCallbackPage } from "@/features/auth/pages/AuthCallbackPage";
import { RequireAuth } from "@/components/guards/RequireAuth";

export const router = createBrowserRouter([
  // Auth routes — rendered outside Layout (no sidebar/nav)
  { path: "/login", element: <LoginPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  {
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/dashboard", element: <DashboardPage /> },
      {
        path: "/employees",
        element: (
          <RequirePermission module="employees" action="view_module">
            <EmployeeListPage />
          </RequirePermission>
        ),
      },
      {
        path: "/employees/offboarding",
        element: (
          <RequirePermission module="employees" action="view_module">
            <OffboardingHubPage />
          </RequirePermission>
        ),
      },
      {
        path: "/employees/:id",
        element: (
          <RequirePermission module="employees" action="view_module">
            <EmployeeDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: "/admin-settings",
        element: (
          <RequirePermission module="admin" action="view_module">
            <Navigate to="/admin-settings/dropdowns" replace />
          </RequirePermission>
        ),
      },
      {
        path: "/admin-settings/:subModule",
        element: (
          <RequirePermission module="admin" action="view_module">
            <AdminSettingsPage />
          </RequirePermission>
        ),
      },
      { path: "/account", element: <AccountSettingsPage /> },
      { path: "/test-nodes", element: <TemplateListPage /> },
      { path: "/test-nodes/new", element: <CanvasEditorPage /> },
      { path: "/test-nodes/:templateId", element: <CanvasEditorPage /> },
      /* Coming-soon module routes */
      {
        path: "/assets",
        element: (
          <RequirePermission module="assets" action="view_module">
            <AssetListPage />
          </RequirePermission>
        ),
      },
      {
        path: "/asset-categories",
        element: (
          <RequirePermission module="assets" action="view_module">
            <AssetCategoryListPage />
          </RequirePermission>
        ),
      },
      {
        path: "/intake",
        element: (
          <RequirePermission module="intake" action="view_module">
            <ComingSoonPage title="Intake Management" />
          </RequirePermission>
        ),
      },
      {
        path: "/onboarding",
        element: (
          <RequirePermission module="onboarding" action="view_module">
            <ComingSoonPage title="Onboarding" />
          </RequirePermission>
        ),
      },
      {
        path: "/projects",
        element: (
          <RequirePermission module="project_management" action="view_module">
            <ComingSoonPage title="Project Management" />
          </RequirePermission>
        ),
      },
      {
        path: "/audit",
        element: (
          <RequirePermission module="audit" action="view_module">
            <ComingSoonPage title="Audit & Logging" />
          </RequirePermission>
        ),
      },
      {
        path: "/timesheets",
        element: (
          <RequirePermission module="timesheets" action="view_module">
            <ComingSoonPage title="Timesheets" />
          </RequirePermission>
        ),
      },
      {
        path: "/productivity",
        element: (
          <RequirePermission module="productivity" action="view_module">
            <ComingSoonPage title="Productivity" />
          </RequirePermission>
        ),
      },
      {
        path: "/ats",
        element: (
          <RequirePermission module="ats" action="view_module">
            <ComingSoonPage title="ATS" />
          </RequirePermission>
        ),
      },
      /* Catch-all */
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
