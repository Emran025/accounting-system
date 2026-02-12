"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, TabNavigation, showToast, SearchableSelect, Label } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { Employee, Workflow } from "../types";

const workflowTypeLabels: Record<string, string> = { onboarding: "توظيف", offboarding: "إنهاء خدمة" };
const statusLabels: Record<string, string> = { not_started: "لم يبدأ", in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي", pending: "قيد الانتظار", blocked: "محظور" };
const statusBadges: Record<string, string> = { not_started: "badge-secondary", in_progress: "badge-warning", completed: "badge-success", cancelled: "badge-danger", pending: "badge-info", blocked: "badge-danger" };
const taskTypeLabels: Record<string, string> = { system_id: "معرف النظام", it_provisioning: "تجهيزات IT", badge_access: "بطاقة دخول", document: "مستندات", training: "تدريب", other: "أخرى" };
const deptLabels: Record<string, string> = { it: "تقنية المعلومات", security: "الأمن", hr: "الموارد البشرية", facilities: "المرافق" };

export function Onboarding() {
  const [activeTab, setActiveTab] = useState("onboarding");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  // Form
  const [form, setForm] = useState({ employee_id: "", start_date: "", target_completion_date: "", notes: "" });

  useEffect(() => { loadAllEmployees(); }, [loadAllEmployees]);
  useEffect(() => { setCurrentPage(1); }, [activeTab]);
  useEffect(() => { loadWorkflows(); }, [activeTab, currentPage]);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({ page: currentPage.toString(), workflow_type: activeTab });
      const res: any = await fetchAPI(`${API_ENDPOINTS.HR.ONBOARDING.BASE}?${q}`);
      setWorkflows(res.data || []); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast("فشل تحميل البيانات", "error"); }
    finally { setIsLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.employee_id || !form.start_date) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HR.ONBOARDING.BASE, {
        method: "POST", body: JSON.stringify({
          employee_id: Number(form.employee_id), workflow_type: activeTab,
          start_date: form.start_date, target_completion_date: form.target_completion_date || undefined,
          notes: form.notes || undefined,
        })
      });
      showToast(`تم إنشاء عملية ${workflowTypeLabels[activeTab]}`, "success"); setShowCreateDialog(false); loadWorkflows();
    } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
  };

  const viewDetail = async (id: number) => {
    try {
      const res: any = await fetchAPI(API_ENDPOINTS.HR.ONBOARDING.withId(id));
      setSelectedWorkflow(res.data || res); setShowDetailDialog(true);
    } catch { showToast("فشل تحميل التفاصيل", "error"); }
  };

  const handleUpdateTask = async (workflowId: number, taskId: number, status: string) => {
    try {
      await fetchAPI(API_ENDPOINTS.HR.ONBOARDING.TASK(workflowId, taskId), { method: "PUT", body: JSON.stringify({ status }) });
      showToast("تم تحديث المهمة", "success");
      // Reload detail
      const res: any = await fetchAPI(API_ENDPOINTS.HR.ONBOARDING.withId(workflowId));
      setSelectedWorkflow(res.data || res);
      loadWorkflows();
    } catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
  };

  const columns: Column<Workflow>[] = [
    {
      key: "employee", header: "الموظف", dataLabel: "الموظف", render: (i) => (
        <div><div>{i.employee?.full_name || "-"}</div><small className="text-muted">{i.employee?.employee_code || ""}</small></div>
      )
    },
    { key: "workflow_type", header: "النوع", dataLabel: "النوع", render: (i) => workflowTypeLabels[i.workflow_type] || i.workflow_type },
    { key: "status", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${statusBadges[i.status]}`}>{statusLabels[i.status] || i.status}</span> },
    {
      key: "completion_percentage", header: "الإنجاز", dataLabel: "الإنجاز", render: (i) => (
        <div className="progress" style={{ height: "20px" }}><div className="progress-bar" role="progressbar" style={{ width: `${i.completion_percentage}%` }}>{i.completion_percentage}%</div></div>
      )
    },
    { key: "start_date", header: "تاريخ البدء", dataLabel: "البدء", render: (i) => formatDate(i.start_date) },
    { key: "target_completion_date", header: "الإنجاز المستهدف", dataLabel: "الهدف", render: (i) => i.target_completion_date ? formatDate(i.target_completion_date) : "-" },
    {
      key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "تفاصيل",
              variant: "view",
              onClick: () => viewDetail(i.id)
            }
          ]}
        />
      )
    },
  ];

  const tabs = [{ key: "onboarding", label: "التوظيف", icon: "user-plus" }, { key: "offboarding", label: "إنهاء الخدمة", icon: "user-minus" }]

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="التوظيف والإنهاء"
        titleIcon="user-check"
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => { setForm({ employee_id: "", start_date: new Date().toISOString().split("T")[0], target_completion_date: "", notes: "" }); setShowCreateDialog(true); }}
          >
            إضافة عملية جديدة
          </Button>
        }
      />

      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <Table columns={columns} data={workflows} keyExtractor={(i) => i.id.toString()} emptyMessage={`لا توجد عمليات ${workflowTypeLabels[activeTab]}`} isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />

      {/* Create Dialog */}
      <Dialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} title={`إضافة عملية ${workflowTypeLabels[activeTab]}`} maxWidth="550px">
        <div className="space-y-4">
          <Select label="الموظف *" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="اختر الموظف" options={employees.map((emp: Employee) => ({ value: emp.id.toString(), label: `${emp.full_name} (${emp.employee_code})` }))} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="تاريخ البدء *" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <TextInput label="الإنجاز المستهدف" type="date" value={form.target_completion_date} onChange={(e) => setForm({ ...form, target_completion_date: e.target.value })} />
          </div>
          <Textarea label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowCreateDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleCreate} icon="save">إنشاء</Button></div>
        </div>
      </Dialog>

      {/* Detail Dialog with Tasks */}
      <Dialog isOpen={showDetailDialog} onClose={() => setShowDetailDialog(false)} title="تفاصيل العملية" maxWidth="750px">
        {selectedWorkflow && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>الموظف:</strong> {selectedWorkflow.employee?.full_name}</div>
            <div><strong>النوع:</strong> {workflowTypeLabels[selectedWorkflow.workflow_type]}</div>
            <div><strong>الحالة:</strong> <span className={`badge ${statusBadges[selectedWorkflow.status]}`}>{statusLabels[selectedWorkflow.status]}</span></div>
            <div><strong>الإنجاز:</strong> {selectedWorkflow.completion_percentage}%</div>
            <div><strong>تاريخ البدء:</strong> {formatDate(selectedWorkflow.start_date)}</div>
            {selectedWorkflow.target_completion_date && <div><strong>الهدف:</strong> {formatDate(selectedWorkflow.target_completion_date)}</div>}
          </div>
          {selectedWorkflow.notes && <div><strong>ملاحظات:</strong> {selectedWorkflow.notes}</div>}

          {/* Tasks */}
          <div style={{ marginTop: "1rem" }}>
            <h4 style={{ marginBottom: "0.75rem" }}>المهام</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {selectedWorkflow.tasks?.sort((a, b) => a.sequence_order - b.sequence_order).map((task) => (
                <div key={task.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{task.task_name}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {taskTypeLabels[task.task_type] || task.task_type} · {deptLabels[task.department] || task.department}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className={`badge ${statusBadges[task.status]}`}>{statusLabels[task.status] || task.status}</span>
                    {task.status === "pending" && <button className="icon-btn" onClick={() => handleUpdateTask(selectedWorkflow.id, task.id, "in_progress")} title="بدء" style={{ color: "var(--warning-color)" }}>{getIcon("play")}</button>}
                    {task.status === "in_progress" && <button className="icon-btn" onClick={() => handleUpdateTask(selectedWorkflow.id, task.id, "completed")} title="إتمام" style={{ color: "var(--success-color)" }}>{getIcon("check")}</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          {selectedWorkflow.documents && selectedWorkflow.documents.length > 0 && <div style={{ marginTop: "1rem" }}>
            <h4 style={{ marginBottom: "0.5rem" }}>المستندات</h4>
            {selectedWorkflow.documents.map(d => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", borderBottom: "1px solid var(--border-color)" }}>
                <span>{d.document_name}</span>
                <span className={`badge ${statusBadges[d.status]}`}>{statusLabels[d.status] || d.status}</span>
              </div>
            ))}
          </div>}
        </div>}
      </Dialog>
    </div>
  );
}
