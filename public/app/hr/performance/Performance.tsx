"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, Button, TabNavigation } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface Goal {
  id: number;
  employee_id: number;
  employee?: { full_name: string };
  goal_title: string;
  goal_type: string;
  status: string;
  target_value?: number;
  current_value?: number;
  progress_percentage: number;
  target_date: string;
}

interface Appraisal {
  id: number;
  appraisal_number: string;
  employee_id: number;
  employee?: { full_name: string };
  appraisal_type: string;
  appraisal_period: string;
  status: string;
  overall_rating?: number;
}

const goalTypeLabels: Record<string, string> = {
  okr: "OKR",
  kpi: "KPI",
  personal: "شخصي",
  team: "فريق",
  corporate: "مؤسسي",
};

const statusLabels: Record<string, string> = {
  not_started: "لم يبدأ",
  in_progress: "قيد التنفيذ",
  on_track: "على المسار",
  at_risk: "في خطر",
  completed: "مكتمل",
  cancelled: "ملغي",
  draft: "مسودة",
  self_review: "مراجعة ذاتية",
  manager_review: "مراجعة المدير",
  calibration: "معايرة",
};

const statusBadges: Record<string, string> = {
  not_started: "badge-secondary",
  in_progress: "badge-warning",
  on_track: "badge-success",
  at_risk: "badge-danger",
  completed: "badge-success",
  cancelled: "badge-secondary",
  draft: "badge-secondary",
  self_review: "badge-info",
  manager_review: "badge-warning",
  calibration: "badge-primary",
};

export function Performance() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("goals");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (activeTab === "goals") {
      loadGoals();
    } else {
      loadAppraisals();
    }
  }, [activeTab, currentPage]);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.PERFORMANCE.GOALS.BASE}?${query}`);
      setGoals(res.data as Goal[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load goals", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAppraisals = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.PERFORMANCE.APPRAISALS.BASE}?${query}`);
      setAppraisals(res.data as Appraisal[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load appraisals", error);
    } finally {
      setIsLoading(false);
    }
  };

  const goalColumns: Column<Goal>[] = [
    {
      key: "goal_title",
      header: "عنوان الهدف",
      dataLabel: "عنوان الهدف",
    },
    {
      key: "employee",
      header: "الموظف",
      dataLabel: "الموظف",
      render: (item) => item.employee?.full_name || '-',
    },
    {
      key: "goal_type",
      header: "النوع",
      dataLabel: "النوع",
      render: (item) => goalTypeLabels[item.goal_type] || item.goal_type,
    },
    {
      key: "progress",
      header: "التقدم",
      dataLabel: "التقدم",
      render: (item) => (
        <div>
          <div className="progress" style={{ height: '20px', marginBottom: '5px' }}>
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${item.progress_percentage}%` }}
            >
              {item.progress_percentage}%
            </div>
          </div>
          {item.target_value && (
            <small>{item.current_value || 0} / {item.target_value}</small>
          )}
        </div>
      ),
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
      key: "target_date",
      header: "تاريخ الهدف",
      dataLabel: "تاريخ الهدف",
      render: (item) => formatDate(item.target_date),
    },
    {
      key: "id",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <div className="action-buttons">
          <button
            className="icon-btn view"
            onClick={() => router.push(`/hr/performance/goals/${item.id}`)}
            title="عرض التفاصيل"
          >
            <i className="fas fa-eye"></i>
          </button>
        </div>
      ),
    },
  ];

  const appraisalColumns: Column<Appraisal>[] = [
    {
      key: "appraisal_number",
      header: "رقم التقييم",
      dataLabel: "رقم التقييم",
    },
    {
      key: "employee",
      header: "الموظف",
      dataLabel: "الموظف",
      render: (item) => item.employee?.full_name || '-',
    },
    {
      key: "appraisal_period",
      header: "الفترة",
      dataLabel: "الفترة",
    },
    {
      key: "appraisal_type",
      header: "النوع",
      dataLabel: "النوع",
    },
    {
      key: "overall_rating",
      header: "التقييم العام",
      dataLabel: "التقييم العام",
      render: (item) => item.overall_rating ? `${item.overall_rating}/5` : '-',
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
      key: "id",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <div className="action-buttons">
          <button
            className="icon-btn view"
            onClick={() => router.push(`/hr/performance/appraisals/${item.id}`)}
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
          <h3 style={{ margin: 0 }}>{getIcon("chart-line")} الأداء والأهداف</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {activeTab === "goals" && (
            <Button
              onClick={() => router.push('/hr/performance/goals/add')}
              className="btn-primary"
            >
              <i className="fas fa-plus"></i> إضافة هدف جديد
            </Button>
          )}
          {activeTab === "appraisals" && (
            <Button
              onClick={() => router.push('/hr/performance/appraisals/add')}
              className="btn-primary"
            >
              <i className="fas fa-plus"></i> تقييم جديد
            </Button>
          )}
        </div>
      </div>

      <TabNavigation
        tabs={[
          { key: "goals", label: "الأهداف", icon: "target" },
          { key: "appraisals", label: "التقييمات", icon: "clipboard-check" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "goals" ? (
        <Table
          columns={goalColumns}
          data={goals}
          keyExtractor={(item) => item.id.toString()}
          emptyMessage="لا توجد أهداف"
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
          }}
        />
      ) : (
        <Table
          columns={appraisalColumns}
          data={appraisals}
          keyExtractor={(item) => item.id.toString()}
          emptyMessage="لا توجد تقييمات"
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
          }}
        />
      )}
    </div>
  );
}


