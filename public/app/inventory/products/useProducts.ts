import { useState, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast } from "@/components/ui";
import { Product, Category } from "./types";

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const itemsPerPage = 10;

    const loadProducts = useCallback(async (page: number = 1, search: string = "") => {
        try {
            setIsLoading(true);
            const response = await fetchAPI(
                `${API_ENDPOINTS.INVENTORY.PRODUCTS}?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}`
            );

            if (response.success) {
                const rawProducts = (response.data as any[]) || [];
                const mappedProducts: Product[] = rawProducts.map(p => ({
                    ...p,
                    selling_price: parseFloat(p.unit_price) || 0,
                    purchase_price: parseFloat(p.purchase_price || p.latest_purchase_price) || 0,
                    stock: p.stock_quantity || 0,
                    min_stock: 10,
                    unit_type: p.unit_name === 'كرتون' ? 'ctn' : 'piece',
                    profit_margin: parseFloat(p.minimum_profit_margin) || 0,
                    description: p.description || '',
                }));

                setProducts(mappedProducts);
                setTotalPages((response.pagination as any)?.total_pages || 1);
                setCurrentPage(page);
            }
        } catch {
            showToast("خطأ في تحميل المنتجات", "error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadCategories = useCallback(async () => {
        try {
            const response = await fetchAPI(API_ENDPOINTS.INVENTORY.CATEGORIES);
            if (response.success) {
                setCategories((response.data as Category[]) || []);
            }
        } catch (e) {
            console.error("Error loading categories", e);
        }
    }, []);

    const saveProduct = useCallback(async (payload: any, id?: number) => {
        try {
            const method = id ? "PUT" : "POST";
            const body = id ? { ...payload, id } : payload;
            const response = await fetchAPI(API_ENDPOINTS.INVENTORY.PRODUCTS, {
                method,
                body: JSON.stringify(body),
            });

            if (response.success) {
                showToast(id ? "تم تحديث المنتج بنجاح" : "تمت إضافة المنتج بنجاح", "success");
                return true;
            } else {
                showToast(response.message || "فشل حفظ المنتج", "error");
                return false;
            }
        } catch {
            showToast("خطأ في حفظ المنتج", "error");
            return false;
        }
    }, []);

    const deleteProduct = useCallback(async (id: number) => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.INVENTORY.PRODUCTS}?id=${id}`, { method: "DELETE" });
            if (response.success) {
                showToast("تم حذف المنتج", "success");
                return true;
            } else {
                showToast(response.message || "فشل الحذف", "error");
                return false;
            }
        } catch {
            showToast("خطأ في حذف المنتج", "error");
            return false;
        }
    }, []);

    return {
        products,
        categories,
        currentPage,
        totalPages,
        isLoading,
        loadProducts,
        loadCategories,
        saveProduct,
        deleteProduct
    };
}
