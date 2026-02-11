"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, Button, SearchableSelect, ActionButtons } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { ExpatRecord } from "@/app/hr/types";

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
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "عرض التفاصيل",
              variant: "view",
              onClick: () => router.push(`/hr/expat-management/view/${item.id}`)
            },
            {
              icon: "edit",
              title: "تعديل",
              variant: "edit",
              onClick: () => router.push(`/hr/expat-management/edit/${item.id}`)
            }
          ]}
        />
      ),
    },
  ];

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="إدارة المغتربين"
        titleIcon="globe"
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
          <Button
            onClick={() => router.push('/hr/expat-management/add')}
            variant="primary"
            icon="plus"
          >
            إضافة سجل
          </Button>

        }
      />

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

