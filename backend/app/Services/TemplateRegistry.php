<?php

namespace App\Services;

/**
 * Template Registry
 * 
 * Central registry for approved template types and their associated context keys.
 * This ensures all modules use only approved, documented template types and keys.
 * 
 * Per the Report and Document Management Policy, this registry serves as the
 * official reference for template designers and enforces architectural compliance.
 */
class TemplateRegistry
{
    /**
     * Approved system template types.
     * These are the only template types that can be used across all modules.
     */
    protected static array $approvedTypes = [
        'sales_invoice'      => [
            'label_ar' => 'فاتورة مبيعات',
            'label_en' => 'Sales Invoice',
            'module'   => 'sales',
        ],
        'quotation'          => [
            'label_ar' => 'عرض سعر',
            'label_en' => 'Quotation',
            'module'   => 'sales',
        ],
        'receipt'            => [
            'label_ar' => 'سند قبض',
            'label_en' => 'Receipt',
            'module'   => 'accounting',
        ],
        'purchase_order'     => [
            'label_ar' => 'أمر شراء',
            'label_en' => 'Purchase Order',
            'module'   => 'purchases',
        ],
        'customer_statement' => [
            'label_ar' => 'كشف حساب عميل',
            'label_en' => 'Customer Statement',
            'module'   => 'accounting',
        ],
        'payment_note'       => [
            'label_ar' => 'سند صرف / دفع',
            'label_en' => 'Payment Note',
            'module'   => 'accounting',
        ],
        // HR Document Templates
        'employee_certificate' => [
            'label_ar' => 'شهادة موظف',
            'label_en' => 'Employee Certificate',
            'module'   => 'hr',
        ],
        'employee_contract'  => [
            'label_ar' => 'عقد موظف',
            'label_en' => 'Employee Contract',
            'module'   => 'hr',
        ],
        'contract'           => [
            'label_ar' => 'عقد عمل',
            'label_en' => 'Employment Contract',
            'module'   => 'hr',
        ],
        'clearance'          => [
            'label_ar' => 'نموذج إخلاء طرف',
            'label_en' => 'Employee Clearance Form',
            'module'   => 'hr',
        ],
        'warning'            => [
            'label_ar' => 'خطاب إنذار',
            'label_en' => 'Official Warning Letter',
            'module'   => 'hr',
        ],
        'id_card'            => [
            'label_ar' => 'بطاقة هوية',
            'label_en' => 'Employee ID Card',
            'module'   => 'hr',
        ],
        'handover'           => [
            'label_ar' => 'نموذج تسليم',
            'label_en' => 'Handover Report',
            'module'   => 'hr',
        ],
        'certificate'        => [
            'label_ar' => 'شهادة',
            'label_en' => 'Certificate',
            'module'   => 'hr',
        ],
        'memo'               => [
            'label_ar' => 'مذكرة',
            'label_en' => 'Internal Memorandum',
            'module'   => 'hr',
        ],
        'other'               => [
            'label_ar' => 'أخرى',
            'label_en' => 'Other',
            'module'   => 'hr',
        ],
        'other_system'       => [
            'label_ar' => 'أخرى',
            'label_en' => 'Other',
            'module'   => 'system',
        ],
    ];

