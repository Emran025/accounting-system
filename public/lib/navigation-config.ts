// Navigation Configuration - Defines system groups and their child links

export interface NavigationLink {
  href: string;
  icon: string;
  label: string;
  description: string;
  module: string;
}

export interface NavigationGroup {
  key: string;
  label: string;
  icon: string;
  links: NavigationLink[];
}

/**
 * Navigation groups aligned with the ERP structure.
 * Each group contains links that belong to that subsystem.
 */
export const navigationGroups: NavigationGroup[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // النظام والإدارة - System Administration
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "dashboard",
    label: "النظام والإدارة",
    icon: "home",
    links: [
      { href: "/system/dashboard", icon: "home", label: "لوحة التحكم", description: "نظرة عامة شاملة على النظام", module: "dashboard" },
      { href: "/system/reports", icon: "eye", label: "التقارير والتحليلات", description: "تقارير مالية وتحليلات متقدمة", module: "reports" },
      { href: "/system/audit_trail", icon: "eye", label: "سجل التدقيق", description: "تتبع جميع العمليات", module: "audit_trail" },
      { href: "/system/recurring_transactions", icon: "check", label: "المعاملات المتكررة", description: "جدولة العمليات الآلية", module: "recurring_transactions" },
      { href: "/system/batch_processing", icon: "check", label: "المعالجة الدفعية", description: "معالجة دفعات البيانات", module: "batch_processing" },
      { href: "/system/settings", icon: "settings", label: "إعدادات النظام", description: "تكوين النظام والتفضيلات", module: "settings" },
      { href: "/system/dashboard", icon: "users", label: "إدارة المستخدمين", description: "المستخدمين والصلاحيات (قريباً)", module: "users" },
      { href: "/system/dashboard", icon: "eye", label: "الإشعارات", description: "مركز الإشعارات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "settings", label: "سجلات النظام", description: "سجلات الأخطاء والأحداث (قريباً)", module: "dashboard" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // المبيعات وعلاقات العملاء - Sales & CRM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "sales",
    label: "المبيعات والعملاء",
    icon: "cart",
    links: [
      { href: "/sales/sales", icon: "cart", label: "فواتير المبيعات", description: "إنشاء وإدارة فواتير البيع", module: "sales" },
      { href: "/sales/deferred_sales", icon: "dollar", label: "المبيعات الآجلة", description: "مبيعات بالتقسيط والآجل", module: "deferred_sales" },
      { href: "/sales/revenues", icon: "dollar", label: "الإيرادات", description: "تسجيل الإيرادات المتنوعة", module: "revenues" },
      { href: "/ar_customers", icon: "users", label: "العملاء", description: "قاعدة بيانات العملاء", module: "ar_customers" },
      { href: "/finance/ar_ledger", icon: "dollar", label: "أستاذ العملاء", description: "حسابات القبض والأرصدة", module: "ar_customers" },
      { href: "/system/dashboard", icon: "cart", label: "عروض الأسعار", description: "إنشاء عروض الأسعار (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "cart", label: "أوامر البيع", description: "إدارة طلبات البيع (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "dollar", label: "المرتجعات", description: "مرتجعات المبيعات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "settings", label: "قوائم الأسعار", description: "إدارة الأسعار والخصومات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "dollar", label: "العمولات", description: "عمولات المبيعات (قريباً)", module: "dashboard" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // المشتريات والموردين - Purchases & Procurement
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "purchases",
    label: "المشتريات والموردين",
    icon: "cart",
    links: [
      { href: "/purchases/purchases", icon: "cart", label: "فواتير المشتريات", description: "إدارة فواتير الشراء", module: "purchases" },
      { href: "/purchases/expenses", icon: "dollar", label: "المصروفات", description: "تسجيل المصروفات التشغيلية", module: "expenses" },
      { href: "/suppliers", icon: "users", label: "الموردين", description: "قاعدة بيانات الموردين", module: "ap_suppliers" },
      { href: "/finance/ap_ledger", icon: "dollar", label: "أستاذ الموردين", description: "حسابات الدفع والأرصدة", module: "ap_suppliers" },
      { href: "/system/dashboard", icon: "cart", label: "طلبات الشراء", description: "إنشاء طلبات الشراء (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "cart", label: "أوامر الشراء", description: "إدارة أوامر الشراء (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "dollar", label: "مرتجعات المشتريات", description: "إدارة المرتجعات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "check", label: "جدول الدفعات", description: "جدولة المدفوعات (قريباً)", module: "dashboard" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // المخزون والمستودعات - Inventory & Warehouse
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "inventory",
    label: "المخزون والمستودعات",
    icon: "box",
    links: [
      { href: "/inventory/products", icon: "box", label: "المنتجات والأصناف", description: "إدارة المنتجات والخدمات", module: "products" },
      { href: "/system/dashboard", icon: "box", label: "مستويات المخزون", description: "متابعة الكميات المتاحة (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "building", label: "المستودعات", description: "إدارة المخازن والفروع (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "cart", label: "التحويلات", description: "تحويل بين المستودعات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "check", label: "تسوية المخزون", description: "جرد وتسوية المخزون (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "settings", label: "التصنيفات", description: "تصنيفات المنتجات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "settings", label: "وحدات القياس", description: "إدارة وحدات القياس (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "eye", label: "تقارير المخزون", description: "تقارير وتحليلات المخزون (قريباً)", module: "dashboard" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // المالية والمحاسبة - Finance & Accounting
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "finance",
    label: "المالية والمحاسبة",
    icon: "dollar",
    links: [
      { href: "/finance/chart_of_accounts", icon: "building", label: "دليل الحسابات", description: "هيكل شجرة الحسابات", module: "chart_of_accounts" },
      { href: "/finance/general_ledger", icon: "dollar", label: "دفتر الأستاذ العام", description: "السجل المالي الشامل", module: "general_ledger" },
      { href: "/finance/journal_vouchers", icon: "dollar", label: "سندات القيد", description: "القيود اليومية والمحاسبية", module: "journal_vouchers" },
      { href: "/finance/fiscal_periods", icon: "dollar", label: "الفترات المالية", description: "إدارة السنوات والفترات", module: "fiscal_periods" },
      { href: "/finance/accrual_accounting", icon: "dollar", label: "المحاسبة الاستحقاقية", description: "الاستحقاقات والمقدمات", module: "accrual_accounting" },
      { href: "/finance/reconciliation", icon: "check", label: "التسوية البنكية", description: "مطابقة الحسابات البنكية", module: "reconciliation" },
      { href: "/finance/assets", icon: "building", label: "الأصول الثابتة", description: "إدارة الأصول والإهلاك", module: "assets" },
      { href: "/system/dashboard", icon: "dollar", label: "الميزانيات", description: "التخطيط والميزانيات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "building", label: "مراكز التكلفة", description: "توزيع التكاليف (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "dollar", label: "التدفق النقدي", description: "إدارة السيولة (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "check", label: "الضرائب (VAT/ZATCA)", description: "إدارة الضرائب (قريباً)", module: "dashboard" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // الموارد البشرية - Human Resources
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "hr",
    label: "الموارد البشرية",
    icon: "users",
    links: [
      { href: "/hr/employees", icon: "users", label: "الموظفين", description: "قاعدة بيانات الموظفين", module: "employees" },
      { href: "/hr/payroll", icon: "dollar", label: "الرواتب", description: "إدارة المسيرات (قريباً)", module: "payroll" },
      { href: "/system/dashboard", icon: "check", label: "الحضور والانصراف", description: "تتبع الدوام (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "check", label: "الإجازات", description: "إدارة الإجازات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "building", label: "الأقسام", description: "الهيكل التنظيمي (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "users", label: "المسميات الوظيفية", description: "إدارة الوظائف (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "eye", label: "تقييم الأداء", description: "تقييمات الموظفين (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "check", label: "التدريب", description: "برامج التدريب (قريباً)", module: "dashboard" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // التصنيع والإنتاج - Manufacturing (Future)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "manufacturing",
    label: "التصنيع والإنتاج",
    icon: "settings",
    links: [
      { href: "/system/dashboard", icon: "box", label: "قائمة المواد (BOM)", description: "تركيبة المنتجات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "cart", label: "أوامر العمل", description: "أوامر الإنتاج (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "check", label: "تخطيط الإنتاج", description: "جدولة الإنتاج (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "eye", label: "مراقبة الجودة", description: "ضبط الجودة (قريباً)", module: "dashboard" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // إدارة المشاريع - Project Management (Future)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "projects",
    label: "إدارة المشاريع",
    icon: "check",
    links: [
      { href: "/system/dashboard", icon: "building", label: "المشاريع", description: "إدارة المشاريع (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "check", label: "المهام", description: "متابعة المهام (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "eye", label: "تتبع الوقت", description: "تسجيل ساعات العمل (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "dollar", label: "تكاليف المشاريع", description: "ميزانية المشاريع (قريباً)", module: "dashboard" },
    ],
  },
];

/**
 * Get a navigation group by its key.
 */
export function getNavigationGroup(key: string): NavigationGroup | undefined {
  return navigationGroups.find((g) => g.key === key);
}
