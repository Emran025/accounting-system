"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout";
import { Button } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { NumberInput } from "@/components/ui/NumberInput";
import { getIcon } from "@/lib/icons";
import { useNumberRange, NrObjectHeader, NrSetupPrompt, NrLoading } from "@/components/number-range";

const EMP_CONFIG = { name: "الموظفين", name_en: "Employees", number_length: 8, prefix: "EMP-" };

export default function AddIntervalPage() {
    const router = useRouter();
    const { objectData, isLoading, createObject, saveInterval } = useNumberRange({ objectType: "employees" });

    const [intCode, setIntCode] = useState("");
    const [intDesc, setIntDesc] = useState("");
    const [intFrom, setIntFrom] = useState("");
    const [intTo, setIntTo] = useState("");
    const [intExternal, setIntExternal] = useState("false");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const ok = await saveInterval({
            code: intCode,
            description: intDesc,
            from_number: parseInt(intFrom),
            to_number: parseInt(intTo),
            is_external: intExternal === "true",
        });
        if (ok) {
            router.push("/hr/groups-number-range-interval/employees/view-number-range-intervals");
        }
    };

    if (isLoading) return <MainLayout><NrLoading /></MainLayout>;

    if (!objectData) {
        return (
            <MainLayout>
                <div className="page-header">
                    <h2>إضافة نطاق جديد</h2>
                </div>
                <NrSetupPrompt defaultConfig={EMP_CONFIG} onCreateObject={createObject} />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="page-header">
                <h2>إضافة نطاق جديد</h2>
            </div>

            <NrObjectHeader objectData={objectData} title="إعدادات ترقيم الموظفين" />

            <div className="nr-tab-content">
                <div className="nr-section-header">
                    <h3>{getIcon("hash")} بيانات النطاق الجديد</h3>
                </div>

                <form onSubmit={handleSubmit} style={{ maxWidth: "600px", marginTop: "1rem" }}>
                    <div id="nr-alert" style={{ marginBottom: "1rem" }} />

                    <div className="nr-info-banner" style={{ marginBottom: "1.25rem" }}>
                        <span className="nr-info-icon">{getIcon("info")}</span>
                        <span>النطاق يجب أن يكون ضمن الحدود المسموحة (1 إلى {Number("9".repeat(objectData.number_length)).toLocaleString()}) ولا يتداخل مع النطاقات الحالية</span>
                    </div>

                    <div className="form-row" style={{ marginBottom: "1.25rem" }}>
                        <TextInput label="الكود *" id="int-code" value={intCode} onChange={(e) => setIntCode(e.target.value)} required placeholder="مثال: INT-01" className="flex-1" />
                        <Select
                            label="تخصيص الخادم"
                            id="int-type"
                            value={intExternal}
                            onChange={(e) => setIntExternal(e.target.value)}
                            options={[
                                { value: "false", label: "داخلي (تلقائي)" },
                                { value: "true", label: "خارجي (يدوي)" },
                            ]}
                            className="flex-1"
                        />
                    </div>

                    <div className="form-row" style={{ marginBottom: "1.25rem" }}>
                        <NumberInput label="بداية النطاق (من) *" id="int-from" value={intFrom} onChange={setIntFrom} required min={1} className="flex-1" />
                        <NumberInput label="نهاية النطاق (إلى) *" id="int-to" value={intTo} onChange={setIntTo} required min={1} className="flex-1" />
                    </div>

                    <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                        <Textarea label="الوصف" id="int-desc" value={intDesc} onChange={(e) => setIntDesc(e.target.value)} rows={3} />
                    </div>

                    <div style={{ display: "flex", gap: "1rem" }}>
                        <Button variant="primary" type="submit" icon="check">
                            حفظ وإنشاء النطاق
                        </Button>
                        <Button variant="secondary" type="button" onClick={() => router.push("/hr/groups-number-range-interval/employees/view-number-range-intervals")}>
                            إلغاء
                        </Button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
}
