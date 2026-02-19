import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchAPI } from '@/lib/api';
import { showToast } from '@/components/ui';

/**
 * State shape for any CRUD store created by this factory.
 */
export interface CRUDState<T> {
    items: T[];
    currentPage: number;
    totalPages: number;
    isLoading: boolean;
    lastFetched: number | null;

    load: (page?: number, search?: string) => Promise<void>;
    save: (data: Record<string, unknown>, id?: number) => Promise<boolean>;
    remove: (id: number) => Promise<boolean>;
    invalidate: () => void;
}

/**
 * Configuration for creating a CRUD store.
 */
export interface CRUDConfig<T = unknown> {
    /** API endpoint path (e.g. API_ENDPOINTS.INVENTORY.PRODUCTS) */
    endpoint: string;
    /** DevTools store name (e.g. 'product-store') */
    storeName: string;
    /** Items per page, defaults to 10 */
    itemsPerPage?: number;
    /** Cache TTL in milliseconds, defaults to 5 minutes */
    cacheTTL?: number;
    /** Custom toast messages in Arabic */
    messages?: {
        loadError?: string;
        saveSuccess?: string;
        updateSuccess?: string;
        saveError?: string;
        deleteSuccess?: string;
        deleteError?: string;
    };
    /**
     * Optional transform applied to the raw data array returned from the API.
     * Use this to map backend field names to frontend-friendly names.
     */
    transform?: (raw: unknown[]) => T[];
}

/**
 * Creates a fully-typed Zustand CRUD store with pagination, caching,
 * devtools, and toast notifications.
 *
 * @example
 * ```ts
 * export const useProductStore = createCRUDStore<Product>({
 *   endpoint: API_ENDPOINTS.INVENTORY.PRODUCTS,
 *   storeName: 'product-store',
 * });
 * ```
 */
export function createCRUDStore<T extends { id: number }>(config: CRUDConfig<T>) {
    const {
        endpoint,
        storeName,
        itemsPerPage = 10,
        // cacheTTL = 5 * 60 * 1000,
        messages = {},
        transform,
    } = config;

    return create<CRUDState<T>>()(
        devtools(
            (set, get) => ({
                items: [],
                currentPage: 1,
                totalPages: 1,
                isLoading: false,
                lastFetched: null,

                load: async (page = 1, search = '') => {
                    set({ isLoading: true });
                    try {
                        const res = await fetchAPI(
                            `${endpoint}?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}`
                        );
                        if (res.success) {
                            const raw = res.data ?? [];
                            let itemsToTransform: unknown[] = [];
                            let totalPages = 1;

                            if (Array.isArray(raw)) {
                                itemsToTransform = raw;
                            } else if (raw && typeof raw === 'object') {
                                const paginated = raw as Record<string, unknown>;
                                if (Array.isArray(paginated.data)) {
                                    itemsToTransform = paginated.data as unknown[];
                                    totalPages = (paginated.last_page as number) || 1;
                                }
                            }

                            // Also check pagination object from BaseApiController
                            const pagination = res.pagination as Record<string, unknown> | undefined;
                            if (pagination?.total_pages) {
                                totalPages = pagination.total_pages as number;
                            }

                            const items = transform
                                ? transform(itemsToTransform)
                                : (itemsToTransform as T[]);

                            set({
                                items,
                                totalPages,
                                currentPage: page,
                                lastFetched: Date.now(),
                            });
                        }
                    } catch {
                        showToast(messages.loadError || 'خطأ في تحميل البيانات', 'error');
                    } finally {
                        set({ isLoading: false });
                    }
                },

                save: async (data, id?) => {
                    try {
                        const res = await fetchAPI(endpoint, {
                            method: id ? 'PUT' : 'POST',
                            body: JSON.stringify(id ? { ...data, id } : data),
                        });
                        if (res.success) {
                            showToast(
                                id
                                    ? (messages.updateSuccess || 'تم التحديث بنجاح')
                                    : (messages.saveSuccess || 'تمت الإضافة بنجاح'),
                                'success'
                            );
                            // Invalidate cache so next load is fresh
                            get().invalidate();
                            return true;
                        }
                        showToast(res.message || messages.saveError || 'فشل الحفظ', 'error');
                        return false;
                    } catch {
                        showToast(messages.saveError || 'خطأ في الحفظ', 'error');
                        return false;
                    }
                },

                remove: async (id) => {
                    try {
                        const res = await fetchAPI(`${endpoint}?id=${id}`, { method: 'DELETE' });
                        if (res.success) {
                            showToast(messages.deleteSuccess || 'تم الحذف', 'success');
                            // Optimistic removal from local items
                            set(state => ({ items: state.items.filter(item => item.id !== id) }));
                            return true;
                        }
                        showToast(res.message || messages.deleteError || 'فشل الحذف', 'error');
                        return false;
                    } catch {
                        showToast(messages.deleteError || 'خطأ في الحذف', 'error');
                        return false;
                    }
                },

                invalidate: () => set({ lastFetched: null }),
            }),
            { name: storeName }
        )
    );
}
