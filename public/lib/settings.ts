import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Fetches and caches system-wide settings from the server.
 * This should be ideally called during the application's initialization phase.
 * 
 * @returns Promise resolving to the settings object or null if failed
 */
export async function initSystemSettings() {
    return useSettingsStore.getState().initSettings();
}

/**
 * Get a setting value by key
 */
export function getSetting(key: string, defaultValue: any = null): any {
    return useSettingsStore.getState().getSetting(key, defaultValue);
}
