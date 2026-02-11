// Authentication utilities - migrated from common.js

import { fetchAPI } from "./api";
import { API_ENDPOINTS } from "./endpoints";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Represents a user in the system.
 */
export interface User {
  /** Unique user identifier */
  id: number;
  /** Login username */
  username: string;
  /** Full display name */
  full_name: string;
  /** Primary role slug (e.g., 'admin', 'cashier') */
  role: string;
  /** Reference to role ID in database */
  role_id: number;
  /** Account status */
  is_active: boolean;
  /** Optional reference to manager for approvals */
  manager_id?: number;
}

/**
 * Represents a module-specific permission for the current user.
 */
export interface Permission {
  /** The module name/slug (e.g., 'sales', 'hr') */
  module: string;
  /** Permission to read module data */
  can_view: boolean;
  /** Permission to create new records */
  can_create: boolean;
  /** Permission to modify existing records */
  can_edit: boolean;
  /** Permission to remove records */
  can_delete: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  permissions: Permission[];
}

// Module access mapping for RBAC
const moduleAccessMap: Record<string, string> = {
  "dashboard": "dashboard",
  "sales": "sales",
  "deferred_sales": "deferred_sales",
  "revenues": "revenues",
  "products": "products",
  "purchases": "purchases",
  "expenses": "expenses",
  "users": "users",
  "ar_customers": "ar_customers",
  "settings": "settings",
  "general_ledger": "general_ledger",
  "chart_of_accounts": "chart_of_accounts",
  "journal_vouchers": "journal_vouchers",
  "reports": "reports",
  "audit_trail": "audit_trail",
  "batch_processing": "batch_processing",
  "ap_suppliers": "ap_suppliers",
  "ap_supplier": "ap_suppliers",
  "hr": "hr",
};

/**
 * Check if user can access a specific module
 */
export function canAccess(
  permissions: Permission[],
  module: string,
  action: "view" | "create" | "edit" | "delete" = "view"
): boolean {
  if (!Array.isArray(permissions)) return false;

  const moduleName = moduleAccessMap[module] || module;
  const permission = permissions.find((p) => p.module === moduleName);

  if (!permission) return false;

  switch (action) {
    case "view":
      return permission.can_view;
    case "create":
      return permission.can_create;
    case "edit":
      return permission.can_edit;
    case "delete":
      return permission.can_delete;
    default:
      return false;
  }
}

/**
 * Get user from localStorage
 */
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;

  const userStr = localStorage.getItem("user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Get permissions from localStorage
 */
export function getStoredPermissions(): Permission[] {
  if (typeof window === "undefined") return [];

  const permStr = localStorage.getItem("userPermissions");
  if (!permStr) return [];

  try {
    return JSON.parse(permStr);
  } catch {
    return [];
  }
}

/**
 * Store user and permissions in localStorage
 */
export function storeAuth(user: User, permissions: Permission[], token?: string): void {
  if (typeof window === "undefined") return;

  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("userPermissions", JSON.stringify(permissions));
  localStorage.setItem("userRole", user.role);
  if (token) {
    localStorage.setItem("sessionToken", token);
  }
}

/**
 * Clear authentication data
 */
export function clearAuth(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("user");
  localStorage.removeItem("userPermissions");
  localStorage.removeItem("userRole");
  localStorage.removeItem("sessionToken");
}

/**
 * Validates the current session with the backend.
 * Synchronizes local authentication state with the server's response.
 * Delegated to useAuthStore.
 * 
 * @returns {Promise<AuthState>} Updated authentication state
 */
export async function checkAuth(): Promise<AuthState> {
  const store = useAuthStore.getState();
  await store.checkAuth();
  const { user, permissions, isAuthenticated } = store;

  return {
    isAuthenticated,
    user,
    permissions
  };
}

/**
 * Login user
 * Delegated to useAuthStore.
 */
export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  const store = useAuthStore.getState();
  const result = await store.login(username, password);

  if (result.success) {
    return {
      success: true,
      user: store.user || undefined
    };
  }

  return {
    success: false,
    error: result.error
  };
}

/**
 * Logout user
 * Delegated to useAuthStore.
 */
export async function logout(): Promise<void> {
  await useAuthStore.getState().logout();
}

/**
 * Filters the main navigation links based on the user's view permissions.
 * Implements RBAC (Role-Based Access Control) at the UI level.
 * 
 * @param {Permission[]} permissions List of permissions for the current user
 * @returns {Array<{ href: string; icon: string; label: string; module: string }>} Filtered links
 */
export function getSidebarLinks(permissions: Permission[]): Array<{
  href: string;
  icon: string;
  label: string;
  module: string;
}> {
  const allLinks = [
    { href: "/system/dashboard", icon: "dashboard", label: "لوحة التحكم", module: "dashboard" },
    { href: "/sales/sales", icon: "cart", label: "المبيعات", module: "sales" },
    { href: "/sales/deferred_sales", icon: "receipt", label: "المبيعات الآجلة", module: "deferred_sales" },
    { href: "/sales/revenues", icon: "trending-up", label: "الإيرادات", module: "revenues" },
    { href: "/inventory/products", icon: "box", label: "المنتجات", module: "products" },
    { href: "/purchases/purchases", icon: "shopping-bag", label: "المشتريات", module: "purchases" },
    { href: "/purchases/expenses", icon: "credit-card", label: "المصروفات", module: "expenses" },
    { href: "/hr/employees", icon: "user", label: "الموظفين", module: "Workforce-Management" },
    { href: "/hr/payroll", icon: "banknote", label: "الرواتب والمستحقات", module: "payroll" },
    { href: "/ar_customers", icon: "user-plus", label: "عملاء الآجل", module: "ar_customers" },
    { href: "/finance/general_ledger", icon: "book-open", label: "دفتر الأستاذ", module: "general_ledger" },
    { href: "/finance/chart_of_accounts", icon: "sitemap", label: "دليل الحسابات", module: "chart_of_accounts" },
    { href: "/finance/journal_vouchers", icon: "file-signature", label: "سندات القيد", module: "journal_vouchers" },
    { href: "/finance/fiscal_periods", icon: "calendar", label: "الفترات المالية", module: "fiscal_periods" },
    { href: "/finance/accrual_accounting", icon: "timer", label: "المحاسبة الاستحقاقية", module: "accrual_accounting" },
    { href: "/finance/reconciliation", icon: "scale", label: "التسوية البنكية", module: "reconciliation" },
    { href: "/finance/assets", icon: "landmark", label: "الأصول", module: "assets" },
    { href: "/system/reports", icon: "pie-chart", label: "الميزانية والتقارير", module: "reports" },
    { href: "/system/audit_trail", icon: "activity", label: "سجل التدقيق", module: "audit_trail" },
    { href: "/system/recurring_transactions", icon: "repeat", label: "المعاملات المتكررة", module: "recurring_transactions" },
    { href: "/system/batch_processing", icon: "layers", label: "المعالجة الدفعية", module: "batch_processing" },
    { href: "/suppliers", icon: "truck", label: "الموردين", module: "ap_suppliers" },
    { href: "/finance/ap_ledger", icon: "hand-coins", label: "مدفوعات الموردين", module: "ap_supplier" },
    { href: "/system/settings", icon: "settings", label: "الإعدادات", module: "settings" },
  ];

  return allLinks.filter((link) => canAccess(permissions, link.module, "view"));
}

