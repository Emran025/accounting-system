import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAPI } from '@/lib/api';
import { showToast } from '@/components/ui';

const mockedFetchAPI = vi.mocked(fetchAPI);

describe('useAuthStore', () => {
    let useAuthStore: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
        const mod = await import('@/stores/useAuthStore');
        useAuthStore = mod.useAuthStore;
        // Reset to defaults
        useAuthStore.setState({
            user: null,
            permissions: [],
            isAuthenticated: false,
            isLoading: true,
            sessionToken: null,
        });
    });

    describe('initial state', () => {
        it('starts unauthenticated', () => {
            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.permissions).toEqual([]);
            expect(state.isAuthenticated).toBe(false);
            expect(state.isLoading).toBe(true);
        });
    });

    describe('checkAuth', () => {
        it('authenticates user with valid session', async () => {
            const mockUser = { id: 1, name: 'Admin', email: 'admin@test.com' };
            const mockPermissions = [{ module: 'hr', action: 'view' }];
            mockedFetchAPI.mockResolvedValueOnce({
                authenticated: true,
                user: mockUser,
                permissions: mockPermissions,
            });

            await useAuthStore.getState().checkAuth();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockUser);
            expect(state.permissions).toEqual(mockPermissions);
            expect(state.isLoading).toBe(false);
        });

        it('clears auth on failed check', async () => {
            // Set some initial auth state
            useAuthStore.setState({
                user: { id: 1 },
                isAuthenticated: true,
                permissions: [{ module: 'hr' }],
            });

            mockedFetchAPI.mockResolvedValueOnce({
                authenticated: false,
            });

            await useAuthStore.getState().checkAuth();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBeNull();
            expect(state.permissions).toEqual([]);
        });

        it('handles network errors gracefully', async () => {
            mockedFetchAPI.mockRejectedValueOnce(new Error('Network error'));

            await useAuthStore.getState().checkAuth();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.isLoading).toBe(false);
        });
    });

    describe('canAccess', () => {
        it('returns true when permission exists', () => {
            useAuthStore.setState({
                permissions: [
                    { module_key: 'hr', can_view: true, can_create: true, can_edit: true, can_delete: true },
                ],
            });

            const state = useAuthStore.getState();
            expect(state.canAccess('hr', 'view')).toBe(true);
            expect(state.canAccess('hr', 'create')).toBe(true);
        });

        it('returns false when permission is missing', () => {
            useAuthStore.setState({
                permissions: [
                    { module_key: 'hr', can_view: true, can_create: false, can_edit: false, can_delete: false },
                ],
            });

            const state = useAuthStore.getState();
            expect(state.canAccess('hr', 'create')).toBe(false);
            expect(state.canAccess('finance', 'view')).toBe(false);
        });
    });

    describe('logout', () => {
        it('clears state on logout', async () => {
            useAuthStore.setState({
                user: { id: 1 },
                isAuthenticated: true,
                permissions: [{ module: 'hr' }],
            });

            mockedFetchAPI.mockResolvedValueOnce({});

            await useAuthStore.getState().logout();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.permissions).toEqual([]);
        });
    });
});
