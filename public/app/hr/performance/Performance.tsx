"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, TabNavigation, showToast, Label } from "@/components/ui";
import { PageSubHeader } from "@/components/layout";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { Employee } from "../types";

interface Goal {
  id: number; employee_id: number; employee?: { full_name: string };
  goal_title: string; goal_description?: string; goal_type: string; status: string;
  target_value?: number; current_value?: number; progress_percentage: number;
  start_date?: string; target_date: string; completed_date?: string; unit?: string; notes?: string;
}

interface Appraisal {
  id: number; appraisal_number: string; employee_id: number; employee?: { full_name: string };
  appraisal_type: string; appraisal_period: string; appraisal_date?: string;
  status: string; overall_rating?: number; self_assessment?: string;
  manager_feedback?: string; notes?: string;
}

const goalTypeLabels: Record<string, string> = { okr: "OKR", kpi: "KPI", personal: "شخصي", team: "فريق", corporate: "مؤسسي" };
const statusLabels: Record<string, string> = { not_started: "لم يبدأ", in_progress: "قيد التنفيذ", on_track: "على المسار", at_risk: "في خطر", completed: "مكتمل", cancelled: "ملغي", draft: "مسودة", self_review: "مراجعة ذاتية", manager_review: "مراجعة المدير", calibration: "معايرة" };
const statusBadges: Record<string, string> = { not_started: "badge-secondary", in_progress: "badge-warning", on_track: "badge-success", at_risk: "badge-danger", completed: "badge-success", cancelled: "badge-secondary", draft: "badge-secondary", self_review: "badge-info", manager_review: "badge-warning", calibration: "badge-primary" };
const appraisalTypeLabels: Record<string, string> = { self: "ذاتي", manager: "المدير", peer: "الأقران", "360": "360 درجة", annual: "سنوي", mid_year: "نصف سنوي" };

