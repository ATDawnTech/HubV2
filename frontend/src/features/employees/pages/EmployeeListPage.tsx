import { useMemo, useState, useCallback } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { getAxiosErrorMessage } from "@/lib/axiosError";
import { BulkArchiveConfirmation } from "../components/BulkArchiveConfirmation";
import { BulkImportModal } from "../components/BulkImportModal";
import { CreateEmployeeModal } from "../components/CreateEmployeeModal";
import { EmployeeTable } from "../components/EmployeeTable";
import { EmployeeAdminToolbar } from "../components/EmployeeAdminToolbar";
import { EmployeeSearchBar } from "../components/EmployeeSearchBar";
import { useArchiveEmployee } from "../hooks/useArchiveEmployee";
import { useCreateEmployee } from "../hooks/useCreateEmployee";
import { useEmployeeFilters } from "../hooks/useEmployeeFilters";
import { useEmployeeSelection } from "../hooks/useEmployeeSelection";
import { useEmployees } from "../hooks/useEmployees";
import { useStaleFieldDetector } from "../hooks/useStaleFieldDetector";
import { employeeService } from "@/services/employee.service";
import type { CreateEmployeeFormValues } from "../schemas/employee.schemas";
import { usePermissions } from "@/hooks/usePermissions";

export function EmployeeListPage(): JSX.Element {
  const [createOpen, setCreateOpen] = useState(false);
  const [createMounted, setCreateMounted] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkArchiveConfirm, setBulkArchiveConfirm] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  const { hasPermission } = usePermissions();
  const canAccessAdminMode = hasPermission("employees", "access_employee_admin_mode");
  const canCreate = hasPermission("employees", "create_employee");
  const canEdit = hasPermission("employees", "edit_employee");
  const canExport = hasPermission("employees", "export_employees");
  const canManageRoles = hasPermission("admin", "assign_roles");

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [pageSize, setPageSize] = useLocalStorage<number>("emp-page-size", 25);

  const filters = useEmployeeFilters();
  const filterParams = filters.buildFilterParams(debouncedSearch);
  const employees = useEmployees({ ...filterParams, limit: pageSize });

  function handlePageSizeChange(size: number): void {
    setPageSize(size);
    employees.resetPage();
  }

  const { getStaleFields } = useStaleFieldDetector();
  const createEmployee = useCreateEmployee();
  const archiveEmployee = useArchiveEmployee();

  const employeeList = useMemo(() => employees.data?.employees ?? [], [employees.data?.employees]);
  const total = employees.data?.meta.total ?? 0;
  const selection = useEmployeeSelection(employeeList, total, filterParams);

  function openCreate() { setCreateMounted(true); setCreateOpen(true); }
  function dismissCreate() { setCreateOpen(false); }
  function closeCreate() { setCreateOpen(false); setCreateMounted(false); createEmployee.reset(); }

  function handleCreate(data: CreateEmployeeFormValues): void {
    if (!canCreate) return;
    createEmployee.mutate(data, { onSuccess: () => closeCreate() });
  }

  const getExportRows = useCallback(async () => {
    if (!selection.someSelected) return employeeList;
    const selectedOnPage = employeeList.filter((e) => selection.selectedIds.has(e.id));
    if (selectedOnPage.length === selection.selectedIds.size) return selectedOnPage;
    const all = await employeeService.fetchAllEmployees(filterParams);
    return all.filter((e) => selection.selectedIds.has(e.id));
  }, [selection.someSelected, selection.selectedIds, employeeList, filterParams]);

  return (
    <main className="px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orange-500">Employees</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {employees.data?.meta.total ?? "—"} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canAccessAdminMode && adminMode && (
            <EmployeeAdminToolbar
              canExport={canExport}
              selection={selection}
              getExportRows={getExportRows}
              onBulkArchive={() => setBulkArchiveConfirm(true)}
              onImport={() => setImportOpen(true)}
            />
          )}
          {canAccessAdminMode && (
            <button
              onClick={() => setAdminMode((v) => !v)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                adminMode
                  ? "border-orange-500 bg-orange-500/10 text-orange-500"
                  : "border-border text-muted-foreground hover:border-orange-500 hover:text-orange-500"
              }`}
            >
              {adminMode ? "Admin Mode ON" : "Admin Mode"}
            </button>
          )}
          <button
            onClick={canCreate ? openCreate : undefined}
            disabled={!canCreate}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              canCreate
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed border border-orange-500/40 bg-orange-500/10 text-orange-500/50"
            }`}
          >
            Add Employee
          </button>
        </div>
      </div>

      <EmployeeSearchBar
        filters={filters}
        filterOpen={filterOpen}
        setFilterOpen={setFilterOpen}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        onResetPage={employees.resetPage}
      />

      {employees.isLoading && <LoadingSpinner message="Loading employees…" />}

      {employees.isError && (
        <ErrorMessage message="Could not load employees." onRetry={() => employees.refetch()} />
      )}

      {employees.data && (
        <div className={`transition-opacity duration-300 ease-in-out ${employees.isFetching ? "opacity-60" : "opacity-100"}`}>
          <EmployeeTable
            employees={employees.data.employees}
            onArchive={(id) => archiveEmployee.mutate(id)}
            isArchiving={archiveEmployee.isPending}
            hasNextPage={employees.hasNextPage}
            hasPrevPage={employees.hasPrevPage}
            onNextPage={employees.goToNextPage}
            onPrevPage={employees.goToPrevPage}
            adminMode={adminMode}
            canEdit={canEdit}
            canExport={canExport}
            canManageRoles={canManageRoles}
            selectedIds={selection.selectedIds}
            onToggleAll={() => { void selection.toggleAll(); }}
            onToggleOne={selection.toggleOne}
            allPagesSelected={selection.allPagesSelected}
            isSelectingAll={selection.isSelectingAll}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            total={employees.data.meta.total}
            getStaleFields={getStaleFields}
          />
        </div>
      )}

      {createMounted && (
        <div style={!createOpen ? { display: "none" } : undefined}>
          <CreateEmployeeModal
            onSubmit={handleCreate}
            onClose={closeCreate}
            onDismiss={dismissCreate}
            isSubmitting={createEmployee.isPending}
            error={
              createEmployee.isError
                ? getAxiosErrorMessage(
                    createEmployee.error,
                    "Failed to create employee. The email may already be in use.",
                  )
                : undefined
            }
          />
        </div>
      )}

      {importOpen && (
        <BulkImportModal onClose={() => setImportOpen(false)} onImported={() => employees.refetch()} />
      )}

      {bulkArchiveConfirm && (
        <BulkArchiveConfirmation
          employees={selection.archivableSelected}
          isArchiving={archiveEmployee.isPending}
          onCancel={() => setBulkArchiveConfirm(false)}
          onConfirm={() => {
            setBulkArchiveConfirm(false);
            selection.archivableSelected.forEach((e) => archiveEmployee.mutate(e.id));
            selection.clearSelection();
          }}
        />
      )}
    </main>
  );
}
