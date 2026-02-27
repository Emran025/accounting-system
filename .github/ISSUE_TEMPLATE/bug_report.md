---
name: "🐛 Bug Report (Markdown)"
about: "Report a defect. Use this template if the YAML form templates are not available in your workflow."
labels: ["type: bug", "status: needs-triage"]
---

## Bug Description

Provide a clear, precise description of the defect. Explain what is happening and why it is incorrect.

## Affected Module

Identify which ERP module(s) are affected (e.g., General Ledger, Sales/POS, Payroll, HR, Inventory, AR/AP, ZATCA, Dashboard, Authentication, Organisational Structure, Bank Reconciliation).

## Severity

- [ ] 🔴 Critical — System crash, data loss, or security breach
- [ ] 🟠 High — Major feature broken, no workaround
- [ ] 🟡 Medium — Feature partially broken, workaround exists
- [ ] 🟢 Low — Minor inconvenience, cosmetic issue

## Steps to Reproduce

Provide the exact, minimal sequence of steps to reproduce the bug, starting from a known state.

1. ...
2. ...
3. ...
4. ...

## Expected Behaviour

Describe what should happen instead.

## Actual Behaviour

Describe what currently happens.

## Is This a Regression?

- [ ] Yes — This previously worked
- [ ] No — This has never worked
- [ ] Unknown

## Environment

- **Operating System:**
- **PHP Version:**
- **Laravel Version:**
- **Node.js Version:**
- **MySQL Version:**
- **Browser (if frontend issue):**
- **ACCSYSTEM Version / Commit:**

## Error Logs

If applicable, paste relevant error output from `backend/storage/logs/laravel.log` or the browser console.

```
(paste logs here)
```

## Screenshots

If applicable, attach screenshots that demonstrate the problem.

## Additional Context

Any other information that may help diagnose the issue.

---

## Checklist

- [ ] I have searched existing issues and confirmed this is not a duplicate.
- [ ] I am using a supported version of ACCSYSTEM ERP.
- [ ] I have provided all the information requested above.
