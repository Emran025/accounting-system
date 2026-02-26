"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Employee, EmployeeDocument } from "../../../../types";
import { Label, Button, Dialog } from "@/components/ui";
import { PageSubHeader } from "@/components/layout";
import { useAuthStore } from "@/stores/useAuthStore";

interface DocumentsTabProps {
    id: string;
    employee: Employee;
}

const DOC_TYPE_MAP: Record<string, { label: string; icon: string; color: string }> = {
    cv: { label: "السيرة الذاتية", icon: "fa-file-alt", color: "#6366f1" },
    contract: { label: "عقد عمل", icon: "fa-file-contract", color: "#0ea5e9" },
    certificate: { label: "شهادة", icon: "fa-certificate", color: "#f59e0b" },
    guarantee: { label: "كفالة / ضمان", icon: "fa-handshake", color: "#10b981" },
    id_copy: { label: "صورة هوية", icon: "fa-id-card", color: "#8b5cf6" },
    passport: { label: "جواز سفر", icon: "fa-passport", color: "#ec4899" },
    medical: { label: "تقرير طبي", icon: "fa-notes-medical", color: "#ef4444" },
    other: { label: "أخرى", icon: "fa-paperclip", color: "#64748b" },
};

function getApiBase(): string {
    const envBase = process.env.NEXT_PUBLIC_API_BASE;
    if (!envBase || envBase === "undefined" || envBase === "null") {
        return "http://127.0.0.1:8000/api";
    }
    return envBase;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function DocumentsTab({ id, employee }: DocumentsTabProps) {
    const { canAccess } = useAuthStore();
    const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [uploadForm, setUploadForm] = useState({ document_name: "", document_type: "other" });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadDocuments = useCallback(async () => {
        setDocsLoading(true);
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEE_FILES.LIST(id));
            const data = Array.isArray(res) ? res : (res.data as EmployeeDocument[]) || [];
            setDocuments(data as EmployeeDocument[]);
        } catch (e) {
            console.error("Failed to load documents", e);
        } finally {
            setDocsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleUpload = async () => {
        if (!selectedFile || !uploadForm.document_name.trim()) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("document", selectedFile);
            formData.append("document_name", uploadForm.document_name);
            formData.append("document_type", uploadForm.document_type);

            const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null;
            const headers: Record<string, string> = { Accept: "application/json" };
            if (token) headers["X-Session-Token"] = token;

            const response = await fetch(`${getApiBase()}/${API_ENDPOINTS.HR.EMPLOYEE_FILES.UPLOAD(id).replace(/^\//, "")}`, {
                method: "POST",
                headers,
                credentials: "include",
                body: formData,
            });

            if (response.ok) {
                setShowUploadDialog(false);
                setSelectedFile(null);
                setUploadForm({ document_name: "", document_type: "other" });
                loadDocuments();
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err.message || "فشل رفع الملف");
            }
        } catch (e) {
            console.error(e);
            alert("حدث خطأ في رفع الملف");
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (doc: EmployeeDocument) => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null;
            const headers: Record<string, string> = {};
            if (token) headers["X-Session-Token"] = token;

            const response = await fetch(
                `${getApiBase()}/${API_ENDPOINTS.HR.EMPLOYEE_FILES.DOWNLOAD(id, doc.id).replace(/^\//, "")}`,
                { headers, credentials: "include" }
            );

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = doc.document_name;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title={"مستندات وملفات الموظف " + documents.length}
                titleIcon="user-circle"
                actions={
                    <div className="flex gap-2">
                        {canAccess("employees", "create") && (
                            <Button onClick={() => setShowUploadDialog(true)} icon="plus">
                                رفع مستند جديد
                            </Button>)}
                    </div>
                }
            />
            <div className="settings-wrapper animate-fade">
                {/* Document Grid */}
                {docsLoading ? (
                    <div className="p-5 text-center" style={{ color: 'var(--text-muted)' }}>
                        <i className="fas fa-spinner fa-spin fa-2x"></i>
                        <p style={{ marginTop: '0.5rem' }}>جاري تحميل المستندات...</p>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="section-card sales-card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <i className="fas fa-file-upload fa-3x" style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '1rem' }}></i>
                        <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>لا توجد مستندات</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            لم يتم رفع أي مستندات لهذا الموظف بعد. يمكنك رفع السيرة الذاتية، الشهادات، العقود والمزيد.
                        </p>
                        <Button onClick={() => setShowUploadDialog(true)} icon="plus">
                            رفع أول مستند
                        </Button>
                    </div>
                ) : (
                    <div className="documents-grid">
                        {documents.map((doc) => {
                            const typeInfo = DOC_TYPE_MAP[doc.document_type] || DOC_TYPE_MAP.other;
                            return (
                                <div key={doc.id} className="document-card section-card sales-card">
                                    <div className="document-card-icon" style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                                        <i className={`fas ${typeInfo.icon}`}></i>
                                    </div>
                                    <div className="document-card-content">
                                        <h5 className="document-card-title">{doc.document_name}</h5>
                                        <div className="document-card-meta">
                                            <span className="document-type-badge" style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                                                {typeInfo.label}
                                            </span>
                                            <span className="document-date">
                                                <i className="fas fa-clock"></i>
                                                {new Date(doc.created_at).toLocaleDateString('ar-SA')}
                                            </span>
                                        </div>
                                        {doc.notes && (
                                            <p className="document-notes">{doc.notes}</p>
                                        )}
                                    </div>
                                    <div className="document-card-actions">
                                        <button
                                            className="doc-action-btn download"
                                            onClick={() => handleDownload(doc)}
                                            title="تحميل"
                                        >
                                            <i className="fas fa-download"></i>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Upload Dialog */}
                <Dialog
                    isOpen={showUploadDialog}
                    onClose={() => {
                        setShowUploadDialog(false);
                        setSelectedFile(null);
                        setUploadForm({ document_name: "", document_type: "other" });
                    }}
                    title="رفع مستند جديد"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Drag & Drop Zone */}
                        <div
                            className={`upload-dropzone ${dragActive ? 'active' : ''} ${selectedFile ? 'has-file' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                                }}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                            />
                            {selectedFile ? (
                                <div className="selected-file-info">
                                    <i className="fas fa-file-check" style={{ fontSize: '2rem', color: 'var(--success-color, #10b981)' }}></i>
                                    <div>
                                        <p style={{ fontWeight: 600, margin: '0.25rem 0 0 0' }}>{selectedFile.name}</p>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatFileSize(selectedFile.size)}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="remove-file-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFile(null);
                                        }}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2.5rem', color: 'var(--primary-color)', opacity: 0.7 }}></i>
                                    <p style={{ margin: '0.5rem 0 0', fontWeight: 500 }}>اسحب الملف هنا أو اضغط للاختيار</p>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        PDF, DOC, DOCX, JPG, PNG, XLS, XLSX — حتى 10 ميغابايت
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Document Name */}
                        <div className="form-group">
                            <Label>اسم المستند</Label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="مثال: شهادة البكالوريوس"
                                value={uploadForm.document_name}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, document_name: e.target.value }))}
                            />
                        </div>

                        {/* Document Type */}
                        <div className="form-group">
                            <Label>نوع المستند</Label>
                            <select
                                className="form-control"
                                value={uploadForm.document_type}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, document_type: e.target.value }))}
                            >
                                {Object.entries(DOC_TYPE_MAP).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <Button variant="secondary" onClick={() => setShowUploadDialog(false)}>إلغاء</Button>
                            <Button
                                onClick={handleUpload}
                                disabled={uploading || !selectedFile || !uploadForm.document_name.trim()}
                            >
                                {uploading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin" style={{ marginLeft: '0.4rem' }}></i>
                                        جاري الرفع...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-upload" style={{ marginLeft: '0.4rem' }}></i>
                                        رفع المستند
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </div>
        </div>
    );
}
