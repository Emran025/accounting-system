import React from "react";
import { Button } from "./Button";
import { PageSubHeader } from "@/components/layout";

export interface DocumentPreviewProps {
    title: string;
    htmlContent: string;
    onBack: () => void;
    isLoading?: boolean;
    titleIcon?: any;
}

export function DocumentPreview({
    title,
    htmlContent,
    onBack,
    isLoading = false,
    titleIcon = "file-signature"
}: DocumentPreviewProps) {
    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
<meta charset="UTF-8"><title>${title || 'مستند'}</title>
</head><body><style>
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
@page { size: A4; margin: 15mm 12mm; }
</style>${htmlContent}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 400);
        }
    };

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title={`معاينة: ${title}`}
                titleIcon={titleIcon}
                actions={
                    <>
                        <Button variant="secondary" onClick={onBack}>
                            رجوع
                        </Button>
                        <Button variant="primary" icon="printer" onClick={handlePrint} disabled={isLoading}>
                            طباعة
                        </Button>
                    </>
                }
            />

            <div className="flex justify-center mt-4 pb-8">
                {isLoading ? (
                    <div className="flex min-h-[400px] items-center justify-center">
                        <div className="spinner" />
                    </div>
                ) : (
                    <div
                        className="document-preview bg-white"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                )}
            </div>
        </div>
    );
}
