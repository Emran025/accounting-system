// Navigation Configuration - Defines system groups and their child links

export interface NavigationLink {
  href: string;
  icon: string;
  label: string;
  description: string;
  module: string;
}

export type NavigationItem = NavigationLink | NavigationGroup;

export interface NavigationGroup {
  key: string;
  label: string;
  icon: string;
  items: NavigationItem[];
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
    items: [
      { href: "/system/dashboard", icon: "dashboard", label: "لوحة التحكم", description: "نظرة عامة شاملة على النظام", module: "dashboard" },
      { href: "/system/modules-status", icon: "check-circle", label: "حالة الوحدات", description: "حالة جميع وحدات النظام", module: "dashboard" },
      { href: "/system/organizational-structure", icon: "tree", label: "الهيكل التنظيمي", description: "تخطيط وتهيئة الهيكل التنظيمي للمؤسسة", module: "org_structure" },
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
    items: [
      { href: "/sales/sales", icon: "cart", label: "فواتير المبيعات", description: "إنشاء وإدارة فواتير البيع", module: "sales" },
      { href: "/sales/deferred_sales", icon: "receipt", label: "المبيعات الآجلة", description: "مبيعات بالتقسيط والآجل", module: "deferred_sales" },
      { href: "/sales/revenues", icon: "trending-up", label: "الإيرادات", description: "تسجيل الإيرادات المتنوعة", module: "revenues" },
      { href: "/ar_customers", icon: "user-plus", label: "العملاء", description: "قاعدة بيانات العملاء", module: "ar_customers" },
      { href: "/sales/receipts", icon: "book-open", label: "سندات القبض", description: "مقبوضات أرصدة العملاء", module: "ar_customers" },
      { href: "/system/dashboard", icon: "cart", label: "عروض الأسعار", description: "إنشاء عروض الأسعار (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "cart", label: "أوامر البيع", description: "إدارة طلبات البيع (قريباً)", module: "dashboard" },
      { href: "/sales/returns", icon: "history", label: "مرتجعات المبيعات", description: "إدارة مرتجعات المبيعات", module: "returns" },
      { href: "/purchases/requests", icon: "book-open", label: "طلبات الشراء", description: "إدارة طلبات الشراء أو النقل المخزني وحالتها", module: "ar_customers" },
      //{ href: "/system/dashboard", icon: "tags", label: "قوائم الأسعار", description: "إدارة الأسعار والخصومات (قريباً)", module: "dashboard" },
      { href: "/representatives", icon: "tags", label: "المناديب والمسوقين", description: "إدارة المناديب والمسوقين", module: "representatives" },
      { href: "/system/dashboard", icon: "coins", label: "العمولات", description: "عمولات المبيعات (قريباً)", module: "dashboard" },
      { href: "/system/templates", icon: "coins", label: "إدارة القوالب", description: "إدارة قوالب التصاميم والفواتير وكشوفات الحساب", module: "dashboard" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // المشتريات والموردين - Purchases & Procurement
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "purchases",
    label: "المشتريات والموردين",
    icon: "shopping-bag",
    items: [
      { href: "/purchases/purchases", icon: "shopping-bag", label: "فواتير المشتريات", description: "إدارة فواتير الشراء", module: "purchases" },
      { href: "/purchases/expenses", icon: "credit-card", label: "المصروفات", description: "تسجيل المصروفات التشغيلية", module: "expenses" },
      { href: "/ap_suppliers", icon: "truck", label: "الموردين", description: "قاعدة بيانات الموردين", module: "ap_suppliers" },
      { href: "/finance/ap_ledger", icon: "hand-coins", label: "أستاذ الموردين", description: "حسابات الدفع والأرصدة", module: "ap_suppliers" },
      { href: "/purchases/requests", icon: "cart", label: "طلبات الشراء", description: "إنشاء أو استعراض طلبات الشراء", module: "dashboard" },
      { href: "/system/dashboard", icon: "cart", label: "أوامر الشراء", description: "إدارة أوامر الشراء (قريباً)", module: "dashboard" },
      { href: "/purchases/returns", icon: "history", label: "مردودات المشتريات", description: "إدارة مردودات المشتريات", module: "purchases" },
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
    items: [
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
    items: [
      {
        key: "finance-core",
        label: "المالية والمحاسبة",
        icon: "coins",
        items: [
          { href: "/finance/cost-centers", icon: "building", label: "مراكز التكلفة", description: "إدارة وتوزيع التكاليف على المراكز", module: "chart_of_accounts" },
          { href: "/finance/profit-centers", icon: "trending-up", label: "مراكز الربح", description: "تحليل الربحية حسب الوحدات", module: "chart_of_accounts" },
          { href: "/system/dashboard", icon: "wallet", label: "الميزانيات", description: "التخطيط والميزانيات (قريباً)", module: "dashboard" },
        ]
      },
      {
        key: "finance-reports",
        label: "التقارير المالية",
        icon: "coins",
        items: [
          { href: "/finance/chart_of_accounts", icon: "sitemap", label: "دليل الحسابات", description: "هيكل شجرة الحسابات", module: "chart_of_accounts" },
          { href: "/finance/fiscal_periods", icon: "calendar", label: "الفترات المالية", description: "إدارة السنوات والفترات", module: "fiscal_periods" },
          { href: "/finance/general_ledger", icon: "book-open", label: "دفتر الأستاذ العام", description: "السجل المالي الشامل", module: "general_ledger" },
          { href: "/system/reports", icon: "pie-chart", label: "التقارير والتحليلات", description: "تقارير مالية وتحليلات متقدمة", module: "reports" },
        ]
      },
      {
        key: "finance-trending",
        label: "النقدية والسياسة المالية",
        icon: "",
        items: [
          { href: "/finance/journal_vouchers", icon: "file-signature", label: "سندات القيد", description: "القيود اليومية والمحاسبية", module: "journal_vouchers" },
          { href: "/system/dashboard", icon: "trending-up", label: "التدفق النقدي", description: "إدارة السيولة (قريباً)", module: "dashboard" },
          { href: "/finance/reconciliation", icon: "scale", label: "التسوية البنكية", description: "مطابقة الحسابات البنكية", module: "reconciliation" },
        ]
      },

      // Treasury and Foreign Exchange (FX): Currency master data, exchange operations, and liquidity management
      {
        key: "finance-currency",
        label: "الخزينة والعملات الأجنبية",
        icon: "coins",
        items: [
          // Currency Master Data
          { href: "/finance/currency", icon: "coins", label: "العملات المعتمدة", description: "تعريف وإدارة العملات الأساسية والأجنبية في النظام", module: "currency" },
          // Treasury Rules & Policies
          { href: "/system/dashboard", icon: "coins", label: "السياسات النقدية", description: "هيكلة محددات التقييم وقواعد التعاملات النقدية(قريبا)", module: "monetary_policy" },// /finance/monetary_policy
          // Exchange Rates Tables
          { href: "/system/dashboard", icon: "coins", label: "أسعار الصرف", description: "إدارة جداول أسعار الصرف والسجل التاريخي للتقييم(قريبا)", module: "exchange_rate" },// /finance/exchange_rate
          // Foreign Exchange (FX) Operations
          { href: "/system/dashboard", icon: "coins", label: "عمليات الصرف الأجنبي", description: "تنفيذ وتسوية أوامر بيع وشراء العملات(قريبا)", module: "currency_transfer" },// /finance/currency_transfer
          // FX Transaction Logs
          { href: "/system/dashboard", icon: "coins", label: "سجل العمليات", description: "التتبع التاريخي والرقابة على حركات التداول النقدي(قريبا)", module: "currency_history" },// /finance/currency_history
          // Currency Positions & Liquidity
          { href: "/system/dashboard", icon: "coins", label: "مراكز العملات", description: "مراقبة مستويات السيولة والمراكز المالية لكل عملة(قريبا)", module: "currency_balances" }, // /finance/currency_balances
        ]
      },
      // assets and the investments of the company
      {
        key: "finance-assets-investments",
        label: "الأصول والإستثمارت",
        icon: "",
        items: [
          { href: "/finance/assets", icon: "landmark", label: "الأصول الثابتة", description: "إدارة الأصول والإهلاك", module: "assets" },
          { href: "/system/dashboard", icon: "", label: "الإستثمارات الخارجية (قريباً)", description: "ميزانيات الإسثمارت", module: "investments" }, //in the future
        ]
      },
      // Internal audit and compliance tracking
      {
        key: "finance-audit",
        label: "التدقيق والإمتثال الداخلي",
        icon: "shield-check",
        items: [
          { href: "/system/audit_trail", icon: "activity", label: "سجل التدقيق", description: "تتبع جميع العمليات", module: "audit_trail" },
        ]
      },
      // Corporate obligations (taxes, customs, government cleaning fees and etc.)
      {
        key: "finance-obligations",
        label: "الالتزامات المؤسسية الخارجية",
        icon: "shield",
        items: [
          { href: "/finance/vat-zatca", icon: "shield-check", label: "الضرائب (VAT/ZATCA)", description: "إدارة الضرائب والربط مع زاتكا", module: "dashboard" },
        ]
      },
      //{ href: "/finance/accrual_accounting", icon: "timer", label: "المحاسبة الاستحقاقية", description: "الاستحقاقات والمقدمات", module: "accrual_accounting" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // الموارد البشرية - Human Resources
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "hr",
    label: "الموارد البشرية",
    icon: "users",
    items: [
      {
        key: "hr-core",
        label: "الإدارة الأساسية",
        icon: "users",
        items: [
          { href: "/hr/employees", icon: "user", label: "الموظفين", description: "قاعدة بيانات الموظفين", module: "employees" },
          { href: "/hr/expat-management", icon: "globe", label: "إدارة العمالة الأجنبية", description: "إدارة الوثائق والتصاريح للموظفين العمالة الأجنبية", module: "employees" },
          { href: "/hr/employee-assets", icon: "laptop", label: "أصول الموظفين", description: "إدارة المعدات والأصول المخصصة للموظفين", module: "employees" },
          { href: "/hr/contracts", icon: "file-contract", label: "العقود والاتفاقيات", description: "إدارة عقود العمل والاتفاقيات", module: "employees" },
        ]
      },
      {
        key: "hr-talent",
        label: "التوظيف والمواهب",
        icon: "user-plus",
        items: [
          { href: "/hr/recruitment", icon: "user-plus", label: "التوظيف والمرشحين", description: "نظام تتبع المتقدمين للوظائف", module: "recruitment" },
          { href: "/hr/administration", icon: "settings", label: "الإدارة والأدوار", description: "المسميات الوظيفية والصلاحيات وربط المستخدمين", module: "employees" },
          { href: "/hr/onboarding", icon: "user-check", label: "التهيئة والإنهاء", description: "عمليات التوظيف وإنهاء الخدمة", module: "onboarding" },
          { href: "/hr/contingent-workers", icon: "briefcase", label: "العمالة المؤقتة", description: "إدارة المقاولين والاستشاريين", module: "contingent" },
        ]
      },
      {
        key: "hr-legal",
        label: "الامتثال والعلاقات",
        icon: "shield-check",
        items: [
          { href: "/hr/qa-compliance", icon: "shield-check", label: "الجودة والامتثال", description: "إدارة الامتثال والتدقيق الداخلي", module: "compliance" },
          { href: "/hr/employee-relations", icon: "scale", label: "علاقات الموظفين", description: "إدارة الشكاوى والانضباط", module: "relations" },
          { href: "/hr/communications", icon: "bullhorn", label: "الاتصالات المؤسسية", description: "الإعلانات والاستطلاعات", module: "communications" },
        ]
      },
      {
        key: "hr-time",
        label: "الوقت والحضور",
        icon: "clock",
        items: [
          { href: "/hr/attendance", icon: "clock", label: "الحضور والانصراف", description: "تتبع الدوام وتقرير الساعات", module: "attendance" },
          { href: "/hr/biometric", icon: "clock", label: "أجهزة البصمة", description: "إدارة أجهزة الحضور البيومترية", module: "attendance" },
          { href: "/hr/scheduling", icon: "calendar-days", label: "جدولة القوى العاملة", description: "جدولة المناوبات والتحسين", module: "scheduling" },
          { href: "/hr/leave", icon: "calendar", label: "الإجازات", description: "إدارة طلبات الإجازات والغياب", module: "leave" },
        ]
      },
      {
        key: "hr-development",
        label: "الأداء والتطوير",
        icon: "chart-line",
        items: [
          { href: "/hr/performance", icon: "chart-line", label: "الأداء والأهداف", description: "إدارة الأهداف وتقييمات الأداء", module: "performance" },
          { href: "/hr/learning", icon: "graduation-cap", label: "التدريب والتعلم", description: "نظام إدارة التعلم (LMS)", module: "learning" },
          { href: "/hr/succession", icon: "sitemap", label: "التخطيط للخلافة", description: "تخطيط الخلافة والمسار الوظيفي", module: "succession" },
        ]
      },
      {
        key: "hr-payroll",
        label: "الرواتب والتعويضات",
        icon: "banknote",
        items: [
          { href: "/hr/compensation", icon: "money-bill-wave", label: "إدارة التعويضات", description: "تخطيط الرواتب والمزايا", module: "compensation" },
          { href: "/hr/benefits", icon: "heart", label: "المزايا والاستحقاقات", description: "إدارة خطط المزايا", module: "benefits" },
          { href: "/hr/payroll", icon: "banknote", label: "الرواتب", description: "إدارة مسيرات الرواتب والاعتمادات", module: "payroll" },
          { href: "/hr/payroll-components", icon: "settings", label: "مكونات الرواتب", description: "إدارة البدلات والاستقطاعات", module: "payroll" },
          { href: "/hr/payroll-integrations", icon: "link", label: "الربط البنكي", description: "ملفات البنوك والتكاملات", module: "payroll" },
        ]
      },
      {
        key: "hr-services",
        label: "الخدمات والصحة",
        icon: "heart-pulse",
        items: [
          { href: "/hr/travel-expenses", icon: "plane", label: "السفر والمصروفات", description: "طلبات السفر وتقارير المصروفات", module: "travel" },
          { href: "/hr/loans", icon: "hand-holding-usd", label: "القروض المالية", description: "إدارة قروض الموظفين", module: "loans" },
          { href: "/hr/ehs", icon: "hard-hat", label: "الصحة والسلامة", description: "إدارة الحوادث والسلامة", module: "ehs" },
          { href: "/hr/wellness", icon: "heart-pulse", label: "الرفاهية", description: "برامج الصحة والرفاهية", module: "wellness" },
        ]
      },
      {
        key: "hr-knowledge",
        label: "المعرفة والبوابة",
        icon: "book",
        items: [
          { href: "/hr/knowledge-base", icon: "book", label: "قاعدة المعرفة", description: "مكتبة المعرفة وأفضل الممارسات", module: "knowledge" },
          { href: "/hr/expertise", icon: "users-gear", label: "دليل الخبراء", description: "دليل الخبراء الداخليين", module: "expertise" },
          { href: "/hr/employee-portal", icon: "user-cog", label: "البوابة الذاتية", description: "كشوف المرتبات وطلبات الموظف", module: "portal" },
          { href: "/hr/eosb", icon: "calculator", label: "مكافأة نهاية الخدمة", description: "حساب تسويات نهاية الخدمة", module: "eosb" },
        ]
      },
      {
        key: "advanced",
        label: "ميزات متقدمة",
        icon: "settings",
        items: [
          { href: "/hr/documents", icon: "file-signature", label: "المستندات والتقارير", description: "قوالب المستندات وبطاقات الهوية والتقارير", module: "employees" },
        ]
      },
      // The work of the Groups, Number Range and Interval component
      {
        key: "hr-groups-number-range-interval",
        label: "التجميع ونطاقات الترقيم",
        icon: "",
        items: [
          {
            key: "emp-groups-number-range-interval",
            label: "تجميعات الموظفين",
            icon: "",
            items: [
              { href: "/hr/groups-number-range-interval/employees/add-employees-group", icon: "add", label: "تعريف تجميع", description: "إضافة تجميع جديد", module: "employees" },
              { href: "/hr/groups-number-range-interval/employees/add-number-range-interval", icon: "view", label: "تعريف نطاق", description: "إضافة نطاق جديد", module: "employees" },
              { href: "/hr/groups-number-range-interval/employees/view-employees-groups", icon: "add", label: "عرض تجميعات الموظفين", description: "عرض تجميعات الموظفين", module: "employees" },
              { href: "/hr/groups-number-range-interval/employees/view-number-range-intervals", icon: "view", label: "عرض نطاقات الموظفين", description: "عرض نطاقات الموظفين", module: "employees" },
              { href: "/hr/groups-number-range-interval/employees/assignment", icon: "add", label: "عرض وإضافة الإسنادات", description: "عرض إسنادات  نطاقات الترقيم إلى الموظفين", module: "employees" },
            ]
          },
          // ect 
        ]
      }
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // التصنيع والإنتاج - Manufacturing (Future)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: "manufacturing",
    label: "التصنيع والإنتاج",
    icon: "factory",
    items: [
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
    items: [
      { href: "/system/dashboard", icon: "briefcase", label: "المشاريع", description: "إدارة المشاريع (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "check-square", label: "المهام", description: "متابعة المهام (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "hourglass", label: "تتبع الوقت", description: "تسجيل ساعات العمل (قريباً)", module: "dashboard" },
      { href: "/system/dashboard", icon: "hand-coins", label: "تكاليف المشاريع", description: "ميزانية المشاريع (قريباً)", module: "dashboard" },
    ],
  },
];


export function isNavigationLink(item: NavigationItem): item is NavigationLink {
  return 'href' in item;
}

export function isNavigationGroup(item: NavigationItem): item is NavigationGroup {
  return 'items' in item;
}

export function getAllNavigationLinks(groups: NavigationGroup[] = navigationGroups): NavigationLink[] {
  let allLinks: NavigationLink[] = [];
  for (const group of groups) {
    if (!group.items || group.items.length === 0) continue;
    if (isNavigationLink(group.items[0])) {
      allLinks.push(...(group.items as NavigationLink[]));
    } else {
      allLinks.push(...getAllNavigationLinks(group.items as NavigationGroup[]));
    }
  }
  return allLinks;
}

export function getNavigationGroup(key: string, groups: NavigationGroup[] = navigationGroups): NavigationGroup | undefined {
  for (const group of groups) {
    if (group.key === key) return group;
    if (group.items && group.items.length > 0 && isNavigationGroup(group.items[0])) {
      const found = getNavigationGroup(key, group.items as NavigationGroup[]);
      if (found) return found;
    }
  }
  return undefined;
}
