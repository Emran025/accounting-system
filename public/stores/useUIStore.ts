import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

interface UIState {
    // Legacy sidebar state
    sidebarCollapsed: boolean;
    moduleSidebarCollapsed: boolean;
    theme: 'light' | 'dark';

    // SideNavigationBar state
    sideNavCollapsed: boolean;
    sideNavWidth: number;
    openedSectionCollapsed: boolean;
    systemMenuSectionCollapsed: boolean;
    favoritesSectionCollapsed: boolean;
    recentScreens: string[];
    favoriteScreens: string[];
    autoCollapseOnNavigate: boolean;
    expandedFolders: string[];

    // Legacy actions
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleModuleSidebar: () => void;
    setModuleSidebarCollapsed: (collapsed: boolean) => void;
    setTheme: (theme: 'light' | 'dark') => void;

    // SideNavigationBar actions
    setSideNavCollapsed: (collapsed: boolean) => void;
    toggleSideNav: () => void;
    setSideNavWidth: (width: number) => void;
    toggleSection: (section: 'opened' | 'systemMenu' | 'favorites') => void;
    addRecentScreen: (path: string) => void;
    clearRecentScreens: () => void;
    addFavorite: (path: string) => void;
    removeFavorite: (path: string) => void;
    isFavorite: (path: string) => boolean;
    setAutoCollapseOnNavigate: (enabled: boolean) => void;
    toggleFolder: (folderKey: string) => void;
    setExpandedFolders: (folders: string[]) => void;
    removeRecentScreen: (path: string) => void;
}

const MAX_RECENT_SCREENS = 10;

export const useUIStore = create<UIState>()(
    persist(
        devtools(
            (set, get) => ({
                // Legacy state
                sidebarCollapsed: false,
                moduleSidebarCollapsed: false,
                theme: 'light',

                // SideNavigationBar state
                sideNavCollapsed: false,
                sideNavWidth: 280,
                openedSectionCollapsed: false,
                systemMenuSectionCollapsed: false,
                favoritesSectionCollapsed: false,
                recentScreens: [],
                favoriteScreens: [],
                autoCollapseOnNavigate: false,
                expandedFolders: [],

                // Legacy actions
                toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
                setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
                toggleModuleSidebar: () => set((state) => ({ moduleSidebarCollapsed: !state.moduleSidebarCollapsed })),
                setModuleSidebarCollapsed: (collapsed) => set({ moduleSidebarCollapsed: collapsed }),
                setTheme: (theme) => set({ theme }),

                // SideNavigationBar actions
                setSideNavCollapsed: (collapsed) => set({ sideNavCollapsed: collapsed }),
                toggleSideNav: () => set((state) => ({ sideNavCollapsed: !state.sideNavCollapsed })),

                setSideNavWidth: (width) => set({ sideNavWidth: Math.max(200, Math.min(420, width)) }),

                toggleSection: (section) => {
                    const map = {
                        opened: 'openedSectionCollapsed',
                        systemMenu: 'systemMenuSectionCollapsed',
                        favorites: 'favoritesSectionCollapsed',
                    } as const;
                    const key = map[section];
                    set((state) => ({ [key]: !state[key] }));
                },

                addRecentScreen: (path) => set((state) => {
                    const filtered = state.recentScreens.filter((s) => s !== path);
                    return { recentScreens: [path, ...filtered].slice(0, MAX_RECENT_SCREENS) };
                }),

                clearRecentScreens: () => set({ recentScreens: [] }),

                addFavorite: (path) => set((state) => {
                    if (state.favoriteScreens.includes(path)) return state;
                    return { favoriteScreens: [...state.favoriteScreens, path] };
                }),

                removeFavorite: (path) => set((state) => ({
                    favoriteScreens: state.favoriteScreens.filter((s) => s !== path),
                })),

                isFavorite: (path) => get().favoriteScreens.includes(path),

                setAutoCollapseOnNavigate: (enabled) => set({ autoCollapseOnNavigate: enabled }),

                toggleFolder: (folderKey) => set((state) => {
                    const isExpanded = state.expandedFolders.includes(folderKey);
                    return {
                        expandedFolders: isExpanded
                            ? state.expandedFolders.filter((k) => k !== folderKey)
                            : [...state.expandedFolders, folderKey],
                    };
                }),

                setExpandedFolders: (folders) => set({ expandedFolders: folders }),

                removeRecentScreen: (path) => set((state) => ({
                    recentScreens: state.recentScreens.filter((s) => s !== path),
                })),
            }),
            { name: 'ui-store' }
        ),
        {
            name: 'accsystem-ui',
            partialize: (state) => ({
                sidebarCollapsed: state.sidebarCollapsed,
                moduleSidebarCollapsed: state.moduleSidebarCollapsed,
                theme: state.theme,
                sideNavCollapsed: state.sideNavCollapsed,
                sideNavWidth: state.sideNavWidth,
                openedSectionCollapsed: state.openedSectionCollapsed,
                systemMenuSectionCollapsed: state.systemMenuSectionCollapsed,
                favoritesSectionCollapsed: state.favoritesSectionCollapsed,
                recentScreens: state.recentScreens,
                favoriteScreens: state.favoriteScreens,
                autoCollapseOnNavigate: state.autoCollapseOnNavigate,
                expandedFolders: state.expandedFolders,
            }),
        }
    )
);
