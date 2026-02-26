"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionButtons, Table, Column, Button, SearchableSelect, Select } from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { EmployeeAsset } from "@/app/hr/types";

const assetTypeLabels: Record<string, string> = {
  laptop: "لابتوب",
  phone: "هاتف",
  vehicle: "مركبة",
  key: "مفتاح",
  equipment: "معدات",
  other: "أخرى",
};

const statusLabels: Record<string, string> = {
  allocated: "مخصص",
  returned: "مسترد",
  maintenance: "صيانة",
  lost: "مفقود",
  damaged: "تالف",
};

const statusBadges: Record<string, string> = {
  allocated: "badge-success",
  returned: "badge-secondary",
  maintenance: "badge-warning",
  lost: "badge-danger",
  damaged: "badge-danger",
};

export function EmployeeAssets() {
  const router = useRouter();
  const { canAccess } = useAuthStore();
  const [assets, setAssets] = useState<EmployeeAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadAssets();
  }, [currentPage, searchTerm, statusFilter]);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        search: searchTerm,
        status: statusFilter,
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEE_ASSETS.BASE}?${query}`);
      setAssets(res.data as EmployeeAsset[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load assets", error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Column<EmployeeAsset>[] = [
    {
      key: "asset_code",
      header: "رمز الأصل",
      dataLabel: "رمز الأصل",
    },
    {
      key: "asset_name",
      header: "اسم الأصل",
      dataLabel: "اسم الأصل",
    },
    {
      key: "asset_type",
      header: "النوع",
      dataLabel: "النوع",
      render: (item) => assetTypeLabels[item.asset_type] || item.asset_type,
    },
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
      key: "allocation_date",
      header: "تاريخ التخصيص",
      dataLabel: "تاريخ التخصيص",
      render: (item) => formatDate(item.allocation_date),
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
      key: "next_maintenance_date",
      header: "الصيانة القادمة",
      dataLabel: "الصيانة القادمة",
      render: (item) => item.next_maintenance_date ? formatDate(item.next_maintenance_date) : '-',
    },
    {
      key: "id",
      header: "الإجراءات",
      dataLabel: "إجراءات",
      render: (item) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "عرض التفاصيل",
              variant: "view",
              onClick: () => router.push(`/hr/employee-assets/view/${item.id}`)
            },
            ...(canAccess("employees", "edit") ? [{
              icon: "edit" as const,
              title: "تعديل",
              variant: "edit" as const,
              onClick: () => router.push(`/hr/employee-assets/edit/${item.id}`)
            }] : [])
          ]}
        />
      ),
    },
  ];

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="أصول الموظفين"
        titleIcon="laptop"
        searchInput={
          <SearchableSelect
            options={[]}
            value={null}
            onChange={() => { }}
            onSearch={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="بحث..."
            className="search-input"
          />
        }
        actions={
          <>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: '150px' }}
              placeholder="جميع الحالات"
              options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
            />
            {canAccess("employees", "create") && (
              <Button
                onClick={() => router.push('/hr/employee-assets/add')}
                variant="primary"
                icon="plus"
              >
                إضافة أصل
              </Button>
            )}
          </>
        }
      />

      <Table
        columns={columns}
        data={assets}
        keyExtractor={(item) => item.id.toString()}
        emptyMessage="لا توجد أصول مسجلة"
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

