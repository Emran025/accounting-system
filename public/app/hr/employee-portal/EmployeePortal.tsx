"use client";

import { useState, useEffect } from "react";
import { Table, Column, Dialog, showToast, Button } from "@/components/ui";
import { TabNavigation } from "@/components/ui/TabNavigation";
import { fetchAPI } from "@/lib/api";
import { PayrollItem, LeaveRequest, AttendanceRecord } from "../types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";

export function EmployeePortal() {
  const [activeTab, setActiveTab] = useState("payslips");
  const [payslips, setPayslips] = useState<PayrollItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<{ records: AttendanceRecord[]; summary: any } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [newLeaveRequest, setNewLeaveRequest] = useState({
    leave_type: "vacation" as const,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ""
  });

  useEffect(() => {
    loadPayslips();
  }, []);

  useEffect(() => {
    if (activeTab === 'leave') {
      loadLeaveRequests();
    } else if (activeTab === 'attendance') {
      loadAttendance();
    }
  }, [activeTab, startDate, endDate]);

  const loadPayslips = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI('/api/employee-portal/my-payslips');
      setPayslips(res.data || res || []);
    } catch (e) {
      showToast("فشل تحميل كشوف المرتبات", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeaveRequests = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI('/api/employee-portal/my-leave-requests');
      setLeaveRequests(res.data || res || []);
    } catch (e) {
      showToast("فشل تحميل طلبات الإجازة", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttendance = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI(
        `/api/employee-portal/my-attendance?start_date=${startDate}&end_date=${endDate}`
      );
      setAttendance(res);
    } catch (e) {
      showToast("فشل تحميل سجلات الحضور", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLeaveRequest = async () => {
    try {
      await fetchAPI('/api/employee-portal/my-leave-requests', {
        method: 'POST',
        body: JSON.stringify(newLeaveRequest)
      });
      showToast("تم إنشاء طلب الإجازة بنجاح", "success");
      setShowLeaveDialog(false);
      setNewLeaveRequest({
        leave_type: "vacation",
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: ""
      });
      loadLeaveRequests();
    } catch (e: any) {
      showToast(e.message || "فشل إنشاء طلب الإجازة", "error");
    }
  };

  const payslipColumns: Column<PayrollItem>[] = [
    {
      key: "payroll_cycle",
      header: "الفترة",
      render: (item) => item.payroll_cycle?.cycle_name || "-"
    },
    {
      key: "period",
      header: "الفترة الزمنية",
      render: (item) => {
        if (!item.payroll_cycle) return "-";
        return `${formatDate(item.payroll_cycle.period_start)} - ${formatDate(item.payroll_cycle.period_end)}`;
      }
    },
    {
      key: "base_salary",
      header: "الراتب الأساسي",
      render: (item) => formatCurrency(item.base_salary)
    },
    {
      key: "total_allowances",
      header: "البدلات",
      render: (item) => formatCurrency(item.total_allowances)
    },
    {
      key: "total_deductions",
      header: "الخصومات",
      render: (item) => formatCurrency(item.total_deductions)
    },
    {
      key: "net_salary",
      header: "صافي الراتب",
      render: (item) => formatCurrency(item.net_salary)
    },
    {
      key: "paid_amount",
      header: "المدفوع",
      render: (item) => formatCurrency(item.paid_amount || 0)
    },
    {
      key: "remaining_balance",
      header: "المتبقي",
      render: (item) => formatCurrency(item.remaining_balance || item.net_salary)
    }
  ];

  const leaveColumns: Column<LeaveRequest>[] = [
    {
      key: "leave_type",
      header: "نوع الإجازة",
      render: (record) => {
        const types: Record<string, string> = {
          vacation: "إجازة سنوية",
          sick: "إجازة مرضية",
          emergency: "إجازة طارئة",
          unpaid: "إجازة بدون راتب",
          other: "أخرى"
        };
        return types[record.leave_type] || record.leave_type;
      }
    },
    {
      key: "start_date",
      header: "من تاريخ",
      render: (record) => formatDate(record.start_date)
    },
    {
      key: "end_date",
      header: "إلى تاريخ",
      render: (record) => formatDate(record.end_date)
    },
    {
      key: "days_requested",
      header: "عدد الأيام",
      render: (record) => `${record.days_requested} يوم`
    },
    {
      key: "status",
      header: "الحالة",
      render: (record) => {
        const statusMap: Record<string, { text: string; class: string }> = {
          pending: { text: "قيد الانتظار", class: "badge badge-warning" },
          approved: { text: "موافق عليه", class: "badge badge-success" },
          rejected: { text: "مرفوض", class: "badge badge-danger" },
          cancelled: { text: "ملغي", class: "badge badge-secondary" }
        };
        const status = statusMap[record.status] || { text: record.status, class: "badge" };
        return <span className={status.class}>{status.text}</span>;
      }
    }
  ];

  const attendanceColumns: Column<AttendanceRecord>[] = [
    {
      key: "attendance_date",
      header: "التاريخ",
      render: (record) => formatDate(record.attendance_date)
    },
    {
      key: "check_in",
      header: "وقت الدخول",
      render: (record) => record.check_in || "-"
    },
    {
      key: "check_out",
      header: "وقت الخروج",
      render: (record) => record.check_out || "-"
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
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">البوابة الذاتية للموظف</h2>

      <TabNavigation
        tabs={[
          { key: "payslips", label: "كشوف المرتبات", icon: "fa-file-invoice-dollar" },
          { key: "leave", label: "طلبات الإجازة", icon: "fa-calendar-alt" },
          { key: "attendance", label: "سجلات الحضور", icon: "fa-clock" }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "payslips" && (
        <div className="tab-content active">
          <Table
            data={payslips}
            columns={payslipColumns}
            isLoading={isLoading}
            emptyMessage="لا توجد كشوف مرتبات"
            keyExtractor={(item) => item.id}
          />
        </div>
      )}

      {activeTab === "leave" && (
        <div className="tab-content active">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowLeaveDialog(true)}>
              {getIcon("plus")} طلب إجازة جديد
            </Button>
          </div>
          <Table
            data={leaveRequests}
            columns={leaveColumns}
            isLoading={isLoading}
            emptyMessage="لا توجد طلبات إجازة"
            keyExtractor={(item) => item.id}
          />
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="tab-content active">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
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
              <Button onClick={loadAttendance}>
                {getIcon("search")} بحث
              </Button>
            </div>
          </div>

          {attendance?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg mb-4">
              <div>
                <div className="text-sm text-gray-600">إجمالي الساعات</div>
                <div className="text-xl font-bold">{attendance.summary.total_hours?.toFixed(2) || 0} ساعة</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">ساعات إضافية</div>
                <div className="text-xl font-bold">{attendance.summary.total_overtime?.toFixed(2) || 0} ساعة</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">أيام الحضور</div>
                <div className="text-xl font-bold">{attendance.summary.total_days_present || 0} يوم</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">أيام الغياب</div>
                <div className="text-xl font-bold">{attendance.summary.total_days_absent || 0} يوم</div>
              </div>
            </div>
          )}

          <Table
            data={attendance?.records || []}
            columns={attendanceColumns}
            isLoading={isLoading}
            emptyMessage="لا توجد سجلات حضور"
            keyExtractor={(item) => item.id}
          />
        </div>
      )}

      <Dialog
        isOpen={showLeaveDialog}
        onClose={() => setShowLeaveDialog(false)}
        title="طلب إجازة جديد"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">نوع الإجازة *</label>
            <Select
              value={newLeaveRequest.leave_type}
              onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, leave_type: e.target.value as any })}
            >
              <option value="vacation">إجازة سنوية</option>
              <option value="sick">إجازة مرضية</option>
              <option value="emergency">إجازة طارئة</option>
              <option value="unpaid">إجازة بدون راتب</option>
              <option value="other">أخرى</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">من تاريخ *</label>
              <TextInput
                type="date"
                value={newLeaveRequest.start_date}
                onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">إلى تاريخ *</label>
              <TextInput
                type="date"
                value={newLeaveRequest.end_date}
                onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, end_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">السبب</label>
            <Textarea
              value={newLeaveRequest.reason}
              onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowLeaveDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateLeaveRequest}>
              حفظ
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

