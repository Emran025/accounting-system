import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must use dynamic import to get a fresh store per test
const getStore = async () => {
    // Clear module cache to get a fresh Zustand store
    vi.resetModules();
    const mod = await import('@/stores/useErrorStore');
    return mod.useErrorStore;
};

describe('useErrorStore', () => {
    let useErrorStore: Awaited<ReturnType<typeof getStore>>;

    beforeEach(async () => {
        useErrorStore = await getStore();
        useErrorStore.getState().clearAll();
    });

    it('starts with empty errors', () => {
        const state = useErrorStore.getState();
        expect(state.errors).toEqual([]);
        expect(state.lastError).toBeNull();
    });

    it('adds an error with auto-generated id and timestamp', () => {
        const store = useErrorStore.getState();
        const id = store.addError({
            message: 'Something failed',
            severity: 'error',
            source: 'test',
        });

        expect(id).toMatch(/^err_/);
        const state = useErrorStore.getState();
        expect(state.errors).toHaveLength(1);
        expect(state.errors[0]).toMatchObject({
            message: 'Something failed',
            severity: 'error',
            source: 'test',
            dismissed: false,
        });
        expect(state.lastError).toBe(state.errors[0]);
    });

    it('supports all severity levels', () => {
        const store = useErrorStore.getState();
        const severities = ['info', 'warning', 'error', 'critical'] as const;

        severities.forEach((severity) => {
            store.addError({ message: `${severity} msg`, severity });
        });

        const state = useErrorStore.getState();
        expect(state.errors).toHaveLength(4);
    });

    it('dismisses an error by id', () => {
        const store = useErrorStore.getState();
        const id = store.addError({ message: 'dismiss me', severity: 'warning' });

        store.dismissError(id);
        const state = useErrorStore.getState();
        expect(state.errors[0].dismissed).toBe(true);
    });

    it('activeErrors returns only non-dismissed errors', () => {
        const store = useErrorStore.getState();
        store.addError({ message: 'keep', severity: 'info' });
        const id = store.addError({ message: 'dismiss', severity: 'warning' });
        store.dismissError(id);

        const active = useErrorStore.getState().activeErrors();
        expect(active).toHaveLength(1);
        expect(active[0].message).toBe('keep');
    });

    it('clearDismissed removes only dismissed errors', () => {
        const store = useErrorStore.getState();
        store.addError({ message: 'keep', severity: 'info' });
        const id = store.addError({ message: 'dismiss', severity: 'warning' });
        store.dismissError(id);
        store.clearDismissed();

        const state = useErrorStore.getState();
        expect(state.errors).toHaveLength(1);
        expect(state.errors[0].message).toBe('keep');
    });

    it('clearAll removes all errors', () => {
        const store = useErrorStore.getState();
        store.addError({ message: 'a', severity: 'error' });
        store.addError({ message: 'b', severity: 'error' });
        store.clearAll();

        const state = useErrorStore.getState();
        expect(state.errors).toEqual([]);
        expect(state.lastError).toBeNull();
    });

    it('caps errors at 50 entries', () => {
        const store = useErrorStore.getState();
        for (let i = 0; i < 60; i++) {
            store.addError({ message: `error ${i}`, severity: 'error' });
        }

        const state = useErrorStore.getState();
        expect(state.errors).toHaveLength(50);
        // Most recent should be first (prepended)
        expect(state.errors[0].message).toBe('error 59');
    });

    it('stores optional details field', () => {
        const store = useErrorStore.getState();
        store.addError({
            message: 'with details',
            severity: 'critical',
            details: 'Stack trace here',
        });

        const state = useErrorStore.getState();
        expect(state.errors[0].details).toBe('Stack trace here');
    });
});
