"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, showToast, TabNavigation, Label, SearchableSelect } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { getIcon } from "@/lib/icons";
import type { Employee, EhsIncident, EmployeeHealthRecord, PpeRecord } from "../types";

const incidentTypeLabels: Record<string, string> = { accident: "حادث", near_miss: "شبه حادث", injury: "إصابة", illness: "مرض", property_damage: "ضرر ممتلكات", environmental: "بيئي", other: "أخرى" };
const severityLabels: Record<string, string> = { minor: "طفيف", moderate: "متوسط", serious: "خطير", critical: "حرج", fatal: "قاتل" };
const severityBadges: Record<string, string> = { minor: "badge-secondary", moderate: "badge-warning", serious: "badge-danger", critical: "badge-danger", fatal: "badge-danger" };
const incidentStatusLabels: Record<string, string> = { reported: "مبلغ عنه", under_investigation: "قيد التحقيق", resolved: "تم الحل", closed: "مغلق" };
const incidentStatusBadges: Record<string, string> = { reported: "badge-warning", under_investigation: "badge-info", resolved: "badge-success", closed: "badge-secondary" };
const healthRecordTypeLabels: Record<string, string> = { vaccination: "تطعيم", medical_exam: "فحص طبي", drug_test: "فحص مخدرات", health_screening: "فحص صحي", other: "أخرى" };
const ppeTypeLabels: Record<string, string> = { helmet: "خوذة", safety_shoes: "حذاء أمان", gloves: "قفازات", goggles: "نظارات واقية", vest: "سترة", mask: "كمامة", other: "أخرى" };

