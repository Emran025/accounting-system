import { useState, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast } from "@/components/ui";
import { Customer } from "./types";

export function useCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const itemsPerPage = 10;

    const loadCustomers = useCallback(async (page: number = 1, search: string = "") => {
        try {
            setIsLoading(true);
            const response = await fetchAPI(
                `${API_ENDPOINTS.FINANCE.AR.CUSTOMERS}?page=${page}&per_page=${itemsPerPage}&search=${encodeURIComponent(search)}`
            );
            if (response.success) {
                setCustomers((response.data as Customer[]) || []);
                setTotalPages((response.pagination as any)?.total_pages || 1);
                setCurrentPage(page);
            }
        } catch {
            showToast("خطأ في تحميل العملاء", "error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveCustomer = useCallback(async (formData: any, id?: number) => {
        try {
            const method = id ? "PUT" : "POST";
            const response = await fetchAPI(API_ENDPOINTS.FINANCE.AR.CUSTOMERS, {
                method,
                body: JSON.stringify(id ? { ...formData, id } : formData),
            });

            if (response.success) {
                showToast(id ? "تم تحديث العميل بنجاح" : "تمت إضافة العميل بنجاح", "success");
                return true;
            } else {
                showToast(response.message || "فشل العملية", "error");
                return false;
            }
        } catch {
            showToast("خطأ في الاتصال بالخادم", "error");
            return false;
        }
    }, []);

    const deleteCustomer = useCallback(async (id: number) => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.AR.CUSTOMERS}?id=${id}`, { method: "DELETE" });
            if (response.success) {
                showToast("تم حذف العميل", "success");
                return true;
            } else {
                showToast(response.message || "فشل الحذف", "error");
                return false;
            }
        } catch {
            showToast("خطأ في حذف العميل", "error");
            return false;
        }
    }, []);

    return {
        customers,
        currentPage,
        totalPages,
        isLoading,
        loadCustomers,
        saveCustomer,
        deleteCustomer
    };
}
