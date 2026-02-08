"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, Column, Button, TabNavigation } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";

interface KnowledgeArticle {
  id: number;
  title: string;
  category: string;
  view_count: number;
  helpful_count: number;
  is_published: boolean;
  created_at: string;
}

interface Expertise {
  id: number;
  employee?: { full_name: string };
  skill_name: string;
  proficiency_level: string;
  years_of_experience: number;
  is_available_for_projects: boolean;
}

const categoryLabels: Record<string, string> = {
  policy: "سياسة",
  procedure: "إجراء",
  best_practice: "أفضل ممارسة",
  faq: "أسئلة شائعة",
  training: "تدريب",
  other: "أخرى",
};

const proficiencyLabels: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
  expert: "خبير",
};

export function KnowledgeBase() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("knowledge");
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [expertise, setExpertise] = useState<Expertise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (activeTab === "knowledge") {
      loadArticles();
    } else {
      loadExpertise();
    }
  }, [activeTab, currentPage, searchTerm]);

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        search: searchTerm,
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.KNOWLEDGE.BASE}?${query}`);
      setArticles(res.data as KnowledgeArticle[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load articles", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExpertise = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
      });
      const res = await fetchAPI(`${API_ENDPOINTS.HR.EXPERTISE.BASE}?${query}`);
      setExpertise(res.data as Expertise[] || []);
      setTotalPages(Number(res.last_page) || 1);
    } catch (error) {
      console.error("Failed to load expertise", error);
    } finally {
      setIsLoading(false);
    }
  };

  const articleColumns: Column<KnowledgeArticle>[] = [
    {
      key: "title",
      header: "العنوان",
      dataLabel: "العنوان",
    },
    {
      key: "category",
      header: "الفئة",
      dataLabel: "الفئة",
      render: (item) => categoryLabels[item.category] || item.category,
    },
    {
      key: "view_count",
      header: "عدد المشاهدات",
      dataLabel: "عدد المشاهدات",
    },
    {
      key: "helpful_count",
      header: "مفيد",
      dataLabel: "مفيد",
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
            onClick={() => router.push(`/hr/knowledge-base/${item.id}`)}
            title="عرض المقال"
          >
            <i className="fas fa-eye"></i>
          </button>
        </div>
      ),
    },
  ];

  const expertiseColumns: Column<Expertise>[] = [
    {
      key: "employee",
      header: "الموظف",
      dataLabel: "الموظف",
      render: (item) => item.employee?.full_name || '-',
    },
    {
      key: "skill_name",
      header: "المهارة",
      dataLabel: "المهارة",
    },
    {
      key: "proficiency_level",
      header: "مستوى الكفاءة",
      dataLabel: "مستوى الكفاءة",
      render: (item) => proficiencyLabels[item.proficiency_level] || item.proficiency_level,
    },
    {
      key: "years_of_experience",
      header: "سنوات الخبرة",
      dataLabel: "سنوات الخبرة",
      render: (item) => `${item.years_of_experience} سنة`,
    },
    {
      key: "is_available_for_projects",
      header: "متاح للمشاريع",
      dataLabel: "متاح للمشاريع",
      render: (item) => (
        <span className={`badge ${item.is_available_for_projects ? 'badge-success' : 'badge-secondary'}`}>
          {item.is_available_for_projects ? 'نعم' : 'لا'}
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
            onClick={() => router.push(`/hr/expertise/${item.id}`)}
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
          <h3 style={{ margin: 0 }}>{getIcon("book")} قاعدة المعرفة</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {activeTab === "knowledge" && (
            <>
              <input
                type="text"
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-control"
                style={{ minWidth: '200px' }}
              />
              <Button
                onClick={() => router.push('/hr/knowledge-base/add')}
                className="btn-primary"
              >
                <i className="fas fa-plus"></i> إضافة مقال
              </Button>
            </>
          )}
        </div>
      </div>

      <TabNavigation
        tabs={[
          { id: "knowledge", label: "قاعدة المعرفة", icon: "book" },
          { id: "expertise", label: "دليل الخبراء", icon: "users-gear" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "knowledge" ? (
        <Table
          columns={articleColumns}
          data={articles}
          keyExtractor={(item) => item.id.toString()}
          emptyMessage="لا توجد مقالات"
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
          }}
        />
      ) : (
        <Table
          columns={expertiseColumns}
          data={expertise}
          keyExtractor={(item) => item.id.toString()}
          emptyMessage="لا يوجد خبراء مسجلين"
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


