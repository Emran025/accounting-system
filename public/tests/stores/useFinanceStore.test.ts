import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAPI } from '@/lib/api';
import { showToast } from '@/components/ui';

const mockedFetchAPI = vi.mocked(fetchAPI);
const mockedShowToast = vi.mocked(showToast);

describe('useFinanceStore', () => {
    let useFinanceStore: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
        const mod = await import('@/stores/useFinanceStore');
        useFinanceStore = mod.useFinanceStore;
        // Reset all state
        useFinanceStore.setState({
            accounts: [],
            accountsLoading: false,
            accountsLastFetched: null,
            fiscalPeriods: [],
            fiscalPeriodsLoading: false,
            fiscalPeriodsLastFetched: null,
            journalVouchers: [],
            journalVouchersLoading: false,
            journalVouchersLastFetched: null,
        });
    });

    describe('accounts', () => {
        it('loads chart of accounts', async () => {
            const mockAccounts = [
                { id: 1, code: '1000', name: 'Assets', type: 'asset' },
                { id: 2, code: '2000', name: 'Liabilities', type: 'liability' },
            ];
            mockedFetchAPI.mockResolvedValueOnce({ accounts: mockAccounts });

            await useFinanceStore.getState().loadAccounts();

            const state = useFinanceStore.getState();
            expect(state.accounts).toEqual(mockAccounts);
            expect(state.accountsLoading).toBe(false);
            expect(state.accountsLastFetched).not.toBeNull();
        });

        it('respects TTL cache', async () => {
            // Set a recent lastFetched to simulate cache
            useFinanceStore.setState({
                accounts: [{ id: 1 }],
                accountsLastFetched: Date.now(),
            });

            await useFinanceStore.getState().loadAccounts();

            // fetchAPI should NOT be called because cache is fresh
            expect(mockedFetchAPI).not.toHaveBeenCalled();
        });

        it('forces reload when cache is stale', async () => {
            // Set a stale lastFetched
            useFinanceStore.setState({
                accounts: [{ id: 1 }],
                accountsLastFetched: Date.now() - 6 * 60 * 1000, // 6 min ago (TTL = 5 min)
            });

            mockedFetchAPI.mockResolvedValueOnce({ accounts: [{ id: 1 }, { id: 2 }] });

            await useFinanceStore.getState().loadAccounts();

            expect(mockedFetchAPI).toHaveBeenCalled();
            expect(useFinanceStore.getState().accounts).toHaveLength(2);
        });

        it('handles error gracefully', async () => {
            mockedFetchAPI.mockRejectedValueOnce(new Error('fail'));

            await useFinanceStore.getState().loadAccounts();

            expect(useFinanceStore.getState().accountsLoading).toBe(false);
        });
    });

    describe('fiscal periods', () => {
        it('loads fiscal periods', async () => {
            const mockPeriods = [
                { id: 1, name: 'Q1 2026', start_date: '2026-01-01', end_date: '2026-03-31' },
            ];
            mockedFetchAPI.mockResolvedValueOnce({ data: mockPeriods });

            await useFinanceStore.getState().loadFiscalPeriods();

            expect(useFinanceStore.getState().fiscalPeriods).toEqual(mockPeriods);
            expect(useFinanceStore.getState().fiscalPeriodsLoading).toBe(false);
        });
    });

    describe('journal vouchers', () => {
        it('loads journal vouchers', async () => {
            const mockVouchers = [
                { id: 1, voucher_number: 'JV-001', total_debit: 1000, total_credit: 1000 },
            ];
            mockedFetchAPI.mockResolvedValueOnce({ data: mockVouchers });

            await useFinanceStore.getState().loadJournalVouchers();

            expect(useFinanceStore.getState().journalVouchers).toEqual(mockVouchers);
        });
    });

    describe('cache invalidation', () => {
        it('invalidateAccounts clears cache timestamp', () => {
            useFinanceStore.setState({ accountsLastFetched: Date.now() });
            useFinanceStore.getState().invalidateAccounts();
            expect(useFinanceStore.getState().accountsLastFetched).toBeNull();
        });

        it('invalidateFiscalPeriods clears cache timestamp', () => {
            useFinanceStore.setState({ fiscalPeriodsLastFetched: Date.now() });
            useFinanceStore.getState().invalidateFiscalPeriods();
            expect(useFinanceStore.getState().fiscalPeriodsLastFetched).toBeNull();
        });

        it('invalidateJournalVouchers clears cache timestamp', () => {
            useFinanceStore.setState({ journalVouchersLastFetched: Date.now() });
            useFinanceStore.getState().invalidateJournalVouchers();
            expect(useFinanceStore.getState().journalVouchersLastFetched).toBeNull();
        });

        it('invalidateAll clears all caches', () => {
            useFinanceStore.setState({
                accountsLastFetched: Date.now(),
                fiscalPeriodsLastFetched: Date.now(),
                journalVouchersLastFetched: Date.now(),
            });

            useFinanceStore.getState().invalidateAll();

            const state = useFinanceStore.getState();
            expect(state.accountsLastFetched).toBeNull();
            expect(state.fiscalPeriodsLastFetched).toBeNull();
            expect(state.journalVouchersLastFetched).toBeNull();
        });
    });
});
