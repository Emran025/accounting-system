"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, showToast, Button, SearchableSelect, Label } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { LeaveRequest, Employee } from "../types";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";

/**
 * Leave Request Management Component.
 * Allows employees to submit leave requests and managers to approve/reject them.
 * Supports multiple leave types: vacation, sick, emergency, unpaid, and other.
 * 
 * Features:
 * - Create new leave requests with date range and reason
 * - Filter requests by employee and status
 * - Approve or reject pending requests with mandatory rejection reason
 * 
 * @returns The LeaveRequests component
 */
export function LeaveRequests() {
  const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();
  const { canAccess } = useAuthStore();
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
    loadAllEmployees();
  }, [loadAllEmployees]);

  useEffect(() => {
    loadLeaveRequests();
  }, [selectedEmployee, statusFilter, currentPage]);

  const loadLeaveRequests = async () => {
    setIsLoading(true);
    try {
      let url = `${API_ENDPOINTS.HR.LEAVE.BASE}?page=${currentPage}&`;
      if (selectedEmployee) url += `employee_id=${selectedEmployee}&`;
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;

      const res: any = await fetchAPI(url);
      const data = res.data || (Array.isArray(res) ? res : []);
      setLeaveRequests(data);
      setTotalPages(res.last_page || 1);
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
        <ActionButtons
          actions={[
            ...(canAccess("leave", "edit") ? [{
              icon: "check" as const,
              title: "معالجة الطلب",
              variant: "edit" as const,
              onClick: () => {
                setSelectedRequest(record);
                setApprovalData({ action: "approved", reason: "" });
                setShowApproveDialog(true);
              },
              hidden: record.status !== 'pending'
            }] : [])
          ]}
        />
      )
    }
  ];

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="طلبات الإجازة"
        titleIcon="calendar"
        actions={
          canAccess("leave", "create") && (
            <Button
              variant="primary"
              onClick={() => setShowRequestDialog(true)}
              icon="plus">
              طلب إجازة جديد
            </Button>
          )
        }
      />

      <div className="sales-card compact" style={{ marginBottom: '1.5rem' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-secondary mb-1">الموظف</Label>
            <SearchableSelect
              options={employees.map((emp: Employee) => ({ value: emp.id.toString(), label: emp.full_name }))}
              value={selectedEmployee?.toString() || ""}
              onChange={(value) => setSelectedEmployee(value ? Number(value) : null)}
              placeholder="جميع الموظفين"
            />
          </div>
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'الكل' },
              { value: 'pending', label: 'قيد الانتظار' },
              { value: 'approved', label: 'موافق عليه' },
              { value: 'rejected', label: 'مرفوض' },
              { value: 'cancelled', label: 'ملغي' }
            ]}
          />
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
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage
          }}
        />
      </div>

      <Dialog
        isOpen={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        title="طلب إجازة جديد"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label className="text-secondary mb-1">الموظف *</Label>
            <SearchableSelect
              options={employees.map((emp: Employee) => ({ value: emp.id.toString(), label: emp.full_name }))}
              value={newRequest.employee_id}
              onChange={(value) => setNewRequest({ ...newRequest, employee_id: value ? String(value) : "" })}
              placeholder="اختر الموظف"
            />
          </div>
          <Select
            label="نوع الإجازة *"
            value={newRequest.leave_type}
            onChange={(e) => setNewRequest({ ...newRequest, leave_type: e.target.value as any })}
            options={[
              { value: 'vacation', label: 'إجازة سنوية' },
              { value: 'sick', label: 'إجازة مرضية' },
              { value: 'emergency', label: 'إجازة طارئة' },
              { value: 'unpaid', label: 'إجازة بدون راتب' },
              { value: 'other', label: 'أخرى' }
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="من تاريخ *"
              type="date"
              value={newRequest.start_date}
              onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
            />
            <TextInput
              label="إلى تاريخ *"
              type="date"
              value={newRequest.end_date}
              onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })}
            />
          </div>
          <Textarea
            label="السبب"
            value={newRequest.reason}
            onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
          />
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
          <Select
            label="الإجراء *"
            value={approvalData.action}
            onChange={(e) => setApprovalData({ ...approvalData, action: e.target.value as any })}
            options={[
              { value: 'approved', label: 'موافقة' },
              { value: 'rejected', label: 'رفض' }
            ]}
          />
          {approvalData.action === 'rejected' && (
            <Textarea
              label="سبب الرفض *"
              value={approvalData.reason}
              onChange={(e) => setApprovalData({ ...approvalData, reason: e.target.value })}
              required
            />
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
