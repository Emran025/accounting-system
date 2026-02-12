"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, showToast, TabNavigation, Label } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { getIcon } from "@/lib/icons";
import { useEmployeeStore } from "@/stores/useEmployeeStore";

import type { Employee, WellnessProgram, WellnessParticipation } from "../types";

const programTypeLabels: Record<string, string> = { steps_challenge: "تحدي الخطوات", health_challenge: "تحدي صحي", fitness: "لياقة بدنية", nutrition: "تغذية", mental_health: "صحة نفسية", other: "أخرى" };
const participationStatusLabels: Record<string, string> = { enrolled: "مسجل", active: "نشط", completed: "مكتمل", dropped: "انسحب" };
const participationStatusBadges: Record<string, string> = { enrolled: "badge-info", active: "badge-success", completed: "badge-secondary", dropped: "badge-danger" };

export function WellnessModule() {
    const [activeTab, setActiveTab] = useState("programs");
    const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();
    const [programs, setPrograms] = useState<WellnessProgram[]>([]);
    const [progLoading, setProgLoading] = useState(false);
    const [progPage, setProgPage] = useState(1);
    const [progTotal, setProgTotal] = useState(1);
    const [showProgDialog, setShowProgDialog] = useState(false);
    const [showProgDetails, setShowProgDetails] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState<WellnessProgram | null>(null);
    const [progForm, setProgForm] = useState({ program_name: "", description: "", program_type: "fitness", start_date: new Date().toISOString().split("T")[0], end_date: "", notes: "" });

    const [participations, setParticipations] = useState<WellnessParticipation[]>([]);
    const [partLoading, setPartLoading] = useState(false);
    const [partPage, setPartPage] = useState(1);
    const [partTotal, setPartTotal] = useState(1);
    const [showPartDialog, setShowPartDialog] = useState(false);
    const [partForm, setPartForm] = useState({ program_id: "", employee_id: "", notes: "" });

    useEffect(() => { loadAllEmployees(); }, [loadAllEmployees]);
    useEffect(() => { loadPrograms(); }, [progPage]);
    useEffect(() => { loadParticipations(); }, [partPage]);

    const loadPrograms = async () => {
        setProgLoading(true);
        try { const r: any = await fetchAPI(`${API_ENDPOINTS.HR.WELLNESS.PROGRAMS.BASE}?page=${progPage}`); const d = r.data || (Array.isArray(r) ? r : []); setPrograms(d); setProgTotal(Number(r.last_page) || 1); }
        catch { showToast("فشل تحميل البرامج", "error"); } finally { setProgLoading(false); }
    };

    const loadParticipations = async () => {
        setPartLoading(true);
        try { const r: any = await fetchAPI(`${API_ENDPOINTS.HR.WELLNESS.PARTICIPATIONS.BASE}?page=${partPage}`); const d = r.data || (Array.isArray(r) ? r : []); setParticipations(d); setPartTotal(Number(r.last_page) || 1); }
        catch { showToast("فشل تحميل المشاركات", "error"); } finally { setPartLoading(false); }
    };

    const handleSaveProgram = async () => {
        if (!progForm.program_name || !progForm.end_date) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
        try {
            await fetchAPI(API_ENDPOINTS.HR.WELLNESS.PROGRAMS.BASE, { method: "POST", body: JSON.stringify(progForm) });
            showToast("تم إنشاء البرنامج", "success"); setShowProgDialog(false); loadPrograms();
        } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
    };

    const handleEnroll = async () => {
        if (!partForm.program_id || !partForm.employee_id) { showToast("يرجى اختيار البرنامج والموظف", "error"); return; }
        try {
            await fetchAPI(API_ENDPOINTS.HR.WELLNESS.PARTICIPATIONS.BASE, { method: "POST", body: JSON.stringify({ program_id: Number(partForm.program_id), employee_id: Number(partForm.employee_id), notes: partForm.notes || undefined }) });
            showToast("تم التسجيل بنجاح", "success"); setShowPartDialog(false); loadParticipations();
        } catch (e: any) { showToast(e.message || "فشل التسجيل", "error"); }
    };

    const handleUpdateParticipation = async (id: number, status: string) => {
        try {
            await fetchAPI(API_ENDPOINTS.HR.WELLNESS.PARTICIPATIONS.withId(id), { method: "PUT", body: JSON.stringify({ status }) });
            showToast("تم التحديث", "success"); loadParticipations();
        } catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
    };

    const progColumns: Column<WellnessProgram>[] = [
        { key: "program_name", header: "اسم البرنامج", dataLabel: "الاسم" },
        { key: "program_type", header: "النوع", dataLabel: "النوع", render: (i) => programTypeLabels[i.program_type] || i.program_type },
        { key: "start_date", header: "البداية", dataLabel: "البداية", render: (i) => formatDate(i.start_date) },
        { key: "end_date", header: "النهاية", dataLabel: "النهاية", render: (i) => formatDate(i.end_date) },
        { key: "is_active", header: "نشط", dataLabel: "نشط", render: (i) => <span className={`badge ${i.is_active ? "badge-success" : "badge-secondary"}`}>{i.is_active ? "نعم" : "لا"}</span> },
        { key: "participations", header: "المشاركون", dataLabel: "المشاركون", render: (i) => i.participations?.length || 0 },
        {
            key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "eye",
                            title: "تفاصيل",
                            variant: "view",
                            onClick: () => { setSelectedProgram(i); setShowProgDetails(true); }
                        }
                    ]}
                />
            )
        },
    ];

    const partColumns: Column<WellnessParticipation>[] = [
        { key: "employee", header: "الموظف", dataLabel: "الموظف", render: (i) => i.employee?.full_name || "-" },
        { key: "program", header: "البرنامج", dataLabel: "البرنامج", render: (i) => i.program?.program_name || "-" },
        { key: "enrollment_date", header: "تاريخ التسجيل", dataLabel: "التسجيل", render: (i) => formatDate(i.enrollment_date) },
        { key: "points", header: "النقاط", dataLabel: "النقاط" },
        { key: "status", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${participationStatusBadges[i.status]}`}>{participationStatusLabels[i.status]}</span> },
        {
            key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "play",
                            title: "تفعيل",
                            variant: "success",
                            onClick: () => handleUpdateParticipation(i.id, "active"),
                            hidden: i.status !== "enrolled"
                        },
                        {
                            icon: "check",
                            title: "إكمال",
                            variant: "view",
                            onClick: () => handleUpdateParticipation(i.id, "completed"),
                            hidden: i.status !== "active"
                        }
                    ]}
                />
            )
        },
    ];

    const tabs = [{ key: "programs", label: "البرامج", icon: "heartbeat" }, { key: "participations", label: "المشاركات", icon: "users" }];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="برامج العافية"
                titleIcon="heart"
            />
            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === "programs" && <>
                <div style={{ display: "flex", justifyContent: "flex-end", margin: "1rem 0" }}>
                    <Button
                        onClick={() => { setProgForm({ program_name: "", description: "", program_type: "fitness", start_date: new Date().toISOString().split("T")[0], end_date: "", notes: "" }); setShowProgDialog(true); }}
                        variant="primary"
                        icon="plus"
                    >
                        برنامج جديد
                    </Button>
                </div>
                <Table columns={progColumns} data={programs} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد برامج" isLoading={progLoading} pagination={{ currentPage: progPage, totalPages: progTotal, onPageChange: setProgPage }} />
            </>}

            {activeTab === "participations" && <>
                <div style={{ display: "flex", justifyContent: "flex-end", margin: "1rem 0" }}>
                    <Button
                        onClick={() => { setPartForm({ program_id: "", employee_id: "", notes: "" }); setShowPartDialog(true); }}
                        variant="primary"
                        icon="plus"
                    >
                        تسجيل مشارك
                    </Button>
                </div>
                <Table columns={partColumns} data={participations} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد مشاركات" isLoading={partLoading} pagination={{ currentPage: partPage, totalPages: partTotal, onPageChange: setPartPage }} />
            </>}

            {/* Create Program Dialog */}
            <Dialog isOpen={showProgDialog} onClose={() => setShowProgDialog(false)} title="برنامج عافية جديد" maxWidth="600px">
                <div className="space-y-4">
                    <TextInput label="اسم البرنامج *" value={progForm.program_name} onChange={(e) => setProgForm({ ...progForm, program_name: e.target.value })} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="النوع" value={progForm.program_type} onChange={(e) => setProgForm({ ...progForm, program_type: e.target.value })} options={Object.entries(programTypeLabels).map(([value, label]) => ({ value, label }))} />
                        <TextInput label="البداية" type="date" value={progForm.start_date} onChange={(e) => setProgForm({ ...progForm, start_date: e.target.value })} />
                    </div>
                    <TextInput label="النهاية *" type="date" value={progForm.end_date} onChange={(e) => setProgForm({ ...progForm, end_date: e.target.value })} />
                    <Textarea label="الوصف" value={progForm.description} onChange={(e) => setProgForm({ ...progForm, description: e.target.value })} rows={3} />
                    <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowProgDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveProgram} icon="save">حفظ</Button></div>
                </div>
            </Dialog>

            {/* Program Details */}
            <Dialog isOpen={showProgDetails} onClose={() => setShowProgDetails(false)} title="تفاصيل البرنامج" maxWidth="700px">
                {selectedProgram && <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><strong>الاسم:</strong> {selectedProgram.program_name}</div>
                        <div><strong>النوع:</strong> {programTypeLabels[selectedProgram.program_type]}</div>
                        <div><strong>البداية:</strong> {formatDate(selectedProgram.start_date)}</div>
                        <div><strong>النهاية:</strong> {formatDate(selectedProgram.end_date)}</div>
                        <div><strong>نشط:</strong> {selectedProgram.is_active ? "نعم" : "لا"}</div>
                        <div><strong>المشاركون:</strong> {selectedProgram.participations?.length || 0}</div>
                    </div>
                    {selectedProgram.description && <div><strong>الوصف:</strong><p>{selectedProgram.description}</p></div>}
                </div>}
            </Dialog>

            {/* Enroll Dialog */}
            <Dialog isOpen={showPartDialog} onClose={() => setShowPartDialog(false)} title="تسجيل مشارك" maxWidth="500px">
                <div className="space-y-4">
                    <Select label="البرنامج *" value={partForm.program_id} onChange={(e) => setPartForm({ ...partForm, program_id: e.target.value })} placeholder="اختر البرنامج" options={programs.filter(p => p.is_active).map(p => ({ value: p.id.toString(), label: p.program_name }))} />
                    <div className="flex flex-col gap-1">
                        <Label className="text-secondary mb-1">الموظف *</Label>
                        <SearchableSelect options={employees.map((e: Employee) => ({ value: e.id.toString(), label: e.full_name }))} value={partForm.employee_id} onChange={(v) => setPartForm(p => ({ ...p, employee_id: v?.toString() || "" }))} placeholder="اختر الموظف" />
                    </div>
                    <Textarea label="ملاحظات" value={partForm.notes} onChange={(e) => setPartForm({ ...partForm, notes: e.target.value })} rows={2} />
                    <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowPartDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleEnroll} icon="save">تسجيل</Button></div>
                </div>
            </Dialog>
        </div>
    );
}
