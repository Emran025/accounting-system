import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

interface UIState {
    sidebarCollapsed: boolean;
    moduleSidebarCollapsed: boolean;
    theme: 'light' | 'dark';

    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleModuleSidebar: () => void;
    setModuleSidebarCollapsed: (collapsed: boolean) => void;
    setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>()(
    persist(
        devtools(
            (set) => ({
                sidebarCollapsed: false,
                moduleSidebarCollapsed: false,
                theme: 'light',

                toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
                setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

                toggleModuleSidebar: () => set((state) => ({ moduleSidebarCollapsed: !state.moduleSidebarCollapsed })),
                setModuleSidebarCollapsed: (collapsed) => set({ moduleSidebarCollapsed: collapsed }),

                setTheme: (theme) => set({ theme }),
            }),
            { name: 'ui-store' }
        ),
        {
            name: 'accsystem-ui',
            partialize: (state) => ({
                sidebarCollapsed: state.sidebarCollapsed,
                moduleSidebarCollapsed: state.moduleSidebarCollapsed,
                theme: state.theme,
            }),
        }
    )
);
