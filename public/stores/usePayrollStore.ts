import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchAPI } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/endpoints';
import { showToast } from '@/components/ui';
import { PayrollCycle, PayrollItem } from '@/app/hr/types';

// ─── Types ──────────────────────────────────────────────────────

export interface PayrollItemExtended extends PayrollItem {
    employee_name?: string;
    paid_amount?: number;
    remaining_balance?: number;
    advance_amount?: number;
    net_after_advance?: number;
    status: 'active' | 'on_hold';
}

export interface PayrollTransaction {
    id: number;
    amount: number;
    transaction_type: 'payment' | 'advance';
    transaction_date: string;
    notes: string;
}

export interface PayrollAccount {
    id: number;
    code: string;
    name: string;
    type: string;
}

// ─── State shape ────────────────────────────────────────────────

interface PayrollState {
    // Cycles
    cycles: PayrollCycle[];
    cyclesLoading: boolean;

    // Selected cycle items
    selectedCycle: PayrollCycle | null;
    items: PayrollItemExtended[];

    // Accounts (for payment method selection)
    accounts: PayrollAccount[];
    defaultAccountId: string;

    // Transaction history
    transactions: PayrollTransaction[];

    // Actions  — data fetching
    loadCycles: () => Promise<void>;
    loadCycleDetails: (cycleId: number) => Promise<PayrollItemExtended[]>;
    loadAccounts: () => Promise<void>;
    loadItemHistory: (itemId: number) => Promise<PayrollTransaction[]>;

    // Actions — mutations
    createCycle: (payload: Record<string, any>) => Promise<boolean>;
    approveCycle: (id: number) => Promise<boolean>;
    bulkPayment: (cycleId: number, accountId: string) => Promise<boolean>;
    toggleItemStatus: (item: PayrollItemExtended) => Promise<boolean>;
    updateItem: (itemId: number, data: Record<string, any>) => Promise<boolean>;
    individualPayment: (itemId: number, data: { amount: number; notes: string; account_id: string }) => Promise<boolean>;

    // Helpers
    setSelectedCycle: (cycle: PayrollCycle | null) => void;
}

// ─── Store ──────────────────────────────────────────────────────

