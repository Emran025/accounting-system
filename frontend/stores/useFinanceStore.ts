import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchAPI } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/endpoints';
import { showToast } from '@/components/ui';

/**
 * Shared types for the finance domain
 */
export interface Account {
    id: number;
    code: string;
    name: string;
    type: string;
    parent_id: number | null;
    balance: number;
    is_active: boolean;
    level?: number;
    children?: Account[];
}

export interface FiscalPeriod {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    status: 'open' | 'closed' | 'locked';
    is_current: boolean;
}

export interface JournalVoucher {
    id: number;
    voucher_number: string;
    date: string;
    description: string;
    status: 'draft' | 'posted';
    total_debit: number;
    total_credit: number;
    created_at: string;
}

interface FinanceState {
    // Chart of Accounts
    accounts: Account[];
    accountsLoading: boolean;
    accountsLastFetched: number | null;

    // Fiscal Periods
    fiscalPeriods: FiscalPeriod[];
    fiscalPeriodsLoading: boolean;
    fiscalPeriodsLastFetched: number | null;

    // Journal Vouchers
    journalVouchers: JournalVoucher[];
    jvCurrentPage: number;
    jvTotalPages: number;
    jvLoading: boolean;
    jvLastFetched: number | null;

    // Actions
    loadAccounts: () => Promise<void>;
    loadFiscalPeriods: () => Promise<void>;
    loadJournalVouchers: (page?: number, search?: string) => Promise<void>;
    invalidateAccounts: () => void;
    invalidateFiscalPeriods: () => void;
    invalidateJournalVouchers: () => void;
    invalidateAll: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useFinanceStore = create<FinanceState>()(
    devtools(
        (set, get) => ({
            // Initial state — Accounts
            accounts: [],
            accountsLoading: false,
            accountsLastFetched: null,

            // Initial state — Fiscal Periods
            fiscalPeriods: [],
            fiscalPeriodsLoading: false,
            fiscalPeriodsLastFetched: null,

            // Initial state — Journal Vouchers
            journalVouchers: [],
            jvCurrentPage: 1,
            jvTotalPages: 1,
            jvLoading: false,
            jvLastFetched: null,

            // ──── Accounts ────
            loadAccounts: async () => {
                const state = get();
                // Use cache
                if (
                    state.accountsLastFetched &&
                    Date.now() - state.accountsLastFetched < CACHE_TTL &&
                    state.accounts.length > 0
                ) {
                    return;
                }

                set({ accountsLoading: true });
                try {
                    const res = await fetchAPI(API_ENDPOINTS.FINANCE.ACCOUNTS.BASE);
                    if (res.success) {
                        const data = res.data as Account[] | { data: Account[] };
                        const accounts = Array.isArray(data) ? data : data.data || [];
                        set({ accounts, accountsLastFetched: Date.now() });
                    }
                } catch {
                    showToast('خطأ في تحميل الحسابات', 'error');
                } finally {
                    set({ accountsLoading: false });
                }
            },

            // ──── Fiscal Periods ────
            loadFiscalPeriods: async () => {
                const state = get();
                if (
                    state.fiscalPeriodsLastFetched &&
                    Date.now() - state.fiscalPeriodsLastFetched < CACHE_TTL &&
                    state.fiscalPeriods.length > 0
                ) {
                    return;
                }

                set({ fiscalPeriodsLoading: true });
                try {
                    const res = await fetchAPI(API_ENDPOINTS.FINANCE.FISCAL_PERIODS.BASE);
                    if (res.success) {
                        const data = res.data as FiscalPeriod[] | { data: FiscalPeriod[] };
                        const fiscalPeriods = Array.isArray(data) ? data : data.data || [];
                        set({ fiscalPeriods, fiscalPeriodsLastFetched: Date.now() });
                    }
                } catch {
                    showToast('خطأ في تحميل الفترات المالية', 'error');
                } finally {
                    set({ fiscalPeriodsLoading: false });
                }
            },

            // ──── Journal Vouchers ────
            loadJournalVouchers: async (page = 1, search = '') => {
                set({ jvLoading: true });
                try {
                    const res = await fetchAPI(
                        `${API_ENDPOINTS.FINANCE.JOURNAL_VOUCHERS.BASE}?page=${page}&search=${encodeURIComponent(search)}`
                    );
                    if (res.success) {
                        const data = res.data as any;
                        let vouchers: JournalVoucher[] = [];
                        let totalPages = 1;

                        if (Array.isArray(data)) {
                            vouchers = data;
                        } else if (data?.data) {
                            vouchers = data.data;
                            totalPages = data.last_page || 1;
                        }

                        if ((res.pagination as any)?.total_pages) {
                            totalPages = (res.pagination as any).total_pages;
                        }

                        set({
                            journalVouchers: vouchers,
                            jvCurrentPage: page,
                            jvTotalPages: totalPages,
                            jvLastFetched: Date.now(),
                        });
                    }
                } catch {
                    showToast('خطأ في تحميل سندات القيد', 'error');
                } finally {
                    set({ jvLoading: false });
                }
            },

            // ──── Invalidation ────
            invalidateAccounts: () => set({ accountsLastFetched: null }),
            invalidateFiscalPeriods: () => set({ fiscalPeriodsLastFetched: null }),
            invalidateJournalVouchers: () => set({ jvLastFetched: null }),
            invalidateAll: () => set({
                accountsLastFetched: null,
                fiscalPeriodsLastFetched: null,
                jvLastFetched: null,
            }),
        }),
        { name: 'finance-store' }
    )
);