export function Performance() {
  const [activeTab, setActiveTab] = useState("goals");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Dialogs
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showGoalDetail, setShowGoalDetail] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showAppDialog, setShowAppDialog] = useState(false);
  const [showAppDetail, setShowAppDetail] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Appraisal | null>(null);
  const [showUpdateGoal, setShowUpdateGoal] = useState(false);
  // Forms
  const [goalForm, setGoalForm] = useState({ employee_id: "", goal_title: "", goal_description: "", goal_type: "kpi", target_value: "", current_value: "0", unit: "", start_date: "", target_date: "", notes: "" });
  const [appForm, setAppForm] = useState({ employee_id: "", appraisal_type: "annual", appraisal_period: "", appraisal_date: "", notes: "" });
  const [updateForm, setUpdateForm] = useState({ current_value: "", progress_percentage: "", status: "", notes: "" });

  useEffect(() => { loadAllEmployees(); }, [loadAllEmployees]);
  useEffect(() => { setCurrentPage(1); }, [activeTab]);
  useEffect(() => { activeTab === "goals" ? loadGoals() : loadAppraisals(); }, [activeTab, currentPage]);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI(`${API_ENDPOINTS.HR.PERFORMANCE.GOALS.BASE}?page=${currentPage}`);
      setGoals(res.data || []); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast("فشل تحميل الأهداف", "error"); }
    finally { setIsLoading(false); }
  };

  const loadAppraisals = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI(`${API_ENDPOINTS.HR.PERFORMANCE.APPRAISALS.BASE}?page=${currentPage}`);
      setAppraisals(res.data || []); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast("فشل تحميل التقييمات", "error"); }
    finally { setIsLoading(false); }
  };

  const handleSaveGoal = async () => {
    if (!goalForm.employee_id || !goalForm.goal_title || !goalForm.goal_description || !goalForm.start_date || !goalForm.target_date) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HR.PERFORMANCE.GOALS.BASE, {
        method: "POST", body: JSON.stringify({
          employee_id: Number(goalForm.employee_id), goal_title: goalForm.goal_title, goal_description: goalForm.goal_description,
          goal_type: goalForm.goal_type, target_value: goalForm.target_value ? Number(goalForm.target_value) : undefined,
          current_value: goalForm.current_value ? Number(goalForm.current_value) : 0, unit: goalForm.unit || undefined,
          start_date: goalForm.start_date, target_date: goalForm.target_date, notes: goalForm.notes || undefined,
        })
      });
      showToast("تم إنشاء الهدف", "success"); setShowGoalDialog(false); loadGoals();
    } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
  };

  const handleUpdateGoal = async () => {
    if (!selectedGoal) return;
    try {
      const body: any = {};
      if (updateForm.current_value) body.current_value = Number(updateForm.current_value);
      if (updateForm.progress_percentage) body.progress_percentage = Number(updateForm.progress_percentage);
      if (updateForm.status) body.status = updateForm.status;
      if (updateForm.notes) body.notes = updateForm.notes;
      if (selectedGoal.target_value) body.target_value = selectedGoal.target_value;
      await fetchAPI(API_ENDPOINTS.HR.PERFORMANCE.GOALS.withId(selectedGoal.id), { method: "PUT", body: JSON.stringify(body) });
      showToast("تم تحديث الهدف", "success"); setShowUpdateGoal(false); loadGoals();
    } catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
  };

  const handleSaveAppraisal = async () => {
    if (!appForm.employee_id || !appForm.appraisal_period || !appForm.appraisal_date) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HR.PERFORMANCE.APPRAISALS.BASE, {
        method: "POST", body: JSON.stringify({
          employee_id: Number(appForm.employee_id), appraisal_type: appForm.appraisal_type,
          appraisal_period: appForm.appraisal_period, appraisal_date: appForm.appraisal_date,
          notes: appForm.notes || undefined,
        })
      });
      showToast("تم إنشاء التقييم", "success"); setShowAppDialog(false); loadAppraisals();
    } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
  };

  const handleUpdateAppraisalStatus = async (id: number, status: string) => {
    try {
      await fetchAPI(API_ENDPOINTS.HR.PERFORMANCE.APPRAISALS.withId(id), { method: "PUT", body: JSON.stringify({ status }) });
      showToast("تم تحديث حالة التقييم", "success"); loadAppraisals();
    } catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
  };

  const goalColumns: Column<Goal>[] = [
    { key: "goal_title", header: "العنوان", dataLabel: "العنوان" },
    { key: "employee", header: "الموظف", dataLabel: "الموظف", render: (i) => i.employee?.full_name || "-" },
    { key: "goal_type", header: "النوع", dataLabel: "النوع", render: (i) => goalTypeLabels[i.goal_type] || i.goal_type },
    {
      key: "progress", header: "التقدم", dataLabel: "التقدم", render: (i) => (
        <div>
          <div className="progress" style={{ height: "20px", marginBottom: "5px" }}><div className="progress-bar" role="progressbar" style={{ width: `${i.progress_percentage}%` }}>{i.progress_percentage}%</div></div>
          {i.target_value && <small>{i.current_value || 0} / {i.target_value} {i.unit || ""}</small>}
        </div>
      )
    },
    { key: "status", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${statusBadges[i.status]}`}>{statusLabels[i.status] || i.status}</span> },
    { key: "target_date", header: "تاريخ الهدف", dataLabel: "الهدف", render: (i) => formatDate(i.target_date) },
    {
      key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "تفاصيل",
              variant: "view",
              onClick: () => { setSelectedGoal(i); setShowGoalDetail(true); }
            },
            {
              icon: "edit",
              title: "تحديث",
              variant: "edit",
              onClick: () => { setSelectedGoal(i); setUpdateForm({ current_value: String(i.current_value || 0), progress_percentage: String(i.progress_percentage), status: i.status, notes: "" }); setShowUpdateGoal(true); },
              hidden: ["completed", "cancelled"].includes(i.status)
            }
          ]}
        />
      )
    },
  ];

  const appraisalColumns: Column<Appraisal>[] = [
    { key: "appraisal_number", header: "الرقم", dataLabel: "الرقم" },
    { key: "employee", header: "الموظف", dataLabel: "الموظف", render: (i) => i.employee?.full_name || "-" },
    { key: "appraisal_period", header: "الفترة", dataLabel: "الفترة" },
    { key: "appraisal_type", header: "النوع", dataLabel: "النوع", render: (i) => appraisalTypeLabels[i.appraisal_type] || i.appraisal_type },
    {
      key: "overall_rating", header: "التقييم", dataLabel: "التقييم", render: (i) => i.overall_rating ? (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} style={{ color: s <= (i.overall_rating || 0) ? "#f59e0b" : "#e5e7eb" }}>
              {getIcon("star", "", 14)}
            </span>
          ))}
          <span style={{ marginRight: "4px" }}>{i.overall_rating}/5</span>
        </div>
      ) : "-"
    },
    { key: "status", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${statusBadges[i.status]}`}>{statusLabels[i.status] || i.status}</span> },
    {
      key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "تفاصيل",
              variant: "view",
              onClick: () => { setSelectedApp(i); setShowAppDetail(true); }
            },
            {
              icon: "play",
              title: "بدء المراجعة",
              variant: "view",
              onClick: () => handleUpdateAppraisalStatus(i.id, "self_review"),
              hidden: i.status !== "draft"
            },
            {
              icon: "send",
              title: "إرسال للمدير",
              variant: "view",
              onClick: () => handleUpdateAppraisalStatus(i.id, "manager_review"),
              hidden: i.status !== "self_review"
            },
            {
              icon: "check",
              title: "إكمال",
              variant: "success",
              onClick: () => handleUpdateAppraisalStatus(i.id, "completed"),
              hidden: i.status !== "manager_review"
            }
          ]}
        />
      )
    },
  ];
  const tabs = [{ key: "goals", label: "الأهداف", icon: "target" }, { key: "appraisals", label: "التقييمات", icon: "clipboard-check" }]

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="الأداء والأهداف"
        titleIcon="chart-line"
        actions={
          <div style={{ display: "flex", gap: "1rem" }}>
            {activeTab === "goals" ? (
              <Button
                onClick={() => { setGoalForm({ employee_id: "", goal_title: "", goal_description: "", goal_type: "kpi", target_value: "", current_value: "0", unit: "", start_date: new Date().toISOString().split("T")[0], target_date: "", notes: "" }); setShowGoalDialog(true); }}
                variant="primary"
                icon="plus"
              >
                إضافة هدف جديد
              </Button>
            ) : (
              <Button
                onClick={() => { setAppForm({ employee_id: "", appraisal_type: "annual", appraisal_period: "", appraisal_date: new Date().toISOString().split("T")[0], notes: "" }); setShowAppDialog(true); }}
                variant="primary"
                icon="plus"
              >
                تقييم جديد
              </Button>
            )}
          </div>
        }
      />

      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "goals" ? (
        <Table columns={goalColumns} data={goals} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد أهداف" isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />
      ) : (
        <Table columns={appraisalColumns} data={appraisals} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد تقييمات" isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />
      )}

      {/* Create Goal Dialog */}
      <Dialog isOpen={showGoalDialog} onClose={() => setShowGoalDialog(false)} title="إضافة هدف جديد" maxWidth="700px">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="الموظف *" value={goalForm.employee_id} onChange={(e) => setGoalForm({ ...goalForm, employee_id: e.target.value })} placeholder="اختر" options={employees.map((e: Employee) => ({ value: e.id.toString(), label: e.full_name }))} />
            <Select label="النوع" value={goalForm.goal_type} onChange={(e) => setGoalForm({ ...goalForm, goal_type: e.target.value })} options={Object.entries(goalTypeLabels).map(([value, label]) => ({ value, label }))} />
          </div>
          <TextInput label="عنوان الهدف *" value={goalForm.goal_title} onChange={(e) => setGoalForm({ ...goalForm, goal_title: e.target.value })} />
          <Textarea label="وصف الهدف *" value={goalForm.goal_description} onChange={(e) => setGoalForm({ ...goalForm, goal_description: e.target.value })} rows={3} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextInput label="القيمة المستهدفة" type="number" value={goalForm.target_value} onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })} />
            <TextInput label="الوحدة" value={goalForm.unit} onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })} placeholder="مثال: %" />
            <TextInput label="القيمة الحالية" type="number" value={goalForm.current_value} onChange={(e) => setGoalForm({ ...goalForm, current_value: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="تاريخ البدء *" type="date" value={goalForm.start_date} onChange={(e) => setGoalForm({ ...goalForm, start_date: e.target.value })} />
            <TextInput label="تاريخ الهدف *" type="date" value={goalForm.target_date} onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowGoalDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveGoal} icon="save">حفظ</Button></div>
        </div>
      </Dialog>

      {/* Goal Detail */}
      <Dialog isOpen={showGoalDetail} onClose={() => setShowGoalDetail(false)} title="تفاصيل الهدف" maxWidth="600px">
        {selectedGoal && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>العنوان:</strong> {selectedGoal.goal_title}</div>
            <div><strong>الموظف:</strong> {selectedGoal.employee?.full_name}</div>
            <div><strong>النوع:</strong> {goalTypeLabels[selectedGoal.goal_type]}</div>
            <div><strong>الحالة:</strong> <span className={`badge ${statusBadges[selectedGoal.status]}`}>{statusLabels[selectedGoal.status]}</span></div>
            <div><strong>التقدم:</strong> {selectedGoal.progress_percentage}%</div>
            {selectedGoal.target_value && <div><strong>القيمة:</strong> {selectedGoal.current_value || 0} / {selectedGoal.target_value} {selectedGoal.unit || ""}</div>}
            <div><strong>تاريخ الهدف:</strong> {formatDate(selectedGoal.target_date)}</div>
          </div>
          {selectedGoal.goal_description && <div><strong>الوصف:</strong><p>{selectedGoal.goal_description}</p></div>}
        </div>}
      </Dialog>

      {/* Update Goal Dialog */}
      <Dialog isOpen={showUpdateGoal} onClose={() => setShowUpdateGoal(false)} title="تحديث الهدف" maxWidth="500px">
        <div className="space-y-4">
          <Select label="الحالة" value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label })).filter(o => ["not_started", "in_progress", "on_track", "at_risk", "completed", "cancelled"].includes(o.value))} />
          {selectedGoal?.target_value && <TextInput label="القيمة الحالية" type="number" value={updateForm.current_value} onChange={(e) => setUpdateForm({ ...updateForm, current_value: e.target.value })} />}
          <TextInput label="نسبة الإنجاز %" type="number" min="0" max="100" value={updateForm.progress_percentage} onChange={(e) => setUpdateForm({ ...updateForm, progress_percentage: e.target.value })} />
          <Textarea label="ملاحظات" value={updateForm.notes} onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowUpdateGoal(false)}>إلغاء</Button><Button variant="primary" onClick={handleUpdateGoal} icon="save">تحديث</Button></div>
        </div>
      </Dialog>

      {/* Create Appraisal Dialog */}
      <Dialog isOpen={showAppDialog} onClose={() => setShowAppDialog(false)} title="تقييم جديد" maxWidth="600px">
        <div className="space-y-4">
          <Select label="الموظف *" value={appForm.employee_id} onChange={(e) => setAppForm({ ...appForm, employee_id: e.target.value })} placeholder="اختر" options={employees.map((e: Employee) => ({ value: e.id.toString(), label: e.full_name }))} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="النوع" value={appForm.appraisal_type} onChange={(e) => setAppForm({ ...appForm, appraisal_type: e.target.value })} options={Object.entries(appraisalTypeLabels).map(([value, label]) => ({ value, label }))} />
            <TextInput label="الفترة *" value={appForm.appraisal_period} onChange={(e) => setAppForm({ ...appForm, appraisal_period: e.target.value })} placeholder="مثال: Q1 2026" />
          </div>
          <TextInput label="تاريخ التقييم *" type="date" value={appForm.appraisal_date} onChange={(e) => setAppForm({ ...appForm, appraisal_date: e.target.value })} />
          <Textarea label="ملاحظات" value={appForm.notes} onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowAppDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveAppraisal} icon="save">حفظ</Button></div>
        </div>
      </Dialog>

      {/* Appraisal Detail */}
      <Dialog isOpen={showAppDetail} onClose={() => setShowAppDetail(false)} title="تفاصيل التقييم" maxWidth="600px">
        {selectedApp && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>الرقم:</strong> {selectedApp.appraisal_number}</div>
            <div><strong>الموظف:</strong> {selectedApp.employee?.full_name}</div>
            <div><strong>النوع:</strong> {appraisalTypeLabels[selectedApp.appraisal_type]}</div>
            <div><strong>الفترة:</strong> {selectedApp.appraisal_period}</div>
            <div><strong>الحالة:</strong> <span className={`badge ${statusBadges[selectedApp.status]}`}>{statusLabels[selectedApp.status]}</span></div>
            {selectedApp.overall_rating && <div><strong>التقييم:</strong> {selectedApp.overall_rating}/5</div>}
          </div>
          {selectedApp.self_assessment && <div><strong>التقييم الذاتي:</strong><p>{selectedApp.self_assessment}</p></div>}
          {selectedApp.manager_feedback && <div><strong>ملاحظات المدير:</strong><p>{selectedApp.manager_feedback}</p></div>}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {selectedApp.status === "draft" && <Button variant="primary" onClick={() => { handleUpdateAppraisalStatus(selectedApp.id, "self_review"); setShowAppDetail(false); }}>بدء المراجعة الذاتية</Button>}
            {selectedApp.status === "self_review" && <Button variant="primary" onClick={() => { handleUpdateAppraisalStatus(selectedApp.id, "manager_review"); setShowAppDetail(false); }}>إرسال لمراجعة المدير</Button>}
            {selectedApp.status === "manager_review" && <Button variant="primary" onClick={() => { handleUpdateAppraisalStatus(selectedApp.id, "completed"); setShowAppDetail(false); }}>إكمال التقييم</Button>}
          </div>
        </div>}
      </Dialog>
    </div>
  );
}
