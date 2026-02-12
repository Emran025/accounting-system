import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchAPI } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/endpoints';
import { showToast } from '@/components/ui';
import { Employee } from '@/app/hr/types';

interface EmployeeState {
    // Data
    employees: Employee[];
    allEmployees: Employee[]; // For dropdowns
    currentPage: number;
    totalPages: number;
    totalItems: number;

    // Filters
    searchTerm: string;
    departmentFilter: string;
    roleFilter: string;
    statusFilter: string;

    // Status
    isLoading: boolean;
    lastFetched: number | null;
    lastFetchedAll: number | null;

    // Actions
    loadEmployees: (page?: number, search?: string, department?: string, role?: string, status?: string) => Promise<void>;
    loadAllEmployees: () => Promise<void>;
    getById: (id: number) => Employee | undefined;
    setSearchTerm: (term: string) => void;
    setDepartmentFilter: (dept: string) => void;
    setRoleFilter: (role: string) => void;
    setStatusFilter: (status: string) => void;
    invalidateCache: () => void;

    // CRUD Actions (optimistic updates can be added later, for now we just invalidate)
    deleteEmployee: (id: number) => Promise<boolean>;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useEmployeeStore = create<EmployeeState>()(
    devtools(
        (set, get) => ({
            employees: [],
            allEmployees: [],
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            searchTerm: '',
            departmentFilter: '',
            roleFilter: '',
            statusFilter: '',
            isLoading: false,
            lastFetched: null,
            lastFetchedAll: null,

            loadEmployees: async (page = 1, search, department, role, status) => {
                const state = get();
                const searchVal = search ?? state.searchTerm;
                const deptVal = department ?? state.departmentFilter;
                const roleVal = role ?? state.roleFilter;
                const statusVal = status ?? state.statusFilter;

                // Skip if recently fetched with same params
                if (
                    state.lastFetched &&
                    Date.now() - state.lastFetched < CACHE_TTL &&
                    state.currentPage === page &&
                    state.searchTerm === searchVal &&
                    state.departmentFilter === deptVal &&
                    state.roleFilter === roleVal &&
                    state.statusFilter === statusVal &&
                    state.employees.length > 0
                ) {
                    return;
                }

                set({ isLoading: true });
                try {
                    const query = new URLSearchParams();
                    query.append('page', page.toString());
                    if (searchVal) query.append('search', searchVal);
                    if (deptVal && deptVal !== 'all') query.append('department_id', deptVal);
                    if (roleVal && roleVal !== 'all') query.append('role', roleVal);
                    if (statusVal && statusVal !== 'all') query.append('status', statusVal);

                    const res = await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEES.BASE}?${query.toString()}`);

                    if (res.success) {
                        const data = res.data as { data: Employee[], last_page: number, total: number, current_page: number } | Employee[];

                        let employees: Employee[] = [];
                        let totalPages = 1;
                        let total = 0;

                        if (Array.isArray(data)) {
                            employees = data;
                            total = data.length;
                        } else {
                            employees = data.data || [];
                            totalPages = data.last_page || 1;
                            total = data.total || 0;
                        }

                        set({
                            employees,
                            totalPages,
                            totalItems: total,
                            currentPage: page,
                            searchTerm: searchVal,
                            departmentFilter: deptVal,
                            roleFilter: roleVal,
                            statusFilter: statusVal,
                            lastFetched: Date.now(),
                            isLoading: false,
                        });
                    } else {
                        set({ isLoading: false });
                    }
                } catch (error) {
                    console.error('Failed to load employees', error);
                    showToast('خطأ في تحميل الموظفين', 'error');
                    set({ isLoading: false });
                }
            },

            loadAllEmployees: async () => {
                const state = get();
                // Use cache if available
                if (state.lastFetchedAll && Date.now() - state.lastFetchedAll < CACHE_TTL && state.allEmployees.length > 0) {
                    return;
                }

                try {
                    // Attempt to fetch all by passing a high limit
                    const res = await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEES.BASE}?per_page=1000`);
                    if (res.success) {
                        const data = res.data as { data: Employee[] } | Employee[];
                        let allEmployees: Employee[] = [];
                        if (Array.isArray(data)) {
                            allEmployees = data;
                        } else {
                            allEmployees = data.data || [];
                        }
                        set({ allEmployees, lastFetchedAll: Date.now() });
                    }
                } catch (error) {
                    console.error('Failed to load all employees', error);
                }
            },

            getById: (id) => get().employees.find(e => e.id === id),

            setSearchTerm: (term) => set({ searchTerm: term }),
            setDepartmentFilter: (dept) => set({ departmentFilter: dept }),
            setRoleFilter: (role) => set({ roleFilter: role }),
            setStatusFilter: (status) => set({ statusFilter: status }),

            invalidateCache: () => set({ lastFetched: null, lastFetchedAll: null }),

            deleteEmployee: async (id) => {
                set({ isLoading: true });
                try {
                    const res = await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEES.BASE}/${id}`, { method: 'DELETE' });
                    if (res.success) {
                        showToast('تم حذف الموظف بنجاح', 'success');
                        // Optimistic update
                        set(state => ({
                            employees: state.employees.filter(e => e.id !== id),
                            allEmployees: state.allEmployees.filter(e => e.id !== id),
                            totalItems: state.totalItems - 1
                        }));
                        // Also invalidate to be safe
                        get().invalidateCache();
                        return true;
                    } else {
                        showToast(res.message || 'فشل حذف الموظف', 'error');
                    }
                } catch (error) {
                    showToast('حدث خطأ أثناء الحذف', 'error');
                } finally {
                    set({ isLoading: false });
                }
                return false;
            }
        }),
        { name: 'employee-store' }
    )
);
