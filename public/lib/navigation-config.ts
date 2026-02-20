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
    icon: "dashboard",
    links: [
      { href: "/system/dashboard", icon: "dashboard", label: "لوحة التحكم", description: "نظرة عامة شاملة على النظام", module: "dashboard" },
      { href: "/system/modules-status", icon: "check-circle", label: "حالة الوحدات", description: "حالة جميع وحدات النظام", module: "dashboard" },
      { href: "/system/reports", icon: "pie-chart", label: "التقارير والتحليلات", description: "تقارير مالية وتحليلات متقدمة", module: "reports" },
      { href: "/system/audit_trail", icon: "activity", label: "سجل التدقيق", description: "تتبع جميع العمليات", module: "audit_trail" },
      { href: "/system/recurring_transactions", icon: "repeat", label: "المعاملات المتكررة", description: "جدولة العمليات الآلية", module: "recurring_transactions" },
      { href: "/system/batch_processing", icon: "layers", label: "المعالجة الدفعية", description: "معالجة دفعات البيانات", module: "batch_processing" },
      { href: "/system/settings", icon: "settings", label: "إعدادات النظام", description: "تكوين النظام والتفضيلات", module: "settings" },
      { href: "/system/dashboard", icon: "user-cog", label: "إدارة المستخدمين", description: "المستخدمين والصلاحيات (قريباً)", module: "users" },
      { href: "/system/dashboard", icon: "bell", label: "الإشعارات", description: "مركز الإشعارات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "file-search", label: "سجلات النظام", description: "سجلات الأخطاء والأحداث (قريباً)", module: "dashboard" },
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
      { href: "/sales/deferred_sales", icon: "receipt", label: "المبيعات الآجلة", description: "مبيعات بالتقسيط والآجل", module: "deferred_sales" },
      { href: "/sales/revenues", icon: "trending-up", label: "الإيرادات", description: "تسجيل الإيرادات المتنوعة", module: "revenues" },
      { href: "/ar_customers", icon: "user-plus", label: "العملاء", description: "قاعدة بيانات العملاء", module: "ar_customers" },
      { href: "/finance/ar_ledger", icon: "book-open", label: "أستاذ العملاء", description: "حسابات القبض والأرصدة", module: "ar_customers" },
      { href: "/system/dashboard", icon: "cart", label: "عروض الأسعار", description: "إنشاء عروض الأسعار (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "cart", label: "أوامر البيع", description: "إدارة طلبات البيع (قريباً)", module: "dashboard" },
      { href: "/sales/returns", icon: "history", label: "المرتجعات", description: "مرتجعات المبيعات", module: "returns" },
      { href: "/system/dashboard", icon: "tags", label: "قوائم الأسعار", description: "إدارة الأسعار والخصومات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "coins", label: "العمولات", description: "عمولات المبيعات (قريباً)", module: "dashboard" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // المشتريات والموردين - Purchases & Procurement
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "purchases",
    label: "المشتريات والموردين",
    icon: "shopping-bag",
    links: [
      { href: "/purchases/purchases", icon: "shopping-bag", label: "فواتير المشتريات", description: "إدارة فواتير الشراء", module: "purchases" },
      { href: "/purchases/expenses", icon: "credit-card", label: "المصروفات", description: "تسجيل المصروفات التشغيلية", module: "expenses" },
      { href: "/ap_suppliers", icon: "truck", label: "الموردين", description: "قاعدة بيانات الموردين", module: "ap_suppliers" },
      { href: "/finance/ap_ledger", icon: "hand-coins", label: "أستاذ الموردين", description: "حسابات الدفع والأرصدة", module: "ap_suppliers" },
      { href: "/system/dashboard", icon: "cart", label: "طلبات الشراء", description: "إنشاء طلبات الشراء (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "cart", label: "أوامر الشراء", description: "إدارة أوامر الشراء (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "history", label: "مرتجعات المشتريات", description: "إدارة المرتجعات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "calendar", label: "جدول الدفعات", description: "جدولة المدفوعات (قريباً)", module: "dashboard" },
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
      { href: "/system/dashboard", icon: "bar-chart-3", label: "مستويات المخزون", description: "متابعة الكميات المتاحة (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "landmark", label: "المستودعات", description: "إدارة المخازن والفروع (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "refresh", label: "التحويلات", description: "تحويل بين المستودعات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "clipboard-check", label: "تسوية المخزون", description: "جرد وتسوية المخزون (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "tags", label: "التصنيفات", description: "تصنيفات المنتجات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "ruler", label: "وحدات القياس", description: "إدارة وحدات القياس (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "eye", label: "تقارير المخزون", description: "تقارير وتحليلات المخزون (قريباً)", module: "dashboard" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // المالية والمحاسبة - Finance & Accounting
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "finance",
    label: "المالية والمحاسبة",
    icon: "coins",
    links: [
      { href: "/finance/chart_of_accounts", icon: "sitemap", label: "دليل الحسابات", description: "هيكل شجرة الحسابات", module: "chart_of_accounts" },
      { href: "/finance/general_ledger", icon: "book-open", label: "دفتر الأستاذ العام", description: "السجل المالي الشامل", module: "general_ledger" },
      { href: "/finance/journal_vouchers", icon: "file-signature", label: "سندات القيد", description: "القيود اليومية والمحاسبية", module: "journal_vouchers" },
      { href: "/finance/fiscal_periods", icon: "calendar", label: "الفترات المالية", description: "إدارة السنوات والفترات", module: "fiscal_periods" },
      { href: "/finance/accrual_accounting", icon: "timer", label: "المحاسبة الاستحقاقية", description: "الاستحقاقات والمقدمات", module: "accrual_accounting" },
      { href: "/finance/reconciliation", icon: "scale", label: "التسوية البنكية", description: "مطابقة الحسابات البنكية", module: "reconciliation" },
      { href: "/finance/assets", icon: "landmark", label: "الأصول الثابتة", description: "إدارة الأصول والإهلاك", module: "assets" },
      { href: "/system/dashboard", icon: "wallet", label: "الميزانيات", description: "التخطيط والميزانيات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "building", label: "مراكز التكلفة", description: "توزيع التكاليف (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "trending-up", label: "التدفق النقدي", description: "إدارة السيولة (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "shield-check", label: "الضرائب (VAT/ZATCA)", description: "إدارة الضرائب (قريباً)", module: "dashboard" },
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
      // Core HR Management
      { href: "/hr/employees", icon: "user", label: "الموظفين", description: "قاعدة بيانات الموظفين", module: "employees" },
      { href: "/hr/expat-management", icon: "globe", label: "إدارة المغتربين", description: "إدارة الوثائق والتصاريح للموظفين المغتربين", module: "employees" },
      { href: "/hr/employee-assets", icon: "laptop", label: "أصول الموظفين", description: "إدارة المعدات والأصول المخصصة للموظفين", module: "employees" },
      { href: "/hr/contracts", icon: "file-contract", label: "العقود والاتفاقيات", description: "إدارة عقود العمل والاتفاقيات", module: "employees" },

      // Talent Acquisition
      { href: "/hr/recruitment", icon: "user-plus", label: "التوظيف والمرشحين", description: "نظام تتبع المتقدمين للوظائف", module: "recruitment" },
      { href: "/hr/onboarding", icon: "user-check", label: "التوظيف والإنهاء", description: "عمليات التوظيف وإنهاء الخدمة", module: "onboarding" },

      // Workforce Strategy
      { href: "/hr/contingent-workers", icon: "briefcase", label: "العمالة المؤقتة", description: "إدارة المقاولين والاستشاريين", module: "contingent" },

      // Legal & Compliance
      { href: "/hr/qa-compliance", icon: "shield-check", label: "الجودة والامتثال", description: "إدارة الامتثال والتدقيق الداخلي", module: "compliance" },

      // Time, Attendance & Scheduling
      { href: "/hr/attendance", icon: "clock", label: "الحضور والانصراف", description: "تتبع الدوام وتقرير الساعات", module: "attendance" },
      { href: "/hr/scheduling", icon: "calendar-days", label: "جدولة القوى العاملة", description: "جدولة المناوبات والتحسين", module: "scheduling" },
      { href: "/hr/leave", icon: "calendar", label: "الإجازات", description: "إدارة طلبات الإجازات والغياب", module: "leave" },

      // Employee Relations & Services
      { href: "/hr/employee-relations", icon: "scale", label: "علاقات الموظفين", description: "إدارة الشكاوى والانضباط", module: "relations" },
      { href: "/hr/travel-expenses", icon: "plane", label: "السفر والمصروفات", description: "طلبات السفر وتقارير المصروفات", module: "travel" },
      { href: "/hr/loans", icon: "hand-holding-usd", label: "القروض المالية", description: "إدارة قروض الموظفين", module: "loans" },
      { href: "/hr/communications", icon: "bullhorn", label: "الاتصالات المؤسسية", description: "الإعلانات والاستطلاعات", module: "communications" },

      // Performance & Talent Development
      { href: "/hr/performance", icon: "chart-line", label: "الأداء والأهداف", description: "إدارة الأهداف وتقييمات الأداء", module: "performance" },
      { href: "/hr/learning", icon: "graduation-cap", label: "التدريب والتعلم", description: "نظام إدارة التعلم (LMS)", module: "learning" },
      { href: "/hr/succession", icon: "sitemap", label: "التخطيط للخلافة", description: "تخطيط الخلافة والمسار الوظيفي", module: "succession" },

      // Compensation & Benefits
      { href: "/hr/compensation", icon: "money-bill-wave", label: "إدارة التعويضات", description: "تخطيط الرواتب والمزايا", module: "compensation" },
      { href: "/hr/benefits", icon: "heart", label: "المزايا والاستحقاقات", description: "إدارة خطط المزايا", module: "benefits" },

      // Payroll
      { href: "/hr/payroll", icon: "banknote", label: "الرواتب", description: "إدارة مسيرات الرواتب والاعتمادات", module: "payroll" },
      { href: "/hr/payroll-components", icon: "settings", label: "مكونات الرواتب", description: "إدارة البدلات والاستقطاعات", module: "payroll" },
      { href: "/hr/payroll-integrations", icon: "link", label: "تكاملات ما بعد الرواتب", description: "ملفات البنوك والتكاملات", module: "payroll" },

      // Health, Safety & Well-being
      { href: "/hr/ehs", icon: "hard-hat", label: "الصحة والسلامة", description: "إدارة الحوادث والسلامة", module: "ehs" },
      { href: "/hr/wellness", icon: "heart-pulse", label: "الرفاهية", description: "برامج الصحة والرفاهية", module: "wellness" },

      // Knowledge Management
      { href: "/hr/knowledge-base", icon: "book", label: "قاعدة المعرفة", description: "مكتبة المعرفة وأفضل الممارسات", module: "knowledge" },
      { href: "/hr/expertise", icon: "users-gear", label: "دليل الخبراء", description: "دليل الخبراء الداخليين", module: "expertise" },

      // Employee Portal
      { href: "/hr/employee-portal", icon: "user-cog", label: "البوابة الذاتية", description: "كشوف المرتبات وطلبات الموظف", module: "portal" },
      { href: "/hr/eosb", icon: "calculator", label: "مكافأة نهاية الخدمة", description: "حساب تسويات نهاية الخدمة", module: "eosb" },

      // Phase 2: Advanced Features
      { href: "/hr/documents", icon: "file-signature", label: "المستندات والتقارير", description: "قوالب المستندات وبطاقات الهوية والتقارير", module: "employees" },
      { href: "/hr/biometric", icon: "clock", label: "أجهزة البصمة", description: "إدارة أجهزة الحضور البيومترية", module: "attendance" },
      { href: "/hr/administration", icon: "settings", label: "الإدارة والأدوار", description: "المسميات الوظيفية والصلاحيات وربط المستخدمين", module: "employees" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // التصنيع والإنتاج - Manufacturing (Future)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "manufacturing",
    label: "التصنيع والإنتاج",
    icon: "factory",
    links: [
      { href: "/system/dashboard", icon: "files", label: "قائمة المواد (BOM)", description: "تركيبة المنتجات (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "hammer", label: "أوامر العمل", description: "أوامر الإنتاج (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "cpu", label: "تخطيط الإنتاج", description: "جدولة الإنتاج (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "clipboard-check", label: "مراقبة الجودة", description: "ضبط الجودة (قريباً)", module: "dashboard" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // إدارة المشاريع - Project Management (Future)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "projects",
    label: "إدارة المشاريع",
    icon: "briefcase",
    links: [
      { href: "/system/dashboard", icon: "briefcase", label: "المشاريع", description: "إدارة المشاريع (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "check-square", label: "المهام", description: "متابعة المهام (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "hourglass", label: "تتبع الوقت", description: "تسجيل ساعات العمل (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "hand-coins", label: "تكاليف المشاريع", description: "ميزانية المشاريع (قريباً)", module: "dashboard" },
    ],
  },
];


/**
 * Get a navigation group by its key.
 */
export function getNavigationGroup(key: string): NavigationGroup | undefined {
  return navigationGroups.find((g) => g.key === key);
}