    /**
     * Approved context keys for each template type.
     * These keys represent the semantic contract between templates and the system.
     * Keys must NOT be linked to database column names.
     */
    protected static array $approvedKeys = [
        // Sales & Invoices
        'sales_invoice' => [
            'invoice_number'   => ['type' => 'string', 'description_ar' => 'رقم الفاتورة', 'description_en' => 'Invoice Number'],
            'invoice_date'     => ['type' => 'date', 'description_ar' => 'تاريخ الفاتورة', 'description_en' => 'Invoice Date'],
            'customer_name'    => ['type' => 'string', 'description_ar' => 'اسم العميل', 'description_en' => 'Customer Name'],
            'customer_tax_id'  => ['type' => 'string', 'description_ar' => 'الرقم الضريبي للعميل', 'description_en' => 'Customer Tax ID'],
            'subtotal'         => ['type' => 'number', 'description_ar' => 'المبلغ الإجمالي', 'description_en' => 'Subtotal'],
            'vat_amount'       => ['type' => 'number', 'description_ar' => 'قيمة الضريبة', 'description_en' => 'VAT Amount'],
            'total_amount'     => ['type' => 'number', 'description_ar' => 'الإجمالي مع الضريبة', 'description_en' => 'Total Amount'],
            'items'            => ['type' => 'array', 'description_ar' => 'عناصر الفاتورة', 'description_en' => 'Invoice Items'],
        ],
        'quotation' => [
            'quotation_number' => ['type' => 'string', 'description_ar' => 'رقم عرض السعر', 'description_en' => 'Quotation Number'],
            'quotation_date'   => ['type' => 'date', 'description_ar' => 'تاريخ العرض', 'description_en' => 'Quotation Date'],
            'customer_name'    => ['type' => 'string', 'description_ar' => 'اسم العميل', 'description_en' => 'Customer Name'],
            'valid_until'      => ['type' => 'date', 'description_ar' => 'صالح حتى', 'description_en' => 'Valid Until'],
            'total_amount'     => ['type' => 'number', 'description_ar' => 'المبلغ الإجمالي', 'description_en' => 'Total Amount'],
        ],
        'receipt' => [
            'receipt_number'   => ['type' => 'string', 'description_ar' => 'رقم السند', 'description_en' => 'Receipt Number'],
            'receipt_date'     => ['type' => 'date', 'description_ar' => 'تاريخ السند', 'description_en' => 'Receipt Date'],
            'customer_name'    => ['type' => 'string', 'description_ar' => 'اسم العميل', 'description_en' => 'Customer Name'],
            'amount'           => ['type' => 'number', 'description_ar' => 'المبلغ', 'description_en' => 'Amount'],
            'payment_method'  => ['type' => 'string', 'description_ar' => 'طريقة الدفع', 'description_en' => 'Payment Method'],
        ],
        'purchase_order' => [
            'po_number'        => ['type' => 'string', 'description_ar' => 'رقم طلب الشراء', 'description_en' => 'PO Number'],
            'po_date'          => ['type' => 'date', 'description_ar' => 'تاريخ الطلب', 'description_en' => 'PO Date'],
            'supplier_name'    => ['type' => 'string', 'description_ar' => 'اسم المورد', 'description_en' => 'Supplier Name'],
            'supplier_tax_id'  => ['type' => 'string', 'description_ar' => 'الرقم الضريبي للمورد', 'description_en' => 'Supplier Tax ID'],
            'total_amount'     => ['type' => 'number', 'description_ar' => 'المبلغ الإجمالي', 'description_en' => 'Total Amount'],
        ],
        'customer_statement' => [
            'customer_name'    => ['type' => 'string', 'description_ar' => 'اسم العميل', 'description_en' => 'Customer Name'],
            'statement_date'   => ['type' => 'date', 'description_ar' => 'تاريخ الكشف', 'description_en' => 'Statement Date'],
            'opening_balance'  => ['type' => 'number', 'description_ar' => 'الرصيد الافتتاحي', 'description_en' => 'Opening Balance'],
            'closing_balance' => ['type' => 'number', 'description_ar' => 'الرصيد الختامي', 'description_en' => 'Closing Balance'],
            'transactions'     => ['type' => 'array', 'description_ar' => 'المعاملات', 'description_en' => 'Transactions'],
        ],
        'payment_note' => [
            'payment_number'  => ['type' => 'string', 'description_ar' => 'رقم السند', 'description_en' => 'Payment Number'],
            'payment_date'     => ['type' => 'date', 'description_ar' => 'تاريخ السند', 'description_en' => 'Payment Date'],
            'payee_name'       => ['type' => 'string', 'description_ar' => 'اسم المستلم', 'description_en' => 'Payee Name'],
            'amount'           => ['type' => 'number', 'description_ar' => 'المبلغ', 'description_en' => 'Amount'],
            'payment_method'  => ['type' => 'string', 'description_ar' => 'طريقة الدفع', 'description_en' => 'Payment Method'],
        ],
        'employee_certificate' => [
            'employee_name'      => ['type' => 'string', 'description_ar' => 'اسم الموظف', 'description_en' => 'Employee Name'],
            'employee_code'      => ['type' => 'string', 'description_ar' => 'رقم الموظف', 'description_en' => 'Employee Code'],
            'employee_national_id' => ['type' => 'string', 'description_ar' => 'الهوية الوطنية', 'description_en' => 'National ID'],
            'department'         => ['type' => 'string', 'description_ar' => 'القسم', 'description_en' => 'Department'],
            'role'               => ['type' => 'string', 'description_ar' => 'المنصب', 'description_en' => 'Role'],
            'hire_date'          => ['type' => 'date', 'description_ar' => 'تاريخ التوظيف', 'description_en' => 'Hire Date'],
            'certificate_date'   => ['type' => 'date', 'description_ar' => 'تاريخ الشهادة', 'description_en' => 'Certificate Date'],
        ],
        'employee_contract' => [
            'employee_name'      => ['type' => 'string', 'description_ar' => 'اسم الموظف', 'description_en' => 'Employee Name'],
            'employee_code'      => ['type' => 'string', 'description_ar' => 'رقم الموظف', 'description_en' => 'Employee Code'],
            'contract_type'      => ['type' => 'string', 'description_ar' => 'نوع العقد', 'description_en' => 'Contract Type'],
            'start_date'         => ['type' => 'date', 'description_ar' => 'تاريخ البدء', 'description_en' => 'Start Date'],
            'end_date'           => ['type' => 'date', 'description_ar' => 'تاريخ الانتهاء', 'description_en' => 'End Date'],
            'base_salary'        => ['type' => 'number', 'description_ar' => 'الراتب الأساسي', 'description_en' => 'Base Salary'],
        ],
        // HR Document Templates
        'contract' => [
            'employee_name'      => ['type' => 'string', 'description_ar' => 'اسم الموظف', 'description_en' => 'Employee Name'],
            'employee_code'      => ['type' => 'string', 'description_ar' => 'الرقم الوظيفي', 'description_en' => 'Employee Code'],
            'employee_national_id' => ['type' => 'string', 'description_ar' => 'رقم الهوية الوطنية', 'description_en' => 'National ID'],
            'department'         => ['type' => 'string', 'description_ar' => 'القسم', 'description_en' => 'Department'],
            'role'               => ['type' => 'string', 'description_ar' => 'المسمى الوظيفي', 'description_en' => 'Job Title'],
            'hire_date'          => ['type' => 'date', 'description_ar' => 'تاريخ التعيين', 'description_en' => 'Hire Date'],
            'contract_type'      => ['type' => 'string', 'description_ar' => 'نوع العقد', 'description_en' => 'Contract Type'],
            'base_salary'        => ['type' => 'number', 'description_ar' => 'الراتب الأساسي', 'description_en' => 'Base Salary'],
            'email'              => ['type' => 'string', 'description_ar' => 'البريد الإلكتروني', 'description_en' => 'Email'],
            'phone'              => ['type' => 'string', 'description_ar' => 'رقم الجوال', 'description_en' => 'Phone'],
        ],
        'clearance' => [
            'employee_name'      => ['type' => 'string', 'description_ar' => 'اسم الموظف', 'description_en' => 'Employee Name'],
            'employee_code'      => ['type' => 'string', 'description_ar' => 'الرقم الوظيفي', 'description_en' => 'Employee Code'],
            'department'         => ['type' => 'string', 'description_ar' => 'القسم', 'description_en' => 'Department'],
            'role'               => ['type' => 'string', 'description_ar' => 'المسمى الوظيفي', 'description_en' => 'Job Title'],
            'hire_date'          => ['type' => 'date', 'description_ar' => 'تاريخ التعيين', 'description_en' => 'Hire Date'],
        ],
        'warning' => [
            'employee_name'      => ['type' => 'string', 'description_ar' => 'اسم الموظف', 'description_en' => 'Employee Name'],
            'employee_code'      => ['type' => 'string', 'description_ar' => 'الرقم الوظيفي', 'description_en' => 'Employee Code'],
            'department'         => ['type' => 'string', 'description_ar' => 'القسم', 'description_en' => 'Department'],
            'role'               => ['type' => 'string', 'description_ar' => 'المسمى الوظيفي', 'description_en' => 'Job Title'],
            'hire_date'          => ['type' => 'date', 'description_ar' => 'تاريخ التعيين', 'description_en' => 'Hire Date'],
        ],
        'id_card' => [
            'employee_name'      => ['type' => 'string', 'description_ar' => 'اسم الموظف', 'description_en' => 'Employee Name'],
            'employee_code'      => ['type' => 'string', 'description_ar' => 'الرقم الوظيفي', 'description_en' => 'Employee Code'],
            'department'         => ['type' => 'string', 'description_ar' => 'القسم', 'description_en' => 'Department'],
            'role'               => ['type' => 'string', 'description_ar' => 'المسمى الوظيفي', 'description_en' => 'Job Title'],
            'hire_date'          => ['type' => 'date', 'description_ar' => 'تاريخ التعيين', 'description_en' => 'Hire Date'],
        ],
        'handover' => [
            'employee_name'      => ['type' => 'string', 'description_ar' => 'اسم الموظف', 'description_en' => 'Employee Name'],
            'employee_code'      => ['type' => 'string', 'description_ar' => 'الرقم الوظيفي', 'description_en' => 'Employee Code'],
            'department'         => ['type' => 'string', 'description_ar' => 'القسم', 'description_en' => 'Department'],
            'role'               => ['type' => 'string', 'description_ar' => 'المسمى الوظيفي', 'description_en' => 'Job Title'],
        ],
        'certificate' => [
            'employee_name'      => ['type' => 'string', 'description_ar' => 'اسم الموظف', 'description_en' => 'Employee Name'],
            'employee_code'      => ['type' => 'string', 'description_ar' => 'الرقم الوظيفي', 'description_en' => 'Employee Code'],
            'employee_national_id' => ['type' => 'string', 'description_ar' => 'رقم الهوية الوطنية', 'description_en' => 'National ID'],
            'department'         => ['type' => 'string', 'description_ar' => 'القسم', 'description_en' => 'Department'],
            'role'               => ['type' => 'string', 'description_ar' => 'المسمى الوظيفي', 'description_en' => 'Job Title'],
            'hire_date'          => ['type' => 'date', 'description_ar' => 'تاريخ الالتحاق', 'description_en' => 'Joining Date'],
            'contract_type'      => ['type' => 'string', 'description_ar' => 'نوع العقد', 'description_en' => 'Contract Type'],
        ],
        'memo' => [
            'employee_name'      => ['type' => 'string', 'description_ar' => 'اسم الموظف', 'description_en' => 'Employee Name'],
            'department'         => ['type' => 'string', 'description_ar' => 'القسم', 'description_en' => 'Department'],
        ],
        'other' => [
            'employee_name'      => ['type' => 'string', 'description_ar' => 'اسم الموظف', 'description_en' => 'Employee Name'],
            'employee_code'      => ['type' => 'string', 'description_ar' => 'الرقم الوظيفي', 'description_en' => 'Employee Code'],
            'employee_national_id' => ['type' => 'string', 'description_ar' => 'رقم الهوية', 'description_en' => 'National ID'],
            'department'         => ['type' => 'string', 'description_ar' => 'القسم', 'description_en' => 'Department'],
            'role'               => ['type' => 'string', 'description_ar' => 'المسمى الوظيفي', 'description_en' => 'Job Title'],
            'hire_date'          => ['type' => 'date', 'description_ar' => 'تاريخ التعيين', 'description_en' => 'Hire Date'],
            'email'              => ['type' => 'string', 'description_ar' => 'البريد الإلكتروني', 'description_en' => 'Email'],
            'phone'              => ['type' => 'string', 'description_ar' => 'رقم الجوال', 'description_en' => 'Phone'],
        ],
        // Common keys available to all templates
        'common' => [
            'company_name'    => ['type' => 'string', 'description_ar' => 'اسم المؤسسة', 'description_en' => 'Company Name'],
            'company_address' => ['type' => 'string', 'description_ar' => 'عنوان المؤسسة', 'description_en' => 'Company Address'],
            'company_tax_id'  => ['type' => 'string', 'description_ar' => 'الرقم الضريبي', 'description_en' => 'Tax ID'],
            'company_logo'    => ['type' => 'string', 'description_ar' => 'شعار المؤسسة', 'description_en' => 'Company Logo'],
            'today_date'      => ['type' => 'date', 'description_ar' => 'تاريخ اليوم', 'description_en' => 'Today\'s Date'],
            'reference_number' => ['type' => 'string', 'description_ar' => 'الرقم المرجعي', 'description_en' => 'Reference Number'],
        ],
    ];

