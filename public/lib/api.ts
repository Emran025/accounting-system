import { API_ENDPOINTS } from "./endpoints";
export {
  formatDate,
  escapeHtml,
  getRoleBadgeText,
  getRoleBadgeClass,
  getArabicDate,
  generateBarcode,
  generateQRCode
} from "./utils";

const getApiBase = () => {
  const envBase = process.env.NEXT_PUBLIC_API_BASE;
  if (!envBase || envBase === 'undefined' || envBase === 'null') {
    return 'http://127.0.0.1:8000/api';
  }
  return envBase;
};

const API_BASE = getApiBase();

if (!process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_BASE === 'undefined') {
  console.warn('NEXT_PUBLIC_API_BASE is not defined or is "undefined". Using fallback: ' + API_BASE);
}

/**
 * Standard API response structure for the application.
 */
export interface APIResponse {
  /** Indicates if the operation was successful */
  success?: boolean;
  /** Human-readable message (often in Arabic) */
  message?: string;
  /** Primary record ID if applicable */
  id?: number | string;
  /** Additional data fields returned by the server */
  [key: string]: unknown;
}

/**
 * Options for the fetchAPI utility.
 */
interface FetchOptions {
  /** HTTP method to use */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** JSON string for the request body */
  body?: string;
  /** Custom headers to include */
  headers?: Record<string, string>;
}

/**
 * Core utility for making authenticated requests to the Laravel backend.
 * Handles API base URL resolution, CSRF/Session token injection, and unified error handling.
 * 
 * @param action The API endpoint path (relative to the base API URL)
 * @param options Configuration for the fetch request
 * @returns A promise resolving to the standard APIResponse structure
 */
export async function fetchAPI(
  action: string,
  options?: FetchOptions
): Promise<APIResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options?.headers,
  };

  // Add session token to headers if it exists
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sessionToken');
    if (token) {
      headers['X-Session-Token'] = token;
    }
  }

  const fetchOptions: RequestInit = {
    method: options?.method || 'GET',
    headers: headers,
    credentials: 'include',
  };

  if (options?.body) {
    fetchOptions.body = options.body;
  }

  try {
    const cleanAction = action
      .replace(/^\//, "") // Remove leading slash
      .replace(/^api\//, "") // Remove api/ prefix
      .replace(/^\?/, ""); // Remove leading ? if any

    // Laravel uses RESTful paths.
    // Ensure we don't have double slashes if action is empty
    const url = cleanAction ? `${API_BASE}/${cleanAction}` : API_BASE;

    const response = await fetch(url as string, fetchOptions);

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      return { success: false, message: 'Unauthorized' };
    }

    if (!response.ok) {
      try {
        const errData = await response.json();
        return {
          success: false,
          message: errData.message || `HTTP Error ${response.status}`,
        };
      } catch {
        return { success: false, message: `HTTP Error ${response.status}` };
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, message: 'Connection error. Please try again.' };
  }
}

/**
 * Global settings cache for the application
 */
let systemSettings: any = null;

/**
 * Fetches and caches system-wide settings from the server.
 * This should be ideally called during the application's initialization phase.
 * 
 * @returns Promise resolving to the settings object or null if failed
 */
export async function initSystemSettings() {
  if (systemSettings) return systemSettings;
  try {
    const result = await fetchAPI(API_ENDPOINTS.SYSTEM.SETTINGS.INDEX);
    if (result.success && result.settings) {
      systemSettings = result.settings;
      return systemSettings;
    }
  } catch (e) {
    console.error("Failed to initialize system settings", e);
  }
  return null;
}

/**
 * Get a setting value by key
 */
export function getSetting(key: string, defaultValue: any = null): any {
  if (!systemSettings) return defaultValue;
  return systemSettings[key] !== undefined ? systemSettings[key] : defaultValue;
}


