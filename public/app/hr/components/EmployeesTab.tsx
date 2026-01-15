"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, SearchableSelect , Button } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { Employee } from "../types";

export function EmployeesTab() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  useEffect(() => {
    loadEmployees();
  }, [currentPage, searchTerm, filterDepartment]);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        search: searchTerm,
        department_id: filterDepartment
      });
      const res = await fetchAPI(`/api/employees?${query}`);
      setEmployees(res.data as Employee[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load employees", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'suspended': return 'badge-warning';
      case 'terminated': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
        case 'active': return 'نشط';
        case 'suspended': return 'معلق';
        case 'terminated': return 'منهي خدماته';
        default: return status;
    }
  };

  const columns: Column<Employee>[] = [
    { key: "employee_code", header: "رقم الموظف", dataLabel: "رقم الموظف" },
    { key: "full_name", header: "الاسم الكامل", dataLabel: "الاسم الكامل" },
    { key: "role", header: "المسمى الوظيفي", dataLabel: "المسمى الوظيفي", render: (item) => item.role?.role_name_ar || '-' },
    { key: "department", header: "القسم", dataLabel: "القسم", render: (item) => item.department?.name_ar || '-' },
    { key: "base_salary", header: "الراتب الأساسي", dataLabel: "الراتب الأساسي" },
    { key: "employment_status", header: "الحالة", dataLabel: "الحالة", render: (item) => (
      <span className={`badge ${getStatusBadgeClass(item.employment_status)}`}>
        {getStatusText(item.employment_status)}
      </span>
    )},
    { key: "id", header: "الإجراءات", dataLabel: "الإجراءات", render: (item) => (
      <div className="action-buttons">
        <button className="icon-btn view" onClick={() => router.push(`/hr/employees/view/${item.id}`)} title="عرض الملف">
          <i className="fas fa-eye"></i>
        </button>
        <button className="icon-btn edit" onClick={() => router.push(`/hr/employees/edit/${item.id}`)} title="تعديل">
           <i className="fas fa-edit"></i>
        </button>
      </div>
    )},
  ];

  return (
    <div className="sales-card animate-fade">
      <div className="form-row">
        <div className="form-group">
          <SearchableSelect
              options={[]}
              value={null}
              onChange={() => {}}
              onSearch={(val) => {
                  setSearchTerm(val);
              }}
              placeholder="بحث سريع..."
              className="header-search-bar"
          />
        </div>
        {/* Department Select could be added here if departments loaded */}
        <div className="form-group">
          <Button
            variant="primary"
            onClick={() => router.push('/hr/employees/add')}
            icon="plus">
            إضافة موظف
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={employees}
        keyExtractor={(item) => item.id}
        emptyMessage="لا يوجد موظفين"
        isLoading={isLoading}
        pagination={{
            currentPage: currentPage,
            totalPages: totalPages,
            onPageChange: setCurrentPage
        }}
      />
    </div>
  );
}
