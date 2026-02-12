import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────────

export interface AppError {
    id: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    source?: string;       // e.g. 'payroll-store', 'api', 'auth'
    timestamp: number;
    dismissed: boolean;
    details?: string;      // stack trace or extra info
}

interface ErrorState {
    errors: AppError[];
    lastError: AppError | null;

    /** Push a new error into the global log. Returns the generated error ID. */
    addError: (error: Omit<AppError, 'id' | 'timestamp' | 'dismissed'>) => string;

    /** Mark an error as dismissed (keeps it in history). */
    dismissError: (id: string) => void;

    /** Remove all dismissed errors from the list. */
    clearDismissed: () => void;

    /** Clear every error. */
    clearAll: () => void;

    /** Get only active (non-dismissed) errors. */
    activeErrors: () => AppError[];
}

// ─── Helpers ────────────────────────────────────────────────────

let errorCounter = 0;

function generateErrorId(): string {
    errorCounter += 1;
    return `err_${Date.now()}_${errorCounter}`;
}

// ─── Store ──────────────────────────────────────────────────────

export const useErrorStore = create<ErrorState>()(
    devtools(
        (set, get) => ({
            errors: [],
            lastError: null,

            addError: (partial) => {
                const newError: AppError = {
                    ...partial,
                    id: generateErrorId(),
                    timestamp: Date.now(),
                    dismissed: false,
                };

                set(state => ({
                    errors: [newError, ...state.errors].slice(0, 50), // keep last 50
                    lastError: newError,
                }));

                return newError.id;
            },

            dismissError: (id) => {
                set(state => ({
                    errors: state.errors.map(e =>
                        e.id === id ? { ...e, dismissed: true } : e
                    ),
                }));
            },

            clearDismissed: () => {
                set(state => ({
                    errors: state.errors.filter(e => !e.dismissed),
                }));
            },

            clearAll: () => set({ errors: [], lastError: null }),

            activeErrors: () => get().errors.filter(e => !e.dismissed),
        }),
        { name: 'error-store' }
    )
);
