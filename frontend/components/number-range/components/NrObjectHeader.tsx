"use client";

import { useState } from "react";
import { getIcon } from "@/lib/icons";
import { Dialog, Button } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { NumberInput } from "@/components/ui/NumberInput";
import type { NrObjectFull } from "../types";

// ══════════════════════════════════════════════════════════════
//  NR Object Header — shared banner with KPIs, shown on all pages
// ══════════════════════════════════════════════════════════════

interface NrObjectHeaderProps {
    objectData: NrObjectFull;
    title?: string;
}

export function NrObjectHeader({ objectData, title }: NrObjectHeaderProps) {
    return (
        <div className="nr-manager-header">
            <div className="nr-header-info">
                <div className="nr-header-icon">{getIcon("hash")}</div>
                <div>
                    <h2 className="nr-title">{title || objectData.name}</h2>
                    <div className="nr-subtitle">
                        {objectData.name_en && <span>{objectData.name_en}</span>}
                        <span className="nr-meta-badge">
                            {getIcon("ruler")} طول الترقيم: {objectData.number_length} أرقام
                        </span>
                        {objectData.prefix && (
                            <span className="nr-meta-badge">
                                {getIcon("tag")} البادئة: {objectData.prefix}
                            </span>
                        )}
                        <span className="nr-meta-badge">
                            الحد الأقصى: {Number("9".repeat(objectData.number_length)).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Summary KPIs */}
            <div className="nr-kpi-strip">
                <div className="nr-kpi">
                    <div className="nr-kpi-value" style={{ color: "#3b82f6" }}>{objectData.summary.total_groups}</div>
                    <div className="nr-kpi-label">مجموعة</div>
                </div>
                <div className="nr-kpi">
                    <div className="nr-kpi-value" style={{ color: "#8b5cf6" }}>{objectData.summary.total_intervals}</div>
                    <div className="nr-kpi-label">نطاق</div>
                </div>
                <div className="nr-kpi">
                    <div className="nr-kpi-value" style={{ color: "#10b981" }}>{objectData.summary.total_assignments}</div>
                    <div className="nr-kpi-label">ربط</div>
                </div>
                <div className="nr-kpi">
                    <div className="nr-kpi-value" style={{
                        color: objectData.summary.overall_fullness >= 95 ? "#ef4444"
                            : objectData.summary.overall_fullness >= 80 ? "#f59e0b"
                                : "#10b981"
                    }}>
                        {objectData.summary.overall_fullness}%
                    </div>
                    <div className="nr-kpi-label">امتلاء</div>
                </div>
                <div className="nr-kpi">
                    <div className="nr-kpi-value" style={{ color: "var(--text-secondary)" }}>
                        {objectData.summary.total_remaining.toLocaleString()}
                    </div>
                    <div className="nr-kpi-label">متبقي</div>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
//  NR Setup Prompt — shown when no NR Object exists yet
// ══════════════════════════════════════════════════════════════

interface NrSetupPromptProps {
    defaultConfig?: {
        name?: string;
        name_en?: string;
        number_length?: number;
        prefix?: string;
    };
    onCreateObject: (data: {
        name: string;
        name_en?: string;
        number_length: number;
        prefix?: string;
    }) => Promise<boolean>;
}

export function NrSetupPrompt({ defaultConfig, onCreateObject }: NrSetupPromptProps) {
    const [setupDialog, setSetupDialog] = useState(false);
    const [setupName, setSetupName] = useState(defaultConfig?.name || "");
    const [setupNameEn, setSetupNameEn] = useState(defaultConfig?.name_en || "");
    const [setupLength, setSetupLength] = useState(String(defaultConfig?.number_length || 8));
    const [setupPrefix, setSetupPrefix] = useState(defaultConfig?.prefix || "");

    const handleCreate = async () => {
        if (!setupName || !setupLength) return;
        const ok = await onCreateObject({
            name: setupName,
            name_en: setupNameEn || undefined,
            number_length: parseInt(setupLength),
            prefix: setupPrefix || undefined,
        });
        if (ok) setSetupDialog(false);
    };

    return (
        <>
            <div className="nr-setup-prompt">
                <div className="nr-setup-icon">{getIcon("hash")}</div>
                <h3>إعداد نظام الترقيم</h3>
                <p>لم يتم تكوين نظام ترقيم لهذا النوع بعد. قم بتحديد طول الترقيم والإعدادات الأولية للبدء.</p>
                <Button variant="primary" onClick={() => setSetupDialog(true)} icon="plus">
                    إعداد نظام الترقيم
                </Button>
            </div>

            <Dialog
                isOpen={setupDialog}
                onClose={() => setSetupDialog(false)}
                title="إعداد نظام الترقيم"
                maxWidth="520px"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setSetupDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={handleCreate}>إنشاء</Button>
                    </>
                }
            >
                <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
                    <div className="nr-info-banner">
                        <span className="nr-info-icon">{getIcon("info")}</span>
                        <span>طول الترقيم يحدد الحد الأقصى لنطاقات الأرقام المتاحة. مثال: طول 8 أرقام يسمح بنطاقات حتى 99,999,999</span>
                    </div>
                    <div className="form-row">
                        <TextInput label="الاسم بالعربية *" id="nr-setup-name" value={setupName} onChange={(e) => setSetupName(e.target.value)} required className="flex-1" />
                        <TextInput label="الاسم بالإنجليزية" id="nr-setup-name-en" value={setupNameEn} onChange={(e) => setSetupNameEn(e.target.value)} className="flex-1" />
                    </div>
                    <div className="form-row">
                        <NumberInput label="طول الترقيم *" id="nr-setup-length" value={setupLength} onChange={setSetupLength} min={1} max={20} className="flex-1" />
                        <TextInput label="البادئة (اختياري)" id="nr-setup-prefix" value={setupPrefix} onChange={(e) => setSetupPrefix(e.target.value)} className="flex-1" placeholder="EMP-" />
                    </div>
                </form>
            </Dialog>
        </>
    );
}

// ══════════════════════════════════════════════════════════════
//  NR Loading Spinner
// ══════════════════════════════════════════════════════════════

export function NrLoading() {
    return (
        <div className="nr-manager-loading">
            <div className="nr-spinner" />
            <p>جارِ تحميل إعدادات الترقيم...</p>
        </div>
    );
}
