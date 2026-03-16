import { apiClient } from "@/lib/axios";
import type { ApiResponse, PaginationMeta } from "@/types/api.types";
import type {
  AssignRoleInput,
  CreateRoleInput,
  Permission,
  Role,
  RoleAssignment,
  RoleWithPermissions,
  SetPermissionsInput,
  UpdateAssignmentInput,
  UpdateRoleInput,
} from "@/features/admin-settings/types/role.types";

export interface RolesPage {
  roles: Role[];
  meta: PaginationMeta;
}

export const roleService = {
  async listRoles(params: {
    limit?: number;
    cursor?: string;
  } = {}): Promise<RolesPage> {
    const res = await apiClient.get<ApiResponse<Role[]>>("/v1/admin/roles", { params });
    return {
      roles: res.data.data ?? [],
      meta: res.data.meta!,
    };
  },

  async getRole(id: string): Promise<RoleWithPermissions> {
    const res = await apiClient.get<ApiResponse<RoleWithPermissions>>(`/v1/admin/roles/${id}`);
    return res.data.data!;
  },

  async createRole(input: CreateRoleInput): Promise<Role> {
    const res = await apiClient.post<ApiResponse<Role>>("/v1/admin/roles", input);
    return res.data.data!;
  },

  async updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
    const res = await apiClient.patch<ApiResponse<Role>>(`/v1/admin/roles/${id}`, input);
    return res.data.data!;
  },

  async deleteRole(id: string): Promise<void> {
    await apiClient.delete(`/v1/admin/roles/${id}`);
  },

  async getPermissions(roleId: string): Promise<Permission[]> {
    const res = await apiClient.get<ApiResponse<Permission[]>>(
      `/v1/admin/roles/${roleId}/permissions`,
    );
    return res.data.data ?? [];
  },

  async setPermissions(roleId: string, input: SetPermissionsInput): Promise<Permission[]> {
    const res = await apiClient.put<ApiResponse<Permission[]>>(
      `/v1/admin/roles/${roleId}/permissions`,
      input,
    );
    return res.data.data ?? [];
  },

  async getGrantableRoles(roleId: string): Promise<string[]> {
    const res = await apiClient.get<ApiResponse<string[]>>(
      `/v1/admin/roles/${roleId}/grantable`,
    );
    return res.data.data ?? [];
  },

  async setGrantableRoles(roleId: string, assignableRoleIds: string[]): Promise<void> {
    await apiClient.put(`/v1/admin/roles/${roleId}/grantable`, {
      assignable_role_ids: assignableRoleIds,
    });
  },

  async getRoleAssignments(roleId: string): Promise<RoleAssignment[]> {
    const res = await apiClient.get<ApiResponse<RoleAssignment[]>>(
      `/v1/admin/roles/${roleId}/assignments`,
    );
    return res.data.data ?? [];
  },

  async assignRole(roleId: string, input: AssignRoleInput): Promise<RoleAssignment> {
    const res = await apiClient.post<ApiResponse<RoleAssignment>>(
      `/v1/admin/roles/${roleId}/assignments`,
      input,
    );
    return res.data.data!;
  },

  async updateAssignment(roleId: string, employeeId: string, input: UpdateAssignmentInput): Promise<RoleAssignment> {
    const res = await apiClient.patch<ApiResponse<RoleAssignment>>(
      `/v1/admin/roles/${roleId}/assignments/${employeeId}`,
      input,
    );
    return res.data.data!;
  },

  async unassignRole(roleId: string, employeeId: string, blacklist = false): Promise<void> {
    await apiClient.delete(`/v1/admin/roles/${roleId}/assignments/${employeeId}`, {
      params: blacklist ? { blacklist: "true" } : undefined,
    });
  },

  async getManagerPermissions(roleId: string): Promise<Permission[]> {
    const res = await apiClient.get<ApiResponse<Permission[]>>(
      `/v1/admin/roles/${roleId}/manager-permissions`,
    );
    return res.data.data ?? [];
  },

  async setManagerPermissions(roleId: string, input: SetPermissionsInput): Promise<Permission[]> {
    const res = await apiClient.put<ApiResponse<Permission[]>>(
      `/v1/admin/roles/${roleId}/manager-permissions`,
      input,
    );
    return res.data.data ?? [];
  },

  async getMyEffectivePermissions(): Promise<Permission[]> {
    const res = await apiClient.get<ApiResponse<Permission[]>>(
      "/v1/admin/roles/me/effective-permissions",
    );
    return res.data.data ?? [];
  },

  async unassignAllMyRoles(): Promise<void> {
    await apiClient.delete("/v1/admin/roles/me/assignments");
  },

  async getDefaultPermissions(): Promise<Permission[]> {
    const res = await apiClient.get<ApiResponse<Permission[]>>(
      "/v1/admin/roles/default-permissions",
    );
    return res.data.data ?? [];
  },

  async setDefaultPermissions(input: SetPermissionsInput): Promise<Permission[]> {
    const res = await apiClient.put<ApiResponse<Permission[]>>(
      "/v1/admin/roles/default-permissions",
      input,
    );
    return res.data.data ?? [];
  },

  async setSortOrders(orders: Array<{ role_id: string; sort_order: number }>): Promise<void> {
    await apiClient.put("/v1/admin/roles/sort-orders", { orders });
  },
};
