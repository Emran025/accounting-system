# Template Editor Module

A professional, feature-rich code editor component for creating and editing HTML templates with live preview, syntax highlighting, and validation.

## Features

- ✨ **Professional Code Editor**
  - Syntax highlighting for HTML, CSS, and template keys
  - Line numbers with click-to-jump functionality
  - Tab support for indentation
  - Find & Replace with case-sensitive option
  - Code formatting (Ctrl+K)
  - Keyboard shortcuts (Ctrl+S to save, Ctrl+F to find)

- 🎨 **Live Preview**
  - Real-time preview with mock data
  - RTL/LTR support
  - Responsive preview with scrollbars
  - Manual refresh option

- 🔍 **Validation & Security**
  - Real-time validation of template keys
  - Detection of forbidden elements (script, iframe, form, etc.)
  - Visual indicators for valid/invalid keys
  - Clickable error messages that jump to problematic lines

- 🎯 **Template Keys Management**
  - Searchable list of approved keys
  - One-click insertion at cursor position
  - Visual indicators for used keys
  - Key type badges (string, number, date, boolean, list)

- 💎 **Professional UI**
  - Dark theme optimized for coding
  - Smooth animations and transitions
  - Responsive design
  - Status badges showing validation state

## Usage

```tsx
import { TemplateEditor } from "@/components/template-editor";
import type { TemplateEditorProps, TemplateData } from "@/components/template-editor";

// Define approved keys for your module
const approvedKeys = [
    { key: "employee_name", description: "اسم الموظف", type: "string" },
    { key: "employee_id", description: "رقم الموظف", type: "number" },
    { key: "hire_date", description: "تاريخ التوظيف", type: "date" },
];

// Define mock context for preview
const mockContext = {
    employee_name: "أحمد محمد",
    employee_id: "12345",
    hire_date: "2024-01-15",
};

// Template type labels (optional)
const templateTypeLabels = {
    contract: "عقد عمل",
    warning: "خطاب إنذار",
    other: "أخرى",
};

function MyTemplateEditor() {
    const handleSave = async (data: TemplateData) => {
        // Save template logic
        await saveTemplate(data);
    };

    const handleCancel = () => {
        // Cancel logic
        router.back();
    };

    return (
        <TemplateEditor
            template={existingTemplate} // Optional: for editing mode
            moduleName="الموارد البشرية"
            templateTypeLabels={templateTypeLabels}
            approvedKeys={approvedKeys}
            mockContext={mockContext}
            onSave={handleSave}
            onCancel={handleCancel}
        />
    );
}
```

## Props

### `TemplateEditorProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `template` | `Partial<TemplateData> \| null` | No | Template data for editing mode. If undefined, creates a new template. |
| `moduleName` | `string` | Yes | Name of the module (e.g., "HR", "Sales") |
| `templateTypeLabels` | `Record<string, string>` | No | Dictionary mapping type keys to labels |
| `approvedKeys` | `TemplateField[]` | Yes | List of approved template keys |
| `mockContext` | `Record<string, string>` | Yes | Mock data for live preview |
| `onSave` | `(data: TemplateData) => Promise<void>` | Yes | Callback when saving |
| `onCancel` | `() => void` | Yes | Callback when canceling |
| `className` | `string` | No | Additional CSS classes |

### `TemplateData`

```typescript
interface TemplateData {
    template_key: string;
    template_name_ar: string;
    template_name_en?: string;
    template_type: string;
    body_html: string;
    description?: string;
    language: "ar" | "en";
}
```

### `TemplateField`

```typescript
interface TemplateField {
    key: string;
    description: string;
    type: "string" | "number" | "date" | "boolean" | "list";
}
```

## Keyboard Shortcuts

- `Ctrl+S` / `Cmd+S` - Save template
- `Ctrl+F` / `Cmd+F` - Open Find & Replace
- `Ctrl+K` / `Cmd+K` - Format code
- `Tab` - Insert 4 spaces
- `Esc` - Close Find & Replace
- `Enter` (in Find) - Find next occurrence

## Validation Rules

The editor automatically validates templates and prevents saving if:

1. **Forbidden Elements**: `<script>`, `<iframe>`, `<form>`, inline JavaScript events (`onclick`, `onload`, etc.), `javascript:` protocol
2. **Invalid Keys**: Template keys that are not in the `approvedKeys` list

## Styling

The module includes its own CSS file (`styles.css`) with a dark theme optimized for code editing. The editor uses CSS variables for theming:

- `--bg-primary`: Main background color (default: `#0f1117`)
- `--bg-secondary`: Secondary background (default: `#161928`)
- `--text-primary`: Primary text color (default: `#e4e7ef`)
- `--text-secondary`: Secondary text color (default: `#8890a4`)
- `--border-color`: Border color (default: `#1e2333`)
- `--accent`: Accent color (default: `#6c8cff`)

## Exports

The module exports:

- `TemplateEditor` - Main component
- `TemplateEditorProps` - Component props type
- `TemplateData` - Template data type
- `TemplateField` - Template field type
- `highlightHTML` - Syntax highlighting function
- `validateTemplateKeys` - Key validation function
- `detectForbiddenElements` - Security validation function
- `generatePreviewHtml` - Preview HTML generator
- `prettifyHTML` - HTML formatter
- `formatHTML` - Alternative HTML formatter
- `KeyValidation` - Validation result type

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- Uses CSS Grid and Flexbox

## Notes

- The editor uses an iframe for preview isolation and security
- Template keys use `{{key}}` syntax
- The editor automatically formats code on save
- Line numbers are clickable for quick navigation
- Validation errors are clickable and jump to the problematic line

