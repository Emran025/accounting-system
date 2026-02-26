"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Table, Column, Dialog, showToast, Select, ActionButtons, DocumentPreview } from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { PageSubHeader } from "@/components/layout";
import { templateTypeLabels, templateTypeBadgeClass } from "./templates-data";

export interface SystemTemplate {
    id: number;
    template_key: string;
    template_name_ar: string;
    template_name_en?: string;
    template_type: string;
    body_html: string;
    is_active: boolean;
    histories?: any[];
}

export function SystemTemplates() {
    const { canAccess } = useAuthStore();
    const router = useRouter();
    const [templates, setTemplates] = useState<SystemTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<SystemTemplate | null>(null);
    const [histories, setHistories] = useState<any[]>([]);
    const [typeFilter, setTypeFilter] = useState("");

    const [previewHtml, setPreviewHtml] = useState("");
    const [previewName, setPreviewName] = useState("");
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, [typeFilter]);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const query = typeFilter ? `?type=${typeFilter}` : "";
            const res = await fetchAPI(`${API_ENDPOINTS.SYSTEM.TEMPLATES.BASE}${query}`);
            console.log('SystemTemplates API Response:', res);
            setTemplates((res as any).data || []);
            console.log('Templates State:', (res as any).data || []);
        } catch { console.error("Failed to load templates"); }
        finally { setIsLoading(false); }
    };

    const openEdit = (template: SystemTemplate) => {
        router.push(`/system/templates/editor?id=${template.id}`);
    };

    const openPreview = async (template: SystemTemplate, historyId?: number) => {
        setIsPreviewMode(true);
        setIsPreviewLoading(true);
        setPreviewName(template.template_name_ar);

        try {
            if (historyId) {
                // Fetch history
                const histRes = await fetchAPI(API_ENDPOINTS.SYSTEM.TEMPLATES.HISTORY(template.id));
                const histData = (histRes as any).data || [];
                const targetHistory = histData.find((h: any) => h.id === historyId);
                if (targetHistory) {
                    setPreviewHtml(targetHistory.body_html || "");
                    setPreviewName((prev) => `${prev} (نسخة قديمة)`);
                } else {
                    showToast("لم يتم العثور على النسخة", "error");
                    setIsPreviewMode(false);
                }
            } else {
                // Render live template
                const res = await fetchAPI(API_ENDPOINTS.SYSTEM.TEMPLATES.RENDER(template.id), { method: "POST" });
                const resData = (res as any).data;
                setPreviewHtml(resData?.rendered_html || template.body_html || "");
            }
        } catch (error) {
            console.error("Render error:", error);
            showToast("فشل في تحميل المعاينة", "error");
            setIsPreviewMode(false);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const viewHistory = async (template: SystemTemplate) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.SYSTEM.TEMPLATES.HISTORY(template.id));
            setHistories((res as any).data || []);
            setSelectedTemplate(template);
            setShowHistory(true);
        } catch {
            showToast("فشل في استعراض السجل", "error");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذا القالب؟ لا يمكن التراجع عن هذه العملية!")) return;
        try {
            await fetchAPI(API_ENDPOINTS.SYSTEM.TEMPLATES.withId(id), { method: "DELETE" });
            showToast("تم حذف القالب بنجاح", "success");
            loadTemplates();
        } catch { showToast("فشل حذف القالب", "error"); }
    };

    const columns: Column<SystemTemplate>[] = [
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
                        { icon: "history", title: "سجل التعديلات", variant: "view", onClick: () => viewHistory(item) },
                        ...(canAccess("settings", "edit") ? [{ icon: "edit" as const, title: "محرر القالب", variant: "edit" as const, onClick: () => openEdit(item) }] : []),
                        ...(canAccess("settings", "delete") ? [{ icon: "trash" as const, title: "حذف", variant: "delete" as const, onClick: () => handleDelete(item.id) }] : [])
                    ]}
                />
            ),
        },
    ];

    const historyColumns: Column<any>[] = [
        { key: "id", header: "#", dataLabel: "#" },
        { key: "created_at", header: "تاريخ التعديل", dataLabel: "تاريخ التعديل", render: (item) => new Date(item.created_at).toLocaleString('ar-SA') },
        { key: "created_by", header: "بواسطة", dataLabel: "المستخدم", render: (item) => item.creator?.name || "غير معروف" },
        {
            key: "actions", header: "النسخة", dataLabel: "النسخة", render: (item) => (
                <Button size="sm" variant="outline" onClick={() => {
                    if (selectedTemplate) {
                        setShowHistory(false);
                        openPreview(selectedTemplate, item.id);
                    }
                }}>معاينة النسخة</Button>
            )
        }
    ]

    if (isPreviewMode) {
        return (
            <DocumentPreview
                title={previewName}
                htmlContent={previewHtml}
                onBack={() => setIsPreviewMode(false)}
                isLoading={isPreviewLoading}
                titleIcon="file-contract"
            />
        );
    }

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="قوالب النظام الرئيسية"
                titleIcon="file-signature"
                actions={
                    <>
                        <Select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            placeholder="جميع الأنواع"
                            options={Object.entries(templateTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
                            style={{ minWidth: "140px" }}
                        />
                        {canAccess("settings", "create") && (
                            <Button variant="primary" icon="edit" onClick={() => router.push("/system/templates/editor")}>
                                محرر قالب جديد
                            </Button>
                        )}
                    </>
                }
            />

            <Table columns={columns} data={templates} keyExtractor={(i) => i.id.toString()} emptyMessage="لا يوجد قوالب مسجلة" isLoading={isLoading} />



            <Dialog isOpen={showHistory} onClose={() => setShowHistory(false)} title={`سجل التعديلات: ${selectedTemplate?.template_name_ar}`}>
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    <Table columns={historyColumns} data={histories} keyExtractor={(i) => i.id.toString()} emptyMessage="لا يوجد سجل تعديلات لهذا القالب" />
                </div>
                <div className="flex justify-end mt-4">
                    <Button variant="secondary" onClick={() => setShowHistory(false)}>إغلاق</Button>
                </div>
            </Dialog>
        </div>
    );
}
