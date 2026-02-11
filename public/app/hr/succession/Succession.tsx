"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, showToast, Label, Select } from "@/components/ui";
import { PageSubHeader } from "@/components/layout";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface SuccessionPlan {
  id: number; position_title: string; incumbent_id?: number;
  incumbent?: { full_name: string }; readiness_level: string;
  status: string; notes?: string;
  candidates?: Candidate[];
}

interface Candidate {
  id: number; employee_id: number; employee?: { full_name: string };
  readiness_level: string; performance_rating?: number; potential_rating?: number;
  development_plan?: string; notes?: string;
}

const readinessLabels: Record<string, string> = { ready_now: "جاهز الآن", ready_1_2_years: "خلال 1-2 سنة", ready_3_5_years: "خلال 3-5 سنوات", not_ready: "غير جاهز" };
const readinessBadges: Record<string, string> = { ready_now: "badge-success", ready_1_2_years: "badge-info", ready_3_5_years: "badge-warning", not_ready: "badge-danger" };
const statusLabels: Record<string, string> = { active: "نشط", inactive: "غير نشط", filled: "مكتمل" };
const statusBadges: Record<string, string> = { active: "badge-success", inactive: "badge-secondary", filled: "badge-info" };

export function Succession() {
  const [plans, setPlans] = useState<SuccessionPlan[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Dialogs
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SuccessionPlan | null>(null);
  const [showCandidateDialog, setShowCandidateDialog] = useState(false);
  // Forms
  const [planForm, setPlanForm] = useState({ position_title: "", incumbent_id: "", readiness_level: "not_ready", notes: "" });
  const [candForm, setCandForm] = useState({ employee_id: "", readiness_level: "not_ready", performance_rating: "", potential_rating: "", development_plan: "", notes: "" });

  useEffect(() => { loadEmployees(); }, []);
  useEffect(() => { loadPlans(); }, [currentPage]);

  const loadEmployees = async () => { try { const r: any = await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEES.BASE}?per_page=500`); setEmployees(r.data || []); } catch { } };

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI(`${API_ENDPOINTS.HR.SUCCESSION.BASE}?page=${currentPage}`);
      setPlans(res.data || []); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast("فشل تحميل خطط الخلافة", "error"); }
    finally { setIsLoading(false); }
  };

  const handleSavePlan = async () => {
    if (!planForm.position_title) { showToast("يرجى إدخال المسمى الوظيفي", "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HR.SUCCESSION.BASE, {
        method: "POST", body: JSON.stringify({
          position_title: planForm.position_title, incumbent_id: planForm.incumbent_id ? Number(planForm.incumbent_id) : undefined,
          readiness_level: planForm.readiness_level, notes: planForm.notes || undefined,
        })
      });
      showToast("تم إنشاء خطة الخلافة", "success"); setShowPlanDialog(false); loadPlans();
    } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
  };

  const handleUpdatePlanStatus = async (id: number, status: string) => {
    try {
      await fetchAPI(API_ENDPOINTS.HR.SUCCESSION.withId(id), { method: "PUT", body: JSON.stringify({ status }) });
      showToast("تم تحديث الحالة", "success"); loadPlans();
    } catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
  };

  const viewDetail = async (id: number) => {
    try {
      const res: any = await fetchAPI(API_ENDPOINTS.HR.SUCCESSION.withId(id));
      setSelectedPlan(res.data || res); setShowDetailDialog(true);
    } catch { showToast("فشل تحميل التفاصيل", "error"); }
  };

  const handleAddCandidate = async () => {
    if (!selectedPlan || !candForm.employee_id) { showToast("يرجى اختيار الموظف", "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HR.SUCCESSION.CANDIDATES(selectedPlan.id), {
        method: "POST", body: JSON.stringify({
          employee_id: Number(candForm.employee_id), readiness_level: candForm.readiness_level,
          performance_rating: candForm.performance_rating ? Number(candForm.performance_rating) : undefined,
          potential_rating: candForm.potential_rating ? Number(candForm.potential_rating) : undefined,
          development_plan: candForm.development_plan || undefined, notes: candForm.notes || undefined,
        })
      });
      showToast("تم إضافة المرشح", "success"); setShowCandidateDialog(false);
      const res: any = await fetchAPI(API_ENDPOINTS.HR.SUCCESSION.withId(selectedPlan.id));
      setSelectedPlan(res.data || res); loadPlans();
    } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
  };

  const columns: Column<SuccessionPlan>[] = [
    { key: "position_title", header: "المسمى الوظيفي", dataLabel: "المسمى" },
    { key: "incumbent", header: "شاغل الوظيفة", dataLabel: "الشاغل", render: (i) => i.incumbent?.full_name || "-" },
    { key: "readiness_level", header: "الجاهزية", dataLabel: "الجاهزية", render: (i) => <span className={`badge ${readinessBadges[i.readiness_level]}`}>{readinessLabels[i.readiness_level] || i.readiness_level}</span> },
    { key: "candidates", header: "المرشحين", dataLabel: "المرشحين", render: (i) => <span style={{ fontWeight: 600 }}>{i.candidates?.length || 0}</span> },
    { key: "status", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${statusBadges[i.status]}`}>{statusLabels[i.status] || i.status}</span> },
    {
      key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "تفاصيل",
              variant: "view",
              onClick: () => viewDetail(i.id)
            },
            {
              icon: "pause",
              title: "تعطيل",
              variant: "edit",
              onClick: () => handleUpdatePlanStatus(i.id, "inactive"),
              hidden: i.status !== "active"
            },
            {
              icon: "play",
              title: "تفعيل",
              variant: "success",
              onClick: () => handleUpdatePlanStatus(i.id, "active"),
              hidden: i.status !== "inactive"
            }
          ]}
        />
      )
    },
  ];

  const renderRatingStars = (rating?: number) => {
    if (!rating) return "-";
    return <div style={{ display: "flex", gap: "2px" }}>{[1, 2, 3, 4, 5].map(s => <span key={s} style={{ color: s <= rating ? "#f59e0b" : "#e5e7eb" }}>{getIcon("star", "", 13)}</span>)}</div>;
  };

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="التخطيط للخلافة"
        titleIcon="sitemap"
        actions={
          <Button
            onClick={() => { setPlanForm({ position_title: "", incumbent_id: "", readiness_level: "not_ready", notes: "" }); setShowPlanDialog(true); }}
            variant="primary"
            icon="plus"
          >
            خطة خلافة جديدة
          </Button>
        }
      />

      <Table columns={columns} data={plans} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد خطط خلافة" isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />

      {/* Create Plan Dialog */}
      <Dialog isOpen={showPlanDialog} onClose={() => setShowPlanDialog(false)} title="خطة خلافة جديدة" maxWidth="550px">
        <div className="space-y-4">
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>المسمى الوظيفي *</Label><TextInput value={planForm.position_title} onChange={(e) => setPlanForm({ ...planForm, position_title: e.target.value })} /></div>
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>شاغل الوظيفة الحالي</Label>
            <Select
              value={planForm.incumbent_id}
              onChange={(e) => setPlanForm({ ...planForm, incumbent_id: e.target.value })}
              placeholder="اختر"
              options={employees.map((e: any) => ({ value: e.id.toString(), label: e.full_name }))}
            /></div>
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>مستوى الجاهزية</Label>
            <Select
              value={planForm.readiness_level}
              onChange={(e) => setPlanForm({ ...planForm, readiness_level: e.target.value })}
              options={Object.entries(readinessLabels).map(([value, label]) => ({ value, label }))}
            /></div>
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>ملاحظات</Label><Textarea value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowPlanDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSavePlan} icon="save">حفظ</Button></div>
        </div>
      </Dialog>

      {/* Detail Dialog with Candidates */}
      <Dialog isOpen={showDetailDialog} onClose={() => setShowDetailDialog(false)} title="تفاصيل خطة الخلافة" maxWidth="750px">
        {selectedPlan && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>المسمى:</strong> {selectedPlan.position_title}</div>
            <div><strong>الشاغل:</strong> {selectedPlan.incumbent?.full_name || "-"}</div>
            <div><strong>الجاهزية:</strong> <span className={`badge ${readinessBadges[selectedPlan.readiness_level]}`}>{readinessLabels[selectedPlan.readiness_level]}</span></div>
            <div><strong>الحالة:</strong> <span className={`badge ${statusBadges[selectedPlan.status]}`}>{statusLabels[selectedPlan.status]}</span></div>
          </div>
          {selectedPlan.notes && <div><strong>ملاحظات:</strong> {selectedPlan.notes}</div>}

          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h4 style={{ margin: 0 }}>المرشحون ({selectedPlan.candidates?.length || 0})</h4>
              <Button

                onClick={() => { setCandForm({ employee_id: "", readiness_level: "not_ready", performance_rating: "", potential_rating: "", development_plan: "", notes: "" }); setShowCandidateDialog(true); }}
                variant="primary"
                icon="plus"
              >
                إضافة مرشح
              </Button>
            </div>
            {selectedPlan.candidates && selectedPlan.candidates.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {selectedPlan.candidates.map(c => (
                  <div key={c.id} style={{ padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <strong>{c.employee?.full_name}</strong>
                      <span className={`badge ${readinessBadges[c.readiness_level]}`}>{readinessLabels[c.readiness_level]}</span>
                    </div>
                    <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem" }}>
                      <div><span style={{ color: "var(--text-secondary)" }}>الأداء:</span> {renderRatingStars(c.performance_rating)}</div>
                      <div><span style={{ color: "var(--text-secondary)" }}>الإمكانيات:</span> {renderRatingStars(c.potential_rating)}</div>
                    </div>
                    {c.development_plan && <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}><span style={{ color: "var(--text-secondary)" }}>خطة التطوير:</span> {c.development_plan}</div>}
                  </div>
                ))}
              </div>
            ) : <p style={{ color: "var(--text-secondary)" }}>لا يوجد مرشحين حتى الآن</p>}
          </div>
        </div>}
      </Dialog>

      {/* Add Candidate Dialog */}
      <Dialog isOpen={showCandidateDialog} onClose={() => setShowCandidateDialog(false)} title="إضافة مرشح للخلافة" maxWidth="550px">
        <div className="space-y-4">
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>الموظف *</Label>
            <Select
              value={candForm.employee_id}
              onChange={(e) => setCandForm({ ...candForm, employee_id: e.target.value })}
              placeholder="اختر"
              options={employees.map((e: any) => ({ value: e.id.toString(), label: e.full_name }))}
            /></div>
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>مستوى الجاهزية</Label>
            <Select
              value={candForm.readiness_level}
              onChange={(e) => setCandForm({ ...candForm, readiness_level: e.target.value })}
              options={Object.entries(readinessLabels).map(([value, label]) => ({ value, label }))}
            /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>تقييم الأداء (1-5)</Label><TextInput type="number" min="1" max="5" value={candForm.performance_rating} onChange={(e) => setCandForm({ ...candForm, performance_rating: e.target.value })} /></div>
            <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>تقييم الإمكانيات (1-5)</Label><TextInput type="number" min="1" max="5" value={candForm.potential_rating} onChange={(e) => setCandForm({ ...candForm, potential_rating: e.target.value })} /></div>
          </div>
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>خطة التطوير</Label><Textarea value={candForm.development_plan} onChange={(e) => setCandForm({ ...candForm, development_plan: e.target.value })} rows={3} /></div>
          <div><Label className="block mb-1" style={{ color: "var(--text-secondary)" }}>ملاحظات</Label><Textarea value={candForm.notes} onChange={(e) => setCandForm({ ...candForm, notes: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowCandidateDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleAddCandidate} icon="save">إضافة</Button></div>
        </div>
      </Dialog>
    </div>
  );
}
