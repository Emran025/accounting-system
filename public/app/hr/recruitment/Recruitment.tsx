"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, Button, TabNavigation } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface Requisition {
  id: number;
  requisition_number: string;
  job_title: string;
  department?: { name_ar: string };
  role?: { role_name_ar: string };
  number_of_positions: number;
  status: string;
  target_start_date?: string;
  budgeted_salary_min?: number;
  budgeted_salary_max?: number;
}

interface Applicant {
  id: number;
  requisition_id: number;
  requisition?: { job_title: string };
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  application_date: string;
  match_score?: number;
}

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  pending_approval: "قيد الموافقة",
  approved: "موافق عليه",
  rejected: "مرفوض",
  closed: "مغلق",
  filled: "مكتمل",
  applied: "تم التقديم",
  screened: "تم الفحص",
  assessment: "التقييم",
  interview: "مقابلة",
  offer: "عرض",
  hired: "تم التوظيف",
};

const statusBadges: Record<string, string> = {
  draft: "badge-secondary",
  pending_approval: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  closed: "badge-secondary",
  filled: "badge-info",
  applied: "badge-info",
  screened: "badge-warning",
  assessment: "badge-warning",
  interview: "badge-primary",
  offer: "badge-success",
  hired: "badge-success",
};

export function Recruitment() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("requisitions");
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (activeTab === "requisitions") {
      loadRequisitions();
    } else {
      loadApplicants();
    }
  }, [activeTab, currentPage]);

  const loadRequisitions = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.RECRUITMENT.REQUISITIONS.BASE}?${query}`);
      setRequisitions(res.data as Requisition[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load requisitions", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadApplicants = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.RECRUITMENT.APPLICANTS.BASE}?${query}`);
      setApplicants(res.data as Applicant[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load applicants", error);
    } finally {
      setIsLoading(false);
    }
  };

  const requisitionColumns: Column<Requisition>[] = [
    {
      key: "requisition_number",
      header: "رقم الطلب",
      dataLabel: "رقم الطلب",
    },
    {
      key: "job_title",
      header: "المسمى الوظيفي",
      dataLabel: "المسمى الوظيفي",
    },
    {
      key: "department",
      header: "القسم",
      dataLabel: "القسم",
      render: (item) => item.department?.name_ar || '-',
    },
    {
      key: "number_of_positions",
      header: "عدد الوظائف",
      dataLabel: "عدد الوظائف",
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
      key: "target_start_date",
      header: "تاريخ البدء",
      dataLabel: "تاريخ البدء",
      render: (item) => item.target_start_date ? formatDate(item.target_start_date) : '-',
    },
    {
      key: "id",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <div className="action-buttons">
          <button
            className="icon-btn view"
            onClick={() => router.push(`/hr/recruitment/requisitions/${item.id}`)}
            title="عرض التفاصيل"
          >
            <i className="fas fa-eye"></i>
          </button>
        </div>
      ),
    },
  ];

  const applicantColumns: Column<Applicant>[] = [
    {
      key: "name",
      header: "الاسم",
      dataLabel: "الاسم",
      render: (item) => `${item.first_name} ${item.last_name}`,
    },
    {
      key: "email",
      header: "البريد الإلكتروني",
      dataLabel: "البريد الإلكتروني",
    },
    {
      key: "requisition",
      header: "الوظيفة",
      dataLabel: "الوظيفة",
      render: (item) => item.requisition?.job_title || '-',
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
      key: "application_date",
      header: "تاريخ التقديم",
      dataLabel: "تاريخ التقديم",
      render: (item) => formatDate(item.application_date),
    },
    {
      key: "match_score",
      header: "نقاط المطابقة",
      dataLabel: "نقاط المطابقة",
      render: (item) => item.match_score ? `${item.match_score}%` : '-',
    },
    {
      key: "id",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <div className="action-buttons">
          <button
            className="icon-btn view"
            onClick={() => router.push(`/hr/recruitment/applicants/${item.id}`)}
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
          <h3 style={{ margin: 0 }}>{getIcon("user-plus")} التوظيف والمرشحين</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {activeTab === "requisitions" && (
            <Button
              onClick={() => router.push('/hr/recruitment/requisitions/add')}
              className="btn-primary"
            >
              <i className="fas fa-plus"></i> طلب توظيف جديد
            </Button>
          )}
        </div>
      </div>

      <TabNavigation
        tabs={[
          { key: "requisitions", label: "طلبات التوظيف", icon: "file-alt" },
          { key: "applicants", label: "المرشحين", icon: "users" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "requisitions" ? (
        <Table
          columns={requisitionColumns}
          data={requisitions}
          keyExtractor={(item) => item.id.toString()}
          emptyMessage="لا توجد طلبات توظيف"
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
          }}
        />
      ) : (
        <Table
          columns={applicantColumns}
          data={applicants}
          keyExtractor={(item) => item.id.toString()}
          emptyMessage="لا يوجد مرشحين"
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


