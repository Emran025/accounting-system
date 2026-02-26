import { TemplateField } from "@/components/template-editor/types";

export const SYSTEM_APPROVED_KEYS: TemplateField[] = [
    // Common
    { key: "company_name", description: "اسم المؤسسة", type: "string" },
    { key: "company_address", description: "عنوان المؤسسة", type: "string" },
    { key: "company_tax_id", description: "الرقم الضريبي", type: "string" },
    { key: "company_logo", description: "شعار المؤسسة", type: "string" },
    { key: "today_date", description: "تاريخ اليوم", type: "date" },
    { key: "reference_number", description: "الرقم المرجعي", type: "string" },
    // Sales Invoice
    { key: "invoice_number", description: "رقم الفاتورة", type: "string", templateTypes: ["sales_invoice"] },
    { key: "invoice_date", description: "تاريخ الفاتورة", type: "date", templateTypes: ["sales_invoice"] },
    { key: "customer_name", description: "اسم العميل", type: "string", templateTypes: ["sales_invoice", "quotation", "receipt", "customer_statement"] },
    { key: "customer_tax_id", description: "الرقم الضريبي للعميل", type: "string", templateTypes: ["sales_invoice"] },
    { key: "subtotal", description: "المبلغ الإجمالي", type: "number", templateTypes: ["sales_invoice"] },
    { key: "vat_amount", description: "قيمة الضريبة", type: "number", templateTypes: ["sales_invoice"] },
    { key: "total_amount", description: "الإجمالي مع الضريبة", type: "number", templateTypes: ["sales_invoice", "quotation", "purchase_order"] },
    { key: "items", description: "عناصر الفاتورة", type: "list", templateTypes: ["sales_invoice"] },
    // Quotation
    { key: "quotation_number", description: "رقم عرض السعر", type: "string", templateTypes: ["quotation"] },
    { key: "quotation_date", description: "تاريخ العرض", type: "date", templateTypes: ["quotation"] },
    { key: "valid_until", description: "صالح حتى", type: "date", templateTypes: ["quotation"] },
    // Receipt
    { key: "receipt_number", description: "رقم السند", type: "string", templateTypes: ["receipt"] },
    { key: "receipt_date", description: "تاريخ السند", type: "date", templateTypes: ["receipt"] },
    { key: "amount", description: "المبلغ", type: "number", templateTypes: ["receipt", "payment_note"] },
    { key: "payment_method", description: "طريقة الدفع", type: "string", templateTypes: ["receipt", "payment_note"] },
    // Purchase Order
    { key: "po_number", description: "رقم طلب الشراء", type: "string", templateTypes: ["purchase_order"] },
    { key: "po_date", description: "تاريخ الطلب", type: "date", templateTypes: ["purchase_order"] },
    { key: "supplier_name", description: "اسم المورد", type: "string", templateTypes: ["purchase_order"] },
    { key: "supplier_tax_id", description: "الرقم الضريبي للمورد", type: "string", templateTypes: ["purchase_order"] },
    // Customer Statement
    { key: "statement_date", description: "تاريخ الكشف", type: "date", templateTypes: ["customer_statement"] },
    { key: "opening_balance", description: "الرصيد الافتتاحي", type: "number", templateTypes: ["customer_statement"] },
    { key: "closing_balance", description: "الرصيد الختامي", type: "number", templateTypes: ["customer_statement"] },
    { key: "transactions", description: "المعاملات", type: "list", templateTypes: ["customer_statement"] },
    // Payment Note
    { key: "payment_number", description: "رقم السند", type: "string", templateTypes: ["payment_note"] },
    { key: "payment_date", description: "تاريخ السند", type: "date", templateTypes: ["payment_note"] },
    { key: "payee_name", description: "اسم المستلم", type: "string", templateTypes: ["payment_note"] }
];

export const SYSTEM_MOCK_CONTEXT: Record<string, any> = {
    company_name: "شركة النور للتقنية",
    company_address: "شارع التحلية، الرياض",
    company_tax_id: "300123456700003",
    company_logo: "https://via.placeholder.com/150",
    today_date: "2026-02-21",
    reference_number: "REF-2026-001",
    invoice_number: "INV-2026-0001",
    invoice_date: "2026-02-21",
    customer_name: "شركة التقنية المتقدمة",
    customer_tax_id: "300987654300003",
    subtotal: "1,500.00",
    vat_amount: "225.00",
    total_amount: "1,725.00",
    items: [],
    quotation_number: "QT-2026-005",
    quotation_date: "2026-02-21",
    valid_until: "2026-03-21",
    receipt_number: "RC-2026-010",
    receipt_date: "2026-02-21",
    amount: "1,500.00",
    payment_method: "تحويل بنكي",
    po_number: "PO-2026-0089",
    po_date: "2026-02-21",
    supplier_name: "مؤسسة التوريدات",
    supplier_tax_id: "300123999900003",
    statement_date: "2026-02-21",
    opening_balance: "5,000.00",
    closing_balance: "3,500.00",
    transactions: [],
    payment_number: "PN-2026-002",
    payment_date: "2026-02-21",
    payee_name: "مؤسسة الصيانة السريعة"
};

export const templateTypeLabels: Record<string, string> = {
    sales_invoice: "فاتورة مبيعات",
    quotation: "عرض سعر",
    receipt: "سند قبض",
    purchase_order: "أمر شراء",
    customer_statement: "كشف حساب عميل",
    payment_note: "سند صرف / دفع",
    other_system: "أخرى"
};

export const templateTypeBadgeClass: Record<string, string> = {
    sales_invoice: "badge-primary",
    quotation: "badge-info",
    receipt: "badge-success",
    purchase_order: "badge-warning",
    customer_statement: "badge-purple",
    payment_note: "badge-rose",
    other_system: "badge-secondary"
};


