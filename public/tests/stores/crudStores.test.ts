import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAPI } from '@/lib/api';
import { showToast } from '@/components/ui';

const mockedFetchAPI = vi.mocked(fetchAPI);
const mockedShowToast = vi.mocked(showToast);

describe('CRUD Store Factory Stores', () => {

    // ──── useProductStore ─────────────────────────────────
    describe('useProductStore', () => {
        let useProductStore: any;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.resetModules();
            const mod = await import('@/stores/useProductStore');
            useProductStore = mod.useProductStore;
            // Reset
            useProductStore.setState({
                items: [],
                isLoading: false,
                error: null,
                lastFetched: null,
                currentPage: 1,
                totalPages: 1,
                totalItems: 0,
            });
        });

        it('has correct initial state', () => {
            const state = useProductStore.getState();
            expect(state.items).toEqual([]);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
        });

        it('loads products from API', async () => {
            const mockProducts = [
                { id: 1, product_name: 'Widget', sku: 'W001', selling_price: 100, quantity: 50 },
                { id: 2, product_name: 'Gadget', sku: 'G001', selling_price: 200, quantity: 30 },
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

            const result = await useProductStore.getState().save({ product_name: 'New', sku: 'N001' });
            expect(result).toBe(true);
            expect(mockedShowToast).toHaveBeenCalledWith(
                expect.any(String),
                'success'
            );
        });

        it('removes a product', async () => {
            useProductStore.setState({
                items: [
                    { id: 1, product_name: 'Widget' },
                    { id: 2, product_name: 'Gadget' },
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
        let useCustomerStore: any;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.resetModules();
            const mod = await import('@/stores/useCustomerStore');
            useCustomerStore = mod.useCustomerStore;
            useCustomerStore.setState({
                items: [],
                isLoading: false,
                error: null,
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
                items: [{ id: 1, name: 'Cust A' }, { id: 2, name: 'Cust B' }],
            });
            mockedFetchAPI.mockResolvedValueOnce({});

            await useCustomerStore.getState().remove(1);
            expect(useCustomerStore.getState().items).toHaveLength(1);
            expect(useCustomerStore.getState().items[0].id).toBe(2);
        });
    });

    // ──── useSupplierStore ────────────────────────────────
    describe('useSupplierStore', () => {
        let useSupplierStore: any;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.resetModules();
            const mod = await import('@/stores/useSupplierStore');
            useSupplierStore = mod.useSupplierStore;
            useSupplierStore.setState({
                items: [],
                isLoading: false,
                error: null,
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
        let usePurchaseStore: any;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.resetModules();
            const mod = await import('@/stores/usePurchaseStore');
            usePurchaseStore = mod.usePurchaseStore;
            usePurchaseStore.setState({
                items: [],
                isLoading: false,
                error: null,
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
