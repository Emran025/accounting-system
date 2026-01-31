"use client";

import { useState, useEffect } from "react";
import { Table, Column, Dialog, showToast, Button } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
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
    loadLeaveRequests();
  }, [selectedEmployee, statusFilter]);

  const loadEmployees = async () => {
    try {
      const res: any = await fetchAPI('/api/employees');
      setEmployees(res.data || res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLeaveRequests = async () => {
    setIsLoading(true);
    try {
      let url = '/api/leave-requests?';
      if (selectedEmployee) url += `employee_id=${selectedEmployee}&`;
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;
      
      const res: any = await fetchAPI(url);
      setLeaveRequests(res.data || res || []);
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
      await fetchAPI('/api/leave-requests', {
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
      await fetchAPI(`/api/leave-requests/${selectedRequest.id}/approve`, {
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
      render: (record) => record.employee?.full_name || "-"
    },
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
    },
    {
      key: "actions",
      header: "الإجراءات",
      render: (record) => (
        <div className="flex gap-2">
          {record.status === 'pending' && (
            <Button
              size="sm"
              onClick={() => {
                setSelectedRequest(record);
                setApprovalData({ action: "approved", reason: "" });
                setShowApproveDialog(true);
              }}
            >
              {getIcon("check")} معالجة
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">طلبات الإجازة</h2>
        <Button onClick={() => setShowRequestDialog(true)}>
          {getIcon("plus")} طلب إجازة جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium mb-1">الموظف</label>
          <Select
            value={selectedEmployee?.toString() || ""}
            onChange={(e) => setSelectedEmployee(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">جميع الموظفين</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">الحالة</label>
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
          <Button onClick={loadLeaveRequests}>
            {getIcon("search")} بحث
          </Button>
        </div>
      </div>

      <Table
        data={leaveRequests}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="لا توجد طلبات إجازة"
        keyExtractor={(item) => item.id}
      />

      <Dialog
        isOpen={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        title="طلب إجازة جديد"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">الموظف *</label>
            <Select
              value={newRequest.employee_id}
              onChange={(e) => setNewRequest({ ...newRequest, employee_id: e.target.value })}
            >
              <option value="">اختر الموظف</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">نوع الإجازة *</label>
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
              <label className="block text-sm font-medium mb-1">من تاريخ *</label>
              <TextInput
                type="date"
                value={newRequest.start_date}
                onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">إلى تاريخ *</label>
              <TextInput
                type="date"
                value={newRequest.end_date}
                onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">السبب</label>
            <Textarea
              value={newRequest.reason}
              onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRequestDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateRequest}>
              حفظ
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        title="معالجة طلب الإجازة"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">الإجراء *</label>
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
              <label className="block text-sm font-medium mb-1">سبب الرفض *</label>
              <Textarea
                value={approvalData.reason}
                onChange={(e) => setApprovalData({ ...approvalData, reason: e.target.value })}
                required
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowApproveDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleApprove}>
              حفظ
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