    /**
     * Get all approved template types.
     */
    public static function getApprovedTypes(): array
    {
        return self::$approvedTypes;
    }

    /**
     * Check if a template type is approved.
     */
    public static function isApprovedType(string $type): bool
    {
        return isset(self::$approvedTypes[$type]);
    }

    /**
     * Get approved keys for a specific template type.
     * Includes common keys that are available to all templates.
     */
    public static function getApprovedKeys(string $type): array
    {
        $typeKeys = self::$approvedKeys[$type] ?? [];
        $commonKeys = self::$approvedKeys['common'] ?? [];
        
        return array_merge($typeKeys, $commonKeys);
    }

    /**
     * Check if a key is approved for a specific template type.
     */
    public static function isApprovedKey(string $type, string $key): bool
    {
        $approvedKeys = self::getApprovedKeys($type);
        return isset($approvedKeys[$key]);
    }

    /**
     * Extract all placeholder keys from a template HTML.
     * Returns array of keys found in {{key}} format.
     */
    public static function extractKeysFromTemplate(string $html): array
    {
        $keys = [];
        preg_match_all('/\{\{([^}]+)\}\}/', $html, $matches);
        
        if (!empty($matches[1])) {
            $keys = array_unique(array_map('trim', $matches[1]));
        }
        
        return $keys;
    }

