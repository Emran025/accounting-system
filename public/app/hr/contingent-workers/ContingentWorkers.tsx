"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, Button, SearchableSelect } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface ContingentWorker {
  id: number;
  worker_code: string;
  full_name: string;
  email?: string;
  phone?: string;
  worker_type: string;
  company_name?: string;
  start_date: string;
  end_date?: string;
  status: string;
  hourly_rate?: number;
  monthly_rate?: number;
  badge_expiry?: string;
  system_access_expiry?: string;
}

const workerTypeLabels: Record<string, string> = {
  contractor: "مقاول",
  consultant: "استشاري",
  freelancer: "مستقل",
  temp_agency: "وكالة مؤقتة",
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  terminated: "منهي",
};

const statusBadges: Record<string, string> = {
  active: "badge-success",
  inactive: "badge-secondary",
  terminated: "badge-danger",
};

export function ContingentWorkers() {
  const router = useRouter();
  const [workers, setWorkers] = useState<ContingentWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadWorkers();
  }, [currentPage, searchTerm, statusFilter]);

  const loadWorkers = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        search: searchTerm,
        status: statusFilter,
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.CONTINGENT_WORKERS.BASE}?${query}`);
      setWorkers(res.data as ContingentWorker[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load contingent workers", error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Column<ContingentWorker>[] = [
    {
      key: "worker_code",
      header: "رمز العامل",
      dataLabel: "رمز العامل",
    },
    {
      key: "full_name",
      header: "الاسم الكامل",
      dataLabel: "الاسم الكامل",
    },
    {
      key: "worker_type",
      header: "النوع",
      dataLabel: "النوع",
      render: (item) => workerTypeLabels[item.worker_type] || item.worker_type,
    },
    {
      key: "company_name",
      header: "الشركة",
      dataLabel: "الشركة",
      render: (item) => item.company_name || '-',
    },
    {
      key: "start_date",
      header: "تاريخ البدء",
      dataLabel: "تاريخ البدء",
      render: (item) => formatDate(item.start_date),
    },
    {
      key: "end_date",
      header: "تاريخ الانتهاء",
      dataLabel: "تاريخ الانتهاء",
      render: (item) => item.end_date ? formatDate(item.end_date) : '-',
    },
    {
      key: "rate",
      header: "المعدل",
      dataLabel: "المعدل",
      render: (item) => {
        if (item.hourly_rate) return formatCurrency(item.hourly_rate) + '/ساعة';
        if (item.monthly_rate) return formatCurrency(item.monthly_rate) + '/شهر';
        return '-';
      },
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
            onClick={() => router.push(`/hr/contingent-workers/${item.id}`)}
            title="عرض التفاصيل"
          >
            <i className="fas fa-eye"></i>
          </button>
          <button
            className="icon-btn edit"
            onClick={() => router.push(`/hr/contingent-workers/edit/${item.id}`)}
            title="تعديل"
          >
            <i className="fas fa-edit"></i>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="sales-card animate-fade">
      <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>{getIcon("briefcase")} العمالة المؤقتة</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="form-select"
            style={{ minWidth: '150px' }}
          >
            <option value="">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="terminated">منهي</option>
          </select>
          <SearchableSelect
            options={[]}
            value={null}
            onChange={() => {}}
            onSearch={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="بحث..."
            className="search-input"
          />
          <Button
            onClick={() => router.push('/hr/contingent-workers/add')}
            className="btn-primary"
          >
            <i className="fas fa-plus"></i> إضافة عامل مؤقت
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={workers}
        keyExtractor={(item) => item.id.toString()}
        emptyMessage="لا يوجد عمالة مؤقتة مسجلة"
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


