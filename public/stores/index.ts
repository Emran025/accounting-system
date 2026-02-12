// Phase 1 — Foundation stores
export * from './useAuthStore';
export * from './useSettingsStore';
export * from './useUIStore';

// Phase 2 — Domain stores (HR)
export * from './useEmployeeStore';
export * from './usePayrollStore';

// Phase 3 — Domain stores (Financial & Inventory)
export * from './useProductStore';
export * from './useCustomerStore';
export * from './useSupplierStore';
export * from './usePurchaseStore';
export * from './useFinanceStore';

// Phase 4 — Infrastructure
export { createCRUDStore } from './factories/createCRUDStore';
export type { CRUDState, CRUDConfig } from './factories/createCRUDStore';
export * from './useErrorStore';
