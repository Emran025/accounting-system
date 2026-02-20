import React from "react";
import { Table, Column } from "@/components/ui";
import { Icon } from "@/lib/icons";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PurchaseRequest } from "../types";
import { canAccess, Permission } from "@/lib/auth";

interface RequestsTableProps {
    requests: PurchaseRequest[];
    isLoading: boolean;
    permissions: Permission[];
    onEditStatus: (req: PurchaseRequest, status: "approved" | "rejected" | "done") => void;
}

export const RequestsTable: React.FC<RequestsTableProps> = ({
    requests,
    isLoading,
    permissions,
    onEditStatus,
}) => {
    const columns: Column<PurchaseRequest>[] = [
        {
            key: "id",
            header: "رقم الطلب",
            dataLabel: "رقم الطلب",
            render: (item) => `#REQ-${item.id}`,
        },
        {
            key: "product_name",
            header: "المنتج",
            dataLabel: "المنتج",
            render: (item) => item.product?.name || item.product_name || "-",
        },
        {
            key: "quantity",
            header: "الكمية المطلوبة",
            dataLabel: "الكمية المطلوبة",
        },
        {
            key: "notes",
            header: "ملاحظات",
            dataLabel: "ملاحظات",
            render: (item) => item.notes || "-",
        },
        {
            key: "user",
            header: "بواسطة",
            dataLabel: "بواسطة",
            render: (item) => item.user?.name || "-",
        },
        {
            key: "created_at",
            header: "التاريخ",
            dataLabel: "التاريخ",
            render: (item) => formatDate(item.created_at),
        },
        {
            key: "status",
            header: "الحالة",
            dataLabel: "الحالة",
            render: (item) => {
                const statusMap: Record<string, { label: string; class: string }> = {
                    pending: { label: "قيد الانتظار", class: "warning" },
                    approved: { label: "مقبول", class: "success" },
                    done: { label: "مكتمل", class: "info" },
                    rejected: { label: "مرفوض", class: "danger" },
                };
                const s = statusMap[item.status] || { label: item.status, class: "secondary" };
                return <span className={`status-badge ${s.class}`}>{s.label}</span>;
            },
        },
        {
            key: "actions",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <div className="action-buttons">
                    {canAccess(permissions, "purchases", "edit") && item.status === "pending" && (
                        <>
                            <button
                                className="icon-btn success"
                                onClick={() => onEditStatus(item, "approved")}
                                title="قبول الطلب"
                            >
                                <Icon name="check" />
                            </button>
                            <button
                                className="icon-btn danger"
                                onClick={() => onEditStatus(item, "rejected")}
                                title="رفض الطلب"
                            >
                                <Icon name="x" />
                            </button>
                        </>
                    )}
                    {canAccess(permissions, "purchases", "edit") && item.status === "approved" && (
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => onEditStatus(item, "done")}
                            title="تعليم كمكتمل"
                        >
                            تأكيد التنفيذ
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            data={requests}
            keyExtractor={(it) => it.id}
            isLoading={isLoading}
            emptyMessage="لا توجد طلبات شراء مطابقة"
        />
    );
};
