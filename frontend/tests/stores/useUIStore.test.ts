import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/useUIStore';

describe('useUIStore', () => {
    beforeEach(() => {
        // Reset to defaults
        useUIStore.setState({
            sidebarCollapsed: false,
            moduleSidebarCollapsed: false,
            theme: 'light',
        });
    });

    it('has correct initial state', () => {
        const state = useUIStore.getState();
        expect(state.sidebarCollapsed).toBe(false);
        expect(state.moduleSidebarCollapsed).toBe(false);
        expect(state.theme).toBe('light');
    });

    it('toggles sidebar collapsed state', () => {
        const store = useUIStore.getState();
        store.toggleSidebar();
        expect(useUIStore.getState().sidebarCollapsed).toBe(true);
        store.toggleSidebar();
        expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    it('sets sidebar collapsed directly', () => {
        useUIStore.getState().setSidebarCollapsed(true);
        expect(useUIStore.getState().sidebarCollapsed).toBe(true);
        useUIStore.getState().setSidebarCollapsed(false);
        expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    it('toggles module sidebar collapsed state', () => {
        const store = useUIStore.getState();
        store.toggleModuleSidebar();
        expect(useUIStore.getState().moduleSidebarCollapsed).toBe(true);
        store.toggleModuleSidebar();
        expect(useUIStore.getState().moduleSidebarCollapsed).toBe(false);
    });

    it('sets module sidebar collapsed directly', () => {
        useUIStore.getState().setModuleSidebarCollapsed(true);
        expect(useUIStore.getState().moduleSidebarCollapsed).toBe(true);
    });

    it('sets theme', () => {
        useUIStore.getState().setTheme('dark');
        expect(useUIStore.getState().theme).toBe('dark');
        useUIStore.getState().setTheme('light');
        expect(useUIStore.getState().theme).toBe('light');
    });

    it('sidebar and module sidebar are independent', () => {
        useUIStore.getState().setSidebarCollapsed(true);
        expect(useUIStore.getState().moduleSidebarCollapsed).toBe(false);

        useUIStore.getState().setModuleSidebarCollapsed(true);
        expect(useUIStore.getState().sidebarCollapsed).toBe(true);
        expect(useUIStore.getState().moduleSidebarCollapsed).toBe(true);
    });
});
