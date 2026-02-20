"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Table, Column, Dialog, showToast, Select, ActionButtons, SearchableSelect } from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { PageSubHeader } from "@/components/layout";
import { DocumentTemplate, Employee } from "@/app/hr/types";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { templateTypeLabels, templateTypeBadgeClass, printCSS } from "./templates-data";

export function DocumentGeneration() {
    const { canAccess } = useAuthStore();
    const router = useRouter();
    const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
    const [renderedHtml, setRenderedHtml] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const printRef = useRef<HTMLDivElement>(null);

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

    // ── Render / preview ──
    const handleRender = async (template: DocumentTemplate) => {
        if (!selectedEmployeeId) {
            showToast("يرجى اختيار موظف أولاً", "error");
            return;
        }
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.RENDER(template.id), {
                method: "POST",
                body: JSON.stringify({ employee_id: Number(selectedEmployeeId) }),
            });
            const resData = (res as any).data;
            setRenderedHtml(resData?.rendered_html || template.body_html);
            setSelectedTemplate(template);
            setShowPreview(true);
        } catch { showToast("فشل عرض المستند", "error"); }
    };

    // ── Print in new window with proper CSS ──
    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
<meta charset="UTF-8"><title>${selectedTemplate?.template_name_ar || 'مستند'}</title>
<style>${printCSS}</style></head><body>${renderedHtml}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 400);
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
                        { icon: "eye", title: "معاينة وطباعة", variant: "view", onClick: () => handleRender(item) },
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

            {/* ── Preview / Print Dialog ── */}
            <Dialog isOpen={showPreview} onClose={() => setShowPreview(false)} title={`معاينة: ${selectedTemplate?.template_name_ar || ''}`} footer={
                <>
                    <Button variant="secondary" onClick={() => setShowPreview(false)}>إغلاق</Button>
                    <Button variant="primary" icon="printer" onClick={handlePrint}>طباعة</Button>
                </>
            }>
                <div
                    ref={printRef}
                    className="document-preview"
                    style={{
                        background: "#f8f9fa",
                        padding: "24px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        minHeight: "500px",
                        maxHeight: "75vh",
                        overflowY: "auto",
                        boxShadow: "inset 0 2px 8px rgba(0,0,0,0.04)",
                    }}
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
            </Dialog>
        </div>
    );
}
