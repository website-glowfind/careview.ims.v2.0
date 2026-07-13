import { create } from 'zustand';
import { employeeServices } from '@/services/employeeServices';
import type { Company } from '@/types/inventory';

export interface Employee {
  _id?: string;
  fullName:   string;
  employeeId: string;
  department: string;
  position:   string;
  company:    Company;
}

export interface ImportResult {
  total:    number;
  upserted: number;
  modified: number;
}

export interface Pagination {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

interface EmployeeState {
  employees:       Employee[];
  pagination:      Pagination;
  selectedCompany: Company | 'ALL';
  isLoading:       boolean;
  isImporting:     boolean;
  error:           string | null;

  setSelectedCompany: (c: Company | 'ALL') => void;
  fetchEmployees:     (search?: string, page?: number) => Promise<void>;
  addEmployee:        (employee: Omit<Employee, '_id'>) => Promise<void>;
  updateEmployee:     (id: string, employee: Omit<Employee, '_id'>) => Promise<void>;
  deleteEmployee:     (id: string) => Promise<void>;
  bulkImport:         (employees: Omit<Employee, '_id'>[]) => Promise<ImportResult>;
}

const DEFAULT_PAGINATION: Pagination = { total: 0, page: 1, limit: 10, totalPages: 0 };

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees:       [],
  pagination:      DEFAULT_PAGINATION,
  selectedCompany: 'ALL',
  isLoading:       false,
  isImporting:     false,
  error:           null,

  setSelectedCompany: (c) => {
    set({ selectedCompany: c });
    get().fetchEmployees(undefined, 1);
  },

  fetchEmployees: async (search?: string, page?: number) => {
    set({ isLoading: true, error: null });
    try {
      const { selectedCompany, pagination } = get();
      const data = await employeeServices.getEmployees({
        limit:   10,
        page:    page ?? pagination.page,
        company: selectedCompany !== 'ALL' ? selectedCompany : undefined,
        search:  search || undefined,
      });
      set({ employees: data.employees, pagination: data.pagination, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch employees', isLoading: false });
    }
  },

  addEmployee: async (employee) => {
    set({ isLoading: true, error: null });
    try {
      await employeeServices.bulkImport([employee]);
      set({ isLoading: false });
      get().fetchEmployees(undefined, 1);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to add employee';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  updateEmployee: async (id, employee) => {
    set({ isLoading: true, error: null });
    try {
      await employeeServices.updateEmployee(id, employee);
      set({ isLoading: false });
      const { pagination } = get();
      get().fetchEmployees(undefined, pagination.page);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update employee';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  deleteEmployee: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await employeeServices.deleteEmployee(id);
      set({ isLoading: false });
      const { pagination } = get();
      get().fetchEmployees(undefined, pagination.page);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete employee';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  bulkImport: async (employees) => {
    set({ isImporting: true, error: null });
    try {
      const result = await employeeServices.bulkImport(employees);
      set({ isImporting: false });
      get().fetchEmployees();
      return result as ImportResult;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Import failed';
      set({ error: message, isImporting: false });
      throw new Error(message);
    }
  },
}));
