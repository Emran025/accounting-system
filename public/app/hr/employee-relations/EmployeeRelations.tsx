"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, showToast, SearchableSelect, Label } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Employee, EmployeeRelationsCase, DisciplinaryAction } from "../types";


const caseTypeLabels: Record<string, string> = {
  grievance: "تظلم",
  complaint: "شكوى",
  misconduct: "سوء سلوك",
  performance: "أداء",
  harassment: "تحرش",
  other: "أخرى",
};

const confidentialityLabels: Record<string, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
  restricted: "سري للغاية",
};

const statusLabels: Record<string, string> = {
  open: "مفتوح",
  in_review: "قيد المراجعة",
  under_investigation: "قيد التحقيق",
  resolved: "محلول",
  closed: "مغلق",
};

const statusBadges: Record<string, string> = {
  open: "badge-warning",
  in_review: "badge-info",
  under_investigation: "badge-info",
  resolved: "badge-success",
  closed: "badge-secondary",
};

export function EmployeeRelations() {
  const [cases, setCases] = useState<EmployeeRelationsCase[]>([]);
  const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();
  const { canAccess } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [totalRecords, setTotalRecords] = useState(0);

  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDisciplinaryDialog, setShowDisciplinaryDialog] = useState(false);

  const [editingCase, setEditingCase] = useState<EmployeeRelationsCase | null>(null);
  const [selectedCase, setSelectedCase] = useState<EmployeeRelationsCase | null>(null);

  const [caseForm, setCaseForm] = useState({
    employee_id: "",
    case_type: "complaint",
    confidentiality_level: "medium",
    description: "",
    status: "open",
    reported_date: new Date().toISOString().split("T")[0],
    resolution: "",
  });

  const [disciplinaryForm, setDisciplinaryForm] = useState({
    action_type: "warning",
    violation_description: "",
    action_taken: "",
    action_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
  });

  useEffect(() => {
    loadAllEmployees();
  }, [loadAllEmployees]);

  useEffect(() => {
    loadCases();
  }, [currentPage, statusFilter]);

  const loadCases = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        status: statusFilter,
      });
      const res: any = await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEE_RELATIONS.BASE}?${query}`);
      const data = res.data || (Array.isArray(res) ? res : []);
      setCases(data);
      setTotalPages(Number(res.last_page) || 1);
      setTotalRecords(Number(res.total) || data.length);
    } catch (e) {
      console.error(e);
      showToast("فشل تحميل قضايا علاقات الموظفين", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const openNewCaseDialog = () => {
    setEditingCase(null);
    setCaseForm({
      employee_id: "",
      case_type: "complaint",
      confidentiality_level: "medium",
      description: "",
      status: "open",
      reported_date: new Date().toISOString().split("T")[0],
      resolution: "",
    });
    setShowCaseDialog(true);
  };

  const handleSaveCase = async () => {
    if (!caseForm.employee_id || !caseForm.description) {
      showToast("يرجى اختيار الموظف وكتابة وصف القضية", "error");
      return;
    }

    const payload = {
      employee_id: Number(caseForm.employee_id),
      case_type: caseForm.case_type,
      confidentiality_level: caseForm.confidentiality_level,
      description: caseForm.description,
      status: caseForm.status,
      reported_date: caseForm.reported_date,
      resolution: caseForm.resolution || undefined,
    };

    try {
      if (editingCase) {
        await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEE_RELATIONS.withId(editingCase.id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showToast("تم تحديث القضية بنجاح", "success");
      } else {
        await fetchAPI(API_ENDPOINTS.HR.EMPLOYEE_RELATIONS.BASE, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast("تم إنشاء القضية بنجاح", "success");
      }
      setShowCaseDialog(false);
      loadCases();
    } catch (e: any) {
      showToast(e.message || "حدث خطأ أثناء حفظ القضية", "error");
    }
  };

  const openEditCase = (item: EmployeeRelationsCase) => {
    setEditingCase(item);
    setCaseForm({
      employee_id: item.employee_id.toString(),
      case_type: item.case_type,
      confidentiality_level: item.confidentiality_level,
      description: item.description,
      status: item.status,
      reported_date: item.reported_date,
      resolution: item.resolution || "",
    });
    setShowCaseDialog(true);
  };

  const openCaseDetails = (item: EmployeeRelationsCase) => {
    setSelectedCase(item);
    setShowDetailsDialog(true);
  };

  const openDisciplinaryDialog = (item: EmployeeRelationsCase) => {
    setSelectedCase(item);
    setDisciplinaryForm({
      action_type: "warning",
      violation_description: "",
      action_taken: "",
      action_date: new Date().toISOString().split("T")[0],
      expiry_date: "",
    });
    setShowDisciplinaryDialog(true);
  };

  const handleSaveDisciplinary = async () => {
    if (!selectedCase) return;
    if (!disciplinaryForm.violation_description || !disciplinaryForm.action_taken) {
      showToast("يرجى إدخال تفاصيل المخالفة والإجراء المتخذ", "error");
      return;
    }

    try {
      await fetchAPI(API_ENDPOINTS.HR.EMPLOYEE_RELATIONS.DISCIPLINARY(selectedCase.id), {
        method: "POST",
        body: JSON.stringify({
          action_type: disciplinaryForm.action_type,
          violation_description: disciplinaryForm.violation_description,
          action_taken: disciplinaryForm.action_taken,
          action_date: disciplinaryForm.action_date,
          expiry_date: disciplinaryForm.expiry_date || undefined,
        }),
      });
      showToast("تم تسجيل الإجراء التأديبي بنجاح", "success");
      setShowDisciplinaryDialog(false);
      loadCases();
    } catch (e: any) {
      showToast(e.message || "فشل حفظ الإجراء التأديبي", "error");
    }
  };

  const columns: Column<EmployeeRelationsCase>[] = [
    {
      key: "case_number",
      header: "رقم القضية",
      dataLabel: "رقم القضية",
    },
    {
      key: "employee",
      header: "الموظف",
      dataLabel: "الموظف",
      render: (item) => item.employee?.full_name || "-",
    },
    {
      key: "case_type",
      header: "نوع القضية",
      dataLabel: "نوع القضية",
      render: (item) => caseTypeLabels[item.case_type] || item.case_type,
    },
    {
      key: "confidentiality_level",
      header: "سرية",
      dataLabel: "سرية",
      render: (item) => confidentialityLabels[item.confidentiality_level] || item.confidentiality_level,
    },
    {
      key: "status",
      header: "الحالة",
      dataLabel: "الحالة",
      render: (item) => (
        <span className={`badge ${statusBadges[item.status] || "badge-secondary"}`}>
          {statusLabels[item.status] || item.status}
        </span>
      ),
    },
    {
      key: "reported_date",
      header: "تاريخ البلاغ",
      dataLabel: "تاريخ البلاغ",
      render: (item) => formatDate(item.reported_date),
    },
    {
      key: "disciplinary_actions",
      header: "إجراءات تأديبية",
      dataLabel: "إجراءات تأديبية",
      render: (item) => item.disciplinary_actions?.length || 0,
    },
    {
      key: "id",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "عرض التفاصيل",
              variant: "view",
              onClick: () => openCaseDetails(item)
            },
            ...(canAccess("relations", "edit") ? [{
              icon: "edit" as const,
              title: "تعديل القضية",
              variant: "edit" as const,
              onClick: () => openEditCase(item)
            }] : []),
            ...(canAccess("relations", "edit") ? [{
              icon: "gavel" as const,
              title: "إضافة إجراء تأديبي",
              variant: "secondary" as const,
              onClick: () => openDisciplinaryDialog(item)
            }] : [])
          ]}
        />
      ),
    },
  ];

  const stats = {
    total: totalRecords,
    open: statusFilter === "open" ? totalRecords : (statusFilter === "" ? cases.filter((c) => c.status === "open").length : "-"),
    inProgress: statusFilter === "" ? cases.filter((c) => c.status === "in_review" || c.status === "under_investigation").length : "-",
    closed: statusFilter === "" ? cases.filter((c) => c.status === "resolved" || c.status === "closed").length : "-",
  };

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="علاقات الموظفين والقضايا"
        titleIcon="scale"
        actions={
          <>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="form-select"
              style={{ minWidth: "160px", padding: '0.4rem 2rem 0.4rem 1rem' }}
              placeholder="جميع الحالات"
              options={[
                { value: 'open', label: 'مفتوح' },
                { value: 'in_review', label: 'قيد المراجعة' },
                { value: 'under_investigation', label: 'قيد التحقيق' },
                { value: 'resolved', label: 'محلول' },
                { value: 'closed', label: 'مغلق' }
              ]}
            />
            {canAccess("relations", "create") && (
              <Button onClick={openNewCaseDialog}
                variant="primary"
                icon="plus"
              >
                فتح قضية جديدة
              </Button>
            )}
          </>
        }
      />

      <div
        className="sales-card compact"
        style={{
          marginBottom: "1.5rem",
          background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
          border: "1px solid #fde68a",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          <div className="stat-card">
            <div className="stat-label">إجمالي القضايا</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">مفتوحة</div>
            <div className="stat-value text-warning">{stats.open}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">قيد المعالجة</div>
            <div className="stat-value text-info">{stats.inProgress}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">مغلقة / محلولة</div>
            <div className="stat-value text-success">{stats.closed}</div>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={cases}
        keyExtractor={(item) => item.id.toString()}
        emptyMessage="لا توجد قضايا مسجلة"
        isLoading={isLoading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Create / Edit Case Dialog */}
      <Dialog
        isOpen={showCaseDialog}
        onClose={() => setShowCaseDialog(false)}
        title={editingCase ? "تعديل القضية" : "فتح قضية جديدة"}
        maxWidth="700px"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <Label className="text-secondary mb-1">الموظف *</Label>
                <SearchableSelect
                  options={employees.map((emp: Employee) => ({ value: emp.id.toString(), label: emp.full_name }))}
                  value={caseForm.employee_id}
                  onChange={(val) => setCaseForm(prev => ({ ...prev, employee_id: val?.toString() || "" }))}
                  placeholder="اختر الموظف"
                />
              </div>
              <Select
                label="نوع القضية"
                value={caseForm.case_type}
                onChange={(e) => setCaseForm({ ...caseForm, case_type: e.target.value })}
                options={[
                  { value: 'complaint', label: 'شكوى' },
                  { value: 'grievance', label: 'تظلم' },
                  { value: 'misconduct', label: 'سوء سلوك' },
                  { value: 'performance', label: 'أداء' },
                  { value: 'harassment', label: 'تحرش' },
                  { value: 'other', label: 'أخرى' }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="مستوى السرية"
              value={caseForm.confidentiality_level}
              onChange={(e) => setCaseForm({ ...caseForm, confidentiality_level: e.target.value })}
              options={[
                { value: 'low', label: 'منخفض' },
                { value: 'medium', label: 'متوسط' },
                { value: 'high', label: 'مرتفع' },
                { value: 'restricted', label: 'سري للغاية' }
              ]}
            />
            <Select
              label="الحالة"
              value={caseForm.status}
              onChange={(e) => setCaseForm({ ...caseForm, status: e.target.value })}
              options={[
                { value: 'open', label: 'مفتوح' },
                { value: 'in_review', label: 'قيد المراجعة' },
                { value: 'under_investigation', label: 'قيد التحقيق' },
                { value: 'resolved', label: 'محلول' },
                { value: 'closed', label: 'مغلق' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="تاريخ البلاغ"
              type="date"
              value={caseForm.reported_date}
              onChange={(e) => setCaseForm({ ...caseForm, reported_date: e.target.value })}
            />
          </div>

          <Textarea
            label="وصف القضية *"
            value={caseForm.description}
            onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}
            rows={4}
          />

          <Textarea
            label="ملخص الحل (اختياري)"
            value={caseForm.resolution}
            onChange={(e) => setCaseForm({ ...caseForm, resolution: e.target.value })}
            rows={3}
          />

          <div
            className="flex justify-end gap-2"
            style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}
          >
            <Button variant="secondary" onClick={() => setShowCaseDialog(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleSaveCase} icon="save">
              حفظ
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Case Details Dialog */}
      <Dialog
        isOpen={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        title="تفاصيل القضية"
        maxWidth="800px"
      >
        {selectedCase && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>رقم القضية:</strong> {selectedCase.case_number}
              </div>
              <div>
                <strong>الموظف:</strong> {selectedCase.employee?.full_name || "-"}
              </div>
              <div>
                <strong>نوع القضية:</strong> {caseTypeLabels[selectedCase.case_type] || selectedCase.case_type}
              </div>
              <div>
                <strong>السرية:</strong>{" "}
                {confidentialityLabels[selectedCase.confidentiality_level] || selectedCase.confidentiality_level}
              </div>
              <div>
                <strong>الحالة:</strong>{" "}
                <span className={`badge ${statusBadges[selectedCase.status] || "badge-secondary"}`}>
                  {statusLabels[selectedCase.status] || selectedCase.status}
                </span>
              </div>
              <div>
                <strong>تاريخ البلاغ:</strong> {formatDate(selectedCase.reported_date)}
              </div>
              {selectedCase.resolved_date && (
                <div>
                  <strong>تاريخ الإغلاق:</strong> {formatDate(selectedCase.resolved_date)}
                </div>
              )}
            </div>

            <div>
              <strong>وصف القضية:</strong>
              <p style={{ marginTop: "0.5rem" }}>{selectedCase.description}</p>
            </div>

            {selectedCase.resolution && (
              <div>
                <strong>ملخص الحل:</strong>
                <p style={{ marginTop: "0.5rem" }}>{selectedCase.resolution}</p>
              </div>
            )}

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong>الإجراءات التأديبية</strong>
                {canAccess("relations", "edit") && (
                  <Button size="sm" onClick={() => openDisciplinaryDialog(selectedCase)} variant="secondary" icon="gavel">
                    إضافة إجراء
                  </Button>
                )}
              </div>
              {selectedCase.disciplinary_actions && selectedCase.disciplinary_actions.length > 0 ? (
                <ul className="list-disc pr-5 space-y-1">
                  {selectedCase.disciplinary_actions.map((action) => (
                    <li key={action.id}>
                      <strong>{action.action_type} - {formatDate(action.action_date)}</strong>:{" "}
                      {action.action_taken}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>لا توجد إجراءات تأديبية مسجلة لهذه القضية.</p>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Disciplinary Action Dialog */}
      <Dialog
        isOpen={showDisciplinaryDialog}
        onClose={() => setShowDisciplinaryDialog(false)}
        title="إضافة إجراء تأديبي"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="نوع الإجراء"
                value={disciplinaryForm.action_type}
                onChange={(e) => setDisciplinaryForm({ ...disciplinaryForm, action_type: e.target.value })}
                options={[
                  { value: 'warning', label: 'إنذار' },
                  { value: 'suspension', label: 'إيقاف' },
                  { value: 'deduction', label: 'خصم' },
                  { value: 'termination', label: 'إنهاء خدمة' }
                ]}
              />
              <TextInput
                label="تاريخ الإجراء"
                type="date"
                value={disciplinaryForm.action_date}
                onChange={(e) => setDisciplinaryForm({ ...disciplinaryForm, action_date: e.target.value })}
              />
            </div>
          </div>

          <Textarea
            label="وصف المخالفة"
            value={disciplinaryForm.violation_description}
            onChange={(e) => setDisciplinaryForm({ ...disciplinaryForm, violation_description: e.target.value })}
            rows={3}
          />

          <Textarea
            label="الإجراء المتخذ"
            value={disciplinaryForm.action_taken}
            onChange={(e) => setDisciplinaryForm({ ...disciplinaryForm, action_taken: e.target.value })}
            rows={3}
          />

          <TextInput
            label="تاريخ انتهاء صلاحية الإجراء (اختياري)"
            type="date"
            value={disciplinaryForm.expiry_date}
            onChange={(e) => setDisciplinaryForm({ ...disciplinaryForm, expiry_date: e.target.value })}
          />

          <div
            className="flex justify-end gap-2"
            style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}
          >
            <Button variant="secondary" onClick={() => setShowDisciplinaryDialog(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleSaveDisciplinary} icon="save">
              حفظ
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}


