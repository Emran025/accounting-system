"use client";

import { useState, useEffect } from "react";
import { ActionButtons, Table, Column, Dialog, Button, TabNavigation, showToast, Label } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { formatDate } from "@/lib/utils";
import { PageSubHeader } from "@/components/layout";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import { useAuthStore } from "@/stores/useAuthStore";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import type { Employee } from "../types";

interface KnowledgeArticle {
  id: number; title: string; content?: string; category: string;
  tags?: string[]; view_count: number; helpful_count: number;
  is_published: boolean; created_at: string; file_path?: string;
}

interface Expertise {
  id: number; employee_id: number; employee?: { full_name: string };
  skill_name: string; proficiency_level: string; years_of_experience: number;
  description?: string; certifications?: string[]; projects?: string[];
  is_available_for_projects: boolean;
}

const categoryLabels: Record<string, string> = { policy: "سياسة", procedure: "إجراء", best_practice: "أفضل ممارسة", faq: "أسئلة شائعة", training: "تدريب", other: "أخرى" };
const profLabels: Record<string, string> = { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", expert: "خبير" };
const profBadges: Record<string, string> = { beginner: "badge-secondary", intermediate: "badge-info", advanced: "badge-warning", expert: "badge-success" };

export function KnowledgeBase() {
  const { canAccess } = useAuthStore();
  const [activeTab, setActiveTab] = useState("knowledge");
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [expertise, setExpertise] = useState<Expertise[]>([]);
  const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  // Dialogs
  const [showArticleDialog, setShowArticleDialog] = useState(false);
  const [showArticleDetail, setShowArticleDetail] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [showExpertDialog, setShowExpertDialog] = useState(false);
  const [showExpertDetail, setShowExpertDetail] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState<Expertise | null>(null);
  // Forms
  const [articleForm, setArticleForm] = useState({ title: "", content: "", category: "policy", tags: "", is_published: false });
  const [expertForm, setExpertForm] = useState({ employee_id: "", skill_name: "", proficiency_level: "beginner", years_of_experience: "", description: "", is_available_for_projects: true });

  useEffect(() => { loadAllEmployees(); }, [loadAllEmployees]);
  useEffect(() => { setCurrentPage(1); }, [activeTab]);
  useEffect(() => { activeTab === "knowledge" ? loadArticles() : loadExpertise(); }, [activeTab, currentPage, searchTerm]);

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({ page: currentPage.toString(), ...(searchTerm && { search: searchTerm }) });
      const res: any = await fetchAPI(`${API_ENDPOINTS.HR.KNOWLEDGE.BASE}?${q}`);
      setArticles(res.data || []); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast("فشل تحميل المقالات", "error"); }
    finally { setIsLoading(false); }
  };

  const loadExpertise = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI(`${API_ENDPOINTS.HR.EXPERTISE.BASE}?page=${currentPage}`);
      setExpertise(res.data || []); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast("فشل تحميل الخبراء", "error"); }
    finally { setIsLoading(false); }
  };

  const handleSaveArticle = async () => {
    if (!articleForm.title || !articleForm.content) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HR.KNOWLEDGE.BASE, {
        method: "POST", body: JSON.stringify({
          title: articleForm.title, content: articleForm.content, category: articleForm.category,
          tags: articleForm.tags ? articleForm.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
          is_published: articleForm.is_published,
        })
      });
      showToast("تم إنشاء المقال", "success"); setShowArticleDialog(false); loadArticles();
    } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
  };

  const viewArticleDetail = async (id: number) => {
    try {
      const res: any = await fetchAPI(API_ENDPOINTS.HR.KNOWLEDGE.withId(id));
      setSelectedArticle(res.data || res); setShowArticleDetail(true);
    } catch { showToast("فشل تحميل التفاصيل", "error"); }
  };

  const handlePublishArticle = async (id: number, publish: boolean) => {
    try {
      await fetchAPI(API_ENDPOINTS.HR.KNOWLEDGE.withId(id), { method: "PUT", body: JSON.stringify({ is_published: publish }) });
      showToast(publish ? "تم نشر المقال" : "تم إلغاء النشر", "success"); loadArticles();
    } catch (e: any) { showToast(e.message || "فشل التحديث", "error"); }
  };

  const handleMarkHelpful = async (id: number) => {
    try {
      await fetchAPI(API_ENDPOINTS.HR.KNOWLEDGE.HELPFUL(id), { method: "POST" });
      showToast("شكراً لتقييمك!", "success");
      if (selectedArticle && selectedArticle.id === id) {
        setSelectedArticle({ ...selectedArticle, helpful_count: selectedArticle.helpful_count + 1 });
      }
    } catch { }
  };

  const handleSaveExpert = async () => {
    if (!expertForm.employee_id || !expertForm.skill_name) { showToast("يرجى ملء الحقول المطلوبة", "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HR.EXPERTISE.BASE, {
        method: "POST", body: JSON.stringify({
          employee_id: Number(expertForm.employee_id), skill_name: expertForm.skill_name,
          proficiency_level: expertForm.proficiency_level,
          years_of_experience: expertForm.years_of_experience ? Number(expertForm.years_of_experience) : undefined,
          description: expertForm.description || undefined,
          is_available_for_projects: expertForm.is_available_for_projects,
        })
      });
      showToast("تم إضافة الخبرة", "success"); setShowExpertDialog(false); loadExpertise();
    } catch (e: any) { showToast(e.message || "فشل الحفظ", "error"); }
  };

  const articleColumns: Column<KnowledgeArticle>[] = [
    { key: "title", header: "العنوان", dataLabel: "العنوان" },
    { key: "category", header: "الفئة", dataLabel: "الفئة", render: (i) => categoryLabels[i.category] || i.category },
    { key: "view_count", header: "المشاهدات", dataLabel: "المشاهدات", render: (i) => <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("eye", "", 14)} {i.view_count}</span> },
    { key: "helpful_count", header: "مفيد", dataLabel: "مفيد", render: (i) => <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("thumbs-up", "", 14)} {i.helpful_count}</span> },
    { key: "is_published", header: "الحالة", dataLabel: "الحالة", render: (i) => <span className={`badge ${i.is_published ? "badge-success" : "badge-secondary"}`}>{i.is_published ? "منشور" : "مسودة"}</span> },
    {
      key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "عرض",
              variant: "view",
              onClick: () => viewArticleDetail(i.id)
            },
            ...(canAccess("knowledge", "edit") ? [{
              icon: (i.is_published ? "eye-off" : "upload") as any,
              title: i.is_published ? "إلغاء النشر" : "نشر",
              variant: (i.is_published ? "secondary" : "success") as any,
              onClick: () => handlePublishArticle(i.id, !i.is_published)
            }] : [])
          ]}
        />
      )
    },
  ];

  const expertColumns: Column<Expertise>[] = [
    { key: "employee", header: "الموظف", dataLabel: "الموظف", render: (i) => i.employee?.full_name || "-" },
    { key: "skill_name", header: "المهارة", dataLabel: "المهارة" },
    { key: "proficiency_level", header: "الكفاءة", dataLabel: "الكفاءة", render: (i) => <span className={`badge ${profBadges[i.proficiency_level]}`}>{profLabels[i.proficiency_level] || i.proficiency_level}</span> },
    { key: "years_of_experience", header: "سنوات الخبرة", dataLabel: "الخبرة", render: (i) => `${i.years_of_experience} سنة` },
    { key: "is_available_for_projects", header: "متاح", dataLabel: "متاح", render: (i) => <span className={`badge ${i.is_available_for_projects ? "badge-success" : "badge-secondary"}`}>{i.is_available_for_projects ? "نعم" : "لا"}</span> },
    {
      key: "id", header: "إجراءات", dataLabel: "إجراءات", render: (i) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: "تفاصيل",
              variant: "view",
              onClick: () => { setSelectedExpert(i); setShowExpertDetail(true); }
            }
          ]}
        />
      )
    },
  ];

  const tabs = [
    ...(canAccess("knowledge", "view") ? [{ key: "knowledge", label: "قاعدة المعرفة", icon: "book" }] : []),
    ...(canAccess("expertise", "view") ? [{ key: "expertise", label: "دليل الخبراء", icon: "users-gear" }] : [])
  ];

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title="قاعدة المعرفة"
        titleIcon="book"
        searchInput={
          <SearchableSelect
            options={[]}
            value={searchTerm} onChange={(value) => { setSearchTerm(value?.toLocaleString ?? ''); setCurrentPage(1); }}
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
            {activeTab === "knowledge" && canAccess("knowledge", "create") && <>
              <Button
                onClick={() => { setArticleForm({ title: "", content: "", category: "policy", tags: "", is_published: false }); setShowArticleDialog(true); }}
                variant="primary"
                icon="plus"
              >
                إضافة مقال
              </Button>
            </>}
            {activeTab === "expertise" && canAccess("expertise", "create") &&
              <Button
                onClick={() => { setExpertForm({ employee_id: "", skill_name: "", proficiency_level: "beginner", years_of_experience: "", description: "", is_available_for_projects: true }); setShowExpertDialog(true); }}
                variant="primary"
                icon="plus"
              >
                إضافة خبرة</Button>}
          </>
        }
      />

      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "knowledge" ? (
        <Table columns={articleColumns} data={articles} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد مقالات" isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />
      ) : (
        <Table columns={expertColumns} data={expertise} keyExtractor={(i) => i.id.toString()} emptyMessage="لا يوجد خبراء" isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />
      )}

      {/* Create Article Dialog */}
      <Dialog isOpen={showArticleDialog} onClose={() => setShowArticleDialog(false)} title="إضافة مقال جديد" maxWidth="700px">
        <div className="space-y-4">
          <TextInput label="العنوان *" value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="الفئة"
              value={articleForm.category}
              onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
              options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))}
            />
            <TextInput label="الوسوم" value={articleForm.tags} onChange={(e) => setArticleForm({ ...articleForm, tags: e.target.value })} placeholder="tag1, tag2, ..." />
          </div>
          <Textarea label="المحتوى *" value={articleForm.content} onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })} rows={8} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={articleForm.is_published} onChange={(e) => setArticleForm({ ...articleForm, is_published: e.target.checked })} id="is_published" />
            <Label htmlFor="is_published" className="text-secondary">نشر المقال فوراً</Label>
          </div>
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowArticleDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveArticle} icon="save">حفظ</Button></div>
        </div>
      </Dialog>

      {/* Article Detail */}
      <Dialog isOpen={showArticleDetail} onClose={() => setShowArticleDetail(false)} title="عرض المقال" maxWidth="700px">
        {selectedArticle && <div className="space-y-4">
          <h3 style={{ margin: 0 }}>{selectedArticle.title}</h3>
          <div style={{ display: "flex", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem", alignItems: "center" }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("folder", "", 14)} {categoryLabels[selectedArticle.category]}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("eye", "", 14)} {selectedArticle.view_count}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("thumbs-up", "", 14)} {selectedArticle.helpful_count}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("calendar", "", 14)} {formatDate(selectedArticle.created_at)}</span>
            <span className={`badge ${selectedArticle.is_published ? "badge-success" : "badge-secondary"}`}>{selectedArticle.is_published ? "منشور" : "مسودة"}</span>
          </div>
          {selectedArticle.tags && selectedArticle.tags.length > 0 && <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {selectedArticle.tags.map((t, i) => <span key={i} className="badge badge-info">{t}</span>)}
          </div>}
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, padding: "1rem", background: "var(--bg-secondary)", borderRadius: "8px" }}>{selectedArticle.content}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button variant="secondary" onClick={() => handleMarkHelpful(selectedArticle.id)} icon="thumbs-up">مفيد</Button>
          </div>
        </div>}
      </Dialog>

      {/* Create Expertise Dialog */}
      <Dialog isOpen={showExpertDialog} onClose={() => setShowExpertDialog(false)} title="إضافة خبرة جديدة" maxWidth="550px">
        <div className="space-y-4">
          <Select
            label="الموظف *"
            value={expertForm.employee_id}
            onChange={(e) => setExpertForm({ ...expertForm, employee_id: e.target.value })}
            placeholder="اختر"
            options={employees.map((e: Employee) => ({ value: e.id.toString(), label: e.full_name }))}
          />
          <TextInput label="المهارة *" value={expertForm.skill_name} onChange={(e) => setExpertForm({ ...expertForm, skill_name: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="مستوى الكفاءة"
              value={expertForm.proficiency_level}
              onChange={(e) => setExpertForm({ ...expertForm, proficiency_level: e.target.value })}
              options={Object.entries(profLabels).map(([value, label]) => ({ value, label }))}
            />
            <TextInput label="سنوات الخبرة" type="number" value={expertForm.years_of_experience} onChange={(e) => setExpertForm({ ...expertForm, years_of_experience: e.target.value })} />
          </div>
          <Textarea label="الوصف" value={expertForm.description} onChange={(e) => setExpertForm({ ...expertForm, description: e.target.value })} rows={3} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={expertForm.is_available_for_projects} onChange={(e) => setExpertForm({ ...expertForm, is_available_for_projects: e.target.checked })} id="is_available_for_projects" />
            <Label htmlFor="is_available_for_projects" className="text-secondary">متاح للمشاريع</Label>
          </div>
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowExpertDialog(false)}>إلغاء</Button><Button variant="primary" onClick={handleSaveExpert} icon="save">حفظ</Button></div>
        </div>
      </Dialog>

      {/* Expertise Detail */}
      <Dialog isOpen={showExpertDetail} onClose={() => setShowExpertDetail(false)} title="تفاصيل الخبرة" maxWidth="550px">
        {selectedExpert && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>الموظف:</strong> {selectedExpert.employee?.full_name}</div>
            <div><strong>المهارة:</strong> {selectedExpert.skill_name}</div>
            <div><strong>الكفاءة:</strong> <span className={`badge ${profBadges[selectedExpert.proficiency_level]}`}>{profLabels[selectedExpert.proficiency_level]}</span></div>
            <div><strong>الخبرة:</strong> {selectedExpert.years_of_experience} سنة</div>
            <div><strong>متاح:</strong> <span className={`badge ${selectedExpert.is_available_for_projects ? "badge-success" : "badge-secondary"}`}>{selectedExpert.is_available_for_projects ? "نعم" : "لا"}</span></div>
          </div>
          {selectedExpert.description && <div><strong>الوصف:</strong><p>{selectedExpert.description}</p></div>}
          {selectedExpert.certifications && selectedExpert.certifications.length > 0 && <div>
            <strong>الشهادات:</strong>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              {selectedExpert.certifications.map((c, i) => <span key={i} className="badge badge-info">{c}</span>)}
            </div>
          </div>}
        </div>}
      </Dialog>
    </div>
  );
}
