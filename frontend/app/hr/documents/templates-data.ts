import { TemplateField } from "@/components/template-editor/types";

// ── HR Approved Keys ──
export const HR_APPROVED_KEYS: TemplateField[] = [
    // Common
    { key: "company_name", description: "اسم المؤسسة", type: "string" },
    { key: "company_address", description: "عنوان المؤسسة", type: "string" },
    { key: "company_tax_id", description: "الرقم الضريبي", type: "string" },
    { key: "company_logo", description: "شعار المؤسسة", type: "string" },
    { key: "today_date", description: "تاريخ اليوم", type: "date" },
    { key: "reference_number", description: "الرقم المرجعي", type: "string" },
    // HR Specific
    { key: "employee_name", description: "اسم الموظف", type: "string", templateTypes: ["contract", "clearance", "warning", "id_card", "handover", "certificate", "memo", "other", "employee_certificate", "employee_contract"] },
    { key: "employee_code", description: "الرقم الوظيفي", type: "string", templateTypes: ["contract", "clearance", "warning", "id_card", "handover", "certificate", "other", "employee_certificate", "employee_contract"] },
    { key: "employee_national_id", description: "رقم الهوية الوطنية", type: "string", templateTypes: ["contract", "certificate", "other", "employee_certificate"] },
    { key: "department", description: "القسم", type: "string", templateTypes: ["contract", "clearance", "warning", "id_card", "handover", "certificate", "memo", "other", "employee_certificate"] },
    { key: "role", description: "المسمى الوظيفي", type: "string", templateTypes: ["contract", "clearance", "warning", "id_card", "handover", "certificate", "other", "employee_certificate"] },
    { key: "hire_date", description: "تاريخ التعيين", type: "date", templateTypes: ["contract", "clearance", "warning", "id_card", "certificate", "other", "employee_certificate"] },
    { key: "certificate_date", description: "تاريخ الشهادة", type: "date", templateTypes: ["employee_certificate"] },
    { key: "contract_type", description: "نوع العقد", type: "string", templateTypes: ["contract", "certificate", "employee_contract"] },
    { key: "start_date", description: "تاريخ البدء", type: "date", templateTypes: ["employee_contract"] },
    { key: "end_date", description: "تاريخ الانتهاء", type: "date", templateTypes: ["employee_contract"] },
    { key: "base_salary", description: "الراتب الأساسي", type: "number", templateTypes: ["contract", "employee_contract"] },
    { key: "email", description: "البريد الإلكتروني", type: "string", templateTypes: ["contract", "other"] },
    { key: "phone", description: "رقم الجوال", type: "string", templateTypes: ["contract", "other"] }
];

// ── Mock data for preview ──
export const HR_MOCK_CONTEXT: Record<string, string> = {
    company_name: "شركة النور للتقنية",
    company_address: "شارع التحلية، الرياض",
    company_tax_id: "300123456700003",
    company_logo: "https://via.placeholder.com/150",
    today_date: "2026-02-21",
    reference_number: "HR-2026-00142",
    employee_name: "أحمد محمد العتيبي",
    employee_code: "EMP-0057",
    employee_national_id: "1098765432",
    department: "تقنية المعلومات",
    role: "مطور برمجيات أول",
    hire_date: "2023-06-15",
    certificate_date: "2026-02-21",
    contract_type: "دوام كامل",
    start_date: "2023-06-15",
    end_date: "2025-06-14",
    base_salary: "12,500",
    email: "ahmed.m@alnoor-tech.sa",
    phone: "+966 55 123 4567"
};

// ── Bilingual labels for every template type ──
export const templateTypeLabels: Record<string, string> = {
    contract: "عقد عمل",
    clearance: "نموذج إخلاء طرف",
    warning: "خطاب إنذار",
    id_card: "بطاقة هوية",
    handover: "نموذج تسليم",
    certificate: "شهادة",
    memo: "مذكرة",
    other: "أخرى",
};

// ── Badge colors ──
export const templateTypeBadgeClass: Record<string, string> = {
    contract: "badge-primary",
    clearance: "badge-danger",
    warning: "badge-warning",
    id_card: "badge-info",
    handover: "badge-secondary",
    certificate: "badge-success",
    memo: "badge-default",
    other: "badge-secondary",
};