export function EhsModule() {
    const [activeTab, setActiveTab] = useState("incidents");
    const [employees, setEmployees] = useState<Employee[]>([]);
    // Incidents
    const [incidents, setIncidents] = useState<EhsIncident[]>([]);
    const [incLoading, setIncLoading] = useState(false);
    const [incPage, setIncPage] = useState(1);
    const [incTotal, setIncTotal] = useState(1);
    const [showIncDialog, setShowIncDialog] = useState(false);
    const [showIncDetails, setShowIncDetails] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState<EhsIncident | null>(null);
    const [incForm, setIncForm] = useState({ employee_id: "", incident_type: "accident", incident_date: new Date().toISOString().split("T")[0], incident_time: "", location: "", description: "", severity: "minor", immediate_action_taken: "", osha_reportable: false, notes: "" });
    // Health Records
    const [healthRecords, setHealthRecords] = useState<EmployeeHealthRecord[]>([]);
    const [hrLoading, setHrLoading] = useState(false);
    const [hrPage, setHrPage] = useState(1);
    const [hrTotal, setHrTotal] = useState(1);
    const [showHrDialog, setShowHrDialog] = useState(false);
    const [hrForm, setHrForm] = useState({ employee_id: "", record_type: "medical_exam", record_date: new Date().toISOString().split("T")[0], expiry_date: "", provider_name: "", results: "", notes: "" });
    // PPE
    const [ppeRecords, setPpeRecords] = useState<PpeRecord[]>([]);
    const [ppeLoading, setPpeLoading] = useState(false);
    const [ppePage, setPpePage] = useState(1);
    const [ppeTotal, setPpeTotal] = useState(1);
    const [showPpeDialog, setShowPpeDialog] = useState(false);
    const [ppeForm, setPpeForm] = useState({ employee_id: "", ppe_item: "", ppe_type: "helmet", issue_date: new Date().toISOString().split("T")[0], expiry_date: "", notes: "" });

    useEffect(() => { loadEmployees(); }, []);
    useEffect(() => { loadIncidents(); }, [incPage]);
    useEffect(() => { loadHealthRecords(); }, [hrPage]);
    useEffect(() => { loadPpeRecords(); }, [ppePage]);

    const loadEmployees = async () => { try { const r: any = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.BASE); setEmployees(r.data || (Array.isArray(r) ? r : [])); } catch { } };

    const loadIncidents = async () => {
        setIncLoading(true);
        try { const r: any = await fetchAPI(`${API_ENDPOINTS.HR.EHS.INCIDENTS.BASE}?page=${incPage}`); const d = r.data || (Array.isArray(r) ? r : []); setIncidents(d); setIncTotal(Number(r.last_page) || 1); }
        catch { showToast("فشل تحميل الحوادث", "error"); } finally { setIncLoading(false); }
    };
    const loadHealthRecords = async () => {
        setHrLoading(true);
        try { const r: any = await fetchAPI(`${API_ENDPOINTS.HR.EHS.HEALTH_RECORDS.BASE}?page=${hrPage}`); const d = r.data || (Array.isArray(r) ? r : []); setHealthRecords(d); setHrTotal(Number(r.last_page) || 1); }
        catch { showToast("فشل تحميل السجلات", "error"); } finally { setHrLoading(false); }
    };
    const loadPpeRecords = async () => {
        setPpeLoading(true);
        try { const r: any = await fetchAPI(`${API_ENDPOINTS.HR.EHS.PPE.BASE}?page=${ppePage}`); const d = r.data || (Array.isArray(r) ? r : []); setPpeRecords(d); setPpeTotal(Number(r.last_page) || 1); }
        catch { showToast("فشل تحميل معدات الوقاية", "error"); } finally { setPpeLoading(false); }
    };

    const handleSaveIncident = async () => {
        if (!incForm.description || !incForm.incident_date) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
        try {
            await fetchAPI(API_ENDPOINTS.HR.EHS.INCIDENTS.BASE, { method: "POST", body: JSON.stringify({ ...incForm, employee_id: incForm.employee_id ? Number(incForm.employee_id) : undefined }) });
            showToast("تم تسجيل الحادث بنجاح", "success"); setShowIncDialog(false); loadIncidents();
        } catch (e: any) { showToast(e.message || "فشل التسجيل", "error"); }
    };

    const handleUpdateIncident = async (id: number, data: any) => {
        try { await fetchAPI(API_ENDPOINTS.HR.EHS.INCIDENTS.withId(id), { method: "PUT", body: JSON.stringify(data) }); showToast("تم التحديث", "success"); loadIncidents(); }
        catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
    };

    const handleSaveHealthRecord = async () => {
        if (!hrForm.employee_id) { showToast("يرجى اختيار الموظف", "error"); return; }
        try {
            await fetchAPI(API_ENDPOINTS.HR.EHS.HEALTH_RECORDS.BASE, { method: "POST", body: JSON.stringify({ ...hrForm, employee_id: Number(hrForm.employee_id) }) });
            showToast("تم إضافة السجل", "success"); setShowHrDialog(false); loadHealthRecords();
        } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
    };

    const handleSavePpe = async () => {
        if (!ppeForm.employee_id || !ppeForm.ppe_item) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
        try {
            await fetchAPI(API_ENDPOINTS.HR.EHS.PPE.BASE, { method: "POST", body: JSON.stringify({ ...ppeForm, employee_id: Number(ppeForm.employee_id) }) });
            showToast("تم تسجيل المعدة", "success"); setShowPpeDialog(false); loadPpeRecords();
        } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
    };

    const incColumns: Column<EhsIncident>[] = [
        { key: "incident_number", header: "رقم الحادث", dataLabel: "رقم" },
        { key: "incident_type", header: "النوع", dataLabel: "النوع", render: (i) => incidentTypeLabels[i.incident_type] || i.incident_type },
        { key: "employee", header: "الموظف", dataLabel: "الموظف", render: (i) => i.employee?.full_name || "-" },
        { key: "incident_date", header: "التاريخ", dataLabel: "التاريخ", render: (i) => formatDate(i.incident_date) },
        { key: "severity", header: "الشدة", dataLabel: "الشدة", render: (i) => <span className={`badge ${severityBadges[i.severity]}`}>{severityLabels[i.severity]}</span> },
        { key: "status", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${incidentStatusBadges[i.status]}`}>{incidentStatusLabels[i.status]}</span> },
        {
            key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "eye",
                            title: "تفاصيل",
                            variant: "view",
                            onClick: () => { setSelectedIncident(i); setShowIncDetails(true); }
                        },
                        {
                            icon: "search",
                            title: "بدء التحقيق",
                            variant: "primary",
                            onClick: () => handleUpdateIncident(i.id, { status: "under_investigation" }),
                            hidden: i.status !== "reported"
                        },
                        {
                            icon: "check",
                            title: "تم الحل",
                            variant: "success",
                            onClick: () => handleUpdateIncident(i.id, { status: "resolved" }),
                            hidden: i.status !== "under_investigation"
                        }
                    ]}
                />
            )
        },
    ];

    const hrColumns: Column<EmployeeHealthRecord>[] = [
        { key: "employee", header: "الموظف", dataLabel: "الموظف", render: (i) => i.employee?.full_name || "-" },
        { key: "record_type", header: "النوع", dataLabel: "النوع", render: (i) => healthRecordTypeLabels[i.record_type] || i.record_type },
        { key: "record_date", header: "التاريخ", dataLabel: "التاريخ", render: (i) => formatDate(i.record_date) },
        { key: "expiry_date", header: "انتهاء الصلاحية", dataLabel: "الانتهاء", render: (i) => i.expiry_date ? formatDate(i.expiry_date) : "-" },
        { key: "provider_name", header: "مقدم الخدمة", dataLabel: "مقدم", render: (i) => i.provider_name || "-" },
    ];

    const ppeColumns: Column<PpeRecord>[] = [
        { key: "employee", header: "الموظف", dataLabel: "الموظف", render: (i) => i.employee?.full_name || "-" },
        { key: "ppe_item", header: "المعدة", dataLabel: "المعدة" },
        { key: "ppe_type", header: "النوع", dataLabel: "النوع", render: (i) => ppeTypeLabels[i.ppe_type] || i.ppe_type },
        { key: "issue_date", header: "تاريخ الإصدار", dataLabel: "الإصدار", render: (i) => formatDate(i.issue_date) },
        { key: "expiry_date", header: "الانتهاء", dataLabel: "الانتهاء", render: (i) => i.expiry_date ? formatDate(i.expiry_date) : "-" },
        { key: "status", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${i.status === "issued" ? "badge-success" : "badge-secondary"}`}>{i.status === "issued" ? "صادر" : i.status}</span> },
    ];

    const tabs = [{ key: "incidents", label: "الحوادث", icon: "alert" }, { key: "health", label: "السجلات الصحية", icon: "activity" }, { key: "ppe", label: "معدات الوقاية", icon: "hard-hat" }];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="البيئة والصحة والسلامة"
                titleIcon="shield-check"
            />
            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === "incidents" && <>
                <div style={{ display: "flex", justifyContent: "flex-end", margin: "1rem 0" }}><Button onClick={() => { setIncForm({ employee_id: "", incident_type: "accident", incident_date: new Date().toISOString().split("T")[0], incident_time: "", location: "", description: "", severity: "minor", immediate_action_taken: "", osha_reportable: false, notes: "" }); setShowIncDialog(true); }} variant="primary" icon="plus">تسجيل حادث</Button></div>
                <Table columns={incColumns} data={incidents} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد حوادث" isLoading={incLoading} pagination={{ currentPage: incPage, totalPages: incTotal, onPageChange: setIncPage }} />
            </>}

            {activeTab === "health" && <>
                <div style={{ display: "flex", justifyContent: "flex-end", margin: "1rem 0" }}><Button onClick={() => { setHrForm({ employee_id: "", record_type: "medical_exam", record_date: new Date().toISOString().split("T")[0], expiry_date: "", provider_name: "", results: "", notes: "" }); setShowHrDialog(true); }} variant="primary" icon="plus">إضافة سجل</Button></div>
                <Table columns={hrColumns} data={healthRecords} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد سجلات" isLoading={hrLoading} pagination={{ currentPage: hrPage, totalPages: hrTotal, onPageChange: setHrPage }} />
            </>}

            {activeTab === "ppe" && <>
                <div style={{ display: "flex", justifyContent: "flex-end", margin: "1rem 0" }}><Button onClick={() => { setPpeForm({ employee_id: "", ppe_item: "", ppe_type: "helmet", issue_date: new Date().toISOString().split("T")[0], expiry_date: "", notes: "" }); setShowPpeDialog(true); }} variant="primary" icon="plus">تسجيل معدة</Button></div>
                <Table columns={ppeColumns} data={ppeRecords} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد معدات" isLoading={ppeLoading} pagination={{ currentPage: ppePage, totalPages: ppeTotal, onPageChange: setPpePage }} />
            </>}

            {/* Incident Dialog */}
            <Dialog isOpen={showIncDialog} onClose={() => setShowIncDialog(false)} title="تسجيل حادث" maxWidth="700px">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <Label className="text-secondary mb-1">الموظف</Label>
                            <SearchableSelect options={employees.map(e => ({ value: e.id.toString(), label: e.full_name }))} value={incForm.employee_id} onChange={(v) => setIncForm(p => ({ ...p, employee_id: v?.toString() || "" }))} placeholder="اختياري" />
                        </div>
                        <Select
                            label="نوع الحادث"
                            value={incForm.incident_type}
                            onChange={(e) => setIncForm({ ...incForm, incident_type: e.target.value })}
                            options={Object.entries(incidentTypeLabels).map(([value, label]) => ({ value, label }))}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <TextInput label="التاريخ *" type="date" value={incForm.incident_date} onChange={(e) => setIncForm({ ...incForm, incident_date: e.target.value })} />
                        <Select
                            label="الشدة"
                            value={incForm.severity}
                            onChange={(e) => setIncForm({ ...incForm, severity: e.target.value })}
                            options={Object.entries(severityLabels).map(([value, label]) => ({ value, label }))}
                        />
                        <TextInput label="الموقع" value={incForm.location} onChange={(e) => setIncForm({ ...incForm, location: e.target.value })} />
                    </div>
                    <Textarea label="الوصف *" value={incForm.description} onChange={(e) => setIncForm({ ...incForm, description: e.target.value })} rows={3} />
                    <Textarea label="الإجراء الفوري" value={incForm.immediate_action_taken} onChange={(e) => setIncForm({ ...incForm, immediate_action_taken: e.target.value })} rows={2} />
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input type="checkbox" checked={incForm.osha_reportable} onChange={(e) => setIncForm({ ...incForm, osha_reportable: e.target.checked })} id="osha" />
                        <Label htmlFor="osha" className="text-secondary">يتطلب تقرير OSHA</Label>
                    </div>
                    <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowIncDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveIncident} icon="save">حفظ</Button></div>
                </div>
            </Dialog>

            {/* Incident Details */}
            <Dialog isOpen={showIncDetails} onClose={() => setShowIncDetails(false)} title="تفاصيل الحادث" maxWidth="700px">
                {selectedIncident && <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><strong>رقم الحادث:</strong> {selectedIncident.incident_number}</div>
                        <div><strong>النوع:</strong> {incidentTypeLabels[selectedIncident.incident_type]}</div>
                        <div><strong>الموظف:</strong> {selectedIncident.employee?.full_name || "-"}</div>
                        <div><strong>التاريخ:</strong> {formatDate(selectedIncident.incident_date)}</div>
                        <div><strong>الشدة:</strong> <span className={`badge ${severityBadges[selectedIncident.severity]}`}>{severityLabels[selectedIncident.severity]}</span></div>
                        <div><strong>الحالة:</strong> <span className={`badge ${incidentStatusBadges[selectedIncident.status]}`}>{incidentStatusLabels[selectedIncident.status]}</span></div>
                        {selectedIncident.location && <div><strong>الموقع:</strong> {selectedIncident.location}</div>}
                    </div>
                    <div><strong>الوصف:</strong><p>{selectedIncident.description}</p></div>
                    {selectedIncident.immediate_action_taken && <div><strong>الإجراء الفوري:</strong><p>{selectedIncident.immediate_action_taken}</p></div>}
                    {selectedIncident.root_cause && <div><strong>السبب الجذري:</strong><p>{selectedIncident.root_cause}</p></div>}
                    {selectedIncident.preventive_measures && <div><strong>الإجراءات الوقائية:</strong><p>{selectedIncident.preventive_measures}</p></div>}
                </div>}
            </Dialog>

            {/* Health Record Dialog */}
            <Dialog isOpen={showHrDialog} onClose={() => setShowHrDialog(false)} title="إضافة سجل صحي" maxWidth="600px">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <Label className="text-secondary mb-1">الموظف *</Label>
                            <SearchableSelect options={employees.map(e => ({ value: e.id.toString(), label: e.full_name }))} value={hrForm.employee_id} onChange={(v) => setHrForm(p => ({ ...p, employee_id: v?.toString() || "" }))} placeholder="اختر" />
                        </div>
                        <Select
                            label="النوع"
                            value={hrForm.record_type}
                            onChange={(e) => setHrForm({ ...hrForm, record_type: e.target.value })}
                            options={Object.entries(healthRecordTypeLabels).map(([value, label]) => ({ value, label }))}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextInput label="التاريخ" type="date" value={hrForm.record_date} onChange={(e) => setHrForm({ ...hrForm, record_date: e.target.value })} />
                        <TextInput label="انتهاء الصلاحية" type="date" value={hrForm.expiry_date} onChange={(e) => setHrForm({ ...hrForm, expiry_date: e.target.value })} />
                    </div>
                    <TextInput label="مقدم الخدمة" value={hrForm.provider_name} onChange={(e) => setHrForm({ ...hrForm, provider_name: e.target.value })} />
                    <Textarea label="النتائج" value={hrForm.results} onChange={(e) => setHrForm({ ...hrForm, results: e.target.value })} rows={2} />
                    <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowHrDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveHealthRecord} icon="save">حفظ</Button></div>
                </div>
            </Dialog>

            {/* PPE Dialog */}
            <Dialog isOpen={showPpeDialog} onClose={() => setShowPpeDialog(false)} title="تسجيل معدة وقاية" maxWidth="600px">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <Label className="text-secondary mb-1">الموظف *</Label>
                            <SearchableSelect options={employees.map(e => ({ value: e.id.toString(), label: e.full_name }))} value={ppeForm.employee_id} onChange={(v) => setPpeForm(p => ({ ...p, employee_id: v?.toString() || "" }))} placeholder="اختر" />
                        </div>
                        <Select
                            label="النوع"
                            value={ppeForm.ppe_type}
                            onChange={(e) => setPpeForm({ ...ppeForm, ppe_type: e.target.value })}
                            options={Object.entries(ppeTypeLabels).map(([value, label]) => ({ value, label }))}
                        />
                    </div>
                    <TextInput label="اسم المعدة *" value={ppeForm.ppe_item} onChange={(e) => setPpeForm({ ...ppeForm, ppe_item: e.target.value })} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextInput label="تاريخ الإصدار" type="date" value={ppeForm.issue_date} onChange={(e) => setPpeForm({ ...ppeForm, issue_date: e.target.value })} />
                        <TextInput label="تاريخ الانتهاء" type="date" value={ppeForm.expiry_date} onChange={(e) => setPpeForm({ ...ppeForm, expiry_date: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowPpeDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSavePpe} icon="save">حفظ</Button></div>
                </div>
            </Dialog>
        </div>
    );
}
