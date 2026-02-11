import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchAPI, APIResponse } from '@/lib/api';
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
    [key: string]: any;
}

interface SettingsState {
    settings: SystemSettings | null;
    isLoading: boolean;
    initSettings: () => Promise<SystemSettings | null>;
    getSetting: (key: string, defaultValue?: any) => any;
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
                        set({ settings: result.settings, isLoading: false });
                        return result.settings;
                    }
                } catch (e) {
                    console.error("Failed to initialize system settings", e);
                }
                set({ isLoading: false });
                return null;
            },

            getSetting: (key, defaultValue = null) => {
                const { settings } = get();
                if (!settings) return defaultValue;
                return settings[key] !== undefined ? settings[key] : defaultValue;
            }
        }),
        { name: 'settings-store' }
    )
);
