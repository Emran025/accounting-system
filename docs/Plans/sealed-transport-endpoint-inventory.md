# Sealed Transport Endpoint Inventory

This inventory is generated before enforcement. Every `/v2` route must later be classified as `sealed-required`, `bootstrap-exempt`, `multipart-policy`, or `stream-policy` in CI.

## Route source files

- `00-auth.php`
- `01-enterprise-core.php`
- `02-commercial.php`
- `03-finance.php`
- `04-supply-chain.php`
- `05-manufacturing.php`
- `06-human-capital.php`
- `07-projects.php`
- `08-assets.php`
- `09-intelligence.php`
- `10-platform.php`
## Direct frontend fetch call sites requiring explicit classification

- `frontend/app/06-human-capital/workforce-admin/employee-master/employees-list/(pages)/add/page.tsx`
- `frontend/app/06-human-capital/workforce-admin/employee-master/employees-list/components/DocumentsTab.tsx`
- `frontend/components/platform/ServerRuntimeGate.tsx`
- `frontend/lib/api.ts`
- `frontend/lib/connection/client-connection.ts`
## Notes

The main JSON path is `frontend/lib/api.ts`. Pairing and policy calls are bootstrap exceptions until the sealed-session contract is implemented. Files, downloads and multipart uploads require an explicit policy rather than an implicit JSON wrapper.
