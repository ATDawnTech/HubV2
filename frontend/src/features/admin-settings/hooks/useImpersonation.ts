import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { roleService } from "@/services/role.service";

const TEST_EMPLOYEE_ID = "emp_role_tester";

export function useImpersonation() {
  const queryClient = useQueryClient();

  const isImpersonating = !!localStorage.getItem("adthub_original_token");
  const originalEmployeeId = localStorage.getItem("adthub_original_employee_id");

  async function startImpersonation() {
    const currentToken = localStorage.getItem("adthub_token");
    const currentEmpId = localStorage.getItem("adthub_employee_id");
    if (currentToken) localStorage.setItem("adthub_original_token", currentToken);
    if (currentEmpId) localStorage.setItem("adthub_original_employee_id", currentEmpId);

    const res = await apiClient.get<{ token: string; employee_id: string }>(
      "/v1/dev/token",
      { params: { employee_id: TEST_EMPLOYEE_ID } },
    );

    localStorage.setItem("adthub_token", res.data.token);
    localStorage.setItem("adthub_employee_id", res.data.employee_id);

    queryClient.clear();
    window.location.reload();
  }

  async function stopImpersonation() {
    try {
      await roleService.unassignAllMyRoles();
    } catch {
      // Best-effort — continue restoring identity even if cleanup fails
    }

    const savedToken = localStorage.getItem("adthub_original_token");
    const savedEmpId = localStorage.getItem("adthub_original_employee_id");

    if (savedToken) localStorage.setItem("adthub_token", savedToken);
    if (savedEmpId) localStorage.setItem("adthub_employee_id", savedEmpId);

    localStorage.removeItem("adthub_original_token");
    localStorage.removeItem("adthub_original_employee_id");

    queryClient.clear();
    window.location.reload();
  }

  return { isImpersonating, startImpersonation, stopImpersonation, originalEmployeeId };
}
