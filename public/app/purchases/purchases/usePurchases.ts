import { useState, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast } from "@/components/ui";
import { Purchase, PurchaseRequest } from "./types";

export function usePurchases() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const itemsPerPage = 10;

    const loadPurchases = useCallback(async (page: number = 1, search: string = "") => {
        try {
            setIsLoading(true);
            const response = await fetchAPI(
                `${API_ENDPOINTS.PURCHASES.BASE}?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}`
            );
            if (response.success) {
                setPurchases((response.data as Purchase[]) || []);
                setTotalPages((response.pagination as any)?.total_pages || 1);
                setCurrentPage(page);
            }
        } catch {
            showToast("خطأ في تحميل المشتريات", "error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const savePurchase = useCallback(async (payload: any, id?: number) => {
        try {
            const endpoint = API_ENDPOINTS.PURCHASES.BASE;
            const method = id ? "PUT" : "POST";
            const body = id ? { ...payload, id } : payload;

            const response = await fetchAPI(endpoint, {
                method,
                body: JSON.stringify(body),
            });

            if (response.success) {
                showToast(id ? "تم تحديث المشترى بنجاح" : "تمت إضافة المشترى بنجاح", "success");
                return true;
            } else {
                showToast(response.message || "فشل حفظ المشترى", "error");
                return false;
            }
        } catch {
            showToast("خطأ في الاتصال بالخادم", "error");
            return false;
        }
    }, []);

    const deletePurchase = useCallback(async (id: number) => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.PURCHASES.BASE}?id=${id}`, { method: "DELETE" });
            if (response.success) {
                showToast("تم حذف المشترى", "success");
                return true;
            } else {
                showToast(response.message || "فشل الحذف", "error");
                return false;
            }
        } catch {
            showToast("خطأ في حذف المشترى", "error");
            return false;
        }
    }, []);

    return {
        purchases,
        currentPage,
        totalPages,
        isLoading,
        loadPurchases,
        savePurchase,
        deletePurchase
    };
}
