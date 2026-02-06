"use client";

import { useState, useEffect } from "react";
import { Table, Column, Dialog, showToast, Button } from "@/components/ui";
import { TabNavigation } from "@/components/ui/TabNavigation";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
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
      const res: any = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEE_PORTAL.PAYSLIPS);
      const data = res.data || (Array.isArray(res) ? res : []);
      setPayslips(data);
    } catch (e) {
      showToast("فشل تحميل كشوف المرتبات", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeaveRequests = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEE_PORTAL.LEAVE_REQUESTS);
      const data = res.data || (Array.isArray(res) ? res : []);
      setLeaveRequests(data);
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
        `${API_ENDPOINTS.HR.EMPLOYEE_PORTAL.ATTENDANCE}?start_date=${startDate}&end_date=${endDate}`
      );
      if (res && !res.error) {
        setAttendance(res);
      } else {
        setAttendance(null);
        if (res?.error) showToast(res.error, "error");
      }
    } catch (e) {
      showToast("فشل تحميل سجلات الحضور", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLeaveRequest = async () => {
    try {
      await fetchAPI(API_ENDPOINTS.HR.EMPLOYEE_PORTAL.LEAVE_REQUESTS, {
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
      dataLabel: "الفترة",
      render: (item) => item.payroll_cycle?.cycle_name || "-"
    },
    {
      key: "period",
      header: "الفترة الزمنية",
      dataLabel: "الفترة الزمنية",
      render: (item) => {
        if (!item.payroll_cycle) return "-";
        return `${formatDate(item.payroll_cycle.period_start)} - ${formatDate(item.payroll_cycle.period_end)}`;
      }
    },
    {
      key: "base_salary",
      header: "الراتب الأساسي",
      dataLabel: "الراتب الأساسي",
      render: (item) => formatCurrency(item.base_salary)
    },
    {
      key: "total_allowances",
      header: "البدلات",
      dataLabel: "البدلات",
      render: (item) => formatCurrency(item.total_allowances)
    },
    {
      key: "total_deductions",
      header: "الخصومات",
      dataLabel: "الخصومات",
      render: (item) => formatCurrency(item.total_deductions)
    },
    {
      key: "net_salary",
      header: "صافي الراتب",
      dataLabel: "صافي الراتب",
      render: (item) => <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{formatCurrency(item.net_salary)}</span>
    },
    {
      key: "paid_amount",
      header: "المدفوع",
      dataLabel: "المدفوع",
      render: (item) => formatCurrency(item.paid_amount || 0)
    },
    {
      key: "remaining_balance",
      header: "المتبقي",
      dataLabel: "المتبقي",
      render: (item) => {
        const remaining = item.remaining_balance || item.net_salary;
        return remaining > 0 ? (
          <span className="badge badge-warning">{formatCurrency(remaining)}</span>
        ) : (
          <span className="badge badge-success">مدفوع بالكامل</span>
        );
      }
    }
  ];

  const leaveColumns: Column<LeaveRequest>[] = [
    {
      key: "leave_type",
      header: "نوع الإجازة",
      dataLabel: "نوع الإجازة",
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
      dataLabel: "من تاريخ",
      render: (record) => formatDate(record.start_date)
    },
    {
      key: "end_date",
      header: "إلى تاريخ",
      dataLabel: "إلى تاريخ",
      render: (record) => formatDate(record.end_date)
    },
    {
      key: "days_requested",
      header: "عدد الأيام",
      dataLabel: "عدد الأيام",
      render: (record) => `${record.days_requested} يوم`
    },
    {
      key: "status",
      header: "الحالة",
      dataLabel: "الحالة",
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
      dataLabel: "التاريخ",
      render: (record) => formatDate(record.attendance_date)
    },
    {
      key: "check_in",
      header: "وقت الدخول",
      dataLabel: "وقت الدخول",
      render: (record) => record.check_in || "-"
    },
    {
      key: "check_out",
      header: "وقت الخروج",
      dataLabel: "وقت الخروج",
      render: (record) => record.check_out || "-"
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
      render: (record) => `${(record.hours_worked || 0).toFixed(2)} ساعة`
    }
  ];

  return (
    <div className="sales-card animate-fade">
      <div className="card-header-flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>{getIcon("user-circle")} البوابة الذاتية للموظف</h3>
        </div>
      </div>

      <div className="settings-wrapper">
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
          <div className="tab-content active" style={{ marginTop: '1.5rem' }}>
            <div className="sales-card">
              <Table
                data={payslips}
                columns={payslipColumns}
                isLoading={isLoading}
                emptyMessage="لا توجد كشوف مرتبات"
                keyExtractor={(item) => item.id.toString()}
              />
            </div>
          </div>
        )}

        {activeTab === "leave" && (
          <div className="tab-content active" style={{ marginTop: '1.5rem' }}>
            <div className="sales-card">
              <div className="card-header-flex" style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>طلبات الإجازة</h4>
                <Button
                  variant="primary"
                  onClick={() => setShowLeaveDialog(true)}
                  icon="plus">
                  طلب إجازة جديد
                </Button>
              </div>
              <Table
                data={leaveRequests}
                columns={leaveColumns}
                isLoading={isLoading}
                emptyMessage="لا توجد طلبات إجازة"
                keyExtractor={(item) => item.id.toString()}
              />
            </div>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="tab-content active" style={{ marginTop: '1.5rem' }}>
            <div className="sales-card compact" style={{ marginBottom: '1.5rem' }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>من تاريخ</label>
                  <TextInput
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>إلى تاريخ</label>
                  <TextInput
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={loadAttendance}
                    variant="primary"
                    icon="search"
                    style={{ width: '100%' }}>
                    بحث
                  </Button>
                </div>
              </div>
            </div>

            {attendance?.summary && (
              <div className="sales-card compact" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe' }}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="stat-item">
                    <span className="stat-label">إجمالي الساعات</span>
                    <span className="stat-value">{attendance.summary.total_hours?.toFixed(2) || 0} ساعة</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">ساعات إضافية</span>
                    <span className="stat-value highlight">{attendance.summary.total_overtime?.toFixed(2) || 0} ساعة</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">أيام الحضور</span>
                    <span className="stat-value">{attendance.summary.total_days_present || 0} يوم</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">أيام الغياب</span>
                    <span className="stat-value">{attendance.summary.total_days_absent || 0} يوم</span>
                  </div>
                </div>
              </div>
            )}

            <div className="sales-card">
              <Table
                data={attendance?.records || []}
                columns={attendanceColumns}
                isLoading={isLoading}
                emptyMessage="لا توجد سجلات حضور"
                keyExtractor={(item) => item.id.toString()}
              />
            </div>
          </div>
        )}
      </div>

      <Dialog
        isOpen={showLeaveDialog}
        onClose={() => setShowLeaveDialog(false)}
        title="طلب إجازة جديد"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>نوع الإجازة *</label>
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
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>من تاريخ *</label>
              <TextInput
                type="date"
                value={newLeaveRequest.start_date}
                onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>إلى تاريخ *</label>
              <TextInput
                type="date"
                value={newLeaveRequest.end_date}
                onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, end_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>السبب</label>
            <Textarea
              value={newLeaveRequest.reason}
              onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <Button variant="secondary" onClick={() => setShowLeaveDialog(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleCreateLeaveRequest} icon="save">
              حفظ
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
