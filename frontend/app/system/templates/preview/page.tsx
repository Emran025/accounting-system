"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast, Button } from "@/components/ui";
import { PageSubHeader } from "@/components/layout";

function TemplatePreviewContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const historyId = searchParams.get("history_id");

    const [renderedHtml, setRenderedHtml] = useState("");
    const [templateName, setTemplateName] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadPreview(id, historyId);
        } else {
            router.push("/system/templates");
        }
    }, [id, historyId]);

    const loadPreview = async (templateId: string, hId: string | null) => {
        setIsLoading(true);
        try {
            // Get original template name
            const templateRes = await fetchAPI(API_ENDPOINTS.SYSTEM.TEMPLATES.withId(templateId));
            const templateData = (templateRes as any).data || templateRes;
            if (templateData) {
                setTemplateName(templateData.template_name_ar);
            }

            if (hId) {
                // Fetch history
                const histRes = await fetchAPI(API_ENDPOINTS.SYSTEM.TEMPLATES.HISTORY(templateId));
                const histData = (histRes as any).data || [];
                const targetHistory = histData.find((h: any) => h.id.toString() === hId);
                if (targetHistory) {
                    setRenderedHtml(targetHistory.body_html || "");
                    setTemplateName((prev) => `${prev} (نسخة قديمة)`);
                } else {
                    showToast("لم يتم العثور على النسخة", "error");
                    router.push("/system/templates");
                }
            } else {
                // Render live template
                const res = await fetchAPI(API_ENDPOINTS.SYSTEM.TEMPLATES.RENDER(templateId), { method: "POST" });
                const resData = (res as any).data;
                setRenderedHtml(resData?.rendered_html || templateData?.body_html || "");
            }
        } catch (error) {
            console.error("Render error:", error);
            showToast("فشل في تحميل المعاينة", "error");
            router.push("/system/templates");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
<meta charset="UTF-8"><title>${templateName || 'مستند'}</title>
</head><body><style>
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
@page { size: A4; margin: 15mm 12mm; }
</style>${renderedHtml}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 400);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title={`معاينة: ${templateName}`}
                titleIcon="file-contract"
                actions={
                    <>
                        <Button variant="secondary" onClick={() => router.push("/system/templates")}>
                            رجوع
                        </Button>
                        <Button variant="primary" icon="printer" onClick={handlePrint}>
                            طباعة
                        </Button>
                    </>
                }
            />

            <div className="flex justify-center mt-4">
                <div
                    className="document-preview bg-white"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
            </div>
        </div>
    );
}

export default function TemplatePreviewPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
                <div className="spinner" />
            </div>
        }>
            <TemplatePreviewContent />
        </Suspense>
    );
}
