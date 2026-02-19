import { createCRUDStore } from './factories/createCRUDStore';
import { API_ENDPOINTS } from '@/lib/endpoints';
import { Product } from '@/app/inventory/products/types';

/**
 * Zustand store for Products.
 * Replaces the old `useProducts` custom hook with a global, cached store.
 *
 * Product data is transformed to include UI-mapped fields (selling_price, stock, etc.)
 * so consuming components don't need to do manual mapping.
 */
export const useProductStore = createCRUDStore<Product>({
    endpoint: API_ENDPOINTS.INVENTORY.PRODUCTS,
    storeName: 'product-store',
    messages: {
        loadError: 'خطأ في تحميل المنتجات',
        saveSuccess: 'تمت إضافة المنتج بنجاح',
        updateSuccess: 'تم تحديث المنتج بنجاح',
        saveError: 'خطأ في حفظ المنتج',
        deleteSuccess: 'تم حذف المنتج',
        deleteError: 'خطأ في حذف المنتج',
    },
    transform: (raw: unknown[]): Product[] =>
        (raw as Record<string, any>[]).map(p => ({
            ...p,
            selling_price: parseFloat(p.unit_price) || 0,
            purchase_price: parseFloat(p.purchase_price || p.latest_purchase_price) || 0,
            stock: p.stock_quantity || 0,
            min_stock: 10,
            unit_type: p.unit_name === 'كرتون' ? 'ctn' : 'piece',
            profit_margin: parseFloat(p.minimum_profit_margin) || 0,
            description: p.description || '',
        } as Product)),
});
