"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { Button, ConfirmDialog, showToast } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { User, getStoredUser, getStoredPermissions, Permission, canAccess, checkAuth } from "@/lib/auth";
import { PurchaseRequest, Product } from "./types";
import { RequestsTable } from "./components/RequestsTable";
import { AddRequestDialog } from "./components/AddRequestDialog";

export default function PurchaseRequestsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Dialog states
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isAutoOpen, setIsAutoOpen] = useState(false);
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [reqRes, prodRes] = await Promise.all([
                fetchAPI(API_ENDPOINTS.PURCHASES.REQUESTS),
                fetchAPI(`${API_ENDPOINTS.INVENTORY.PRODUCTS}?limit=1000`),
            ]);
            setRequests((reqRes.data as PurchaseRequest[]) || []);
            setProducts((prodRes.data as Product[]) || []);
        } catch (error) {
            console.error("Failed to load requests", error);
            showToast("خطأ في تحميل الطلبات", "error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const authState = await checkAuth();
            if (!authState.isAuthenticated) return;
            setUser(authState.user);
            setPermissions(authState.permissions);
            await loadData();
        };
        init();
    }, [loadData]);

    const handleCreateRequest = async (data: { product_id: string; product_name: string; quantity: number; notes: string }) => {
        try {
            await fetchAPI(API_ENDPOINTS.PURCHASES.REQUESTS, {
                method: "POST",
                body: JSON.stringify(data),
            });
            showToast("تم إنشاء الطلب بنجاح", "success");
            loadData();
        } catch (error) {
            console.error("Failed to create request", error);
            showToast("حدث خطأ أثناء الإنشاء", "error");
        }
    };

    const handleUpdateStatus = async (request: PurchaseRequest, newStatus: string) => {
        try {
            await fetchAPI(API_ENDPOINTS.PURCHASES.REQUESTS, {
                method: "PUT",
                body: JSON.stringify({ id: request.id, status: newStatus }),
            });
            showToast("تم تحديث الحالة بنجاح", "success");
            loadData();
        } catch (error) {
            console.error("Failed to update status", error);
            showToast("حدث خطأ أثناء التحديث", "error");
        }
    };

    const handleAutoGenerate = async () => {
        setIsAutoGenerating(true);
        try {
            const response = await fetchAPI(API_ENDPOINTS.PURCHASES.REQUESTS + "/auto-generate", {
                method: "POST",
            });

            // The backend merges the response object if it's associative
            const message = (response.message as string) || "تمت العملية بنجاح";
            const generatedCount = (response.generated_count as number) || 0;

            showToast(message, "success");
            setIsAutoOpen(false);
            if (generatedCount > 0) {
                await loadData();
            }
        } catch (error) {
            console.error("Failed to auto-generate requests", error);
            showToast("حدث خطأ أثناء التوليد التلقائي", "error");
        } finally {
            setIsAutoGenerating(false);
        }
    };

    return (
        <ModuleLayout groupKey="purchases" requiredModule="purchases">
            <PageHeader
                title="إدارة طلبات الشراء"
                user={user}
                actions={
                    <>
                        {canAccess(permissions, "purchases", "create") && (
                            <Button
                                variant="secondary"
                                icon="refresh"
                                onClick={() => setIsAutoOpen(true)}
                            >
                                توليد طلبات للنواقص
                            </Button>
                        )}
                        {canAccess(permissions, "purchases", "create") && (
                            <Button
                                variant="primary"
                                icon="plus"
                                onClick={() => setIsAddOpen(true)}
                            >
                                طلب جديد
                            </Button>
                        )}
                    </>
                }
            />

            <div className="sales-card animate-fade">
                <RequestsTable
                    requests={requests}
                    isLoading={isLoading}
                    permissions={permissions}
                    onEditStatus={handleUpdateStatus}
                />
            </div>

            <AddRequestDialog
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSave={handleCreateRequest}
                products={products}
            />

            <ConfirmDialog
                isOpen={isAutoOpen}
                onClose={() => setIsAutoOpen(false)}
                title="توليد تلقائي للطلبات"
                message="هل أنت متأكد من مراجعة النواقص في المخزون وتوليد طلبات شراء آلية لها؟ سيتم طلب المنتجات التي نفدت من المخزون أو التي قل رصيدها عن الحد الأدنى."
                confirmText={isAutoGenerating ? "جاري التوليد..." : "نعم، توليد"}
                cancelText="إلغاء"
                onConfirm={handleAutoGenerate}
            />
        </ModuleLayout>
    );
}
