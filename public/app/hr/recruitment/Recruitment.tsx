"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, TabNavigation, showToast, Label, Select } from "@/components/ui";
import { PageSubHeader } from "@/components/layout";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";

interface Requisition {
  id: number; requisition_number: string; job_title: string; job_description?: string;
  department_id?: number; department?: { name_ar: string }; role_id?: number; role?: { role_name_ar: string };
  number_of_positions: number; employment_type: string; status: string;
  target_start_date?: string; budgeted_salary_min?: number; budgeted_salary_max?: number;
  required_qualifications?: string; preferred_qualifications?: string; notes?: string; is_published: boolean;
  applicants?: Applicant[];
}

interface Applicant {
  id: number; requisition_id: number; requisition?: { job_title: string };
  first_name: string; last_name: string; email: string; phone?: string;
  status: string; application_date: string; match_score?: number;
  screening_notes?: string; interview_notes?: string;
}

const statusLabels: Record<string, string> = { draft: "مسودة", pending_approval: "قيد الموافقة", approved: "موافق عليه", rejected: "مرفوض", closed: "مغلق", filled: "مكتمل", applied: "تم التقديم", screened: "تم الفحص", assessment: "التقييم", interview: "مقابلة", offer: "عرض", hired: "تم التوظيف", withdrawn: "منسحب" };
const statusBadges: Record<string, string> = { draft: "badge-secondary", pending_approval: "badge-warning", approved: "badge-success", rejected: "badge-danger", closed: "badge-secondary", filled: "badge-info", applied: "badge-info", screened: "badge-warning", assessment: "badge-warning", interview: "badge-primary", offer: "badge-success", hired: "badge-success", withdrawn: "badge-secondary" };
const empTypeLabels: Record<string, string> = { full_time: "دوام كامل", part_time: "دوام جزئي", contract: "عقد", temporary: "مؤقت" };

