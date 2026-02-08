"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, Button, TabNavigation } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface Workflow {
  id: number;
  employee_id: number;
  employee?: {
    full_name: string;
    employee_code: string;
  };
  workflow_type: string;
  status: string;
  start_date: string;
  target_completion_date?: string;
  actual_completion_date?: string;
  completion_percentage: number;
  tasks?: Array<{
    id: number;
    task_name: string;
    status: string;
  }>;
}

const workflowTypeLabels: Record<string, string> = {
  onboarding: "توظيف",
  offboarding: "إنهاء خدمة",
};

const statusLabels: Record<string, string> = {
  not_started: "لم يبدأ",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const statusBadges: Record<string, string> = {
  not_started: "badge-secondary",
  in_progress: "badge-warning",
  completed: "badge-success",
  cancelled: "badge-danger",
};

export function Onboarding() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("onboarding");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadWorkflows();
  }, [activeTab, currentPage]);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        workflow_type: activeTab,
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.ONBOARDING.BASE}?${query}`);
      setWorkflows(res.data as Workflow[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load workflows", error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Column<Workflow>[] = [
    {
      key: "employee",
      header: "الموظف",
      dataLabel: "الموظف",
      render: (item) => (
        <div>
          <div>{item.employee?.full_name || '-'}</div>
          <small className="text-muted">{item.employee?.employee_code || ''}</small>
        </div>
      ),
    },
    {
      key: "workflow_type",
      header: "النوع",
      dataLabel: "النوع",
      render: (item) => workflowTypeLabels[item.workflow_type] || item.workflow_type,
    },
    {
      key: "status",
      header: "الحالة",
      dataLabel: "الحالة",
      render: (item) => (
        <span className={`badge ${statusBadges[item.status] || 'badge-secondary'}`}>
          {statusLabels[item.status] || item.status}
        </span>
      ),
    },
    {
      key: "completion_percentage",
      header: "نسبة الإنجاز",
      dataLabel: "نسبة الإنجاز",
      render: (item) => (
        <div>
          <div className="progress" style={{ height: '20px', marginBottom: '5px' }}>
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${item.completion_percentage}%` }}
            >
              {item.completion_percentage}%
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "start_date",
      header: "تاريخ البدء",
      dataLabel: "تاريخ البدء",
      render: (item) => formatDate(item.start_date),
    },
    {
      key: "target_completion_date",
      header: "تاريخ الإنجاز المستهدف",
      dataLabel: "تاريخ الإنجاز المستهدف",
      render: (item) => item.target_completion_date ? formatDate(item.target_completion_date) : '-',
    },
    {
      key: "id",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <div className="action-buttons">
          <button
            className="icon-btn view"
            onClick={() => router.push(`/hr/onboarding/${item.id}`)}
            title="عرض التفاصيل"
          >
            <i className="fas fa-eye"></i>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="sales-card animate-fade">
      <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>{getIcon("user-check")} التوظيف والإنهاء</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Button
            onClick={() => router.push(`/hr/onboarding/add?type=${activeTab}`)}
            className="btn-primary"
          >
            <i className="fas fa-plus"></i> إضافة عملية جديدة
          </Button>
        </div>
      </div>

      <TabNavigation
        tabs={[
          { id: "onboarding", label: "التوظيف", icon: "user-plus" },
          { id: "offboarding", label: "إنهاء الخدمة", icon: "user-minus" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <Table
        columns={columns}
        data={workflows}
        keyExtractor={(item) => item.id.toString()}
        emptyMessage={`لا توجد عمليات ${activeTab === 'onboarding' ? 'توظيف' : 'إنهاء خدمة'}`}
        isLoading={isLoading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />
    </div>
  );
}


