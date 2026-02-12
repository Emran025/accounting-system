"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionButtons, Table, Column, Button, TabNavigation } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { useAuthStore } from "@/stores/useAuthStore";
import { getIcon } from "@/lib/icons";

interface BenefitsPlan {
  id: number;
  plan_code: string;
  plan_name: string;
  plan_type: string;
  employee_contribution: number;
  employer_contribution: number;
  effective_date: string;
  is_active: boolean;
  enrollments?: Array<{ id: number }>;
}

interface BenefitsEnrollment {
  id: number;
  plan?: { plan_name: string };
  employee?: { full_name: string };
  enrollment_type: string;
  status: string;
  enrollment_date: string;
  effective_date: string;
}

const planTypeLabels: Record<string, string> = {
  health: "صحة",
  dental: "أسنان",
  vision: "بصر",
  life_insurance: "تأمين على الحياة",
  disability: "إعاقة",
  retirement: "تقاعد",
  fsa: "FSA",
  hsa: "HSA",
  other: "أخرى",
};

const enrollmentTypeLabels: Record<string, string> = {
  open_enrollment: "تسجيل مفتوح",
  new_hire: "موظف جديد",
  life_event: "حدث حياتي",
  qualifying_event: "حدث مؤهل",
};

const statusLabels: Record<string, string> = {
  enrolled: "مسجل",
  active: "نشط",
  terminated: "منهي",
  cancelled: "ملغي",
};

const statusBadges: Record<string, string> = {
  enrolled: "badge-info",
  active: "badge-success",
  terminated: "badge-danger",
  cancelled: "badge-secondary",
};

export function Benefits() {
  const router = useRouter();
  const { canAccess } = useAuthStore();
  const [activeTab, setActiveTab] = useState("plans");
  const [plans, setPlans] = useState<BenefitsPlan[]>([]);
  const [enrollments, setEnrollments] = useState<BenefitsEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (activeTab === "plans") {
      loadPlans();
    } else {
      loadEnrollments();
    }
  }, [activeTab, currentPage]);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.BENEFITS.PLANS.BASE}?${query}`);
      setPlans(res.data as BenefitsPlan[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load plans", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEnrollments = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.BENEFITS.ENROLLMENTS.BASE}?${query}`);
      setEnrollments(res.data as BenefitsEnrollment[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load enrollments", error);
    } finally {
      setIsLoading(false);
    }
  };

  const planColumns: Column<BenefitsPlan>[] = [
    {
      key: "plan_code",
      header: "رمز الخطة",
      dataLabel: "رمز الخطة",
    },
    {
      key: "plan_name",
      header: "اسم الخطة",
      dataLabel: "اسم الخطة",
    },
    {
      key: "plan_type",
      header: "النوع",
      dataLabel: "النوع",
      render: (item) => planTypeLabels[item.plan_type] || item.plan_type,
    },
    {
      key: "contributions",
      header: "المساهمات",
      dataLabel: "المساهمات",
      render: (item) => (
        <div>
          <div>موظف: {formatCurrency(item.employee_contribution)}</div>
          <div>صاحب عمل: {formatCurrency(item.employer_contribution)}</div>
        </div>
      ),
    },
    {
      key: "enrollments",
      header: "عدد المسجلين",
      dataLabel: "عدد المسجلين",
      render: (item) => item.enrollments?.length || 0,
    },
    {
      key: "is_active",
      header: "الحالة",
      dataLabel: "الحالة",
      render: (item) => (
        <span className={`badge ${item.is_active ? 'badge-success' : 'badge-secondary'}`}>
          {item.is_active ? 'نشط' : 'غير نشط'}
        </span>
      ),
    },
    {
      key: "id",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "عرض التفاصيل",
              variant: "view",
              onClick: () => router.push(`/hr/benefits/plans/${item.id}`)
            },
            ...(canAccess("benefits", "edit") ? [{
              icon: "edit" as const,
              title: "تعديل",
              variant: "edit" as const,
              onClick: () => router.push(`/hr/benefits/plans/edit/${item.id}`)
            }] : [])
          ]}
        />
      ),
    },
  ];

  const enrollmentColumns: Column<BenefitsEnrollment>[] = [
    {
      key: "employee",
      header: "الموظف",
      dataLabel: "الموظف",
      render: (item) => item.employee?.full_name || '-',
    },
    {
      key: "plan",
      header: "الخطة",
      dataLabel: "الخطة",
      render: (item) => item.plan?.plan_name || '-',
    },
    {
      key: "enrollment_type",
      header: "نوع التسجيل",
      dataLabel: "نوع التسجيل",
      render: (item) => enrollmentTypeLabels[item.enrollment_type] || item.enrollment_type,
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
      key: "enrollment_date",
      header: "تاريخ التسجيل",
      dataLabel: "تاريخ التسجيل",
      render: (item) => formatDate(item.enrollment_date),
    },
    {
      key: "effective_date",
      header: "تاريخ السريان",
      dataLabel: "تاريخ السريان",
      render: (item) => formatDate(item.effective_date),
    },
    {
      key: "id",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "عرض التفاصيل",
              variant: "view",
              onClick: () => router.push(`/hr/benefits/enrollments/${item.id}`)
            },
            ...(canAccess("benefits", "edit") ? [{
              icon: "edit" as const,
              title: "تعديل",
              variant: "edit" as const,
              onClick: () => router.push(`/hr/benefits/enrollments/edit/${item.id}`)
            }] : [])
          ]}
        />
      ),
    },
  ];

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="المزايا والاستحقاقات"
        titleIcon="heart"
        actions={
          <>
            {activeTab === "plans" && canAccess("benefits", "create") && (
              <Button
                onClick={() => router.push('/hr/benefits/plans/add')}
                variant="primary"
                icon="plus"
              >
                خطة مزايا جديدة
              </Button>
            )}
            {activeTab === "enrollments" && canAccess("benefits", "create") && (
              <Button
                onClick={() => router.push('/hr/benefits/enrollments/add')}
                variant="primary"
                icon="plus"
              >
                تسجيل جديد
              </Button>
            )}
          </>
        }
      />

      <TabNavigation
        tabs={[
          { key: "plans", label: "خطط المزايا", icon: "file-alt" },
          { key: "enrollments", label: "التسجيلات", icon: "user-check" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "plans" ? (
        <Table
          columns={planColumns}
          data={plans}
          keyExtractor={(item) => item.id.toString()}
          emptyMessage="لا توجد خطط مزايا"
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
          }}
        />
      ) : (
        <Table
          columns={enrollmentColumns}
          data={enrollments}
          keyExtractor={(item) => item.id.toString()}
          emptyMessage="لا توجد تسجيلات"
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


