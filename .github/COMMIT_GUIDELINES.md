# Git Workflow & Commit Message Guidelines

To keep our Git history clean, clear, and collaborative, please follow these rules for branching and writing commit messages. **Every contribution counts!** 

---

## Branching Strategy

> ** Never commit directly to `main`!**  
> Always work on a new branch.

1. **Sync with `main`**  
   Make sure your local `main` is up-to-date:
   ```bash
   git checkout main
   git pull upstream main
   ```

2. **Create a Descriptive Branch**  
   Use a prefix to describe your change:
   - `feat/...` — New features (`feat/user-avatars`)
   - `fix/...` — Bug fixes (`fix/login-redirect-loop`)
   - `docs/...` — Documentation (`docs/update-readme`)
   - `chore/...` — Maintenance (`chore/upgrade-laravel-pint`)
   - `refactor/...` — Code improvements (`refactor/user-service-logic`)

   ```bash
   # Example: new feature
   git checkout -b feat/add-monthly-reports
   ```

---

## Commit Message Style Guide

We use [Conventional Commits](https://www.conventionalcommits.org/) for clarity and automation.  
A commit message has a **header**, optional **body**, and optional **footer**.

### Header Format

```
<type>(<optional scope>): <description>
```

- **`<type>`**: What kind of change?  

| Type        | Description                                                        |
|-------------:|--------------------------------------------------------------------|
| `feat`      | New feature                                                        |
| `fix`       | Bug fix                                                            |
| `docs`      | Documentation only                                                 |
| `style`     | Code style (formatting, whitespace, etc.)                          |
| `refactor`  | Refactor code (no feature/bug)                                     |
| `perf`      | Performance improvement                                            |
| `test`      | Add/correct tests                                                  |
| `build`     | Build system/dependencies                                          |
| `ci`        | CI/CD config/scripts                                               |
| `chore`     | Other changes (e.g., `.gitignore`)                                 |

- **`<scope>`** (optional): What part is affected?  
  _Examples_: `feat(auth): ...`, `fix(reports): ...`, `docs(contributing): ...`

- **`<description>`**: Short, imperative summary  
  - Use present tense: "Add", "Fix", "Change"
  - Capitalize first letter
  - No period at the end
  - Keep under 72 characters

---

### Body (Optional)

Explain **what** and **why** (not just how).  
Start after a blank line.

- Describe the problem or reasoning
- Use bullet points for clarity

---

### Footer (Optional)

- **Breaking Changes**:  
  `BREAKING CHANGE: ...`  
  Explain what changed and how to migrate.

- **Issue References**:  
  `Closes #123`, `Fixes #45`  
  (Automatically closes issues!)

---

## Real-World Examples

**Simple Feature:**
```
feat: Add user profile picture uploads
```

**Bug Fix with Scope:**
```
fix(auth): Prevent login with disabled user accounts
```

**Docs Update:**
```
docs: Update contributing guide with commit message rules
```

**Complex Commit with Body:**
```
feat(reports): Generate monthly student progress reports as PDF

Introduce a new Artisan command `reports:generate-monthly` that
aggregates daily tracking data for each active student.

- Uses the `spatie/laravel-pdf` package to create the PDF
- The command is scheduled to run on the last day of every month
```

**Breaking Change:**
```
refactor(users): Rename `status` column to `account_status`

BREAKING CHANGE: The `status` column on the `users` table has been renamed to `account_status` to avoid conflicts with reserved keywords. All queries referencing the old column must be updated.
```

---

## Golden Rules

- **One Change, One Commit:**  
  Don’t mix bug fixes and features.
- **Test Before You Commit:**  
  Never commit broken code or failing tests.
- **Write for Your Future Self:**  
  Clear history helps everyone!

---

## Quick Tips

- Use descriptive branch names and commit messages.
- Keep commits focused and atomic.
- Review your changes before pushing.
- Communicate in PRs for clarity and collaboration.

---

Happy committing!