export function Recruitment() {
  const [activeTab, setActiveTab] = useState("requisitions");
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  // Dialogs
  const [showReqDialog, setShowReqDialog] = useState(false);
  const [showReqDetail, setShowReqDetail] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [showAppDialog, setShowAppDialog] = useState(false);
  const [showAppDetail, setShowAppDetail] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Applicant | null>(null);
  // Forms
  const [reqForm, setReqForm] = useState({ job_title: "", job_description: "", department_id: "", number_of_positions: "1", employment_type: "full_time", budgeted_salary_min: "", budgeted_salary_max: "", target_start_date: "", required_qualifications: "", preferred_qualifications: "", notes: "" });
  const [appForm, setAppForm] = useState({ requisition_id: "", first_name: "", last_name: "", email: "", phone: "", notes: "" });

  useEffect(() => { loadDepartments(); }, []);
  useEffect(() => { setCurrentPage(1); }, [activeTab]);
  useEffect(() => { activeTab === "requisitions" ? loadRequisitions() : loadApplicants(); }, [activeTab, currentPage, statusFilter]);

  const loadDepartments = async () => { try { const r: any = await fetchAPI(API_ENDPOINTS.HR.DEPARTMENTS); setDepartments(r.data || (Array.isArray(r) ? r : [])); } catch { } };

  const loadRequisitions = async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({ page: currentPage.toString(), ...(statusFilter && { status: statusFilter }) });
      const res: any = await fetchAPI(`${API_ENDPOINTS.HR.RECRUITMENT.REQUISITIONS.BASE}?${q}`);
      const data = res.data || (Array.isArray(res) ? res : []);
      setRequisitions(data); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast("فشل تحميل طلبات التوظيف", "error"); }
    finally { setIsLoading(false); }
  };

  const loadApplicants = async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({ page: currentPage.toString(), ...(statusFilter && { status: statusFilter }) });
      const res: any = await fetchAPI(`${API_ENDPOINTS.HR.RECRUITMENT.APPLICANTS.BASE}?${q}`);
      const data = res.data || (Array.isArray(res) ? res : []);
      setApplicants(data); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast("فشل تحميل المرشحين", "error"); }
    finally { setIsLoading(false); }
  };

  const handleSaveRequisition = async () => {
    if (!reqForm.job_title || !reqForm.number_of_positions) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HR.RECRUITMENT.REQUISITIONS.BASE, {
        method: "POST", body: JSON.stringify({
          job_title: reqForm.job_title, job_description: reqForm.job_description || undefined,
          department_id: reqForm.department_id ? Number(reqForm.department_id) : undefined,
          number_of_positions: Number(reqForm.number_of_positions), employment_type: reqForm.employment_type,
          budgeted_salary_min: reqForm.budgeted_salary_min ? Number(reqForm.budgeted_salary_min) : undefined,
          budgeted_salary_max: reqForm.budgeted_salary_max ? Number(reqForm.budgeted_salary_max) : undefined,
          target_start_date: reqForm.target_start_date || undefined,
          required_qualifications: reqForm.required_qualifications || undefined,
          preferred_qualifications: reqForm.preferred_qualifications || undefined,
          notes: reqForm.notes || undefined,
        })
      });
      showToast("تم إنشاء طلب التوظيف", "success"); setShowReqDialog(false); loadRequisitions();
    } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
  };

  const handleUpdateReqStatus = async (id: number, status: string) => {
    try {
      await fetchAPI(API_ENDPOINTS.HR.RECRUITMENT.REQUISITIONS.withId(id), { method: "PUT", body: JSON.stringify({ status }) });
      showToast("تم تحديث الحالة", "success"); loadRequisitions();
    } catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
  };

  const handleSaveApplicant = async () => {
    if (!appForm.requisition_id || !appForm.first_name || !appForm.last_name || !appForm.email) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HR.RECRUITMENT.APPLICANTS.BASE, {
        method: "POST", body: JSON.stringify({
          requisition_id: Number(appForm.requisition_id), first_name: appForm.first_name,
          last_name: appForm.last_name, email: appForm.email, phone: appForm.phone || undefined,
          notes: appForm.notes || undefined,
        })
      });
      showToast("تم إضافة المرشح", "success"); setShowAppDialog(false); loadApplicants();
    } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
  };

  const handleUpdateAppStatus = async (id: number, status: string) => {
    try {
      await fetchAPI(API_ENDPOINTS.HR.RECRUITMENT.APPLICANTS.STATUS(id), { method: "PUT", body: JSON.stringify({ status }) });
      showToast("تم تحديث حالة المرشح", "success"); loadApplicants();
    } catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
  };

  const viewReqDetail = async (id: number) => {
    try {
      const res: any = await fetchAPI(API_ENDPOINTS.HR.RECRUITMENT.REQUISITIONS.withId(id));
      setSelectedReq(res.data || res); setShowReqDetail(true);
    } catch { showToast("فشل تحميل التفاصيل", "error"); }
  };

  const requisitionColumns: Column<Requisition>[] = [
    { key: "requisition_number", header: "رقم الطلب", dataLabel: "رقم الطلب" },
    { key: "job_title", header: "المسمى الوظيفي", dataLabel: "المسمى" },
    { key: "department", header: "القسم", dataLabel: "القسم", render: (i) => i.department?.name_ar || "-" },
    { key: "number_of_positions", header: "عدد الوظائف", dataLabel: "العدد" },
    { key: "employment_type", header: "نوع التوظيف", dataLabel: "النوع", render: (i) => empTypeLabels[i.employment_type] || i.employment_type },
    { key: "status", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${statusBadges[i.status]}`}>{statusLabels[i.status] || i.status}</span> },
    { key: "target_start_date", header: "تاريخ البدء", dataLabel: "البدء", render: (i) => i.target_start_date ? formatDate(i.target_start_date) : "-" },
    {
      key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "تفاصيل",
              variant: "view",
              onClick: () => viewReqDetail(i.id)
            },
            {
              icon: "send",
              title: "إرسال للموافقة",
              variant: "view",
              onClick: () => handleUpdateReqStatus(i.id, "pending_approval"),
              hidden: i.status !== "draft"
            },
            {
              icon: "check",
              title: "موافقة",
              variant: "success",
              onClick: () => handleUpdateReqStatus(i.id, "approved"),
              hidden: i.status !== "pending_approval"
            }
          ]}
        />
      )
    },
  ];

  const applicantColumns: Column<Applicant>[] = [
    { key: "name", header: "الاسم", dataLabel: "الاسم", render: (i) => `${i.first_name} ${i.last_name}` },
    { key: "email", header: "البريد الإلكتروني", dataLabel: "البريد" },
    { key: "requisition", header: "الوظيفة", dataLabel: "الوظيفة", render: (i) => i.requisition?.job_title || "-" },
    { key: "status", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${statusBadges[i.status]}`}>{statusLabels[i.status] || i.status}</span> },
    { key: "application_date", header: "تاريخ التقديم", dataLabel: "التاريخ", render: (i) => formatDate(i.application_date) },
    { key: "match_score", header: "المطابقة", dataLabel: "المطابقة", render: (i) => i.match_score ? `${i.match_score}%` : "-" },
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
              icon: "filter",
              title: "فحص",
              variant: "view",
              onClick: () => handleUpdateAppStatus(i.id, "screened"),
              hidden: i.status !== "applied"
            },
            {
              icon: "user-check",
              title: "مقابلة",
              variant: "view",
              onClick: () => handleUpdateAppStatus(i.id, "interview"),
              hidden: i.status !== "screened"
            },
            {
              icon: "handshake",
              title: "عرض",
              variant: "success",
              onClick: () => handleUpdateAppStatus(i.id, "offer"),
              hidden: i.status !== "interview"
            },
            {
              icon: "check-check",
              title: "توظيف",
              variant: "success",
              onClick: () => handleUpdateAppStatus(i.id, "hired"),
              hidden: i.status !== "offer"
            }
          ]}
        />
      )
    },
  ];

  const tabs = [{ key: "requisitions", label: "طلبات التوظيف", icon: "file-alt" }, { key: "applicants", label: "المرشحين", icon: "users" }];

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="التوظيف والمرشحين"
        titleIcon="user-plus"
        actions={
          <>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: "140px" }}
              placeholder="جميع الحالات"
              options={activeTab === "requisitions"
                ? [
                  { value: "draft", label: "مسودة" },
                  { value: "pending_approval", label: "قيد الموافقة" },
                  { value: "approved", label: "موافق" },
                  { value: "filled", label: "مكتمل" }
                ]
                : [
                  { value: "applied", label: "تم التقديم" },
                  { value: "screened", label: "فحص" },
                  { value: "interview", label: "مقابلة" },
                  { value: "hired", label: "تم التوظيف" }
                ]
              }
            />
            {activeTab === "requisitions" ? (
              <Button
                onClick={() => { setReqForm({ job_title: "", job_description: "", department_id: "", number_of_positions: "1", employment_type: "full_time", budgeted_salary_min: "", budgeted_salary_max: "", target_start_date: "", required_qualifications: "", preferred_qualifications: "", notes: "" }); setShowReqDialog(true); }}
                variant="primary"
                icon="plus"
              >
                طلب توظيف جديد
              </Button>
            ) : (
              <Button
                onClick={() => { setAppForm({ requisition_id: "", first_name: "", last_name: "", email: "", phone: "", notes: "" }); setShowAppDialog(true); }}
                variant="primary"
                icon="plus"
              >
                إضافة مرشح
              </Button>
            )}
          </>
        }
      />

      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={(t) => { setActiveTab(t); setStatusFilter(""); }} />

      {activeTab === "requisitions" ? (
        <Table columns={requisitionColumns} data={requisitions} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد طلبات توظيف" isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />
      ) : (
        <Table columns={applicantColumns} data={applicants} keyExtractor={(i) => i.id.toString()} emptyMessage="لا يوجد مرشحين" isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />
      )}

      {/* Create Requisition Dialog */}
      <Dialog isOpen={showReqDialog} onClose={() => setShowReqDialog(false)} title="طلب توظيف جديد" maxWidth="750px">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>المسمى الوظيفي *</Label><TextInput value={reqForm.job_title} onChange={(e) => setReqForm({ ...reqForm, job_title: e.target.value })} /></div>
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>القسم</Label><Select value={reqForm.department_id} onChange={(e) => setReqForm({ ...reqForm, department_id: e.target.value })} placeholder="اختر" options={departments.map((d: any) => ({ value: d.id.toString(), label: d.name_ar || d.name }))} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>عدد الوظائف *</Label><TextInput type="number" min="1" value={reqForm.number_of_positions} onChange={(e) => setReqForm({ ...reqForm, number_of_positions: e.target.value })} /></div>
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>نوع التوظيف</Label><Select value={reqForm.employment_type} onChange={(e) => setReqForm({ ...reqForm, employment_type: e.target.value })} options={Object.entries(empTypeLabels).map(([value, label]) => ({ value, label }))} /></div>
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>تاريخ البدء</Label><TextInput type="date" value={reqForm.target_start_date} onChange={(e) => setReqForm({ ...reqForm, target_start_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الحد الأدنى للراتب</Label><TextInput type="number" value={reqForm.budgeted_salary_min} onChange={(e) => setReqForm({ ...reqForm, budgeted_salary_min: e.target.value })} /></div>
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الحد الأقصى للراتب</Label><TextInput type="number" value={reqForm.budgeted_salary_max} onChange={(e) => setReqForm({ ...reqForm, budgeted_salary_max: e.target.value })} /></div>
          </div>
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الوصف الوظيفي</Label><Textarea value={reqForm.job_description} onChange={(e) => setReqForm({ ...reqForm, job_description: e.target.value })} rows={3} /></div>
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>المؤهلات المطلوبة</Label><Textarea value={reqForm.required_qualifications} onChange={(e) => setReqForm({ ...reqForm, required_qualifications: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowReqDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveRequisition} icon="save">حفظ</Button></div>
        </div>
      </Dialog>

      {/* Requisition Detail Dialog */}
      <Dialog isOpen={showReqDetail} onClose={() => setShowReqDetail(false)} title="تفاصيل طلب التوظيف" maxWidth="750px">
        {selectedReq && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>رقم الطلب:</strong> {selectedReq.requisition_number}</div>
            <div><strong>المسمى:</strong> {selectedReq.job_title}</div>
            <div><strong>القسم:</strong> {selectedReq.department?.name_ar || "-"}</div>
            <div><strong>نوع التوظيف:</strong> {empTypeLabels[selectedReq.employment_type] || selectedReq.employment_type}</div>
            <div><strong>عدد الوظائف:</strong> {selectedReq.number_of_positions}</div>
            <div><strong>الحالة:</strong> <span className={`badge ${statusBadges[selectedReq.status]}`}>{statusLabels[selectedReq.status]}</span></div>
            {selectedReq.budgeted_salary_min && <div><strong>نطاق الراتب:</strong> {formatCurrency(selectedReq.budgeted_salary_min)} - {formatCurrency(selectedReq.budgeted_salary_max || 0)}</div>}
            {selectedReq.target_start_date && <div><strong>تاريخ البدء:</strong> {formatDate(selectedReq.target_start_date)}</div>}
          </div>
          {selectedReq.job_description && <div><strong>الوصف:</strong><p>{selectedReq.job_description}</p></div>}
          {selectedReq.required_qualifications && <div><strong>المؤهلات المطلوبة:</strong><p>{selectedReq.required_qualifications}</p></div>}
          {selectedReq.applicants && selectedReq.applicants.length > 0 && <div>
            <strong>المرشحون ({selectedReq.applicants.length}):</strong>
            <div style={{ marginTop: "0.5rem" }}>{selectedReq.applicants.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", borderBottom: "1px solid var(--border-color)" }}>
                <span>{a.first_name} {a.last_name}</span>
                <span className={`badge ${statusBadges[a.status]}`}>{statusLabels[a.status]}</span>
              </div>
            ))}</div>
          </div>}
        </div>}
      </Dialog>

      {/* Add Applicant Dialog */}
      <Dialog isOpen={showAppDialog} onClose={() => setShowAppDialog(false)} title="إضافة مرشح" maxWidth="600px">
        <div className="space-y-4">
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الوظيفة *</Label>
            <Select
              value={appForm.requisition_id}
              onChange={(e) => setAppForm({ ...appForm, requisition_id: e.target.value })}
              placeholder="اختر الوظيفة"
              options={requisitions.filter(r => r.status === "approved").map(r => ({ value: r.id.toString(), label: r.job_title }))}
            /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الاسم الأول *</Label><TextInput value={appForm.first_name} onChange={(e) => setAppForm({ ...appForm, first_name: e.target.value })} /></div>
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>اسم العائلة *</Label><TextInput value={appForm.last_name} onChange={(e) => setAppForm({ ...appForm, last_name: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>البريد الإلكتروني *</Label><TextInput type="email" value={appForm.email} onChange={(e) => setAppForm({ ...appForm, email: e.target.value })} /></div>
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الهاتف</Label><TextInput value={appForm.phone} onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })} /></div>
          </div>
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>ملاحظات</Label><Textarea value={appForm.notes} onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowAppDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveApplicant} icon="save">حفظ</Button></div>
        </div>
      </Dialog>

      {/* Applicant Detail Dialog */}
      <Dialog isOpen={showAppDetail} onClose={() => setShowAppDetail(false)} title="تفاصيل المرشح" maxWidth="600px">
        {selectedApp && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>الاسم:</strong> {selectedApp.first_name} {selectedApp.last_name}</div>
            <div><strong>البريد:</strong> {selectedApp.email}</div>
            {selectedApp.phone && <div><strong>الهاتف:</strong> {selectedApp.phone}</div>}
            <div><strong>الوظيفة:</strong> {selectedApp.requisition?.job_title || "-"}</div>
            <div><strong>تاريخ التقديم:</strong> {formatDate(selectedApp.application_date)}</div>
            <div><strong>الحالة:</strong> <span className={`badge ${statusBadges[selectedApp.status]}`}>{statusLabels[selectedApp.status]}</span></div>
            {selectedApp.match_score && <div><strong>المطابقة:</strong> {selectedApp.match_score}%</div>}
          </div>
          {selectedApp.screening_notes && <div><strong>ملاحظات الفحص:</strong><p>{selectedApp.screening_notes}</p></div>}
          {selectedApp.interview_notes && <div><strong>ملاحظات المقابلة:</strong><p>{selectedApp.interview_notes}</p></div>}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {selectedApp.status === "applied" && <Button variant="primary" onClick={() => { handleUpdateAppStatus(selectedApp.id, "screened"); setShowAppDetail(false); }}>فحص</Button>}
            {selectedApp.status === "screened" && <Button variant="primary" onClick={() => { handleUpdateAppStatus(selectedApp.id, "interview"); setShowAppDetail(false); }}>جدولة مقابلة</Button>}
            {selectedApp.status === "interview" && <Button variant="primary" onClick={() => { handleUpdateAppStatus(selectedApp.id, "offer"); setShowAppDetail(false); }}>تقديم عرض</Button>}
            {selectedApp.status === "offer" && <Button variant="primary" onClick={() => { handleUpdateAppStatus(selectedApp.id, "hired"); setShowAppDetail(false); }}>تأكيد التوظيف</Button>}
            {!["hired", "rejected", "withdrawn"].includes(selectedApp.status) && <Button variant="danger" onClick={() => { handleUpdateAppStatus(selectedApp.id, "rejected"); setShowAppDetail(false); }}>رفض</Button>}
          </div>
        </div>}
      </Dialog>
    </div>
  );
}
