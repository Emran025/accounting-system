"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TemplateEditor, TemplateData } from "@/components/template-editor";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showToast } from "@/components/ui";
import { DocumentTemplate } from "@/app/hr/types";
import {
    HR_APPROVED_KEYS,
    HR_MOCK_CONTEXT,
    templateTypeLabels
} from "../templates-data";

function DocumentEditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    const [template, setTemplate] = useState<DocumentTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(!!id);

    useEffect(() => {
        if (id) {
            fetchTemplate(id);
        }
    }, [id]);

    const fetchTemplate = async (templateId: string) => {
        setIsLoading(true);
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.withId(templateId));
            const templateData = (res as any).data || res; // Handle both wrapped and unwrapped responses

            if (templateData && templateData.template_key) {
                setTemplate(templateData);
            } else {
                console.error("Invalid template data:", res);
                showToast("فشل في تحميل بيانات القالب", "error");
                router.push("/hr/documents");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
            router.push("/hr/documents");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (data: TemplateData) => {
        try {
            if (id) {
                // Edit
                const res = await fetchAPI(API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.withId(id), {
                    method: "PUT",
                    body: JSON.stringify(data),
                });
                if ((res as any).success === false) throw new Error((res as any).message);
                showToast("تم تحديث القالب بنجاح", "success");
            } else {
                // Create
                const body = data.body_html || "";
                const res = await fetchAPI(API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.BASE, {
                    method: "POST",
                    body: JSON.stringify({ ...data, body_html: body }),
                });
                if ((res as any).success === false) throw new Error((res as any).message);
                showToast("تم إنشاء القالب بنجاح", "success");
            }
            router.push("/hr/documents");
        } catch (error: any) {
            showToast(error.message || "حدث خطأ أثناء حفظ القالب", "error");
            throw error;
        }
    };

    const handleCancel = () => {
        router.push("/hr/documents");
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="p-0 w-full h-screen overflow-hidden bg-[#0f1117]">
            <TemplateEditor
                key={id ? `edit-${id}` : "create"}
                template={template as any}
                moduleName="الموارد البشرية"
                templateTypeLabels={templateTypeLabels}
                approvedKeys={HR_APPROVED_KEYS}
                mockContext={HR_MOCK_CONTEXT}
                onSave={handleSave}
                onCancel={handleCancel}
                className="w-full h-full"
            />
        </div>
    );
}

export default function DocumentEditorPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
                <div className="spinner" />
            </div>
        }>
            <DocumentEditorContent />
        </Suspense>
    );
}
