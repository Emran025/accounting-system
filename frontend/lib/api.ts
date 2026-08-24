import { catalogMessage, getActiveLocale } from '@/lib/i18n';
import { API_ENDPOINTS } from './endpoints';
import { API_BASE, PRODUCT_FLAVOR } from './product-flavor';
import { getRuntimeClientApiBase } from './connection/client-connection';
import { getInMemoryAccessToken } from './connection/desktop-credential-vault';
export {
  formatDate,
  escapeHtml,
  getRoleBadgeText,
  getRoleBadgeClass,
  getArabicDate,
  generateBarcode,
  generateQRCode,
} from './utils';

const AUTH_ENDPOINT_SEGMENTS = [
  'v2/check',
  'v2/login',
  'v2/logout',
  'v2/refresh',
  'v2/revoke',
  'auth/check',
  'auth/login',
  'auth/logout',
] as const;

if (!API_BASE && PRODUCT_FLAVOR !== 'client') {
  console.warn(
    catalogMessage('platform.api.nextPublicApiBaseIsNotDefinedIsUndefinedUsingFallback')
  );
}

/**
 * Standard API response structure for the application.
 */
export interface APIResponse<T = any> {
  /** Indicates if the operation was successful */
  success?: boolean;
  /** Localized human-readable message selected by the API request locale. */
  message?: string;
  /** Stable semantic API message key, when the endpoint uses the shared localized response contract. */
  message_key?: string;
  /** Response metadata, including the resolved endpoint locale. */
  meta?: { locale?: string; language_tag?: string; [key: string]: unknown };
  /** Primary record ID if applicable */
  id?: number | string;
  /** Additional data fields returned by the server */
  data?: T;
  [key: string]: unknown;
}

/**
 * Options for the fetchAPI utility.
 */
export interface FetchOptions {
  /** HTTP method to use */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** JSON string or browser multipart body for the request. */
  body?: BodyInit;
  /** Custom headers to include */
  headers?: Record<string, string>;
  /** Prevent session-recovery recursion for auth lifecycle endpoints. */
  skipSessionRecovery?: boolean;
}

/**
 * Core utility for making authenticated requests to the Laravel backend.
 * Handles API base URL resolution, CSRF/Session token injection, and unified error handling.
 *
 * @param action The API endpoint path (relative to the base API URL)
 * @param options Configuration for the fetch request
 * @returns A promise resolving to the standard APIResponse structure
 */
export function createApiRequestHeaders(options?: FetchOptions): Record<string, string> {
  const activeLocale = getActiveLocale();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Language': activeLocale,
    'X-Accore-Locale': activeLocale,
    ...options?.headers,
  };

  const token = getInMemoryAccessToken();
  if (token) headers['X-Session-Token'] = token;

  if (typeof FormData !== 'undefined' && options?.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  return headers;
}

function activeApiBase(): string | undefined {
  return PRODUCT_FLAVOR === 'client' ? getRuntimeClientApiBase() : API_BASE;
}

export async function fetchAPI<T = unknown>(
  action: string,
  options?: FetchOptions
): Promise<APIResponse<T>> {
  const apiBase = activeApiBase();

  if (!apiBase) {
    return {
      success: false,
      message: catalogMessage('platform.product.serverProfileRequiredApiMessage'),
    };
  }

  const headers = createApiRequestHeaders(options);

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
      .replace(/^\//, '') // Remove leading slash
      .replace(/^api\//, '') // Remove api/ prefix
      .replace(/^\?/, ''); // Remove leading ? if any

    const isAuthEndpoint = AUTH_ENDPOINT_SEGMENTS.some((segment) => cleanAction.includes(segment));

    // --- Fast Fail block: Stop all network requests if session is already expired ---
    if (typeof window !== 'undefined' && !options?.skipSessionRecovery) {
      try {
        const { useAuthStore } = await import('@/stores/useAuthStore');
        if (useAuthStore.getState().sessionExpired && !isAuthEndpoint) {
          return {
            success: false,
            message: catalogMessage('platform.api.unauthorizedSessionExpired'),
          };
        }
      } catch (e) {
        // ignore dynamic import errors
      }
    }

    // Laravel uses RESTful paths.
    // Ensure we don't have double slashes if action is empty
    const url = cleanAction ? `${apiBase}/${cleanAction}` : apiBase;

    const response = await fetch(url as string, fetchOptions);

    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined') {
        if (!isAuthEndpoint && !options?.skipSessionRecovery) {
          try {
            const { useAuthStore } = await import('@/stores/useAuthStore');
            const isStillAuth = await useAuthStore.getState().checkAuth(true); // Force sync
            if (!isStillAuth) {
              useAuthStore.getState().setSessionExpired(true);
            }
          } catch (e) {
            const { useAuthStore } = await import('@/stores/useAuthStore');
            useAuthStore.getState().setSessionExpired(true);
          }
        }
      }
      return {
        success: false,
        message:
          response.status === 403
            ? catalogMessage('platform.api.accessDeniedPermissionsSynchronized')
            : catalogMessage('platform.api.unauthorized'),
      };
    }

    if (!response.ok) {
      try {
        const errData = await response.json();
        return {
          success: false,
          message:
            errData.message ||
            catalogMessage('common.general.httpError', { value0: response.status }),
        };
      } catch {
        return {
          success: false,
          message: catalogMessage('common.general.httpError', { value0: response.status }),
        };
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(catalogMessage('platform.api.apiError'), error);
    return {
      success: false,
      message: catalogMessage('platform.api.connectionErrorPleaseTryAgain'),
    };
  }
}
