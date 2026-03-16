/**
 * Employee API service — thin wrapper around the HTTP layer.
 * All return types are validated against Zod schemas before returning.
 */

import { z } from "zod";
import { apiClient } from "@/lib/axios";
import type { ApiResponse, PaginationMeta } from "@/types/api.types";
import type {
  CreateEmployeeInput,
  Employee,
  EmployeeListParams,
  EmployeeRoleEntry,
  OffboardingEmployee,
  OffboardingTask,
  UpdateEmployeeInput,
} from "@/features/employees/types/employee.types";
import {
  employeeSchema,
  offboardingEmployeeSchema,
  offboardingTaskSchema,
} from "@/features/employees/schemas/employee.schemas";

export interface EmployeesPage {
  employees: Employee[];
  meta: PaginationMeta;
}

export interface OffboardingPage {
  items: OffboardingEmployee[];
  meta: PaginationMeta;
}

export const employeeService = {
  async listEmployees(params: EmployeeListParams = {}): Promise<EmployeesPage> {
    const { cursor, q, status, department, location, hire_type, work_mode, job_title, hire_date_from, hire_date_to, limit = 20 } = params;
    const query: Record<string, string | number | string[]> = { limit };
    if (cursor) query.cursor = cursor;
    if (q) query.q = q;
    if (status?.length) query.status = status;
    if (department?.length) query.department = department;
    if (location?.length) query.location = location;
    if (hire_type?.length) query.hire_type = hire_type;
    if (work_mode?.length) query.work_mode = work_mode;
    if (job_title) query.job_title = job_title;
    if (hire_date_from) query.hire_date_from = hire_date_from;
    if (hire_date_to) query.hire_date_to = hire_date_to;

    const res = await apiClient.get<ApiResponse<Employee[]>>("/v1/employees", {
      params: query,
    });

    return {
      employees: z.array(employeeSchema).parse(res.data.data),
      meta: res.data.meta!,
    };
  },

  async fetchAllEmployees(
    params: Omit<EmployeeListParams, "cursor" | "limit">,
  ): Promise<Employee[]> {
    const all: Employee[] = [];
    let cursor: string | undefined = undefined;
    do {
      const page = await this.listEmployees({ ...params, limit: 100, cursor });
      all.push(...page.employees);
      cursor = page.meta.next_cursor ?? undefined;
    } while (cursor);
    return all;
  },

  async getEmployee(id: string): Promise<Employee> {
    const res = await apiClient.get<ApiResponse<Employee>>(
      `/v1/employees/${id}`,
    );
    return employeeSchema.parse(res.data.data);
  },

  async checkEmail(email: string): Promise<{ available: boolean }> {
    const res = await apiClient.get<ApiResponse<{ available: boolean }>>(
      "/v1/employees/check-email",
      { params: { email } },
    );
    return res.data.data!;
  },

  async createEmployee(data: CreateEmployeeInput): Promise<Employee> {
    const res = await apiClient.post<ApiResponse<Employee>>(
      "/v1/employees",
      data,
    );
    return employeeSchema.parse(res.data.data);
  },

  async updateEmployee(
    id: string,
    data: UpdateEmployeeInput,
  ): Promise<Employee> {
    const res = await apiClient.patch<ApiResponse<Employee>>(
      `/v1/employees/${id}`,
      data,
    );
    return employeeSchema.parse(res.data.data);
  },

  async archiveEmployee(id: string): Promise<Employee> {
    const res = await apiClient.delete<ApiResponse<Employee>>(
      `/v1/employees/${id}`,
    );
    return employeeSchema.parse(res.data.data);
  },

  async listOffboarding(
    cursor?: string,
    limit = 20,
  ): Promise<OffboardingPage> {
    const params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;

    const res = await apiClient.get<ApiResponse<OffboardingEmployee[]>>(
      "/v1/employees/offboarding",
      { params },
    );

    return {
      items: z.array(offboardingEmployeeSchema).parse(res.data.data),
      meta: res.data.meta!,
    };
  },

  async getOffboardingTasks(employeeId: string): Promise<OffboardingTask[]> {
    const res = await apiClient.get<ApiResponse<OffboardingTask[]>>(
      `/v1/employees/${employeeId}/offboarding-tasks`,
    );
    return z.array(offboardingTaskSchema).parse(res.data.data);
  },

  async completeOffboardingTask(
    employeeId: string,
    taskId: string,
  ): Promise<OffboardingTask> {
    const res = await apiClient.post<ApiResponse<OffboardingTask>>(
      `/v1/employees/${employeeId}/offboarding-tasks/${taskId}/complete`,
    );
    return offboardingTaskSchema.parse(res.data.data);
  },

  async reassignOffboardingTask(
    employeeId: string,
    taskId: string,
    assigneeId: string | null,
  ): Promise<OffboardingTask> {
    const res = await apiClient.patch<ApiResponse<OffboardingTask>>(
      `/v1/employees/${employeeId}/offboarding-tasks/${taskId}/reassign`,
      { assignee_id: assigneeId },
    );
    return offboardingTaskSchema.parse(res.data.data);
  },

  async getEmployeeRoles(employeeId: string): Promise<EmployeeRoleEntry[]> {
    const res = await apiClient.get<ApiResponse<EmployeeRoleEntry[]>>(
      `/v1/employees/${employeeId}/roles`,
    );
    return res.data.data ?? [];
  },
};
