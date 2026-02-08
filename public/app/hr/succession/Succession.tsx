"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, Button } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface SuccessionPlan {
  id: number;
  position_title: string;
  incumbent_id?: number;
  incumbent?: { full_name: string };
  readiness_level: string;
  status: string;
  candidates?: Array<{
    id: number;
    employee?: { full_name: string };
    readiness_level: string;
  }>;
}

const readinessLabels: Record<string, string> = {
  ready_now: "جاهز الآن",
  ready_1_2_years: "جاهز خلال 1-2 سنة",
  ready_3_5_years: "جاهز خلال 3-5 سنوات",
  not_ready: "غير جاهز",
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  filled: "مكتمل",
};

const statusBadges: Record<string, string> = {
  active: "badge-success",
  inactive: "badge-secondary",
  filled: "badge-info",
};

export function Succession() {
  const router = useRouter();
  const [plans, setPlans] = useState<SuccessionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadPlans();
  }, [currentPage]);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.SUCCESSION.BASE}?${query}`);
      setPlans(res.data as SuccessionPlan[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load succession plans", error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Column<SuccessionPlan>[] = [
    {
      key: "position_title",
      header: "المسمى الوظيفي",
      dataLabel: "المسمى الوظيفي",
    },
    {
      key: "incumbent",
      header: "شاغل الوظيفة",
      dataLabel: "شاغل الوظيفة",
      render: (item) => item.incumbent?.full_name || '-',
    },
    {
      key: "readiness_level",
      header: "مستوى الجاهزية",
      dataLabel: "مستوى الجاهزية",
      render: (item) => readinessLabels[item.readiness_level] || item.readiness_level,
    },
    {
      key: "candidates",
      header: "عدد المرشحين",
      dataLabel: "عدد المرشحين",
      render: (item) => item.candidates?.length || 0,
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
            onClick={() => router.push(`/hr/succession/${item.id}`)}
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
          <h3 style={{ margin: 0 }}>{getIcon("sitemap")} التخطيط للخلافة</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Button
            onClick={() => router.push('/hr/succession/add')}
            className="btn-primary"
          >
            <i className="fas fa-plus"></i> خطة خلافة جديدة
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={plans}
        keyExtractor={(item) => item.id.toString()}
        emptyMessage="لا توجد خطط خلافة"
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


