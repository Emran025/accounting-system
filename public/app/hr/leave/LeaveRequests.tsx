"use client";

import { useState, useEffect } from "react";
import { Table, Column, Dialog, showToast, Button, SearchableSelect } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { LeaveRequest, Employee } from "../types";
import { formatDate } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";

export function LeaveRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  const [newRequest, setNewRequest] = useState({
    employee_id: "",
    leave_type: "vacation" as const,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ""
  });

  const [approvalData, setApprovalData] = useState({
    action: "approved" as "approved" | "rejected",
    reason: ""
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadLeaveRequests();
  }, [selectedEmployee, statusFilter]);

  const loadEmployees = async () => {
    try {
      const res: any = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.BASE);
      setEmployees(res.data || res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLeaveRequests = async () => {
    setIsLoading(true);
    try {
      let url = `${API_ENDPOINTS.HR.LEAVE.BASE}?`;
      if (selectedEmployee) url += `employee_id=${selectedEmployee}&`;
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;

      const res: any = await fetchAPI(url);
      const data = res.data || (Array.isArray(res) ? res : []);
      setLeaveRequests(data);
    } catch (e) {
      showToast("فشل تحميل طلبات الإجازة", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!newRequest.employee_id) {
      showToast("يرجى اختيار الموظف", "error");
      return;
    }

    try {
      await fetchAPI(API_ENDPOINTS.HR.LEAVE.BASE, {
        method: 'POST',
        body: JSON.stringify(newRequest)
      });
      showToast("تم إنشاء طلب الإجازة بنجاح", "success");
      setShowRequestDialog(false);
      setNewRequest({
        employee_id: "",
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

  const handleApprove = async () => {
    if (!selectedRequest) return;

    if (approvalData.action === 'rejected' && !approvalData.reason) {
      showToast("يرجى إدخال سبب الرفض", "error");
      return;
    }

    try {
      await fetchAPI(API_ENDPOINTS.HR.LEAVE.APPROVE(selectedRequest.id), {
        method: 'POST',
        body: JSON.stringify(approvalData)
      });
      showToast(`تم ${approvalData.action === 'approved' ? 'الموافقة' : 'الرفض'} على طلب الإجازة بنجاح`, "success");
      setShowApproveDialog(false);
      setSelectedRequest(null);
      loadLeaveRequests();
    } catch (e: any) {
      showToast(e.message || "فشل معالجة طلب الإجازة", "error");
    }
  };

  const columns: Column<LeaveRequest>[] = [
    {
      key: "employee",
      header: "الموظف",
      dataLabel: "الموظف",
      render: (record) => record.employee?.full_name || "-"
    },
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
    },
    {
      key: "actions",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (record) => (
        <div className="action-buttons">
          {record.status === 'pending' && (
            <button
              className="icon-btn edit"
              onClick={() => {
                setSelectedRequest(record);
                setApprovalData({ action: "approved", reason: "" });
                setShowApproveDialog(true);
              }}
              title="معالجة الطلب"
            >
              {getIcon("check-circle")}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="sales-card animate-fade">
      <div className="card-header-flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>{getIcon("calendar")} طلبات الإجازة</h3>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowRequestDialog(true)}
          icon="plus">
          طلب إجازة جديد
        </Button>
      </div>

      <div className="sales-card compact" style={{ marginBottom: '1.5rem' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>الموظف</label>
            <SearchableSelect
              options={employees.map(emp => ({ value: emp.id.toString(), label: emp.full_name }))}
              value={selectedEmployee?.toString() || ""}
              onChange={(value) => setSelectedEmployee(value ? Number(value) : null)}
              placeholder="جميع الموظفين"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>الحالة</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="pending">قيد الانتظار</option>
              <option value="approved">موافق عليه</option>
              <option value="rejected">مرفوض</option>
              <option value="cancelled">ملغي</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={loadLeaveRequests}
              variant="primary"
              icon="search"
              style={{ width: '100%' }}>
              بحث
            </Button>
          </div>
        </div>
      </div>

      <div className="sales-card">
        <Table
          data={leaveRequests}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="لا توجد طلبات إجازة"
          keyExtractor={(item) => item.id.toString()}
        />
      </div>

      <Dialog
        isOpen={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        title="طلب إجازة جديد"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>الموظف *</label>
            <SearchableSelect
              options={employees.map(emp => ({ value: emp.id.toString(), label: emp.full_name }))}
              value={newRequest.employee_id}
              onChange={(value) => setNewRequest({ ...newRequest, employee_id: value ? String(value) : "" })}
              placeholder="اختر الموظف"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>نوع الإجازة *</label>
            <Select
              value={newRequest.leave_type}
              onChange={(e) => setNewRequest({ ...newRequest, leave_type: e.target.value as any })}
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
                value={newRequest.start_date}
                onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>إلى تاريخ *</label>
              <TextInput
                type="date"
                value={newRequest.end_date}
                onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>السبب</label>
            <Textarea
              value={newRequest.reason}
              onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <Button variant="secondary" onClick={() => setShowRequestDialog(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleCreateRequest} icon="save">
              حفظ
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        title="معالجة طلب الإجازة"
        maxWidth="500px"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>الإجراء *</label>
            <Select
              value={approvalData.action}
              onChange={(e) => setApprovalData({ ...approvalData, action: e.target.value as any })}
            >
              <option value="approved">موافقة</option>
              <option value="rejected">رفض</option>
            </Select>
          </div>
          {approvalData.action === 'rejected' && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>سبب الرفض *</label>
              <Textarea
                value={approvalData.reason}
                onChange={(e) => setApprovalData({ ...approvalData, reason: e.target.value })}
                required
              />
            </div>
          )}
          <div className="flex justify-end gap-2" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <Button variant="secondary" onClick={() => setShowApproveDialog(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={handleApprove}
              icon={approvalData.action === 'approved' ? 'check' : 'x'}>
              {approvalData.action === 'approved' ? 'موافقة' : 'رفض'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
