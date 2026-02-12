import { createCRUDStore } from './factories/createCRUDStore';
import { API_ENDPOINTS } from '@/lib/endpoints';
import { Supplier } from '@/app/suppliers/types';

/**
 * Zustand store for Suppliers (AP).
 * Replaces the old `useSuppliers` custom hook with a global, cached store.
 */
export const useSupplierStore = createCRUDStore<Supplier>({
    endpoint: API_ENDPOINTS.PURCHASES.SUPPLIERS.BASE,
    storeName: 'supplier-store',
    messages: {
        loadError: 'خطأ في تحميل الموردين',
        saveSuccess: 'تمت إضافة المورد بنجاح',
        updateSuccess: 'تم تحديث المورد بنجاح',
        saveError: 'خطأ في حفظ المورد',
        deleteSuccess: 'تم حذف المورد',
        deleteError: 'خطأ في حذف المورد',
    },
});
