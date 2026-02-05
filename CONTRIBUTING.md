# Contributing to ACCSYSTEM ERP System

Thank you for considering contributing to our Enterprise Resource Planning (ERP) system! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [How to Contribute](#how-to-contribute)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Documentation Requirements](#documentation-requirements)
8. [Pull Request Process](#pull-request-process)
9. [Issue Reporting](#issue-reporting)
10. [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions.

### Our Standards

**Positive behavior includes:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**

- Harassment, trolling, or derogatory comments
- Publishing others' private information
- Unprofessional conduct

### Enforcement

Instances of unacceptable behavior may be reported to the project maintainers. All complaints will be reviewed and investigated.

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **PHP 8.2+** installed
- **Node.js 20+** and npm
- **Composer** (latest version)
- **Git** for version control
- A code editor (VS Code recommended)
- Basic understanding of Laravel and Next.js
- Understanding of ERP concepts (accounting, inventory, HR)

### Initial Setup

1. **Fork the repository**

   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/ACCSYSTEM-erp.git
   cd ACCSYSTEM-erp
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/ACCSYSTEM/ACCSYSTEM-erp.git
   ```

4. **Set up the development environment**

   ```bash
   # Backend
   cd src
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan migrate
   
   # Frontend
   cd ../public
   npm install
   ```

5. **Verify setup**

   ```bash
   # Terminal 1 - Backend
   cd src && php artisan serve
   
   # Terminal 2 - Frontend
   cd public && npm run dev
   ```

---

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

1. **Bug Fixes** 🐛
   - Report bugs via GitHub Issues
   - Submit fixes with test cases

2. **New Features** ✨
   - Discuss the feature in an issue first
   - Follow the feature development process

3. **Documentation** 📚
   - Improve existing documentation
   - Add examples and tutorials
   - Fix typos and unclear explanations

4. **Code Refactoring** 🔨
   - Improve code quality
   - Optimize performance
   - Enhance maintainability

5. **Testing** ✅
   - Add test coverage
   - Improve existing tests

### Contribution Areas by ERP Module

| Module | Skills Needed | Difficulty |
| ------ | ------------- | ---------- |
| **Sales & POS** | PHP, TypeScript, Accounting | Intermediate |
| **Purchases** | Laravel, Approval Workflows | Intermediate |
| **Inventory** | FIFO/Average Costing, PHP | Intermediate-Advanced |
| **General Ledger** | Double-Entry Accounting, Laravel | Advanced |
| **Financial Reports** | SQL, Accounting Principles | Advanced |
| **HR & Payroll** | Laravel, Payroll Processing | Intermediate-Advanced |
| **ZATCA Integration** | API Integration, Saudi Regulations | Advanced |
| **Multi-Currency** | Exchange Rates, Financial Logic | Intermediate |
| **UI/UX** | React, TypeScript, Tailwind | Beginner-Intermediate |
| **Testing** | PHPUnit, Jest | Intermediate |
| **Documentation** | Technical Writing | Beginner |

---

## Development Workflow

### Branch Strategy

We use **Git Flow** branching model:

```txt
main (production-ready)
  └── develop (integration branch)
       ├── feature/feature-name
       ├── bugfix/bug-description
       ├── hotfix/critical-fix
       ├── docs/documentation-update
       └── module/module-name-enhancement
```

### Creating a Branch

1. **Update your local repository**

   ```bash
   git checkout develop
   git pull upstream develop
   ```

2. **Create a feature branch**

   ```bash
   # For new features
   git checkout -b feature/add-inventory-alerts
   
   # For bug fixes
   git checkout -b bugfix/fix-invoice-calculation
   
   # For documentation
   git checkout -b docs/update-api-reference
   
   # For module enhancements
   git checkout -b module/hr-leave-management
   ```

### Making Changes

1. **Make your changes**
   - Follow coding standards (see below)
   - Write clean, readable code
   - Add comments for complex logic
   - Consider both Arabic and English users

2. **Test your changes**

   ```bash
   # Backend tests
   cd src
   php artisan test
   
   # Frontend (if tests are set up)
   cd public
   npm run test
   ```

3. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat(sales): add inventory low stock alerts"
   ```

### Commit Message Convention

We follow **Conventional Commits** specification:

```txt
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Scopes (ERP Modules):**

- `sales`, `purchases`, `inventory`, `ar`, `ap`
- `gl`, `reports`, `hr`, `payroll`, `assets`
- `auth`, `settings`, `api`, `ui`

**Examples:**

```bash
feat(sales): add multi-currency support to invoices
fix(payroll): correct net salary calculation for deductions
docs(api): update authentication endpoints documentation
refactor(gl): optimize trial balance query performance
test(purchases): add tests for approval workflow
```

---

## Coding Standards

### PHP (Backend)

Follow **PSR-12** coding standard:

```php
<?php

namespace App\Services;

use App\Models\Invoice;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    /**
     * Create a new invoice with automatic ledger posting
     *
     * @param array $data Invoice data with items
     * @return int Invoice ID
     * @throws \Exception When posting fails
     */
    public function createInvoice(array $data): int
    {
        return DB::transaction(function () use ($data) {
            $invoice = Invoice::create($data);
            $this->postToLedger($invoice);
            
            return $invoice->id;
        });
    }
}
```

**Rules:**

- Use type hints for parameters and return values
- Add PHPDoc comments for public methods
- Keep methods focused (Single Responsibility)
- Use dependency injection
- Use Services for business logic (not in Controllers)
- Name classes, methods, and variables clearly
- Max line length: 120 characters
- Use Eloquent relationships properly

### TypeScript (Frontend)

Follow **Airbnb React/TypeScript** style guide:

```typescript
import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import type { Invoice } from '@/lib/types';

interface InvoiceListProps {
  customerId?: number;
  pageSize?: number;
}

export default function InvoiceList({ 
  customerId, 
  pageSize = 20 
}: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, [customerId]);

  async function loadInvoices() {
    try {
      setLoading(true);
      const response = await fetchAPI('invoices', {
        method: 'GET'
      });
      
      if (response.success) {
        setInvoices(response.data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="invoice-list">
      {/* Component JSX */}
    </div>
  );
}
```

**Rules:**

- Use TypeScript interfaces for all data structures
- Prefer `const` over `let`
- Use async/await over `.then()`
- Name components in PascalCase
- Name functions in camelCase
- Use arrow functions for callbacks
- Max line length: 100 characters
- Support RTL (Arabic) layout where applicable

### Database Migrations

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('table_name', function (Blueprint $table) {
            $table->id();
            $table->string('column_name');
            $table->foreignId('user_id')
                ->constrained()
                ->onDelete('cascade');
            $table->timestamps();
            
            $table->index('column_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('table_name');
    }
};
```

**Rules:**

- Always include `up()` and `down()` methods
- Use descriptive file names with timestamps
- Add indexes for foreign keys and frequently queried columns
- Document complex migrations
- Consider data preservation in `down()` methods

---

## Testing Guidelines

### Backend Testing (PHPUnit)

**Test Structure:**

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InvoiceTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_creates_an_invoice_successfully()
    {
        // Arrange
        $user = User::factory()->create();
        $this->actingAs($user);
        
        $invoiceData = [
            'items' => [
                ['product_id' => 1, 'quantity' => 2, 'unit_price' => 50]
            ],
            'payment_type' => 'cash'
        ];

        // Act
        $response = $this->postJson('/api/invoices', $invoiceData);

        // Assert
        $response->assertStatus(200);
        $response->assertJsonStructure(['success', 'id']);
        $this->assertDatabaseHas('invoices', [
            'payment_type' => 'cash'
        ]);
    }
    
    /** @test */
    public function it_posts_correct_gl_entries_for_cash_sale()
    {
        // Test that ledger entries are correct
    }
}
```

**Testing Requirements:**

- Write tests for all new features
- Cover edge cases and error scenarios
- Aim for 80%+ code coverage
- Use factories for test data
- Clean up after tests (use `RefreshDatabase`)
- Test GL postings for financial transactions

### Frontend Testing (Jest - when implemented)

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceList from './InvoiceList';

describe('InvoiceList', () => {
  it('displays invoices when loaded', async () => {
    render(<InvoiceList />);
    
    await waitFor(() => {
      expect(screen.getByText('INV-00001')).toBeInTheDocument();
    });
  });
});
```

---

## Documentation Requirements

### Code Documentation

**PHP:**

```php
/**
 * Calculate the total amount for an invoice including VAT
 *
 * This method calculates the subtotal from items, applies any discount,
 * then adds VAT based on the configured rate. Also posts to General Ledger.
 *
 * @param array $items Array of invoice items with quantity and unit_price
 * @param float $discount Discount amount to subtract
 * @param float $vatRate VAT rate as percentage (e.g., 15 for 15%)
 * @return float Total amount including VAT
 */
public function calculateTotal(array $items, float $discount, float $vatRate): float
{
    // Implementation
}
```

**TypeScript:**

```typescript
/**
 * Fetch invoices from the API with pagination
 * 
 * @param page - Page number (1-indexed)
 * @param perPage - Number of items per page
 * @returns Promise resolving to API response with invoices
 */
async function fetchInvoices(page: number, perPage: number): Promise<APIResponse> {
  // Implementation
}
```

### Documentation Updates

When adding features, update:

1. **`docs/TECHNICAL_DOCUMENTATION.md`** - Technical details
2. **`docs/API_REFERENCE.md`** - API endpoint documentation
3. **`docs/DATABASE_SCHEMA.md`** - Database schema changes
4. **`docs/USER_GUIDE.md`** - User-facing features (Arabic & English)
5. **`README.md`** - High-level changes
6. **Code comments** - Complex business logic

---

## Pull Request Process

### Before Submitting

- [ ] Code follows project coding standards
- [ ] All tests pass (`php artisan test`)
- [ ] Documentation is updated
- [ ] Commit messages follow convention
- [ ] No merge conflicts with `develop` branch
- [ ] Self-review completed
- [ ] GL postings verified (for financial features)
- [ ] Arabic/English translations added (if UI changes)

### Creating a Pull Request

1. **Push your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Set base: `develop` ← compare: `your-feature-branch`
   - Fill in the PR template

3. **PR Template**

   ```markdown
   ## Description
   Brief description of changes
   
   ## ERP Module Affected
   - [ ] Sales & POS
   - [ ] Purchases
   - [ ] Inventory
   - [ ] AR/AP
   - [ ] General Ledger
   - [ ] Reports
   - [ ] HR & Payroll
   - [ ] System Settings
   - [ ] Other: ___
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Manual testing completed
   - [ ] All tests pass
   - [ ] GL postings verified
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No breaking changes (or documented)
   - [ ] Arabic/English translations added
   
   ## Related Issues
   Fixes #123
   ```

### PR Review Process

1. **Automated Checks**
   - CI/CD pipeline runs tests
   - Code style checks
   - Build verification

2. **Code Review**
   - At least one maintainer reviews
   - Feedback is provided
   - Requested changes made

3. **Approval & Merge**
   - PR approved by maintainer
   - Merged into `develop` branch
   - Branch deleted

### Review Criteria

Reviewers will check:

- **Functionality:** Does it work as intended?
- **Code Quality:** Clean, readable, maintainable?
- **Performance:** No performance regressions?
- **Security:** No security vulnerabilities?
- **Testing:** Adequate test coverage?
- **Documentation:** Changes documented?
- **Accounting Accuracy:** GL postings correct?

---

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**ERP Module**
[e.g., Sales, Purchases, GL, HR, Payroll]

**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- PHP Version: [e.g., 8.2.10]
- Node Version: [e.g., 20.10.0]

**Additional context**
Any other context about the problem.

**Logs**
```txt
Paste relevant logs from storage/logs/laravel.log
```
```

### Feature Requests

Use the feature request template:

```markdown
**ERP Module**
[e.g., Sales, Purchases, GL, HR, Payroll]

**Is your feature related to a problem?**
A clear description of the problem.

**Describe the solution**
What you want to happen.

**Describe alternatives**
Other solutions you've considered.

**Additional context**
Any other context or screenshots.
```

---

## Community

### Communication Channels

- **GitHub Issues:** Bug reports, feature requests
- **GitHub Discussions:** General questions, ideas
- **Pull Requests:** Code contributions, reviews

### Getting Help

1. Check existing documentation in `/docs`
2. Search closed issues
3. Ask in GitHub Discussions
4. Create a new issue with details

### Recognition

Contributors will be:

- Listed in `CONTRIBUTORS.md`
- Mentioned in release notes
- Credited in documentation

---

## Development Tips

### ERP-Specific Guidelines

**Financial Transactions:**

- Always post to General Ledger via `LedgerService`
- Ensure debit = credit in all postings
- Test fiscal period restrictions
- Verify voucher numbering

**Multi-Currency:**

- Use `CurrencyHelper` for conversions
- Store amounts in base currency + original
- Handle exchange rate differences

**Approval Workflows:**

- Use status fields ('pending', 'approved', 'rejected')
- Track approver and approval timestamp
- Respect multi-level approval settings

### Performance Guidelines

**Backend:**

- Use eager loading to avoid N+1 queries
- Cache frequently accessed data
- Use database indexes appropriately
- Profile slow queries

**Frontend:**

- Minimize re-renders with React.memo
- Use pagination for large datasets
- Lazy load components when possible
- Optimize images and assets

### Security Best Practices

- Never commit sensitive data (`.env`, credentials)
- Validate all user input
- Use parameterized queries (Eloquent does this)
- Sanitize output to prevent XSS
- Follow OWASP guidelines
- Respect role-based permissions

### Debugging

**Backend:**

```bash
# Enable debug mode
APP_DEBUG=true

# View logs
tail -f storage/logs/laravel.log

# Use Telescope for debugging
php artisan telescope:install
```

**Frontend:**

```bash
# Enable verbose logging
NEXT_PUBLIC_DEBUG=true

# Use React DevTools browser extension
```

---

## Release Process

### Version Numbering

We follow **Semantic Versioning** (SemVer):

- **MAJOR.MINOR.PATCH** (e.g., 2.1.0)
- **MAJOR:** Breaking changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes

### Release Workflow

1. All features merged to `develop`
2. Create release branch: `release/v2.1.0`
3. Final testing and bug fixes
4. Update version numbers
5. Merge to `main` and tag
6. Deploy to production
7. Merge back to `develop`

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

## Questions?

If you have questions about contributing:

1. Check the [Technical Documentation](./docs/TECHNICAL_DOCUMENTATION.md)
2. Review [closed pull requests](https://github.com/ACCSYSTEM/ACCSYSTEM-erp/pulls?q=is%3Apr+is%3Aclosed)
3. Ask in [GitHub Discussions](https://github.com/ACCSYSTEM/ACCSYSTEM-erp/discussions)
4. Contact maintainers

---

## Thank You! 🎉

Every contribution, no matter how small, makes a difference. We appreciate your time and effort in improving the ACCSYSTEM ERP System!

**Happy Coding!** 💻
