"use client";

import { useState, useEffect } from "react";
import { Table, Column, Dialog, showToast, Button, SearchableSelect } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { AttendanceRecord, Employee } from "../types";
import { formatDate, formatTime } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";

export function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [newRecord, setNewRecord] = useState({
    employee_id: "",
    attendance_date: new Date().toISOString().split('T')[0],
    check_in: "",
    check_out: "",
    status: "present" as const,
    notes: ""
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadAttendance();
    }
  }, [selectedEmployee, startDate, endDate, currentPage]);

  const loadEmployees = async () => {
    try {
      const res: any = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.BASE);
      const data = res.data || (Array.isArray(res) ? res : []);
      setEmployees(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAttendance = async () => {
    if (!selectedEmployee) return;

    setIsLoading(true);
    try {
      const res: any = await fetchAPI(
        `${API_ENDPOINTS.HR.ATTENDANCE.BASE}?employee_id=${selectedEmployee}&start_date=${startDate}&end_date=${endDate}&page=${currentPage}`
      );
      const data = res.data || (Array.isArray(res) ? res : []);
      setAttendanceRecords(data);
      setTotalPages(res.last_page || 1);

      const summaryRes: any = await fetchAPI(
        `${API_ENDPOINTS.HR.ATTENDANCE.SUMMARY}?employee_id=${selectedEmployee}&start_date=${startDate}&end_date=${endDate}`
      );
      setSummary(summaryRes);
    } catch (e) {
      showToast("فشل تحميل سجلات الحضور", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordAttendance = async () => {
    if (!newRecord.employee_id) {
      showToast("يرجى اختيار الموظف", "error");
      return;
    }

    try {
      await fetchAPI(API_ENDPOINTS.HR.ATTENDANCE.BASE, {
        method: 'POST',
        body: JSON.stringify(newRecord)
      });
      showToast("تم تسجيل الحضور بنجاح", "success");
      setShowRecordDialog(false);
      setNewRecord({
        employee_id: "",
        attendance_date: new Date().toISOString().split('T')[0],
        check_in: "",
        check_out: "",
        status: "present",
        notes: ""
      });
      if (selectedEmployee) loadAttendance();
    } catch (e: any) {
      showToast(e.message || "فشل تسجيل الحضور", "error");
    }
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      key: "attendance_date",
      header: "التاريخ",
      dataLabel: "التاريخ",
      render: (record) => formatDate(record.attendance_date)
    },
    {
      key: "check_in",
      header: "وقت الدخول",
      dataLabel: "وقت الدخول",
      render: (record) => record.check_in ? formatTime(record.check_in) : "-"
    },
    {
      key: "check_out",
      header: "وقت الخروج",
      dataLabel: "وقت الخروج",
      render: (record) => record.check_out ? formatTime(record.check_out) : "-"
    },
    {
      key: "status",
      header: "الحالة",
      dataLabel: "الحالة",
      render: (record) => {
        const statusMap: Record<string, { text: string; class: string }> = {
          present: { text: "حاضر", class: "badge badge-success" },
          absent: { text: "غائب", class: "badge badge-danger" },
          leave: { text: "إجازة", class: "badge badge-info" },
          holiday: { text: "عطلة", class: "badge badge-secondary" },
          weekend: { text: "نهاية أسبوع", class: "badge badge-secondary" }
        };
        const status = statusMap[record.status] || { text: record.status, class: "badge" };
        return <span className={status.class}>{status.text}</span>;
      }
    },
    {
      key: "hours_worked",
      header: "ساعات العمل",
      dataLabel: "ساعات العمل",
      render: (record) => `${record.hours_worked.toFixed(2)} ساعة`
    },
    {
      key: "overtime_hours",
      header: "ساعات إضافية",
      dataLabel: "ساعات إضافية",
      render: (record) => record.overtime_hours > 0 ? (
        <span className="badge badge-warning">{record.overtime_hours.toFixed(2)} ساعة</span>
      ) : "-"
    },
    {
      key: "is_late",
      header: "تأخير",
      dataLabel: "تأخير",
      render: (record) => record.is_late ? (
        <span className="badge badge-warning">نعم ({record.late_minutes} دقيقة)</span>
      ) : (
        <span className="badge badge-success">لا</span>
      )
    }
  ];

  return (
    <div className="sales-card animate-fade">
      <div className="card-header-flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>{getIcon("clock")} سجلات الحضور والانصراف</h3>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowRecordDialog(true)}
          icon="plus">
          تسجيل حضور جديد
        </Button>
      </div>

      <div className="sales-card compact" style={{ marginBottom: '1.5rem' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>الموظف</label>
            <SearchableSelect
              options={employees.map(emp => ({ value: emp.id.toString(), label: emp.full_name }))}
              value={selectedEmployee?.toString() || ""}
              onChange={(value) => setSelectedEmployee(value ? Number(value) : null)}
              placeholder="اختر الموظف"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>من تاريخ</label>
            <TextInput
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>إلى تاريخ</label>
            <TextInput
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={loadAttendance}
              disabled={!selectedEmployee}
              variant="primary"
              icon="search"
              style={{ width: '100%' }}>
              بحث
            </Button>
          </div>
        </div>
      </div>

      {summary && (
        <div className="sales-card compact" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stat-item">
              <span className="stat-label">إجمالي الساعات</span>
              <span className="stat-value">{summary.total_hours?.toFixed(2) || 0} ساعة</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">ساعات إضافية</span>
              <span className="stat-value highlight">{summary.total_overtime?.toFixed(2) || 0} ساعة</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">أيام الحضور</span>
              <span className="stat-value">{summary.total_days_present || 0} يوم</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">أيام الغياب</span>
              <span className="stat-value">{summary.total_days_absent || 0} يوم</span>
            </div>
          </div>
        </div>
      )}

      <div className="sales-card">
        <Table
          data={attendanceRecords}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="لا توجد سجلات حضور"
          keyExtractor={(item) => item.id.toString()}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage
          }}
        />
      </div>

      <Dialog
        isOpen={showRecordDialog}
        onClose={() => setShowRecordDialog(false)}
        title="تسجيل حضور جديد"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>الموظف *</label>
            <SearchableSelect
              options={employees.map(emp => ({ value: emp.id.toString(), label: emp.full_name }))}
              value={newRecord.employee_id}
              onChange={(value) => setNewRecord({ ...newRecord, employee_id: value ? String(value) : "" })}
              placeholder="اختر الموظف"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>التاريخ *</label>
            <TextInput
              type="date"
              value={newRecord.attendance_date}
              onChange={(e) => setNewRecord({ ...newRecord, attendance_date: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>وقت الدخول</label>
              <TextInput
                type="time"
                value={newRecord.check_in}
                onChange={(e) => setNewRecord({ ...newRecord, check_in: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>وقت الخروج</label>
              <TextInput
                type="time"
                value={newRecord.check_out}
                onChange={(e) => setNewRecord({ ...newRecord, check_out: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>الحالة</label>
            <Select
              value={newRecord.status}
              onChange={(e) => setNewRecord({ ...newRecord, status: e.target.value as any })}
            >
              <option value="present">حاضر</option>
              <option value="absent">غائب</option>
              <option value="leave">إجازة</option>
              <option value="holiday">عطلة</option>
              <option value="weekend">نهاية أسبوع</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>ملاحظات</label>
            <Textarea
              value={newRecord.notes}
              onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <Button variant="secondary" onClick={() => setShowRecordDialog(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleRecordAttendance} icon="save">
              حفظ
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
