"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, Button, SearchableSelect } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface ExpatRecord {
  id: number;
  employee_id: number;
  employee?: {
    full_name: string;
    employee_code: string;
  };
  passport_number?: string;
  passport_expiry?: string;
  visa_number?: string;
  visa_expiry?: string;
  work_permit_number?: string;
  work_permit_expiry?: string;
  residency_number?: string;
  residency_expiry?: string;
  host_country?: string;
  home_country?: string;
  cost_of_living_adjustment: number;
  housing_allowance: number;
  relocation_package: number;
  tax_equalization: boolean;
  repatriation_date?: string;
  notes?: string;
}

export function ExpatManagement() {
  const router = useRouter();
  const [records, setRecords] = useState<ExpatRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadRecords();
  }, [currentPage, searchTerm]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        search: searchTerm,
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.EXPAT_MANAGEMENT.BASE}?${query}`);
      setRecords(res.data as ExpatRecord[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load expat records", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return { class: "", text: "-" };
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return { class: "badge-danger", text: "منتهي" };
    if (daysUntilExpiry < 30) return { class: "badge-warning", text: "قريباً" };
    if (daysUntilExpiry < 90) return { class: "badge-info", text: "قريباً" };
    return { class: "badge-success", text: "صالح" };
  };

  const columns: Column<ExpatRecord>[] = [
    {
      key: "employee",
      header: "الموظف",
      dataLabel: "الموظف",
      render: (item) => (
        <div>
          <div>{item.employee?.full_name || '-'}</div>
          <small className="text-muted">{item.employee?.employee_code || ''}</small>
        </div>
      )
    },
    {
      key: "passport_expiry",
      header: "انتهاء جواز السفر",
      dataLabel: "انتهاء جواز السفر",
      render: (item) => {
        const status = getExpiryStatus(item.passport_expiry);
        return (
          <div>
            <div>{item.passport_expiry ? formatDate(item.passport_expiry) : '-'}</div>
            {item.passport_expiry && (
              <span className={`badge ${status.class}`}>{status.text}</span>
            )}
          </div>
        );
      }
    },
    {
      key: "visa_expiry",
      header: "انتهاء التأشيرة",
      dataLabel: "انتهاء التأشيرة",
      render: (item) => {
        const status = getExpiryStatus(item.visa_expiry);
        return (
          <div>
            <div>{item.visa_expiry ? formatDate(item.visa_expiry) : '-'}</div>
            {item.visa_expiry && (
              <span className={`badge ${status.class}`}>{status.text}</span>
            )}
          </div>
        );
      }
    },
    {
      key: "host_country",
      header: "البلد المضيف",
      dataLabel: "البلد المضيف",
      render: (item) => item.host_country || '-'
    },
    {
      key: "cost_of_living_adjustment",
      header: "بدل المعيشة",
      dataLabel: "بدل المعيشة",
      render: (item) => formatCurrency(item.cost_of_living_adjustment || 0)
    },
    {
      key: "housing_allowance",
      header: "بدل السكن",
      dataLabel: "بدل السكن",
      render: (item) => formatCurrency(item.housing_allowance || 0)
    },
    {
      key: "id",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <div className="action-buttons">
          <button
            className="icon-btn view"
            onClick={() => router.push(`/hr/expat-management/view/${item.id}`)}
            title="عرض التفاصيل"
          >
            <i className="fas fa-eye"></i>
          </button>
          <button
            className="icon-btn edit"
            onClick={() => router.push(`/hr/expat-management/edit/${item.id}`)}
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
          <h3 style={{ margin: 0 }}>{getIcon("globe")} إدارة المغتربين</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
          <Button
            onClick={() => router.push('/hr/expat-management/add')}
            className="btn-primary"
          >
            <i className="fas fa-plus"></i> إضافة سجل
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={records}
        keyExtractor={(item) => item.id.toString()}
        emptyMessage="لا توجد سجلات للمغتربين"
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

