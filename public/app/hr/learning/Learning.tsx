"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, TabNavigation, showToast, Label } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import type { Course, Enrollment } from "../types";



const deliveryLabels: Record<string, string> = { in_person: "حضوري", virtual: "افتراضي", elearning: "تعلم إلكتروني", blended: "مختلط" };
const typeLabels: Record<string, string> = { mandatory: "إلزامي", optional: "اختياري", compliance: "امتثال", development: "تطوير" };
const statusLabels: Record<string, string> = { enrolled: "مسجل", in_progress: "قيد التنفيذ", completed: "مكتمل", failed: "فشل", dropped: "انسحب" };
const statusBadges: Record<string, string> = { enrolled: "badge-info", in_progress: "badge-warning", completed: "badge-success", failed: "badge-danger", dropped: "badge-secondary" };
const enrollTypeLabels: Record<string, string> = { assigned: "معين", self_enrolled: "ذاتي", mandatory: "إلزامي" };

export function Learning() {
  const [activeTab, setActiveTab] = useState("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Dialogs
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [showCourseDetail, setShowCourseDetail] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showEnrollDetail, setShowEnrollDetail] = useState(false);
  const [selectedEnroll, setSelectedEnroll] = useState<Enrollment | null>(null);
  // Forms
  const [courseForm, setCourseForm] = useState({ course_code: "", course_name: "", description: "", delivery_method: "in_person", course_type: "optional", duration_hours: "", requires_assessment: false, passing_score: "", video_url: "", is_recurring: false, recurrence_months: "", notes: "" });
  const [enrollForm, setEnrollForm] = useState({ course_id: "", employee_id: "", enrollment_type: "assigned", due_date: "", notes: "" });

  useEffect(() => { loadEmployees(); }, []);
  useEffect(() => { setCurrentPage(1); }, [activeTab]);
  useEffect(() => { activeTab === "courses" ? loadCourses() : loadEnrollments(); }, [activeTab, currentPage]);

  const loadEmployees = async () => { try { const r: any = await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEES.BASE}?per_page=500`); setEmployees(r.data || []); } catch { } };

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI(`${API_ENDPOINTS.HR.LEARNING.COURSES.BASE}?page=${currentPage}`);
      setCourses(res.data || []); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast("فشل تحميل الدورات", "error"); }
    finally { setIsLoading(false); }
  };

  const loadEnrollments = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI(`${API_ENDPOINTS.HR.LEARNING.ENROLLMENTS.BASE}?page=${currentPage}`);
      setEnrollments(res.data || []); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast("فشل تحميل التسجيلات", "error"); }
    finally { setIsLoading(false); }
  };

  const handleSaveCourse = async () => {
    if (!courseForm.course_code || !courseForm.course_name) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HR.LEARNING.COURSES.BASE, {
        method: "POST", body: JSON.stringify({
          course_code: courseForm.course_code, course_name: courseForm.course_name,
          description: courseForm.description || undefined, delivery_method: courseForm.delivery_method,
          course_type: courseForm.course_type, duration_hours: courseForm.duration_hours ? Number(courseForm.duration_hours) : undefined,
          requires_assessment: courseForm.requires_assessment, passing_score: courseForm.passing_score ? Number(courseForm.passing_score) : undefined,
          video_url: courseForm.video_url || undefined, is_recurring: courseForm.is_recurring,
          recurrence_months: courseForm.recurrence_months ? Number(courseForm.recurrence_months) : undefined,
        })
      });
      showToast("تم إنشاء الدورة", "success"); setShowCourseDialog(false); loadCourses();
    } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
  };

  const handlePublishCourse = async (id: number, publish: boolean) => {
    try {
      await fetchAPI(API_ENDPOINTS.HR.LEARNING.COURSES.withId(id), { method: "PUT", body: JSON.stringify({ is_published: publish }) });
      showToast(publish ? "تم نشر الدورة" : "تم إلغاء نشر الدورة", "success"); loadCourses();
    } catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
  };

  const viewCourseDetail = async (id: number) => {
    try {
      const res: any = await fetchAPI(API_ENDPOINTS.HR.LEARNING.COURSES.withId(id));
      setSelectedCourse(res.data || res); setShowCourseDetail(true);
    } catch { showToast("فشل تحميل التفاصيل", "error"); }
  };

  const handleSaveEnrollment = async () => {
    if (!enrollForm.course_id || !enrollForm.employee_id) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HR.LEARNING.ENROLLMENTS.BASE, {
        method: "POST", body: JSON.stringify({
          course_id: Number(enrollForm.course_id), employee_id: Number(enrollForm.employee_id),
          enrollment_type: enrollForm.enrollment_type, due_date: enrollForm.due_date || undefined,
          notes: enrollForm.notes || undefined,
        })
      });
      showToast("تم تسجيل الموظف", "success"); setShowEnrollDialog(false); loadEnrollments();
    } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
  };

  const handleUpdateEnrollment = async (id: number, data: any) => {
    try {
      await fetchAPI(API_ENDPOINTS.HR.LEARNING.ENROLLMENTS.withId(id), { method: "PUT", body: JSON.stringify(data) });
      showToast("تم تحديث التسجيل", "success"); loadEnrollments();
    } catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
  };

  const courseColumns: Column<Course>[] = [
    { key: "course_code", header: "الرمز", dataLabel: "الرمز" },
    { key: "course_name", header: "اسم الدورة", dataLabel: "الاسم" },
    { key: "delivery_method", header: "طريقة التسليم", dataLabel: "الطريقة", render: (i) => deliveryLabels[i.delivery_method] || i.delivery_method },
    { key: "course_type", header: "النوع", dataLabel: "النوع", render: (i) => <span className={`badge ${i.course_type === "mandatory" ? "badge-warning" : "badge-info"}`}>{typeLabels[i.course_type] || i.course_type}</span> },
    { key: "duration_hours", header: "المدة", dataLabel: "المدة", render: (i) => `${i.duration_hours || 0} ساعة` },
    { key: "enrollments", header: "المسجلين", dataLabel: "المسجلين", render: (i) => i.enrollments?.length || 0 },
    { key: "is_published", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${i.is_published ? "badge-success" : "badge-secondary"}`}>{i.is_published ? "منشور" : "مسودة"}</span> },
    {
      key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "تفاصيل",
              variant: "view",
              onClick: () => viewCourseDetail(i.id)
            },
            {
              icon: i.is_published ? "eye-off" : "send",
              title: i.is_published ? "إلغاء النشر" : "نشر",
              variant: i.is_published ? "delete" : "success",
              onClick: () => handlePublishCourse(i.id, !i.is_published)
            },
            {
              icon: "user-plus",
              title: "تسجيل موظف",
              variant: "view",
              onClick: () => { setEnrollForm({ course_id: String(i.id), employee_id: "", enrollment_type: "assigned", due_date: "", notes: "" }); setShowEnrollDialog(true); }
            }
          ]}
        />
      )
    },
  ];

  const enrollmentColumns: Column<Enrollment>[] = [
    { key: "course", header: "الدورة", dataLabel: "الدورة", render: (i) => <div><div>{i.course?.course_name || "-"}</div><small className="text-muted">{i.course?.course_code}</small></div> },
    { key: "employee", header: "الموظف", dataLabel: "الموظف", render: (i) => i.employee?.full_name || "-" },
    { key: "enrollment_type", header: "النوع", dataLabel: "النوع", render: (i) => enrollTypeLabels[i.enrollment_type] || i.enrollment_type },
    { key: "progress", header: "التقدم", dataLabel: "التقدم", render: (i) => <div className="progress" style={{ height: "20px" }}><div className="progress-bar" role="progressbar" style={{ width: `${i.progress_percentage}%` }}>{i.progress_percentage}%</div></div> },
    { key: "status", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${statusBadges[i.status]}`}>{statusLabels[i.status] || i.status}</span> },
    { key: "enrollment_date", header: "تاريخ التسجيل", dataLabel: "التاريخ", render: (i) => formatDate(i.enrollment_date) },
    {
      key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "تفاصيل",
              variant: "view",
              onClick: () => { setSelectedEnroll(i); setShowEnrollDetail(true); }
            },
            {
              icon: "play",
              title: "بدء",
              variant: "view",
              onClick: () => handleUpdateEnrollment(i.id, { status: "in_progress", progress_percentage: 10 }),
              hidden: i.status !== "enrolled"
            },
            {
              icon: "check",
              title: "إكمال",
              variant: "success",
              onClick: () => handleUpdateEnrollment(i.id, { status: "completed" }),
              hidden: i.status !== "in_progress"
            }
          ]}
        />
      )
    },
  ];

  const tabs = [{ key: "courses", label: "الدورات", icon: "book" }, { key: "enrollments", label: "التسجيلات", icon: "user-check" }]

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="التدريب والتعلم"
        titleIcon="graduation-cap"
        actions={
          <div style={{ display: "flex", gap: "1rem" }}>
            {activeTab === "courses" &&
              <Button
                onClick={() => { setCourseForm({ course_code: "", course_name: "", description: "", delivery_method: "in_person", course_type: "optional", duration_hours: "", requires_assessment: false, passing_score: "", video_url: "", is_recurring: false, recurrence_months: "", notes: "" }); setShowCourseDialog(true); }}
                variant="primary"
                icon="plus"
              >
                إضافة دورة جديدة
              </Button>}
            {activeTab === "enrollments" &&
              <Button
                onClick={() => { setEnrollForm({ course_id: "", employee_id: "", enrollment_type: "assigned", due_date: "", notes: "" }); setShowEnrollDialog(true); }}
                variant="primary"
                icon="plus"
              >
                تسجيل جديد</Button>}
          </div>
        }
      />

      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "courses" ? (
        <Table columns={courseColumns} data={courses} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد دورات" isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />
      ) : (
        <Table columns={enrollmentColumns} data={enrollments} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد تسجيلات" isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />
      )}

      {/* Create Course Dialog */}
      <Dialog isOpen={showCourseDialog} onClose={() => setShowCourseDialog(false)} title="إضافة دورة جديدة" maxWidth="700px">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="رمز الدورة *" value={courseForm.course_code} onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })} placeholder="CRS-001" />
            <TextInput label="اسم الدورة *" value={courseForm.course_name} onChange={(e) => setCourseForm({ ...courseForm, course_name: e.target.value })} />
          </div>
          <Textarea label="الوصف" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} rows={3} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="طريقة التسليم"
              value={courseForm.delivery_method}
              onChange={(e) => setCourseForm({ ...courseForm, delivery_method: e.target.value })}
              options={Object.entries(deliveryLabels).map(([value, label]) => ({ value, label }))}
            />
            <Select
              label="النوع"
              value={courseForm.course_type}
              onChange={(e) => setCourseForm({ ...courseForm, course_type: e.target.value })}
              options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
            />
            <TextInput label="المدة (ساعة)" type="number" value={courseForm.duration_hours} onChange={(e) => setCourseForm({ ...courseForm, duration_hours: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={courseForm.requires_assessment} onChange={(e) => setCourseForm({ ...courseForm, requires_assessment: e.target.checked })} id="requires_assessment" />
              <Label htmlFor="requires_assessment" className="text-secondary">يتطلب اختبار</Label>
            </div>
            {courseForm.requires_assessment && (
              <TextInput label="درجة النجاح" type="number" min="0" max="100" value={courseForm.passing_score} onChange={(e) => setCourseForm({ ...courseForm, passing_score: e.target.value })} />
            )}
          </div>
          <TextInput label="رابط الفيديو" value={courseForm.video_url} onChange={(e) => setCourseForm({ ...courseForm, video_url: e.target.value })} placeholder="https://..." />
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowCourseDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveCourse} icon="save">حفظ</Button></div>
        </div>
      </Dialog>

      {/* Course Detail */}
      <Dialog isOpen={showCourseDetail} onClose={() => setShowCourseDetail(false)} title="تفاصيل الدورة" maxWidth="700px">
        {selectedCourse && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>الرمز:</strong> {selectedCourse.course_code}</div>
            <div><strong>الاسم:</strong> {selectedCourse.course_name}</div>
            <div><strong>الطريقة:</strong> {deliveryLabels[selectedCourse.delivery_method]}</div>
            <div><strong>النوع:</strong> {typeLabels[selectedCourse.course_type]}</div>
            <div><strong>المدة:</strong> {selectedCourse.duration_hours} ساعة</div>
            <div><strong>الحالة:</strong> <span className={`badge ${selectedCourse.is_published ? "badge-success" : "badge-secondary"}`}>{selectedCourse.is_published ? "منشور" : "مسودة"}</span></div>
            {selectedCourse.requires_assessment && <div><strong>درجة النجاح:</strong> {selectedCourse.passing_score}%</div>}
          </div>
          {selectedCourse.description && <div><strong>الوصف:</strong><p>{selectedCourse.description}</p></div>}
          {selectedCourse.enrollments && selectedCourse.enrollments.length > 0 && <div>
            <strong>المسجلون ({selectedCourse.enrollments.length}):</strong>
            <div style={{ marginTop: "0.5rem" }}>
              {selectedCourse.enrollments.map(e => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", borderBottom: "1px solid var(--border-color)" }}>
                  <span>{e.employee?.full_name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className={`badge ${statusBadges[e.status]}`}>{statusLabels[e.status]}</span>
                    <span>{e.progress_percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>}
        </div>}
      </Dialog>

      {/* Enroll Dialog */}
      <Dialog isOpen={showEnrollDialog} onClose={() => setShowEnrollDialog(false)} title="تسجيل موظف" maxWidth="550px">
        <div className="space-y-4">
          <Select
            label="الدورة *"
            value={enrollForm.course_id}
            onChange={(e) => setEnrollForm({ ...enrollForm, course_id: e.target.value })}
            placeholder="اختر الدورة"
            options={courses.filter(c => c.is_published).map(c => ({ value: c.id, label: `${c.course_name} (${c.course_code})` }))}
          />
          <Select
            label="الموظف *"
            value={enrollForm.employee_id}
            onChange={(e) => setEnrollForm({ ...enrollForm, employee_id: e.target.value })}
            placeholder="اختر الموظف"
            options={employees.map((e: any) => ({ value: e.id, label: e.full_name }))}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="نوع التسجيل"
              value={enrollForm.enrollment_type}
              onChange={(e) => setEnrollForm({ ...enrollForm, enrollment_type: e.target.value })}
              options={Object.entries(enrollTypeLabels).map(([value, label]) => ({ value, label }))}
            />
            <TextInput label="آخر موعد" type="date" value={enrollForm.due_date} onChange={(e) => setEnrollForm({ ...enrollForm, due_date: e.target.value })} />
          </div>
          <Textarea label="ملاحظات" value={enrollForm.notes} onChange={(e) => setEnrollForm({ ...enrollForm, notes: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowEnrollDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveEnrollment} icon="save">تسجيل</Button></div>
        </div>
      </Dialog>

      {/* Enrollment Detail */}
      <Dialog isOpen={showEnrollDetail} onClose={() => setShowEnrollDetail(false)} title="تفاصيل التسجيل" maxWidth="550px">
        {selectedEnroll && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>الدورة:</strong> {selectedEnroll.course?.course_name}</div>
            <div><strong>الموظف:</strong> {selectedEnroll.employee?.full_name}</div>
            <div><strong>النوع:</strong> {enrollTypeLabels[selectedEnroll.enrollment_type]}</div>
            <div><strong>الحالة:</strong> <span className={`badge ${statusBadges[selectedEnroll.status]}`}>{statusLabels[selectedEnroll.status]}</span></div>
            <div><strong>التقدم:</strong> {selectedEnroll.progress_percentage}%</div>
            <div><strong>تاريخ التسجيل:</strong> {formatDate(selectedEnroll.enrollment_date)}</div>
            {selectedEnroll.due_date && <div><strong>آخر موعد:</strong> {formatDate(selectedEnroll.due_date)}</div>}
            {selectedEnroll.completion_date && <div><strong>تاريخ الإكمال:</strong> {formatDate(selectedEnroll.completion_date)}</div>}
            {selectedEnroll.score !== undefined && selectedEnroll.score !== null && <div><strong>الدرجة:</strong> {selectedEnroll.score}%</div>}
            {selectedEnroll.is_passed !== undefined && selectedEnroll.is_passed !== null && <div><strong>النتيجة:</strong> <span className={`badge ${selectedEnroll.is_passed ? "badge-success" : "badge-danger"}`}>{selectedEnroll.is_passed ? "ناجح" : "راسب"}</span></div>}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {selectedEnroll.status === "enrolled" && <Button variant="primary" onClick={() => { handleUpdateEnrollment(selectedEnroll.id, { status: "in_progress", progress_percentage: 10 }); setShowEnrollDetail(false); }}>بدء الدورة</Button>}
            {selectedEnroll.status === "in_progress" && <Button variant="primary" onClick={() => { handleUpdateEnrollment(selectedEnroll.id, { status: "completed" }); setShowEnrollDetail(false); }}>إكمال</Button>}
          </div>
        </div>}
      </Dialog>
    </div>
  );
}
