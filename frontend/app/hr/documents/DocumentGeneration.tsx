"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Table, Column, showToast, Select, ActionButtons, SearchableSelect, DocumentPreview } from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { PageSubHeader } from "@/components/layout";
import { DocumentTemplate, Employee } from "@/app/hr/types";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { templateTypeLabels, templateTypeBadgeClass } from "./templates-data";

export function DocumentGeneration() {
    const { canAccess } = useAuthStore();
    const router = useRouter();
    const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
    const [typeFilter, setTypeFilter] = useState("");

    const [previewHtml, setPreviewHtml] = useState("");
    const [previewName, setPreviewName] = useState("");
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    useEffect(() => {
        loadTemplates();
        loadAllEmployees();
    }, [loadAllEmployees]);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const query = typeFilter ? `?type=${typeFilter}` : "";
            const res = await fetchAPI(`${API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.BASE}${query}`);
            setTemplates((res as any).data || []);
        } catch { console.error("Failed to load templates"); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { loadTemplates(); }, [typeFilter]);

    // ── Open Editor for Edit ──
    const openEdit = (template: DocumentTemplate) => {
        router.push(`/hr/documents/editor?id=${template.id}`);
    };

    // ── Open Preview ──
    const openPreview = async (template: DocumentTemplate) => {
        if (!selectedEmployeeId) {
            showToast("يرجى اختيار موظف للمعاينة أولاً", "error");
            return;
        }

        setIsPreviewMode(true);
        setIsPreviewLoading(true);
        setPreviewName(template.template_name_ar);

        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.RENDER(template.id), {
                method: "POST",
                body: JSON.stringify({ employee_id: Number(selectedEmployeeId) }),
            });
            const resData = (res as any).data;
            let finalHtml = resData?.rendered_html || "";

            const templateRes = await fetchAPI(API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.withId(template.id));
            const templateData = (templateRes as any).data || templateRes;
            if (templateData) {
                if (!finalHtml) {
                    finalHtml = templateData.body_html || "";
                }
            }

            setPreviewHtml(finalHtml);
        } catch (error) {
            console.error("Render error:", error);
            showToast("فشل في تحميل المعاينة", "error");
            setIsPreviewMode(false);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    // ── Delete ──
    const handleDelete = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذا القالب؟")) return;
        try {
            await fetchAPI(API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.withId(id), { method: "DELETE" });
            showToast("تم حذف القالب", "success");
            loadTemplates();
        } catch { showToast("فشل حذف القالب", "error"); }
    };

    // ── Table columns ──
    const columns: Column<DocumentTemplate>[] = [
        {
            key: "template_name_ar",
            header: "اسم القالب",
            dataLabel: "اسم القالب",
            render: (item) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{item.template_name_ar}</div>
                    {item.template_name_en && <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{item.template_name_en}</div>}
                </div>
            ),
        },
        {
            key: "template_type",
            header: "النوع",
            dataLabel: "النوع",
            render: (item) => (
                <span className={`badge ${templateTypeBadgeClass[item.template_type] || 'badge-secondary'}`}>
                    {templateTypeLabels[item.template_type] || item.template_type}
                </span>
            ),
        },
        { key: "template_key", header: "المفتاح", dataLabel: "المفتاح" },
        {
            key: "id",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons
                    actions={[
                        { icon: "eye", title: "معاينة", variant: "view", onClick: () => openPreview(item) },
                        ...(canAccess("employees", "edit") ? [{ icon: "edit" as const, title: "محرر القالب", variant: "edit" as const, onClick: () => openEdit(item) }] : []),
                        ...(canAccess("employees", "delete") ? [{ icon: "trash" as const, title: "حذف", variant: "delete" as const, onClick: () => handleDelete(item.id) }] : [])
                    ]}
                />
            ),
        },
    ];

    // ═══════════════════════════
    //  List View
    // ═══════════════════════════
    if (isPreviewMode) {
        return (
            <DocumentPreview
                title={previewName}
                htmlContent={previewHtml}
                onBack={() => setIsPreviewMode(false)}
                isLoading={isPreviewLoading}
                titleIcon="file-signature"
            />
        );
    }

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="المستندات والتقارير الرسمية"
                titleIcon="file-signature"
                searchInput={
                    <SearchableSelect
                        options={employees.map((e: Employee) => ({ value: e.id.toString(), label: `${e.full_name} (${e.employee_code})` }))}
                        value={selectedEmployeeId}
                        onChange={(val) => setSelectedEmployeeId(val?.toString() || "")}
                        placeholder="اختر موظف للمعاينة..."
                    />
                }
                actions={
                    <>
                        <Select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            placeholder="جميع الأنواع"
                            options={Object.entries(templateTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
                            style={{ minWidth: "140px" }}
                        />
                        {canAccess("employees", "create") && (
                            <Button variant="primary" icon="edit" onClick={() => router.push("/hr/documents/editor")}>
                                محرر قالب جديد
                            </Button>
                        )}
                    </>
                }
            />

            <Table columns={columns} data={templates} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد قوالب مسجلة" isLoading={isLoading} />

        </div>
    );
}
