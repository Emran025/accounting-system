import { createCRUDStore } from './factories/createCRUDStore';
import { API_ENDPOINTS } from '@/lib/endpoints';
import { SalesRepresentative } from '@/app/representatives/types';

export const useSalesRepresentativeStore = createCRUDStore<SalesRepresentative>({
    endpoint: API_ENDPOINTS.SALES.REPRESENTATIVES.BASE,
    storeName: 'sales-representative-store',
    messages: {
        loadError: 'خطأ في تحميل المناديب',
        saveSuccess: 'تم الحفظ بنجاح',
        updateSuccess: 'تم التحديث بنجاح',
        saveError: 'خطأ في الحفظ',
        deleteSuccess: 'تم الحذف بنجاح',
        deleteError: 'خطأ في الحذف',
    },
});
