import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAPI } from '@/lib/api';
import { showToast } from '@/components/ui';

const mockedFetchAPI = vi.mocked(fetchAPI);
const mockedShowToast = vi.mocked(showToast);

// Dynamic import for fresh store per describe block
const getStore = async () => {
    vi.resetModules();
    const mod = await import('@/stores/usePayrollStore');
    return mod.usePayrollStore;
};

describe('usePayrollStore', () => {
    let usePayrollStore: Awaited<ReturnType<typeof getStore>>;

    beforeEach(async () => {
        vi.clearAllMocks();
        usePayrollStore = await getStore();
    });

    describe('initial state', () => {
        it('starts with empty state', () => {
            const state = usePayrollStore.getState();
            expect(state.cycles).toEqual([]);
            expect(state.cyclesLoading).toBe(false);
            expect(state.selectedCycle).toBeNull();
            expect(state.items).toEqual([]);
            expect(state.accounts).toEqual([]);
            expect(state.transactions).toEqual([]);
        });
    });

    describe('loadCycles', () => {
        it('loads cycles from API', async () => {
            const mockCycles = [
                { id: 1, cycle_type: 'salary', status: 'draft', total_net: 50000 },
                { id: 2, cycle_type: 'bonus', status: 'approved', total_net: 10000 },
            ];
            mockedFetchAPI.mockResolvedValueOnce({ data: mockCycles });

            await usePayrollStore.getState().loadCycles();

            const state = usePayrollStore.getState();
            expect(state.cycles).toEqual(mockCycles);
            expect(state.cyclesLoading).toBe(false);
        });

        it('handles nested response structure', async () => {
            const mockCycles = [{ id: 1 }];
            mockedFetchAPI.mockResolvedValueOnce({ data: { data: mockCycles } });

            await usePayrollStore.getState().loadCycles();
            expect(usePayrollStore.getState().cycles).toEqual(mockCycles);
        });

        it('sets loading state during fetch', async () => {
            let resolvePromise: Function;
            const promise = new Promise((resolve) => { resolvePromise = resolve; });
            mockedFetchAPI.mockReturnValueOnce(promise as any);

            const loadPromise = usePayrollStore.getState().loadCycles();
            expect(usePayrollStore.getState().cyclesLoading).toBe(true);

            resolvePromise!({ data: [] });
            await loadPromise;
            expect(usePayrollStore.getState().cyclesLoading).toBe(false);
        });

        it('shows error toast on failure', async () => {
            mockedFetchAPI.mockRejectedValueOnce(new Error('Network error'));

            await usePayrollStore.getState().loadCycles();

            expect(mockedShowToast).toHaveBeenCalledWith(
                'خطأ في تحميل دورات الرواتب',
                'error'
            );
            expect(usePayrollStore.getState().cyclesLoading).toBe(false);
        });
    });

    describe('loadCycleDetails', () => {
        it('loads items for a cycle', async () => {
            const mockItems = [
                { id: 1, employee_name: 'Ahmed', net_salary: 5000, status: 'active' },
                { id: 2, employee_name: 'Sara', net_salary: 6000, status: 'active' },
            ];
            mockedFetchAPI.mockResolvedValueOnce({ data: mockItems });

            const result = await usePayrollStore.getState().loadCycleDetails(1);

            expect(result).toEqual(mockItems);
            expect(usePayrollStore.getState().items).toEqual(mockItems);
        });

        it('updates selectedCycle when response includes cycle data', async () => {
            const mockCycle = { id: 1, status: 'approved' };
            mockedFetchAPI.mockResolvedValueOnce({
                data: [],
                cycle: mockCycle,
            });

            await usePayrollStore.getState().loadCycleDetails(1);
            expect(usePayrollStore.getState().selectedCycle).toEqual(mockCycle);
        });

        it('returns empty array on failure', async () => {
            mockedFetchAPI.mockRejectedValueOnce(new Error('fail'));

            const result = await usePayrollStore.getState().loadCycleDetails(1);
            expect(result).toEqual([]);
        });
    });

    describe('createCycle', () => {
        it('creates a cycle and reloads', async () => {
            mockedFetchAPI
                .mockResolvedValueOnce({ success: true })   // createCycle
                .mockResolvedValueOnce({ data: [] });        // loadCycles reload

            const result = await usePayrollStore.getState().createCycle({
                payment_nature: 'salary',
                month: 1,
                year: 2026,
            });

            expect(result).toBe(true);
            expect(mockedShowToast).toHaveBeenCalledWith('تم إنشاء المسير بنجاح', 'success');
        });

        it('returns false on failure response', async () => {
            mockedFetchAPI.mockResolvedValueOnce({ success: false, message: 'duplicate' });

            const result = await usePayrollStore.getState().createCycle({});
            expect(result).toBe(false);
            expect(mockedShowToast).toHaveBeenCalledWith(
                expect.stringContaining('فشل إنشاء المسير'),
                'error'
            );
        });
    });

    describe('approveCycle', () => {
        it('approves a cycle and returns true', async () => {
            mockedFetchAPI
                .mockResolvedValueOnce({ success: true })
                .mockResolvedValueOnce({ data: [] });

            const result = await usePayrollStore.getState().approveCycle(1);
            expect(result).toBe(true);
            expect(mockedShowToast).toHaveBeenCalledWith('تمت الموافقة بنجاح', 'success');
        });
    });

    describe('bulkPayment', () => {
        it('processes bulk payment', async () => {
            mockedFetchAPI
                .mockResolvedValueOnce({ success: true })
                .mockResolvedValueOnce({ data: [] });

            const result = await usePayrollStore.getState().bulkPayment(1, '100');
            expect(result).toBe(true);
            expect(mockedShowToast).toHaveBeenCalledWith(
                'تم ترحيل وصرف الرواتب بنجاح',
                'success'
            );
        });
    });

    describe('toggleItemStatus', () => {
        it('toggles item and reloads cycle details', async () => {
            const item = { id: 1, payroll_cycle_id: 5, status: 'active' } as any;
            mockedFetchAPI
                .mockResolvedValueOnce({ status: 'on_hold' })  // toggle
                .mockResolvedValueOnce({ data: [] });           // reload

            const result = await usePayrollStore.getState().toggleItemStatus(item);
            expect(result).toBe(true);
            expect(mockedShowToast).toHaveBeenCalledWith(
                'تم إيقاف صرف الراتب مؤقتاً',
                'info'
            );
        });
    });

    describe('individualPayment', () => {
        it('processes individual payment', async () => {
            mockedFetchAPI.mockResolvedValueOnce({ success: true });

            const result = await usePayrollStore.getState().individualPayment(1, {
                amount: 5000,
                notes: 'monthly',
                account_id: '100',
            });

            expect(result).toBe(true);
            expect(mockedShowToast).toHaveBeenCalledWith(
                'تم تسجيل عملية التحويل بنجاح',
                'success'
            );
        });

        it('shows error on failure', async () => {
            mockedFetchAPI.mockResolvedValueOnce({
                success: false,
                message: 'Insufficient funds',
            });

            const result = await usePayrollStore.getState().individualPayment(1, {
                amount: 99999,
                notes: '',
                account_id: '100',
            });

            expect(result).toBe(false);
            expect(mockedShowToast).toHaveBeenCalledWith('Insufficient funds', 'error');
        });
    });

    describe('setSelectedCycle', () => {
        it('sets selected cycle', () => {
            const cycle = { id: 1, status: 'draft' } as any;
            usePayrollStore.getState().setSelectedCycle(cycle);
            expect(usePayrollStore.getState().selectedCycle).toEqual(cycle);
        });

        it('clears selected cycle', () => {
            usePayrollStore.getState().setSelectedCycle({ id: 1 } as any);
            usePayrollStore.getState().setSelectedCycle(null);
            expect(usePayrollStore.getState().selectedCycle).toBeNull();
        });
    });

    describe('loadAccounts', () => {
        it('loads and filters asset accounts', async () => {
            const mockAccounts = [
                { id: 1, code: '1110', name: 'Cash', type: 'asset' },
                { id: 2, code: '1120', name: 'Bank', type: 'asset' },
                { id: 3, code: '4000', name: 'Revenue', type: 'revenue' },
            ];
            mockedFetchAPI.mockResolvedValueOnce({ accounts: mockAccounts });

            await usePayrollStore.getState().loadAccounts();

            const state = usePayrollStore.getState();
            // Only asset accounts (or code starting with 1)
            expect(state.accounts).toHaveLength(2);
            expect(state.defaultAccountId).toBe('1'); // cash account id
        });
    });

    describe('loadItemHistory', () => {
        it('loads transaction history', async () => {
            const mockTransactions = [
                { id: 1, amount: 5000, transaction_type: 'payment' },
            ];
            mockedFetchAPI.mockResolvedValueOnce({ data: mockTransactions });

            const result = await usePayrollStore.getState().loadItemHistory(1);
            expect(result).toEqual(mockTransactions);
            expect(usePayrollStore.getState().transactions).toEqual(mockTransactions);
        });
    });
});
