import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAPI } from '@/lib/api';

const mockedFetchAPI = vi.mocked(fetchAPI);

describe('useSettingsStore', () => {
    let useSettingsStore: typeof import('@/stores/useSettingsStore').useSettingsStore;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
        const mod = await import('@/stores/useSettingsStore');
        useSettingsStore = mod.useSettingsStore;
    });

    it('has correct initial state', () => {
        const state = useSettingsStore.getState();
        expect(state.settings).toBeNull();
        expect(state.isLoading).toBe(false);
    });

    it('loads settings from API via initSettings', async () => {
        const mockSettings = {
            store_name: 'Test Store',
            currency_symbol: 'SAR',
        };
        mockedFetchAPI.mockResolvedValueOnce({
            success: true,
            settings: mockSettings,
        });

        const result = await useSettingsStore.getState().initSettings();

        expect(result).toMatchObject(mockSettings);
        expect(useSettingsStore.getState().settings).toMatchObject(mockSettings);
    });

    it('returns null on initSettings failure', async () => {
        mockedFetchAPI.mockRejectedValueOnce(new Error('fail'));

        const result = await useSettingsStore.getState().initSettings();

        expect(result).toBeNull();
        expect(useSettingsStore.getState().isLoading).toBe(false);
    });

    it('gets a specific setting with getSetting', () => {
        useSettingsStore.setState({
            settings: {
                store_name: 'Mapped Store',
            },
        });

        const name = useSettingsStore.getState().getSetting('store_name');
        const missing = useSettingsStore.getState().getSetting('missing', 'fallback');

        expect(name).toBe('Mapped Store');
        expect(missing).toBe('fallback');
    });
});
