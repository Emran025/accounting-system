"use client";

import { useI18n, catalogText, catalogMessage } from "@/lib/i18n";
import { PageSubHeader } from "@/components/layout";
import { ActionButtons, Button, Column, Dialog, Label, TabNavigation, Table, showToast } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/select";
import { RichTextContent, RichTextEditor } from "@/components/rich-text-editor/RichTextEditor";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import type { Employee } from "@/types";
import { useEffect, useState } from "react";

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

const categoryLabels: Record<string, string> = { policy: catalogMessage("common.general.policy"), procedure: catalogMessage("common.general.action"), best_practice: catalogMessage("common.general.bestPractice"), faq: catalogMessage("common.general.frequentlyAskedQuestions"), training: catalogMessage("common.general.training"), other: catalogMessage("common.general.other") };
const profLabels: Record<string, string> = { beginner: catalogMessage("common.general.beginner"), intermediate: catalogMessage("common.general.average"), advanced: catalogMessage("common.general.advanced"), expert: catalogMessage("common.general.expert") };
const profBadges: Record<string, string> = { beginner: "badge-secondary", intermediate: "badge-info", advanced: "badge-warning", expert: "badge-success" };

export function KnowledgeBase() {
    const { t: i18n } = useI18n();
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
      const res: any = await fetchAPI(`${API_ENDPOINTS.HUMAN_CAPITAL.KNOWLEDGE.BASE}?${q}`);
      setArticles(res.data || []); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast(i18n.catalog["common.general.failedLoadArticles"], "error"); }
    finally { setIsLoading(false); }
  };

  const loadExpertise = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchAPI(`${API_ENDPOINTS.HUMAN_CAPITAL.EXPERTISE.BASE}?page=${currentPage}`);
      setExpertise(res.data || []); setTotalPages(Number(res.last_page) || 1);
    } catch { showToast(i18n.catalog["common.general.failedLoadExperts"], "error"); }
    finally { setIsLoading(false); }
  };

  const handleSaveArticle = async () => {
    const articleText = articleForm.content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!articleForm.title || !articleText) { showToast(i18n.catalog["common.general.pleaseFillRequiredFields.alternative2"], "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HUMAN_CAPITAL.KNOWLEDGE.BASE, {
        method: "POST", body: JSON.stringify({
          title: articleForm.title, content: articleForm.content, category: articleForm.category,
          tags: articleForm.tags ? articleForm.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
          is_published: articleForm.is_published,
        })
      });
      showToast(i18n.catalog["common.general.articleCreated"], "success"); setShowArticleDialog(false); loadArticles();
    } catch (e: any) { showToast(e.message || i18n.catalog["common.general.failedSave"], "error"); }
  };

  const viewArticleDetail = async (id: number) => {
    try {
      const res: any = await fetchAPI(API_ENDPOINTS.HUMAN_CAPITAL.KNOWLEDGE.withId(id));
      setSelectedArticle(res.data || res); setShowArticleDetail(true);
    } catch { showToast(i18n.catalog["common.general.failedLoadDetails"], "error"); }
  };

  const handlePublishArticle = async (id: number, publish: boolean) => {
    try {
      await fetchAPI(API_ENDPOINTS.HUMAN_CAPITAL.KNOWLEDGE.withId(id), { method: "PUT", body: JSON.stringify({ is_published: publish }) });
      showToast(publish ? i18n.catalog["common.general.articlePublished"] : i18n.catalog["common.general.unpublished"], "success"); loadArticles();
    } catch (e: any) { showToast(e.message || i18n.catalog["common.general.updateFailed"], "error"); }
  };

  const handleMarkHelpful = async (id: number) => {
    try {
      await fetchAPI(API_ENDPOINTS.HUMAN_CAPITAL.KNOWLEDGE.HELPFUL(id), { method: "POST" });
      showToast(i18n.catalog["common.general.thankYouYourRating"], "success");
      if (selectedArticle && selectedArticle.id === id) {
        setSelectedArticle({ ...selectedArticle, helpful_count: selectedArticle.helpful_count + 1 });
      }
    } catch { }
  };

  const handleSaveExpert = async () => {
    if (!expertForm.employee_id || !expertForm.skill_name) { showToast(i18n.catalog["common.general.pleaseFillRequiredFields.alternative2"], "error"); return; }
    try {
      await fetchAPI(API_ENDPOINTS.HUMAN_CAPITAL.EXPERTISE.BASE, {
        method: "POST", body: JSON.stringify({
          employee_id: Number(expertForm.employee_id), skill_name: expertForm.skill_name,
          proficiency_level: expertForm.proficiency_level,
          years_of_experience: expertForm.years_of_experience ? Number(expertForm.years_of_experience) : undefined,
          description: expertForm.description || undefined,
          is_available_for_projects: expertForm.is_available_for_projects,
        })
      });
      showToast(i18n.catalog["common.general.experienceAdded"], "success"); setShowExpertDialog(false); loadExpertise();
    } catch (e: any) { showToast(e.message || i18n.catalog["common.general.failedSave"], "error"); }
  };

  const articleColumns: Column<KnowledgeArticle>[] = [
    { key: "title", header: i18n.catalog["common.general.title"], dataLabel: i18n.catalog["common.general.title"] },
    { key: "category", header: i18n.catalog["common.general.category"], dataLabel: i18n.catalog["common.general.category"], render: (i) => categoryLabels[i.category] || i.category },
    { key: "view_count", header: i18n.catalog["common.general.views"], dataLabel: i18n.catalog["common.general.views"], render: (i) => <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("eye", "", 14)} {i.view_count}</span> },
    { key: "helpful_count", header: i18n.catalog["common.general.helpful"], dataLabel: i18n.catalog["common.general.helpful"], render: (i) => <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("thumbs-up", "", 14)} {i.helpful_count}</span> },
    { key: "is_published", header: i18n.catalog["common.general.status.alternative2"], dataLabel: i18n.catalog["common.general.status.alternative2"], render: (i) => <span className={`badge ${i.is_published ? "badge-success" : "badge-secondary"}`}>{i.is_published ? i18n.catalog["common.general.published"] : i18n.catalog["common.general.draft"]}</span> },
    {
      key: "id", header: i18n.catalog["common.general.actions.alternative2"], dataLabel: i18n.catalog["common.general.actions.alternative2"], render: (i) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: i18n.catalog["common.general.view"],
              variant: "view",
              onClick: () => viewArticleDetail(i.id)
            },
            ...(canAccess("knowledge", "edit") ? [{
              icon: (i.is_published ? "eye-off" : "upload") as any,
              title: i.is_published ? i18n.catalog["common.general.unpublish"] : i18n.catalog["common.general.publish"],
              variant: (i.is_published ? "secondary" : "success") as any,
              onClick: () => handlePublishArticle(i.id, !i.is_published)
            }] : [])
          ]}
        />
      )
    },
  ];

  const expertColumns: Column<Expertise>[] = [
    { key: "employee", header: i18n.catalog["common.general.employee.alternative3"], dataLabel: i18n.catalog["common.general.employee.alternative3"], render: (i) => i.employee?.full_name || "-" },
    { key: "skill_name", header: i18n.catalog["common.general.skill"], dataLabel: i18n.catalog["common.general.skill"] },
    { key: "proficiency_level", header: i18n.catalog["common.general.competency"], dataLabel: i18n.catalog["common.general.competency"], render: (i) => <span className={`badge ${profBadges[i.proficiency_level]}`}>{profLabels[i.proficiency_level] || i.proficiency_level}</span> },
    { key: "years_of_experience", header: i18n.catalog["common.general.yearsExperience"], dataLabel: i18n.catalog["common.general.experience"], render: (i) => catalogText(i18n, "common.general.year.alternative2", { value0: i.years_of_experience }) },
    { key: "is_available_for_projects", header: i18n.catalog["common.general.available"], dataLabel: i18n.catalog["common.general.available"], render: (i) => <span className={`badge ${i.is_available_for_projects ? "badge-success" : "badge-secondary"}`}>{i.is_available_for_projects ? i18n.catalog["common.general.yes"] : i18n.catalog["common.general.no"]}</span> },
    {
      key: "id", header: i18n.catalog["common.general.actions.alternative2"], dataLabel: i18n.catalog["common.general.actions.alternative2"], render: (i) => (
        <ActionButtons
          actions={[
            {
              icon: "eye",
              title: i18n.catalog["common.general.details"],
              variant: "view",
              onClick: () => { setSelectedExpert(i); setShowExpertDetail(true); }
            }
          ]}
        />
      )
    },
  ];

  const tabs = [
    ...(canAccess("knowledge", "view") ? [{ key: "knowledge", label: i18n.catalog["common.general.knowledgeBase"], icon: "book" }] : []),
    ...(canAccess("expertise", "view") ? [{ key: "expertise", label: i18n.catalog["common.general.expertGuide"], icon: "users-gear" }] : [])
  ];

  return (
    <div className="sales-card animate-fade">
      <PageSubHeader
        title={i18n.catalog["common.general.knowledgeBase"]}
        titleIcon="book"
        searchInput={
          <SearchableSelect
            options={[]}
            value={searchTerm} onChange={(value) => { setSearchTerm(value?.toLocaleString ?? ''); setCurrentPage(1); }}
            onSearch={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder={i18n.catalog["common.general.search"]}
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
                {i18n.catalog["common.general.addArticle"]}</Button>
            </>}
            {activeTab === "expertise" && canAccess("expertise", "create") &&
              <Button
                onClick={() => { setExpertForm({ employee_id: "", skill_name: "", proficiency_level: "beginner", years_of_experience: "", description: "", is_available_for_projects: true }); setShowExpertDialog(true); }}
                variant="primary"
                icon="plus"
              >
                {i18n.catalog["common.general.addExperience"]}</Button>}
          </>
        }
      />

      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "knowledge" ? (
        <Table columns={articleColumns} data={articles} keyExtractor={(i) => i.id.toString()} emptyMessage={i18n.catalog["common.general.noArticles"]} isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />
      ) : (
        <Table columns={expertColumns} data={expertise} keyExtractor={(i) => i.id.toString()} emptyMessage={i18n.catalog["common.general.noExperts"]} isLoading={isLoading} pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }} />
      )}

      {/* Create Article Dialog */}
      <Dialog isOpen={showArticleDialog} onClose={() => setShowArticleDialog(false)} title={i18n.catalog["common.general.addNewArticle"]} maxWidth="700px">
        <div className="space-y-4">
          <TextInput label={i18n.catalog["common.general.address"]} value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={i18n.catalog["common.general.category"]}
              value={articleForm.category}
              onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
              options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))}
            />
            <TextInput label={i18n.catalog["common.general.tags"]} value={articleForm.tags} onChange={(e) => setArticleForm({ ...articleForm, tags: e.target.value })} placeholder={i18n.catalog["common.general.tag1Tag2"]} />
          </div>
          <RichTextEditor
            label={i18n.catalog["common.general.content"]}
            value={articleForm.content}
            onChange={(content) => setArticleForm({ ...articleForm, content })}
            placeholder="اكتب المقالة، وأضف العناوين والجداول والتنسيقات التي تحتاجها…"
            minHeight={360}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={articleForm.is_published} onChange={(e) => setArticleForm({ ...articleForm, is_published: e.target.checked })} id="is_published" />
            <Label htmlFor="is_published" className="text-secondary">{i18n.catalog["common.general.publishArticleImmediately"]}</Label>
          </div>
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowArticleDialog(false)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={handleSaveArticle} icon="save">{i18n.catalog["common.general.save"]}</Button></div>
        </div>
      </Dialog>

      {/* Article Detail */}
      <Dialog isOpen={showArticleDetail} onClose={() => setShowArticleDetail(false)} title={i18n.catalog["common.general.viewArticle"]} maxWidth="700px">
        {selectedArticle && <div className="space-y-4">
          <h3 style={{ margin: 0 }}>{selectedArticle.title}</h3>
          <div style={{ display: "flex", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem", alignItems: "center" }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("folder", "", 14)} {categoryLabels[selectedArticle.category]}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("eye", "", 14)} {selectedArticle.view_count}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("thumbs-up", "", 14)} {selectedArticle.helpful_count}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getIcon("calendar", "", 14)} {formatDate(selectedArticle.created_at)}</span>
            <span className={`badge ${selectedArticle.is_published ? "badge-success" : "badge-secondary"}`}>{selectedArticle.is_published ? i18n.catalog["common.general.published"] : i18n.catalog["common.general.draft"]}</span>
          </div>
          {selectedArticle.tags && selectedArticle.tags.length > 0 && <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {selectedArticle.tags.map((t, i) => <span key={i} className="badge badge-info">{t}</span>)}
          </div>}
          <div style={{ padding: "1rem", background: "var(--bg-secondary)", borderRadius: "8px" }}>
            <RichTextContent html={selectedArticle.content} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button variant="secondary" onClick={() => handleMarkHelpful(selectedArticle.id)} icon="thumbs-up">{i18n.catalog["common.general.helpful"]}</Button>
          </div>
        </div>}
      </Dialog>

      {/* Create Expertise Dialog */}
      <Dialog isOpen={showExpertDialog} onClose={() => setShowExpertDialog(false)} title={i18n.catalog["common.general.addNewExperience"]} maxWidth="550px">
        <div className="space-y-4">
          <Select
            label={i18n.catalog["common.general.employee"]}
            value={expertForm.employee_id}
            onChange={(e) => setExpertForm({ ...expertForm, employee_id: e.target.value })}
            placeholder={i18n.catalog["common.general.select"]}
            options={employees.map((e: Employee) => ({ value: e.id.toString(), label: e.full_name }))}
          />
          <TextInput label={i18n.catalog["common.general.skill.alternative2"]} value={expertForm.skill_name} onChange={(e) => setExpertForm({ ...expertForm, skill_name: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={i18n.catalog["common.general.competencyLevel"]}
              value={expertForm.proficiency_level}
              onChange={(e) => setExpertForm({ ...expertForm, proficiency_level: e.target.value })}
              options={Object.entries(profLabels).map(([value, label]) => ({ value, label }))}
            />
            <TextInput label={i18n.catalog["common.general.yearsExperience"]} type="number" value={expertForm.years_of_experience} onChange={(e) => setExpertForm({ ...expertForm, years_of_experience: e.target.value })} />
          </div>
          <Textarea label={i18n.catalog["common.general.description.alternative2"]} value={expertForm.description} onChange={(e) => setExpertForm({ ...expertForm, description: e.target.value })} rows={3} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={expertForm.is_available_for_projects} onChange={(e) => setExpertForm({ ...expertForm, is_available_for_projects: e.target.checked })} id="is_available_for_projects" />
            <Label htmlFor="is_available_for_projects" className="text-secondary">{i18n.catalog["common.general.availableProjects"]}</Label>
          </div>
          <div className="flex justify-end gap-2" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}><Button variant="secondary" onClick={() => setShowExpertDialog(false)}>{i18n.catalog["common.general.cancel"]}</Button><Button variant="primary" onClick={handleSaveExpert} icon="save">{i18n.catalog["common.general.save"]}</Button></div>
        </div>
      </Dialog>

      {/* Expertise Detail */}
      <Dialog isOpen={showExpertDetail} onClose={() => setShowExpertDetail(false)} title={i18n.catalog["common.general.experienceDetails"]} maxWidth="550px">
        {selectedExpert && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>{i18n.catalog["common.general.employee.alternative2"]}</strong> {selectedExpert.employee?.full_name}</div>
            <div><strong>{i18n.catalog["common.general.skill.alternative3"]}</strong> {selectedExpert.skill_name}</div>
            <div><strong>{i18n.catalog["common.general.competency.alternative2"]}</strong> <span className={`badge ${profBadges[selectedExpert.proficiency_level]}`}>{profLabels[selectedExpert.proficiency_level]}</span></div>
            <div><strong>{i18n.catalog["common.general.experience.alternative2"]}</strong> {selectedExpert.years_of_experience} {i18n.catalog["common.general.year"]}</div>
            <div><strong>{i18n.catalog["common.general.available.alternative2"]}</strong> <span className={`badge ${selectedExpert.is_available_for_projects ? "badge-success" : "badge-secondary"}`}>{selectedExpert.is_available_for_projects ? i18n.catalog["common.general.yes"] : i18n.catalog["common.general.no"]}</span></div>
          </div>
          {selectedExpert.description && <div><strong>{i18n.catalog["common.general.description"]}</strong><p>{selectedExpert.description}</p></div>}
          {selectedExpert.certifications && selectedExpert.certifications.length > 0 && <div>
            <strong>{i18n.catalog["common.general.certificates"]}</strong>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              {selectedExpert.certifications.map((c, i) => <span key={i} className="badge badge-info">{c}</span>)}
            </div>
          </div>}
        </div>}
      </Dialog>
    </div>
  );
}
