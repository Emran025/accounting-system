"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionButtons, Table, Column, Button } from "@/components/ui";
import { PageSubHeader } from "@/components/layout";
import { fetchAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import type { Schedule } from "../types";


const statusLabels: Record<string, string> = {
  draft: "مسودة",
  published: "منشور",
  archived: "مؤرشف",
};

const statusBadges: Record<string, string> = {
  draft: "badge-secondary",
  published: "badge-success",
  archived: "badge-secondary",
};

export function WorkforceScheduling() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadSchedules();
  }, [currentPage]);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.WORKFORCE_SCHEDULING.BASE}?${query}`);
      setSchedules(res.data as Schedule[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load schedules", error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Column<Schedule>[] = [
    {
      key: "schedule_name",
      header: "اسم الجدول",
      dataLabel: "اسم الجدول",
    },
    {
      key: "schedule_date",
      header: "تاريخ الجدول",
      dataLabel: "تاريخ الجدول",
      render: (item) => formatDate(item.schedule_date),
    },
    {
      key: "department",
      header: "القسم",
      dataLabel: "القسم",
      render: (item) => item.department?.name_ar || '-',
    },
    {
      key: "shifts",
      header: "عدد المناوبات",
      dataLabel: "عدد المناوبات",
      render: (item) => item.shifts?.length || 0,
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
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "عرض الجدول",
              variant: "view",
              onClick: () => router.push(`/hr/scheduling/${item.id}`)
            },
            {
              icon: "edit",
              title: "تعديل",
              variant: "edit",
              onClick: () => router.push(`/hr/scheduling/edit/${item.id}`)
            }
          ]}
        />
      ),
    },
  ];

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="جدولة القوى العاملة"
        titleIcon="calendar-days"
        actions={
          <Button
            onClick={() => router.push("/hr/scheduling/add")}
            variant="primary"
            icon="plus"
          >
            إنشاء جدول جديد
          </Button>
        }
      />

      <Table
        columns={columns}
        data={schedules}
        keyExtractor={(item) => item.id.toString()}
        emptyMessage="لا توجد جداول"
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


