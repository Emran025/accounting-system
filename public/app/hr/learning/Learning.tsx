"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, Button, TabNavigation } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface Course {
  id: number;
  course_code: string;
  course_name: string;
  delivery_method: string;
  course_type: string;
  duration_hours: number;
  is_published: boolean;
  enrollments?: Array<{ id: number }>;
}

interface Enrollment {
  id: number;
  course?: { course_name: string };
  employee?: { full_name: string };
  status: string;
  progress_percentage: number;
  enrollment_date: string;
  completion_date?: string;
}

const deliveryMethodLabels: Record<string, string> = {
  in_person: "حضوري",
  virtual: "افتراضي",
  elearning: "تعلم إلكتروني",
  blended: "مختلط",
};

const courseTypeLabels: Record<string, string> = {
  mandatory: "إلزامي",
  optional: "اختياري",
  compliance: "امتثال",
  development: "تطوير",
};

const statusLabels: Record<string, string> = {
  enrolled: "مسجل",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  failed: "فشل",
  dropped: "انسحب",
};

const statusBadges: Record<string, string> = {
  enrolled: "badge-info",
  in_progress: "badge-warning",
  completed: "badge-success",
  failed: "badge-danger",
  dropped: "badge-secondary",
};

export function Learning() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (activeTab === "courses") {
      loadCourses();
    } else {
      loadEnrollments();
    }
  }, [activeTab, currentPage]);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.LEARNING.COURSES.BASE}?${query}`);
      setCourses(res.data as Course[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load courses", error);
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
      const res = await fetchAPI(`${API_ENDPOINTS.HR.LEARNING.ENROLLMENTS.BASE}?${query}`);
      setEnrollments(res.data as Enrollment[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load enrollments", error);
    } finally {
      setIsLoading(false);
    }
  };

  const courseColumns: Column<Course>[] = [
    {
      key: "course_code",
      header: "رمز الدورة",
      dataLabel: "رمز الدورة",
    },
    {
      key: "course_name",
      header: "اسم الدورة",
      dataLabel: "اسم الدورة",
    },
    {
      key: "delivery_method",
      header: "طريقة التسليم",
      dataLabel: "طريقة التسليم",
      render: (item) => deliveryMethodLabels[item.delivery_method] || item.delivery_method,
    },
    {
      key: "course_type",
      header: "النوع",
      dataLabel: "النوع",
      render: (item) => (
        <span className={`badge ${item.course_type === 'mandatory' ? 'badge-warning' : 'badge-info'}`}>
          {courseTypeLabels[item.course_type] || item.course_type}
        </span>
      ),
    },
    {
      key: "duration_hours",
      header: "المدة (ساعة)",
      dataLabel: "المدة (ساعة)",
      render: (item) => `${item.duration_hours || 0} ساعة`,
    },
    {
      key: "enrollments",
      header: "عدد المسجلين",
      dataLabel: "عدد المسجلين",
      render: (item) => item.enrollments?.length || 0,
    },
    {
      key: "is_published",
      header: "الحالة",
      dataLabel: "الحالة",
      render: (item) => (
        <span className={`badge ${item.is_published ? 'badge-success' : 'badge-secondary'}`}>
          {item.is_published ? 'منشور' : 'مسودة'}
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
            onClick={() => router.push(`/hr/learning/courses/${item.id}`)}
            title="عرض التفاصيل"
          >
            <i className="fas fa-eye"></i>
          </button>
        </div>
      ),
    },
  ];

  const enrollmentColumns: Column<Enrollment>[] = [
    {
      key: "course",
      header: "الدورة",
      dataLabel: "الدورة",
      render: (item) => item.course?.course_name || '-',
    },
    {
      key: "employee",
      header: "الموظف",
      dataLabel: "الموظف",
      render: (item) => item.employee?.full_name || '-',
    },
    {
      key: "progress",
      header: "التقدم",
      dataLabel: "التقدم",
      render: (item) => (
        <div className="progress" style={{ height: '20px' }}>
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${item.progress_percentage}%` }}
          >
            {item.progress_percentage}%
          </div>
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
      key: "enrollment_date",
      header: "تاريخ التسجيل",
      dataLabel: "تاريخ التسجيل",
      render: (item) => formatDate(item.enrollment_date),
    },
    {
      key: "completion_date",
      header: "تاريخ الإكمال",
      dataLabel: "تاريخ الإكمال",
      render: (item) => item.completion_date ? formatDate(item.completion_date) : '-',
    },
    {
      key: "id",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => (
        <div className="action-buttons">
          <button
            className="icon-btn view"
            onClick={() => router.push(`/hr/learning/enrollments/${item.id}`)}
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
          <h3 style={{ margin: 0 }}>{getIcon("graduation-cap")} التدريب والتعلم</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {activeTab === "courses" && (
            <Button
              onClick={() => router.push('/hr/learning/courses/add')}
              className="btn-primary"
            >
              <i className="fas fa-plus"></i> إضافة دورة جديدة
            </Button>
          )}
        </div>
      </div>

      <TabNavigation
        tabs={[
          { key: "courses", label: "الدورات", icon: "book" },
          { key: "enrollments", label: "التسجيلات", icon: "user-check" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "courses" ? (
        <Table
          columns={courseColumns}
          data={courses}
          keyExtractor={(item) => item.id.toString()}
          emptyMessage="لا توجد دورات"
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


