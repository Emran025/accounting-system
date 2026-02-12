import { createCRUDStore } from './factories/createCRUDStore';
import { API_ENDPOINTS } from '@/lib/endpoints';
import { Purchase } from '@/app/purchases/purchases/types';

/**
 * Zustand store for Purchases.
 * Replaces the old `usePurchases` custom hook with a global, cached store.
 */
export const usePurchaseStore = createCRUDStore<Purchase>({
    endpoint: API_ENDPOINTS.PURCHASES.BASE,
    storeName: 'purchase-store',
    messages: {
        loadError: 'خطأ في تحميل المشتريات',
        saveSuccess: 'تمت إضافة المشترى بنجاح',
        updateSuccess: 'تم تحديث المشترى بنجاح',
        saveError: 'خطأ في الاتصال بالخادم',
        deleteSuccess: 'تم حذف المشترى',
        deleteError: 'خطأ في حذف المشترى',
    },
});
