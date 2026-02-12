"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, TabNavigation, showToast, Label } from "@/components/ui";
import { PageSubHeader } from "@/components/layout";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDate } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import type { CorporateAnnouncement, PulseSurvey } from "../types";

const priorityLabels: Record<string, string> = { low: "منخفض", normal: "عادي", high: "مرتفع", urgent: "عاجل" };
const priorityBadges: Record<string, string> = { low: "badge-secondary", normal: "badge-info", high: "badge-warning", urgent: "badge-danger" };
const audienceLabels: Record<string, string> = { all: "الجميع", department: "قسم", role: "دور", location: "موقع", custom: "مخصص" };
const surveyTypeLabels: Record<string, string> = { sentiment: "قياس المشاعر", burnout: "الإرهاق", engagement: "المشاركة", custom: "مخصص" };

export function CorporateCommunications() {
    const { canAccess } = useAuthStore();
    const [activeTab, setActiveTab] = useState("announcements");
    // Announcements
    const [announcements, setAnnouncements] = useState<CorporateAnnouncement[]>([]);
    const [annLoading, setAnnLoading] = useState(false);
    const [annPage, setAnnPage] = useState(1);
    const [annTotal, setAnnTotal] = useState(1);
    const [annTotalRecords, setAnnTotalRecords] = useState(0);
    const [showAnnDialog, setShowAnnDialog] = useState(false);
    const [annForm, setAnnForm] = useState({ title: "", content: "", priority: "normal", target_audience: "all", publish_date: new Date().toISOString().split("T")[0], expiry_date: "", is_published: false });
    // Surveys
    const [surveys, setSurveys] = useState<PulseSurvey[]>([]);
    const [survLoading, setSurvLoading] = useState(false);
    const [survPage, setSurvPage] = useState(1);
    const [survTotal, setSurvTotal] = useState(1);
    const [survTotalRecords, setSurvTotalRecords] = useState(0);
    const [showSurvDialog, setShowSurvDialog] = useState(false);
    const [showSurvDetails, setShowSurvDetails] = useState(false);
    const [selectedSurvey, setSelectedSurvey] = useState<PulseSurvey | null>(null);
    const [survForm, setSurvForm] = useState({ survey_name: "", description: "", survey_type: "engagement", questions: "[]", start_date: new Date().toISOString().split("T")[0], end_date: "", is_anonymous: true, target_audience: "all" });

    useEffect(() => { loadAnnouncements(); }, [annPage]);
    useEffect(() => { loadSurveys(); }, [survPage]);

    const loadAnnouncements = async () => {
        setAnnLoading(true);
        try {
            const res: any = await fetchAPI(`${API_ENDPOINTS.HR.COMMUNICATIONS.ANNOUNCEMENTS.BASE}?page=${annPage}&all=true`);
            const data = res.data || (Array.isArray(res) ? res : []);
            setAnnouncements(data); setAnnTotal(Number(res.last_page) || 1); setAnnTotalRecords(Number(res.total) || data.length);
        } catch (e) { console.error(e); showToast("فشل تحميل الإعلانات", "error"); }
        finally { setAnnLoading(false); }
    };

    const loadSurveys = async () => {
        setSurvLoading(true);
        try {
            const res: any = await fetchAPI(`${API_ENDPOINTS.HR.COMMUNICATIONS.SURVEYS.BASE}?page=${survPage}`);
            const data = res.data || (Array.isArray(res) ? res : []);
            setSurveys(data); setSurvTotal(Number(res.last_page) || 1); setSurvTotalRecords(Number(res.total) || data.length);
        } catch (e) { console.error(e); showToast("فشل تحميل الاستبيانات", "error"); }
        finally { setSurvLoading(false); }
    };

    const handleSaveAnnouncement = async () => {
        if (!annForm.title || !annForm.content) { showToast("يرجى إدخال العنوان والمحتوى", "error"); return; }
        try {
            await fetchAPI(API_ENDPOINTS.HR.COMMUNICATIONS.ANNOUNCEMENTS.BASE, { method: "POST", body: JSON.stringify({ ...annForm, is_published: annForm.is_published }) });
            showToast("تم نشر الإعلان بنجاح", "success"); setShowAnnDialog(false); loadAnnouncements();
        } catch (e: any) { showToast(e.message || "فشل حفظ الإعلان", "error"); }
    };

    const togglePublish = async (ann: CorporateAnnouncement) => {
        try {
            await fetchAPI(API_ENDPOINTS.HR.COMMUNICATIONS.ANNOUNCEMENTS.withId(ann.id), { method: "PUT", body: JSON.stringify({ is_published: !ann.is_published }) });
            showToast(ann.is_published ? "تم إلغاء النشر" : "تم النشر", "success"); loadAnnouncements();
        } catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
    };

    const handleSaveSurvey = async () => {
        if (!survForm.survey_name || !survForm.end_date) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
        let questions: any[];
        try { questions = JSON.parse(survForm.questions); } catch { showToast("صيغة الأسئلة غير صحيحة (JSON)", "error"); return; }
        try {
            await fetchAPI(API_ENDPOINTS.HR.COMMUNICATIONS.SURVEYS.BASE, { method: "POST", body: JSON.stringify({ survey_name: survForm.survey_name, description: survForm.description, survey_type: survForm.survey_type, questions, start_date: survForm.start_date, end_date: survForm.end_date, is_anonymous: survForm.is_anonymous, target_audience: survForm.target_audience }) });
            showToast("تم إنشاء الاستبيان بنجاح", "success"); setShowSurvDialog(false); loadSurveys();
        } catch (e: any) { showToast(e.message || "فشل إنشاء الاستبيان", "error"); }
    };

    const annColumns: Column<CorporateAnnouncement>[] = [
        { key: "title", header: "العنوان", dataLabel: "العنوان" },
        { key: "priority", header: "الأولوية", dataLabel: "الأولوية", render: (i) => <span className={`badge ${priorityBadges[i.priority]}`}>{priorityLabels[i.priority] || i.priority}</span> },
        { key: "target_audience", header: "الجمهور", dataLabel: "الجمهور", render: (i) => audienceLabels[i.target_audience] || i.target_audience },
        { key: "publish_date", header: "تاريخ النشر", dataLabel: "تاريخ النشر", render: (i) => formatDate(i.publish_date) },
        { key: "is_published", header: "منشور", dataLabel: "منشور", render: (i) => <span className={`badge ${i.is_published ? "badge-success" : "badge-secondary"}`}>{i.is_published ? "نعم" : "لا"}</span> },
        {
            key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
                <ActionButtons
                    actions={[
                        ...(canAccess("communications", "edit") ? [{
                            icon: (i.is_published ? "eye-off" : "eye") as any,
                            title: i.is_published ? "إلغاء النشر" : "نشر",
                            variant: (i.is_published ? "delete" : "success") as any,
                            onClick: () => togglePublish(i)
                        }] : [])
                    ]}
                />
            )
        },
    ];

    const survColumns: Column<PulseSurvey>[] = [
        { key: "survey_name", header: "اسم الاستبيان", dataLabel: "الاسم" },
        { key: "survey_type", header: "النوع", dataLabel: "النوع", render: (i) => surveyTypeLabels[i.survey_type] || i.survey_type },
        { key: "start_date", header: "البداية", dataLabel: "البداية", render: (i) => formatDate(i.start_date) },
        { key: "end_date", header: "النهاية", dataLabel: "النهاية", render: (i) => formatDate(i.end_date) },
        { key: "is_active", header: "نشط", dataLabel: "نشط", render: (i) => <span className={`badge ${i.is_active ? "badge-success" : "badge-secondary"}`}>{i.is_active ? "نعم" : "لا"}</span> },
        { key: "responses", header: "الردود", dataLabel: "الردود", render: (i) => i.responses?.length || 0 },
        {
            key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
                <ActionButtons
                    actions={[
                        {
                            icon: "eye",
                            title: "تفاصيل",
                            variant: "view",
                            onClick: () => { setSelectedSurvey(i); setShowSurvDetails(true); }
                        }
                    ]}
                />
            )
        },
    ];

    const tabs = [{ key: "announcements", label: "الإعلانات", icon: "bullhorn" }, { key: "surveys", label: "الاستبيانات", icon: "poll" }];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="الاتصالات المؤسسية"
                titleIcon="bullhorn"
                actions={
                    <>
                        {activeTab === "announcements" ? (
                            canAccess("communications", "create") && (
                                <Button onClick={() => { setAnnForm({ title: "", content: "", priority: "normal", target_audience: "all", publish_date: new Date().toISOString().split("T")[0], expiry_date: "", is_published: false }); setShowAnnDialog(true); }}
                                    variant="primary"
                                    icon="plus"
                                >
                                    إعلان جديد
                                </Button>
                            )
                        ) : (
                            canAccess("communications", "create") && (
                                <Button
                                    onClick={() => {
                                        setSurvForm({
                                            survey_name: "",
                                            description: "",
                                            survey_type: "engagement",
                                            questions: "[]",
                                            start_date: new Date().toISOString().split("T")[0],
                                            end_date: "",
                                            is_anonymous: true,
                                            target_audience: "all"
                                        });
                                        setShowSurvDialog(true);
                                    }}
                                    variant="primary"
                                    icon="plus"
                                >
                                    استبيان جديد
                                </Button>
                            )
                        )}
                    </>
                }
            />
            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === "announcements" && (
                <Table columns={annColumns} data={announcements} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد إعلانات" isLoading={annLoading} pagination={{ currentPage: annPage, totalPages: annTotal, onPageChange: setAnnPage }} />
            )}

            {activeTab === "surveys" && (
                <Table columns={survColumns} data={surveys} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد استبيانات" isLoading={survLoading} pagination={{ currentPage: survPage, totalPages: survTotal, onPageChange: setSurvPage }} />
            )}

            {/* Announcement Dialog */}
            <Dialog isOpen={showAnnDialog} onClose={() => setShowAnnDialog(false)} title="إعلان جديد" maxWidth="700px">
                <div className="space-y-4">
                    <TextInput label="العنوان *" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="الأولوية"
                            value={annForm.priority}
                            onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value })}
                            options={[
                                { value: 'low', label: 'منخفض' },
                                { value: 'normal', label: 'عادي' },
                                { value: 'high', label: 'مرتفع' },
                                { value: 'urgent', label: 'عاجل' }
                            ]}
                        />
                        <Select
                            label="الجمهور"
                            value={annForm.target_audience}
                            onChange={(e) => setAnnForm({ ...annForm, target_audience: e.target.value })}
                            options={[
                                { value: 'all', label: 'الجميع' },
                                { value: 'department', label: 'قسم' },
                                { value: 'role', label: 'دور' }
                            ]}
                        />
                        <TextInput label="تاريخ النشر" type="date" value={annForm.publish_date} onChange={(e) => setAnnForm({ ...annForm, publish_date: e.target.value })} />
                    </div>
                    <Textarea label="المحتوى *" value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} rows={5} />
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input type="checkbox" checked={annForm.is_published} onChange={(e) => setAnnForm({ ...annForm, is_published: e.target.checked })} id="pub" />
                        <Label htmlFor="pub" className="text-secondary">نشر فوري</Label>
                    </div>
                    <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowAnnDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveAnnouncement} icon="save">حفظ</Button></div>
                </div>
            </Dialog>

            {/* Survey Dialog */}
            <Dialog isOpen={showSurvDialog} onClose={() => setShowSurvDialog(false)} title="استبيان جديد" maxWidth="700px">
                <div className="space-y-4">
                    <TextInput label="اسم الاستبيان *" value={survForm.survey_name} onChange={(e) => setSurvForm({ ...survForm, survey_name: e.target.value })} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="النوع"
                            value={survForm.survey_type}
                            onChange={(e) => setSurvForm({ ...survForm, survey_type: e.target.value })}
                            options={[
                                { value: 'sentiment', label: 'مشاعر' },
                                { value: 'burnout', label: 'إرهاق' },
                                { value: 'engagement', label: 'مشاركة' },
                                { value: 'custom', label: 'مخصص' }
                            ]}
                        />
                        <Select
                            label="الجمهور"
                            value={survForm.target_audience}
                            onChange={(e) => setSurvForm({ ...survForm, target_audience: e.target.value })}
                            options={[
                                { value: 'all', label: 'الجميع' },
                                { value: 'department', label: 'قسم' },
                                { value: 'role', label: 'دور' }
                            ]}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextInput label="البداية" type="date" value={survForm.start_date} onChange={(e) => setSurvForm({ ...survForm, start_date: e.target.value })} />
                        <TextInput label="النهاية *" type="date" value={survForm.end_date} onChange={(e) => setSurvForm({ ...survForm, end_date: e.target.value })} />
                    </div>
                    <Textarea label="الوصف" value={survForm.description} onChange={(e) => setSurvForm({ ...survForm, description: e.target.value })} rows={2} />
                    <Textarea label="الأسئلة (JSON)" value={survForm.questions} onChange={(e) => setSurvForm({ ...survForm, questions: e.target.value })} rows={4} />
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input type="checkbox" checked={survForm.is_anonymous} onChange={(e) => setSurvForm({ ...survForm, is_anonymous: e.target.checked })} id="anon" />
                        <Label htmlFor="anon" className="text-secondary">مجهول</Label>
                    </div>
                    <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowSurvDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveSurvey} icon="save">حفظ</Button></div>
                </div>
            </Dialog>

            {/* Survey Details Dialog */}
            <Dialog isOpen={showSurvDetails} onClose={() => setShowSurvDetails(false)} title="تفاصيل الاستبيان" maxWidth="700px">
                {selectedSurvey && <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><strong>الاسم:</strong> {selectedSurvey.survey_name}</div>
                        <div><strong>النوع:</strong> {surveyTypeLabels[selectedSurvey.survey_type]}</div>
                        <div><strong>البداية:</strong> {formatDate(selectedSurvey.start_date)}</div>
                        <div><strong>النهاية:</strong> {formatDate(selectedSurvey.end_date)}</div>
                        <div><strong>مجهول:</strong> {selectedSurvey.is_anonymous ? "نعم" : "لا"}</div>
                        <div><strong>عدد الردود:</strong> {selectedSurvey.responses?.length || 0}</div>
                    </div>
                    {selectedSurvey.description && <div><strong>الوصف:</strong><p>{selectedSurvey.description}</p></div>}
                    <div><strong>الأسئلة:</strong><pre style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "8px", fontSize: "0.85rem", maxHeight: "200px", overflowY: "auto" }}>{JSON.stringify(selectedSurvey.questions, null, 2)}</pre></div>
                </div>}
            </Dialog>
        </div>
    );
}
