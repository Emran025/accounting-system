import { useState, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast } from "@/components/ui";
import { Supplier } from "./types";

export function useSuppliers() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const itemsPerPage = 10;

    const loadSuppliers = useCallback(async (page: number = 1, search: string = "") => {
        try {
            setIsLoading(true);
            const response = await fetchAPI(
                `${API_ENDPOINTS.PURCHASES.SUPPLIERS.BASE}?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}`
            );
            if (response.success) {
                setSuppliers((response.data as Supplier[]) || []);
                setTotalPages((response.pagination as any)?.total_pages || 1);
                setCurrentPage(page);
            }
        } catch {
            showToast("خطأ في تحميل الموردين", "error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveSupplier = useCallback(async (formData: any, id?: number) => {
        try {
            const method = id ? "PUT" : "POST";
            const response = await fetchAPI(API_ENDPOINTS.PURCHASES.SUPPLIERS.BASE, {
                method,
                body: JSON.stringify(id ? { ...formData, id } : formData),
            });

            if (response.success) {
                showToast(id ? "تم تحديث المورد بنجاح" : "تمت إضافة المورد بنجاح", "success");
                return true;
            } else {
                showToast(response.message || "فشل العملية", "error");
                return false;
            }
        } catch {
            showToast("خطأ في حفظ المورد", "error");
            return false;
        }
    }, []);

    const deleteSupplier = useCallback(async (id: number) => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.PURCHASES.SUPPLIERS.BASE}?id=${id}`, { method: "DELETE" });
            if (response.success) {
                showToast("تم حذف المورد", "success");
                return true;
            } else {
                showToast(response.message || "فشل الحذف", "error");
                return false;
            }
        } catch {
            showToast("خطأ في حذف المورد", "error");
            return false;
        }
    }, []);

    return {
        suppliers,
        currentPage,
        totalPages,
        isLoading,
        loadSuppliers,
        saveSupplier,
        deleteSupplier
    };
}