export const usePayrollStore = create<PayrollState>()(
    devtools(
        (set, get) => ({
            cycles: [],
            cyclesLoading: false,
            selectedCycle: null,
            items: [],
            accounts: [],
            defaultAccountId: '',
            transactions: [],

            // ──── Load cycles ─────────────────────────────────
            loadCycles: async () => {
                set({ cyclesLoading: true });
                try {
                    const res: any = await fetchAPI(API_ENDPOINTS.HR.PAYROLL.CYCLES);
                    const data = res.data?.data || res.data || res || [];
                    set({ cycles: Array.isArray(data) ? data : [] });
                } catch (error) {
                    console.error(error);
                    showToast('خطأ في تحميل دورات الرواتب', 'error');
                } finally {
                    set({ cyclesLoading: false });
                }
            },

            // ──── Load cycle details (items) ──────────────────
            loadCycleDetails: async (cycleId) => {
                try {
                    const res: any = await fetchAPI(API_ENDPOINTS.HR.PAYROLL.CYCLE_ITEMS(cycleId));
                    const items = (res.data || (Array.isArray(res) ? res : [])) as PayrollItemExtended[];
                    const cycle = res.cycle ? (res.cycle as PayrollCycle) : get().selectedCycle;
                    set({ items, selectedCycle: cycle });
                    return items;
                } catch (error) {
                    console.error(error);
                    showToast('خطأ في تحميل تفاصيل الدورة', 'error');
                    return [];
                }
            },

            // ──── Load chart-of-accounts for payment ──────────
            loadAccounts: async () => {
                try {
                    const res: any = await fetchAPI(API_ENDPOINTS.FINANCE.ACCOUNTS.BASE);
                    const data = res.accounts || (Array.isArray(res) ? res : []);
                    const assetAccounts = data.filter(
                        (acc: PayrollAccount) => acc.type === 'asset' || acc.code.startsWith('1')
                    );

                    const cashAcc =
                        assetAccounts.find((a: PayrollAccount) => a.code === '1110') ||
                        assetAccounts.find((a: PayrollAccount) => a.name.toLowerCase().includes('cash')) ||
                        assetAccounts[0];

                    set({
                        accounts: assetAccounts,
                        defaultAccountId: cashAcc ? cashAcc.id.toString() : '',
                    });
                } catch (e) {
                    console.error('Failed to load accounts', e);
                }
            },

            // ──── Load transaction history for an item ────────
            loadItemHistory: async (itemId) => {
                try {
                    const res: any = await fetchAPI(API_ENDPOINTS.HR.PAYROLL.ITEM_TRANSACTIONS(itemId));
                    const transactions = (res.data as PayrollTransaction[]) || [];
                    set({ transactions });
                    return transactions;
                } catch (error) {
                    console.error(error);
                    showToast('خطأ في تحميل سجل التحويلات', 'error');
                    return [];
                }
            },

            // ──── Create a new payroll cycle ──────────────────
            createCycle: async (payload) => {
                try {
                    const res: any = await fetchAPI(API_ENDPOINTS.HR.PAYROLL.GENERATE, {
                        method: 'POST',
                        body: JSON.stringify(payload),
                    });
                    if (res.success !== false) {
                        showToast('تم إنشاء المسير بنجاح', 'success');
                        get().loadCycles();
                        return true;
                    }
                    showToast('فشل إنشاء المسير: ' + res.message, 'error');
                    return false;
                } catch {
                    showToast('حدث خطأ غير متوقع', 'error');
                    return false;
                }
            },

            // ──── Approve / advance cycle ─────────────────────
            approveCycle: async (id) => {
                try {
                    const res: any = await fetchAPI(API_ENDPOINTS.HR.PAYROLL.APPROVE(id), { method: 'POST' });
                    if (res.success !== false) {
                        showToast('تمت الموافقة بنجاح', 'success');
                        get().loadCycles();
                        return true;
                    }
                    showToast('فشل الموافقة: ' + res.message, 'error');
                    return false;
                } catch {
                    showToast('حدث خطأ', 'error');
                    return false;
                }
            },

            // ──── Bulk payment ────────────────────────────────
            bulkPayment: async (cycleId, accountId) => {
                try {
                    const res: any = await fetchAPI(API_ENDPOINTS.HR.PAYROLL.PROCESS_PAYMENT(cycleId), {
                        method: 'POST',
                        body: JSON.stringify({ account_id: accountId }),
                    });
                    if (res.success !== false) {
                        showToast('تم ترحيل وصرف الرواتب بنجاح', 'success');
                        get().loadCycles();
                        return true;
                    }
                    showToast('فشل الصرف: ' + res.message, 'error');
                    return false;
                } catch {
                    showToast('حدث خطأ', 'error');
                    return false;
                }
            },

            // ──── Toggle item on_hold / active ────────────────
            toggleItemStatus: async (item) => {
                try {
                    const res: any = await fetchAPI(API_ENDPOINTS.HR.PAYROLL.TOGGLE_ITEM(item.id), {
                        method: 'POST',
                    });
                    if (res) {
                        showToast(
                            res.status === 'on_hold'
                                ? 'تم إيقاف صرف الراتب مؤقتاً'
                                : 'تم تفعيل صرف الراتب',
                            'info'
                        );
                        get().loadCycleDetails(item.payroll_cycle_id);
                        return true;
                    }
                    return false;
                } catch {
                    showToast('حدث خطأ', 'error');
                    return false;
                }
            },

            // ──── Update a payroll item ───────────────────────
            updateItem: async (itemId, data) => {
                try {
                    const res: any = await fetchAPI(API_ENDPOINTS.HR.PAYROLL.UPDATE_ITEM(itemId), {
                        method: 'PUT',
                        body: JSON.stringify(data),
                    });
                    if (res.id) {
                        showToast('تم تحديث بيانات الموظف بنجاح', 'success');
                        get().loadCycles(); // refresh totals
                        return true;
                    }
                    return false;
                } catch {
                    return false;
                }
            },

            // ──── Individual payment ──────────────────────────
            individualPayment: async (itemId, data) => {
                try {
                    const res: any = await fetchAPI(API_ENDPOINTS.HR.PAYROLL.PAY_ITEM(itemId), {
                        method: 'POST',
                        body: JSON.stringify(data),
                    });
                    if (res.success !== false) {
                        showToast('تم تسجيل عملية التحويل بنجاح', 'success');
                        return true;
                    }
                    showToast(res.message || res.error || 'فشل تسجيل التحويل', 'error');
                    return false;
                } catch {
                    showToast('حدث خطأ', 'error');
                    return false;
                }
            },

            setSelectedCycle: (cycle) => set({ selectedCycle: cycle }),
        }),
        { name: 'payroll-store' }
    )
);
