import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchAPI } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/endpoints';

interface SystemSettings {
    store_name?: string;
    store_address?: string;
    store_phone?: string;
    store_email?: string;
    tax_number?: string;
    cr_number?: string;
    invoice_size?: 'thermal' | 'a4';
    footer_message?: string;
    currency_symbol?: string;
    [key: string]: unknown;
}

interface SettingsState {
    settings: SystemSettings | null;
    isLoading: boolean;
    initSettings: () => Promise<SystemSettings | null>;
    getSetting: <T = unknown>(key: string, defaultValue?: T) => T;
}

export const useSettingsStore = create<SettingsState>()(
    devtools(
        (set, get) => ({
            settings: null,
            isLoading: false,

            initSettings: async () => {
                // Return existing settings if already loaded
                const current = get().settings;
                if (current) return current;

                set({ isLoading: true });
                try {
                    // Note: ENDPOINTS.SYSTEM.SETTINGS.INDEX is just "/settings" but API call usually needs prefix
                    // The fetchAPI handles base URL prepending.
                    const result = await fetchAPI(API_ENDPOINTS.SYSTEM.SETTINGS.INDEX);
                    if (result.success && result.settings) {
                        set({ settings: result.settings as SystemSettings, isLoading: false });
                        return result.settings as SystemSettings;
                    }
                } catch (e) {
                    console.error("Failed to initialize system settings", e);
                }
                set({ isLoading: false });
                return null;
            },

            getSetting: <T>(key: string, defaultValue?: T): T => {
                const { settings } = get();
                if (!settings) return defaultValue as T;
                return (settings[key] !== undefined ? settings[key] : defaultValue) as T;
            }
        }),
        { name: 'settings-store' }
    )
);
