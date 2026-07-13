import api from './api';
import type { Employee } from '@/store/employeeStore';

export interface EmployeePage {
  employees: Employee[];
  pagination: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
}

export const employeeServices = {
  /** Paginated list with optional search / company filter */
  getEmployees: async (params?: {
    search?:  string;
    company?: string;
    page?:    number;
    limit?:   number;
  }): Promise<EmployeePage> => {
    const res = await api.get('/employees', { params });
    return res.data;
  },

  /** Look up a single employee by exact Employee ID */
  getByEmployeeId: async (employeeId: string): Promise<Employee | null> => {
    const res = await api.get('/employees', {
      params: { search: employeeId.trim(), limit: 10 },
    });
    const list: Employee[] = res.data?.employees ?? res.data ?? [];
    return list.find(e => String(e.employeeId).trim() === employeeId.trim()) ?? null;
  },

  /** Bulk upsert — used by import and single-add */
  bulkImport: async (employees: Omit<Employee, '_id'>[]): Promise<{
    total:    number;
    upserted: number;
    modified: number;
    message:  string;
  }> => {
    const res = await api.post('/employees/bulk', { employees });
    return res.data;
  },

  /** Update one employee */
  updateEmployee: async (id: string, employee: Omit<Employee, '_id'>): Promise<Employee> => {
    const res = await api.put(`/employees/${id}`, employee);
    return res.data;
  },

  /** Delete one employee */
  deleteEmployee: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },
};
