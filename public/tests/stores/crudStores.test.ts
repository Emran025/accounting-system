import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAPI } from '@/lib/api';
import { showToast } from '@/components/ui';

const mockedFetchAPI = vi.mocked(fetchAPI);
const mockedShowToast = vi.mocked(showToast);

describe('CRUD Store Factory Stores', () => {

    // ──── useProductStore ─────────────────────────────────
    describe('useProductStore', () => {
        let useProductStore: typeof import('@/stores/useProductStore').useProductStore;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.resetModules();
            const mod = await import('@/stores/useProductStore');
            useProductStore = mod.useProductStore;
            // Reset
            useProductStore.setState({
                items: [],
                isLoading: false,
                lastFetched: null,
                currentPage: 1,
                totalPages: 1,
            });
        });

        it('has correct initial state', () => {
            const state = useProductStore.getState();
            expect(state.items).toEqual([]);
            expect(state.isLoading).toBe(false);
        });

        it('loads products from API', async () => {
            const mockProducts = [
                { id: 1, name: 'Widget', barcode: 'W001', unit_price: 100, stock_quantity: 50 },
                { id: 2, name: 'Gadget', barcode: 'G001', unit_price: 200, stock_quantity: 30 },
            ];
            mockedFetchAPI.mockResolvedValueOnce({
                data: mockProducts,
                meta: { current_page: 1, last_page: 1, total: 2 },
            });

            await useProductStore.getState().load();

            const state = useProductStore.getState();
            expect(state.items.length).toBe(2);
            expect(state.isLoading).toBe(false);
        });

        it('shows error toast on load failure', async () => {
            mockedFetchAPI.mockRejectedValueOnce(new Error('Network error'));

            await useProductStore.getState().load();

            expect(mockedShowToast).toHaveBeenCalledWith(
                expect.stringContaining('خطأ'),
                'error'
            );
        });

        it('saves a new product', async () => {
            mockedFetchAPI
                .mockResolvedValueOnce({ id: 3, product_name: 'New' })  // save
                .mockResolvedValueOnce({ data: [] });                     // reload

            const result = await useProductStore.getState().save({ name: 'New', barcode: 'N001' });
            expect(result).toBe(true);
            expect(mockedShowToast).toHaveBeenCalledWith(
                expect.any(String),
                'success'
            );
        });

        it('removes a product', async () => {
            useProductStore.setState({
                items: [
                    { id: 1, name: 'Widget' } as any,
                    { id: 2, name: 'Gadget' } as any,
                ],
            });

            mockedFetchAPI.mockResolvedValueOnce({});

            const result = await useProductStore.getState().remove(1);
            expect(result).toBe(true);
            // Optimistic removal
            expect(useProductStore.getState().items).toHaveLength(1);
        });

        it('invalidates cache via invalidate', () => {
            useProductStore.setState({ lastFetched: Date.now() });
            useProductStore.getState().invalidate();
            expect(useProductStore.getState().lastFetched).toBeNull();
        });
    });

    // ──── useCustomerStore ────────────────────────────────
    describe('useCustomerStore', () => {
        let useCustomerStore: typeof import('@/stores/useCustomerStore').useCustomerStore;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.resetModules();
            const mod = await import('@/stores/useCustomerStore');
            useCustomerStore = mod.useCustomerStore;
            useCustomerStore.setState({
                items: [],
                isLoading: false,
                lastFetched: null,
            });
        });

        it('has correct initial state', () => {
            const state = useCustomerStore.getState();
            expect(state.items).toEqual([]);
            expect(state.isLoading).toBe(false);
        });

        it('loads customers', async () => {
            mockedFetchAPI.mockResolvedValueOnce({
                data: [{ id: 1, name: 'Customer A' }],
                meta: { current_page: 1, last_page: 1, total: 1 },
            });

            await useCustomerStore.getState().load();
            expect(useCustomerStore.getState().items).toHaveLength(1);
        });

        it('removes a customer optimistically', async () => {
            useCustomerStore.setState({
                items: [{ id: 1, name: 'Cust A' } as any, { id: 2, name: 'Cust B' } as any],
            });
            mockedFetchAPI.mockResolvedValueOnce({});

            await useCustomerStore.getState().remove(1);
            expect(useCustomerStore.getState().items).toHaveLength(1);
            expect(useCustomerStore.getState().items[0].id).toBe(2);
        });
    });

    // ──── useSupplierStore ────────────────────────────────
    describe('useSupplierStore', () => {
        let useSupplierStore: typeof import('@/stores/useSupplierStore').useSupplierStore;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.resetModules();
            const mod = await import('@/stores/useSupplierStore');
            useSupplierStore = mod.useSupplierStore;
            useSupplierStore.setState({
                items: [],
                isLoading: false,
                lastFetched: null,
            });
        });

        it('loads suppliers', async () => {
            mockedFetchAPI.mockResolvedValueOnce({
                data: [{ id: 1, name: 'Supplier X' }],
                meta: { current_page: 1, last_page: 1, total: 1 },
            });

            await useSupplierStore.getState().load();
            expect(useSupplierStore.getState().items).toHaveLength(1);
        });
    });

    // ──── usePurchaseStore ────────────────────────────────
    describe('usePurchaseStore', () => {
        let usePurchaseStore: typeof import('@/stores/usePurchaseStore').usePurchaseStore;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.resetModules();
            const mod = await import('@/stores/usePurchaseStore');
            usePurchaseStore = mod.usePurchaseStore;
            usePurchaseStore.setState({
                items: [],
                isLoading: false,
                lastFetched: null,
            });
        });

        it('loads purchases', async () => {
            mockedFetchAPI.mockResolvedValueOnce({
                data: [{ id: 1, supplier: 'Supplier A', total: 5000 }],
                meta: { current_page: 1, last_page: 1, total: 1 },
            });

            await usePurchaseStore.getState().load();
            expect(usePurchaseStore.getState().items).toHaveLength(1);
        });

        it('saves a purchase', async () => {
            mockedFetchAPI
                .mockResolvedValueOnce({ id: 1 })
                .mockResolvedValueOnce({ data: [] });

            const result = await usePurchaseStore.getState().save({ supplier_id: 1, total: 5000 });
            expect(result).toBe(true);
        });
    });
});
