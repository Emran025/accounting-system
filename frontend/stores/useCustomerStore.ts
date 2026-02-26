import { createCRUDStore } from './factories/createCRUDStore';
import { API_ENDPOINTS } from '@/lib/endpoints';
import { Customer } from '@/app/ar_customers/types';

/**
 * Zustand store for AR Customers.
 * Replaces the old `useCustomers` custom hook with a global, cached store.
 */
export const useCustomerStore = createCRUDStore<Customer>({
    endpoint: API_ENDPOINTS.FINANCE.AR.CUSTOMERS,
    storeName: 'customer-store',
    messages: {
        loadError: 'خطأ في تحميل العملاء',
        saveSuccess: 'تمت إضافة العميل بنجاح',
        updateSuccess: 'تم تحديث العميل بنجاح',
        saveError: 'خطأ في الاتصال بالخادم',
        deleteSuccess: 'تم حذف العميل',
        deleteError: 'خطأ في حذف العميل',
    },
});
