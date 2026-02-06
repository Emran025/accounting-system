/**
 * @fileoverview Utility functions for the ACCSYSTEM ERP frontend.
 * Provides formatting, validation, and helper utilities used across all modules.
 */

import { getSetting } from "./api";

/**
 * Format a number as currency using the system's configured currency symbol.
 * Uses Arabic (Saudi Arabia) locale for number formatting.
 * 
 * @param amount The numeric value to format (can be string, number, null, or undefined)
 * @returns Formatted currency string (e.g., "1,234.56 ر.س")
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = parseFloat(String(amount)) || 0;
  const symbol = getSetting('currency_symbol', 'ر.س');

  return num.toLocaleString("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " " + symbol;
}

/**
 * Format a date string to Arabic (Saudi Arabia) locale.
 * 
 * @param dateStr ISO date string or any parseable date format
 * @returns Formatted date string (e.g., "٢٠٢٦/٠٢/٠٦") or "-" if invalid
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format date with time
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format time string (HH:mm format)
 */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "-";
  try {
    // Handle both "HH:mm" and "HH:mm:ss" formats
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

/**
 * Escape HTML special characters to prevent XSS attacks.
 * Creates a temporary DOM element to leverage browser's built-in escaping.
 * 
 * @param text The raw text to escape
 * @returns HTML-safe string
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get current date formatted for display
 */
export function getCurrentDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return now.toLocaleDateString("ar-SA", options);
}

/**
 * Get current date and time formatted for display
 */
export function getCurrentDateTime(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return now.toLocaleString("ar-SA", options);
}

/**
 * Get role badge text in Arabic
 */
export function getRoleBadgeText(role: string): string {
  const roleMap: Record<string, string> = {
    admin: "مدير النظام",
    manager: "مشرف",
    cashier: "كاشير",
    accountant: "محاسب",
    viewer: "مشاهد",
  };
  return roleMap[role?.toLowerCase()] || role || "غير محدد";
}

/**
 * Get role badge CSS class
 */
export function getRoleBadgeClass(role: string): string {
  const classMap: Record<string, string> = {
    admin: "badge-primary",
    manager: "badge-success",
    cashier: "badge-info",
    accountant: "badge-warning",
    viewer: "badge-secondary",
  };
  return classMap[role?.toLowerCase()] || "badge-secondary";
}

/**
 * Translate expense category to Arabic
 */
export function translateExpenseCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    rent: "إيجار",
    utilities: "مرافق",
    salaries: "رواتب",
    maintenance: "صيانة",
    supplies: "مستلزمات",
    marketing: "تسويق",
    transport: "نقل",
    other: "أخرى",
  };
  return categoryMap[category?.toLowerCase()] || category || "أخرى";
}


/**
 * Debounce function for rate-limiting frequent calls (e.g., search inputs).
 * Delays execution until after `wait` milliseconds have elapsed since the last call.
 * 
 * @param func The function to debounce
 * @param wait Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
}

/**
 * Parse number safely
 */
export function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

