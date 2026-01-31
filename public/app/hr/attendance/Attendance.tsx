"use client";

import { useState, useEffect } from "react";
import { Table, Column, Dialog, showToast, Button } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
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
  }, [selectedEmployee, startDate, endDate]);

  const loadEmployees = async () => {
    try {
      const res: any = await fetchAPI('/api/employees');
      setEmployees(res.data || res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAttendance = async () => {
    if (!selectedEmployee) return;
    
    setIsLoading(true);
    try {
      const res: any = await fetchAPI(
        `/api/attendance?employee_id=${selectedEmployee}&start_date=${startDate}&end_date=${endDate}`
      );
      setAttendanceRecords(res.data || res || []);

      // Load summary
      const summaryRes: any = await fetchAPI(
        `/api/attendance/summary?employee_id=${selectedEmployee}&start_date=${startDate}&end_date=${endDate}`
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
      await fetchAPI('/api/attendance', {
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
      render: (record) => formatDate(record.attendance_date)
    },
    {
      key: "check_in",
      header: "وقت الدخول",
      render: (record) => record.check_in ? formatTime(record.check_in) : "-"
    },
    {
      key: "check_out",
      header: "وقت الخروج",
      render: (record) => record.check_out ? formatTime(record.check_out) : "-"
    },
    {
      key: "status",
      header: "الحالة",
      render: (record) => {
        const statusMap: Record<string, string> = {
          present: "حاضر",
          absent: "غائب",
          leave: "إجازة",
          holiday: "عطلة",
          weekend: "نهاية أسبوع"
        };
        return statusMap[record.status] || record.status;
      }
    },
    {
      key: "hours_worked",
      header: "ساعات العمل",
      render: (record) => `${record.hours_worked.toFixed(2)} ساعة`
    },
    {
      key: "overtime_hours",
      header: "ساعات إضافية",
      render: (record) => record.overtime_hours > 0 ? `${record.overtime_hours.toFixed(2)} ساعة` : "-"
    },
    {
      key: "is_late",
      header: "تأخير",
      render: (record) => record.is_late ? `نعم (${record.late_minutes} دقيقة)` : "لا"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">سجلات الحضور والانصراف</h2>
        <Button onClick={() => setShowRecordDialog(true)}>
          {getIcon("plus")} تسجيل حضور جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium mb-1">الموظف</label>
          <Select
            value={selectedEmployee?.toString() || ""}
            onChange={(e) => setSelectedEmployee(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">اختر الموظف</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">من تاريخ</label>
          <TextInput
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
          <TextInput
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={loadAttendance} disabled={!selectedEmployee}>
            {getIcon("search")} بحث
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
          <div>
            <div className="text-sm text-gray-600">إجمالي الساعات</div>
            <div className="text-xl font-bold">{summary.total_hours?.toFixed(2) || 0} ساعة</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">ساعات إضافية</div>
            <div className="text-xl font-bold">{summary.total_overtime?.toFixed(2) || 0} ساعة</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">أيام الحضور</div>
            <div className="text-xl font-bold">{summary.total_days_present || 0} يوم</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">أيام الغياب</div>
            <div className="text-xl font-bold">{summary.total_days_absent || 0} يوم</div>
          </div>
        </div>
      )}

      <Table
        data={attendanceRecords}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="لا توجد سجلات حضور"
        keyExtractor={(record) => record.id}
      />

      <Dialog
        isOpen={showRecordDialog}
        onClose={() => setShowRecordDialog(false)}
        title="تسجيل حضور جديد"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">الموظف *</label>
            <Select
              value={newRecord.employee_id}
              onChange={(e) => setNewRecord({ ...newRecord, employee_id: e.target.value })}
            >
              <option value="">اختر الموظف</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">التاريخ *</label>
            <TextInput
              type="date"
              value={newRecord.attendance_date}
              onChange={(e) => setNewRecord({ ...newRecord, attendance_date: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">وقت الدخول</label>
              <TextInput
                type="time"
                value={newRecord.check_in}
                onChange={(e) => setNewRecord({ ...newRecord, check_in: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">وقت الخروج</label>
              <TextInput
                type="time"
                value={newRecord.check_out}
                onChange={(e) => setNewRecord({ ...newRecord, check_out: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الحالة</label>
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
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <Textarea
              value={newRecord.notes}
              onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRecordDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleRecordAttendance}>
              حفظ
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