    /**
     * Validate that all keys in a template are approved for the given type.
     * Returns array of invalid keys if any, empty array if all valid.
     */
    public static function validateTemplateKeys(string $type, string $html): array
    {
        if (!self::isApprovedType($type)) {
            return ['Template type is not approved'];
        }

        $extractedKeys = self::extractKeysFromTemplate($html);
        $approvedKeys = self::getApprovedKeys($type);
        $invalidKeys = [];

        foreach ($extractedKeys as $key) {
            if (!isset($approvedKeys[$key])) {
                $invalidKeys[] = $key;
            }
        }

        return $invalidKeys;
    }

    /**
     * Get template type metadata.
     */
    public static function getTypeMetadata(string $type): ?array
    {
        return self::$approvedTypes[$type] ?? null;
    }

    /**
     * Get all approved keys as a flat list for a given type.
     * Useful for template editors to display available keys.
     */
    public static function getApprovedKeysList(string $type): array
    {
        $keys = self::getApprovedKeys($type);
        $list = [];

        foreach ($keys as $key => $metadata) {
            $list[] = [
                'key' => $key,
                'type' => $metadata['type'],
                'description_ar' => $metadata['description_ar'] ?? '',
                'description_en' => $metadata['description_en'] ?? '',
            ];
        }

        return $list;
    }
}

