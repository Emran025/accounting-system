import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAPI } from '@/lib/api';
import { showToast } from '@/components/ui';

const mockedFetchAPI = vi.mocked(fetchAPI);
const mockedShowToast = vi.mocked(showToast);

describe('useSettingsStore', () => {
    let useSettingsStore: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
        const mod = await import('@/stores/useSettingsStore');
        useSettingsStore = mod.useSettingsStore;
    });

    it('has correct initial state', () => {
        const state = useSettingsStore.getState();
        expect(state.settings).toBeDefined();
        expect(state.isLoaded).toBeDefined();
    });

    it('loads settings from API', async () => {
        const mockSettings = {
            company_name: 'Test Corp',
            currency: 'SAR',
            language: 'ar',
        };
        mockedFetchAPI.mockResolvedValueOnce(mockSettings);

        await useSettingsStore.getState().loadSettings();

        const state = useSettingsStore.getState();
        expect(state.settings).toMatchObject(mockSettings);
        expect(state.isLoaded).toBe(true);
    });

    it('handles load failure gracefully', async () => {
        mockedFetchAPI.mockRejectedValueOnce(new Error('fail'));

        await useSettingsStore.getState().loadSettings();

        const state = useSettingsStore.getState();
        expect(state.isLoaded).toBe(false);
    });
});
