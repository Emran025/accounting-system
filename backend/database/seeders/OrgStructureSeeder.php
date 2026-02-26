<?php

namespace Database\Seeders;

use App\Models\OrgMetaType;
use App\Models\OrgMetaTypeAttribute;
use App\Models\TopologyRule;
use Illuminate\Database\Seeder;

/**
 * Seeds the Organizational Structure meta-registry and topology rules.
 * SAP SPRO-aligned: Full enterprise structure covering all module dimensions.
 *
 * Domains:
 *   - Enterprise: Client (top-level)
 *   - Financial: Company Code, Controlling Area, Business Area, Functional Area,
 *                Segment, Credit Control Area
 *   - Controlling: Profit Center, Cost Center
 *   - Logistics: Plant, Storage Location, Purchase Organization, Purchasing Group,
 *                Shipping Point, Loading Point, Valuation Area
 *   - Sales: Sales Organization, Distribution Channel, Division,
 *            Sales Office, Sales Group
 *   - HR: Personnel Area, Personnel Subarea, HR Org Unit, Position
 *   - Project Systems: WBS Element
 */
class OrgStructureSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedMetaTypes();
        $this->seedAttributes();
        $this->seedTopologyRules();
    }

    private function seedMetaTypes(): void
    {
        $metaTypes = [
            // ── Enterprise ─────────────────────────────────
            [
                'id' => 'CLIENT',
                'display_name' => 'Client',
                'display_name_ar' => 'العميل (المستأجر)',
                'level_domain' => 'Enterprise',
                'description' => 'Highest organisational level; self-contained unit with own master data (SAP Mandant)',
                'is_assignable' => false,
                'sort_order' => 1,
            ],

            // ── Financial Accounting (FI) ──────────────────
            [
                'id' => 'COMP_CODE',
                'display_name' => 'Company Code',
                'display_name_ar' => 'رمز الشركة',
                'level_domain' => 'Financial',
                'description' => 'Legal entity for financial statements (balance sheet, P&L)',
                'is_assignable' => true,
                'sort_order' => 10,
            ],
            [
                'id' => 'CONTROLLING_AREA',
                'display_name' => 'Controlling Area',
                'display_name_ar' => 'منطقة التحكم',
                'level_domain' => 'Financial',
                'description' => 'Cost accounting and internal reporting scope',
                'is_assignable' => true,
                'sort_order' => 20,
            ],
            [
                'id' => 'BUS_AREA',
                'display_name' => 'Business Area',
                'display_name_ar' => 'منطقة الأعمال',
                'level_domain' => 'Financial',
                'description' => 'Segment reporting (profit center group)',
                'is_assignable' => true,
                'sort_order' => 25,
            ],
            [
                'id' => 'FUNC_AREA',
                'display_name' => 'Functional Area',
                'display_name_ar' => 'المجال الوظيفي',
                'level_domain' => 'Financial',
                'description' => 'Functional classification for cost-of-sales accounting (e.g. R&D, Production, Admin, Sales)',
                'is_assignable' => true,
                'sort_order' => 26,
            ],
            [
                'id' => 'SEGMENT',
                'display_name' => 'Segment',
                'display_name_ar' => 'القطاع',
                'level_domain' => 'Financial',
                'description' => 'Segment reporting per IFRS 8 / US GAAP ASC 280',
                'is_assignable' => true,
                'sort_order' => 27,
            ],
            [
                'id' => 'CREDIT_CTRL_AREA',
                'display_name' => 'Credit Control Area',
                'display_name_ar' => 'منطقة الرقابة الائتمانية',
                'level_domain' => 'Financial',
                'description' => 'Central area for managing customer credit limits and exposure',
                'is_assignable' => true,
                'sort_order' => 28,
            ],

            // ── Controlling (CO) ───────────────────────────
            [
                'id' => 'PROFIT_CENTER',
                'display_name' => 'Profit Center',
                'display_name_ar' => 'مركز الربح',
                'level_domain' => 'Controlling',
                'description' => 'Internal area of responsibility for profit tracking',
                'is_assignable' => true,
                'sort_order' => 29,
            ],
            [
                'id' => 'COST_CENTER',
                'display_name' => 'Cost Center',
                'display_name_ar' => 'مركز التكلفة',
                'level_domain' => 'Controlling',
                'description' => 'Organizational unit within controlling area for cost tracking',
                'is_assignable' => true,
                'sort_order' => 30,
            ],

            // ── Logistics – General ────────────────────────
            [
                'id' => 'PLANT',
                'display_name' => 'Plant',
                'display_name_ar' => 'المصنع',
                'level_domain' => 'Logistics',
                'description' => 'Manufacturing, storage or service location',
                'is_assignable' => true,
                'sort_order' => 40,
            ],
            [
                'id' => 'STORAGE_LOC',
                'display_name' => 'Storage Location',
                'display_name_ar' => 'مكان التخزين',
                'level_domain' => 'Logistics',
                'description' => 'Sub-location within a plant for inventory management',
                'is_assignable' => true,
                'sort_order' => 45,
            ],
            [
                'id' => 'VALUATION_AREA',
                'display_name' => 'Valuation Area',
                'display_name_ar' => 'منطقة التقييم',
                'level_domain' => 'Logistics',
                'description' => 'Scope for material valuation (usually equals plant in S/4HANA)',
                'is_assignable' => true,
                'sort_order' => 46,
            ],
            [
                'id' => 'SHIPPING_POINT',
                'display_name' => 'Shipping Point',
                'display_name_ar' => 'نقطة الشحن',
                'level_domain' => 'Logistics',
                'description' => 'Location from which goods are dispatched (delivery processing)',
                'is_assignable' => true,
                'sort_order' => 47,
            ],
            [
                'id' => 'LOADING_POINT',
                'display_name' => 'Loading Point',
                'display_name_ar' => 'نقطة التحميل',
                'level_domain' => 'Logistics',
                'description' => 'Loading dock or bay within a shipping point',
                'is_assignable' => true,
                'sort_order' => 48,
            ],

            // ── Materials Management (MM) ──────────────────
            [
                'id' => 'PURCH_ORG',
                'display_name' => 'Purchasing Organization',
                'display_name_ar' => 'منظمة المشتريات',
                'level_domain' => 'Logistics',
                'description' => 'Procurement unit responsible for purchasing activities',
                'is_assignable' => true,
                'sort_order' => 50,
            ],
            [
                'id' => 'PURCH_GROUP',
                'display_name' => 'Purchasing Group',
                'display_name_ar' => 'مجموعة المشتريات',
                'level_domain' => 'Logistics',
                'description' => 'Key for a buyer or group of buyers responsible for purchasing',
                'is_assignable' => true,
                'sort_order' => 55,
            ],

            // ── Sales & Distribution (SD) ──────────────────
            [
                'id' => 'SALES_ORG',
                'display_name' => 'Sales Organization',
                'display_name_ar' => 'منظمة المبيعات',
                'level_domain' => 'Sales',
                'description' => 'Organizational unit responsible for selling and distributing goods/services',
                'is_assignable' => true,
                'sort_order' => 60,
            ],
            [
                'id' => 'DISTR_CHANNEL',
                'display_name' => 'Distribution Channel',
                'display_name_ar' => 'قناة التوزيع',
                'level_domain' => 'Sales',
                'description' => 'Channel through which products reach the customer (retail, wholesale, direct)',
                'is_assignable' => true,
                'sort_order' => 65,
            ],
            [
                'id' => 'DIVISION',
                'display_name' => 'Division',
                'display_name_ar' => 'القسم (خط المنتجات)',
                'level_domain' => 'Sales',
                'description' => 'Product line or group of similar products/services',
                'is_assignable' => true,
                'sort_order' => 66,
            ],
            [
                'id' => 'SALES_OFFICE',
                'display_name' => 'Sales Office',
                'display_name_ar' => 'مكتب المبيعات',
                'level_domain' => 'Sales',
                'description' => 'Geographic sales office for monitoring regional sales',
                'is_assignable' => true,
                'sort_order' => 67,
            ],
            [
                'id' => 'SALES_GROUP',
                'display_name' => 'Sales Group',
                'display_name_ar' => 'مجموعة المبيعات',
                'level_domain' => 'Sales',
                'description' => 'Team of sales representatives within a sales office',
                'is_assignable' => true,
                'sort_order' => 68,
            ],

            // ── HR / Personnel Administration ──────────────
            [
                'id' => 'PERSONNEL_AREA',
                'display_name' => 'Personnel Area',
                'display_name_ar' => 'منطقة شؤون الموظفين',
                'level_domain' => 'HR',
                'description' => 'HR sub-unit of company code for personnel administration (pay scale, schedules)',
                'is_assignable' => true,
                'sort_order' => 70,
            ],
            [
                'id' => 'PERSONNEL_SUBAREA',
                'display_name' => 'Personnel Subarea',
                'display_name_ar' => 'المنطقة الفرعية لشؤون الموظفين',
                'level_domain' => 'HR',
                'description' => 'Subdivision of personnel area (public holidays, work schedules, pay scale groups)',
                'is_assignable' => true,
                'sort_order' => 75,
            ],
            [
                'id' => 'HR_ORG_UNIT',
                'display_name' => 'HR Organizational Unit',
                'display_name_ar' => 'الوحدة التنظيمية للموارد البشرية',
                'level_domain' => 'HR',
                'description' => 'Department or team in the org-management hierarchy',
                'is_assignable' => true,
                'sort_order' => 80,
            ],
            [
                'id' => 'POSITION',
                'display_name' => 'Position',
                'display_name_ar' => 'المنصب الوظيفي',
                'level_domain' => 'HR',
                'description' => 'Concrete staffing position (linked to HR Org Unit)',
                'is_assignable' => true,
                'sort_order' => 85,
            ],
            [
                'id' => 'JOB',
                'display_name' => 'Job',
                'display_name_ar' => 'المسمى الوظيفي',
                'level_domain' => 'HR',
                'description' => 'General classification of positions (e.g. Accountant, Engineer)',
                'is_assignable' => true,
                'sort_order' => 86,
            ],
            [
                'id' => 'EMPLOYEE_GROUP',
                'display_name' => 'Employee Group',
                'display_name_ar' => 'مجموعة الموظفين',
                'level_domain' => 'HR',
                'description' => 'Employee classification (active, retiree, contractor)',
                'is_assignable' => true,
                'sort_order' => 87,
            ],
            [
                'id' => 'EMPLOYEE_SUBGROUP',
                'display_name' => 'Employee Subgroup',
                'display_name_ar' => 'المجموعة الفرعية للموظفين',
                'level_domain' => 'HR',
                'description' => 'Sub-classification (monthly, hourly, management)',
                'is_assignable' => true,
                'sort_order' => 88,
            ],

            // ── Project Systems (PS) ───────────────────────
            [
                'id' => 'WBS_ELEMENT',
                'display_name' => 'WBS Element',
                'display_name_ar' => 'عنصر هيكل تقسيم العمل',
                'level_domain' => 'Project',
                'description' => 'Work Breakdown Structure element for project cost tracking',
                'is_assignable' => true,
                'sort_order' => 90,
            ],
        ];

        foreach ($metaTypes as $type) {
            OrgMetaType::updateOrCreate(['id' => $type['id']], $type);
        }
    }

    private function seedAttributes(): void
    {
        $attributes = [
            // ── Client ──
            ['org_meta_type_id' => 'CLIENT', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => true, 'sort_order' => 1],
            ['org_meta_type_id' => 'CLIENT', 'attribute_key' => 'default_language', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],

            // ── Company Code ──
            ['org_meta_type_id' => 'COMP_CODE', 'attribute_key' => 'currency_id', 'attribute_type' => 'string', 'is_mandatory' => true, 'sort_order' => 1],
            ['org_meta_type_id' => 'COMP_CODE', 'attribute_key' => 'chart_of_accounts_id', 'attribute_type' => 'string', 'is_mandatory' => true, 'sort_order' => 2],
            ['org_meta_type_id' => 'COMP_CODE', 'attribute_key' => 'country_code', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 3],
            ['org_meta_type_id' => 'COMP_CODE', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 4],
            ['org_meta_type_id' => 'COMP_CODE', 'attribute_key' => 'city', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 5],
            ['org_meta_type_id' => 'COMP_CODE', 'attribute_key' => 'fiscal_year_variant', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 6],

            // ── Controlling Area ──
            ['org_meta_type_id' => 'CONTROLLING_AREA', 'attribute_key' => 'currency_id', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'CONTROLLING_AREA', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],

            // ── Business Area ──
            ['org_meta_type_id' => 'BUS_AREA', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],

            // ── Functional Area ──
            ['org_meta_type_id' => 'FUNC_AREA', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],

            // ── Segment ──
            ['org_meta_type_id' => 'SEGMENT', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],

            // ── Credit Control Area ──
            ['org_meta_type_id' => 'CREDIT_CTRL_AREA', 'attribute_key' => 'currency_id', 'attribute_type' => 'string', 'is_mandatory' => true, 'sort_order' => 1],
            ['org_meta_type_id' => 'CREDIT_CTRL_AREA', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],
            ['org_meta_type_id' => 'CREDIT_CTRL_AREA', 'attribute_key' => 'risk_category', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 3],

            // ── Profit Center ──
            ['org_meta_type_id' => 'PROFIT_CENTER', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'PROFIT_CENTER', 'attribute_key' => 'manager', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],
            ['org_meta_type_id' => 'PROFIT_CENTER', 'attribute_key' => 'profit_center_group', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 3],

            // ── Cost Center ──
            ['org_meta_type_id' => 'COST_CENTER', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'COST_CENTER', 'attribute_key' => 'responsible_person', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],
            ['org_meta_type_id' => 'COST_CENTER', 'attribute_key' => 'cost_center_category', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 3],

            // ── Plant ──
            ['org_meta_type_id' => 'PLANT', 'attribute_key' => 'factory_calendar_id', 'attribute_type' => 'string', 'is_mandatory' => true, 'sort_order' => 1],
            ['org_meta_type_id' => 'PLANT', 'attribute_key' => 'country_code', 'attribute_type' => 'string', 'is_mandatory' => true, 'sort_order' => 2],
            ['org_meta_type_id' => 'PLANT', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 3],
            ['org_meta_type_id' => 'PLANT', 'attribute_key' => 'address', 'attribute_type' => 'json', 'is_mandatory' => false, 'sort_order' => 4],
            ['org_meta_type_id' => 'PLANT', 'attribute_key' => 'language', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 5],

            // ── Storage Location ──
            ['org_meta_type_id' => 'STORAGE_LOC', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],

            // ── Valuation Area ──
            ['org_meta_type_id' => 'VALUATION_AREA', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'VALUATION_AREA', 'attribute_key' => 'valuation_grouping', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],

            // ── Shipping Point ──
            ['org_meta_type_id' => 'SHIPPING_POINT', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'SHIPPING_POINT', 'attribute_key' => 'country_code', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],
            ['org_meta_type_id' => 'SHIPPING_POINT', 'attribute_key' => 'factory_calendar_id', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 3],

            // ── Loading Point ──
            ['org_meta_type_id' => 'LOADING_POINT', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],

            // ── Purchase Organization ──
            ['org_meta_type_id' => 'PURCH_ORG', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],

            // ── Purchasing Group ──
            ['org_meta_type_id' => 'PURCH_GROUP', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'PURCH_GROUP', 'attribute_key' => 'buyer_name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],
            ['org_meta_type_id' => 'PURCH_GROUP', 'attribute_key' => 'telephone', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 3],

            // ── Sales Organization ──
            ['org_meta_type_id' => 'SALES_ORG', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'SALES_ORG', 'attribute_key' => 'currency_id', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],

            // ── Distribution Channel ──
            ['org_meta_type_id' => 'DISTR_CHANNEL', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],

            // ── Division ──
            ['org_meta_type_id' => 'DIVISION', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],

            // ── Sales Office ──
            ['org_meta_type_id' => 'SALES_OFFICE', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'SALES_OFFICE', 'attribute_key' => 'city', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],

            // ── Sales Group ──
            ['org_meta_type_id' => 'SALES_GROUP', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],

            // ── Personnel Area ──
            ['org_meta_type_id' => 'PERSONNEL_AREA', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'PERSONNEL_AREA', 'attribute_key' => 'country_code', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],

            // ── Personnel Subarea ──
            ['org_meta_type_id' => 'PERSONNEL_SUBAREA', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'PERSONNEL_SUBAREA', 'attribute_key' => 'public_holiday_calendar', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],
            ['org_meta_type_id' => 'PERSONNEL_SUBAREA', 'attribute_key' => 'pay_scale_area', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 3],

            // ── HR Org Unit ──
            ['org_meta_type_id' => 'HR_ORG_UNIT', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'HR_ORG_UNIT', 'attribute_key' => 'manager', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],

            // ── Position ──
            ['org_meta_type_id' => 'POSITION', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'POSITION', 'attribute_key' => 'headcount', 'attribute_type' => 'integer', 'is_mandatory' => false, 'sort_order' => 2],
            ['org_meta_type_id' => 'POSITION', 'attribute_key' => 'vacancy_status', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 3],

            // ── Job ──
            ['org_meta_type_id' => 'JOB', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'JOB', 'attribute_key' => 'job_family', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],

            // ── Employee Group ──
            ['org_meta_type_id' => 'EMPLOYEE_GROUP', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],

            // ── Employee Subgroup ──
            ['org_meta_type_id' => 'EMPLOYEE_SUBGROUP', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'EMPLOYEE_SUBGROUP', 'attribute_key' => 'pay_scale_type', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],

            // ── WBS Element ──
            ['org_meta_type_id' => 'WBS_ELEMENT', 'attribute_key' => 'name', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 1],
            ['org_meta_type_id' => 'WBS_ELEMENT', 'attribute_key' => 'project_id', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 2],
            ['org_meta_type_id' => 'WBS_ELEMENT', 'attribute_key' => 'responsible_cost_center', 'attribute_type' => 'string', 'is_mandatory' => false, 'sort_order' => 3],
        ];

        foreach ($attributes as $attr) {
            OrgMetaTypeAttribute::updateOrCreate(
                ['org_meta_type_id' => $attr['org_meta_type_id'], 'attribute_key' => $attr['attribute_key']],
                $attr
            );
        }
    }

    private function seedTopologyRules(): void
    {
        $topologyRules = [
            // ── Enterprise → Financial ──
            ['source_node_type_id' => 'COMP_CODE', 'target_node_type_id' => 'CLIENT', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Company Code belongs to Client', 'sort_order' => 1],

            // ── Financial Hierarchy ──
            ['source_node_type_id' => 'CONTROLLING_AREA', 'target_node_type_id' => 'COMP_CODE', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Controlling Area assigns to Company Code', 'sort_order' => 5],
            ['source_node_type_id' => 'BUS_AREA', 'target_node_type_id' => 'COMP_CODE', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Business Area assigns to Company Code', 'sort_order' => 6],
            ['source_node_type_id' => 'CREDIT_CTRL_AREA', 'target_node_type_id' => 'COMP_CODE', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Credit Control Area assigns to Company Code', 'sort_order' => 7],
            ['source_node_type_id' => 'FUNC_AREA', 'target_node_type_id' => 'COMP_CODE', 'cardinality' => 'N:M', 'link_direction' => 'source_to_target', 'description' => 'Functional Area can assign to Company Code', 'sort_order' => 8],
            ['source_node_type_id' => 'SEGMENT', 'target_node_type_id' => 'PROFIT_CENTER', 'cardinality' => 'N:M', 'link_direction' => 'source_to_target', 'description' => 'Segment derives from Profit Center', 'sort_order' => 9],

            // ── Controlling Hierarchy ──
            ['source_node_type_id' => 'PROFIT_CENTER', 'target_node_type_id' => 'CONTROLLING_AREA', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Profit Center belongs to Controlling Area', 'sort_order' => 10],
            ['source_node_type_id' => 'COST_CENTER', 'target_node_type_id' => 'CONTROLLING_AREA', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Cost Center belongs to Controlling Area', 'sort_order' => 11],
            ['source_node_type_id' => 'COST_CENTER', 'target_node_type_id' => 'PROFIT_CENTER', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Cost Center can assign to Profit Center', 'sort_order' => 12],

            // ── Logistics Hierarchy ──
            [
                'source_node_type_id' => 'PLANT',
                'target_node_type_id' => 'COMP_CODE',
                'cardinality' => 'N:1',
                'link_direction' => 'source_to_target',
                'constraint_logic' => ['rules' => [['type' => 'attribute_match', 'source_attr' => 'country_code', 'target_attr' => 'country_code', 'operator' => 'eq']]],
                'description' => 'Plant assigns to Company Code (same country)',
                'sort_order' => 15,
            ],
            ['source_node_type_id' => 'STORAGE_LOC', 'target_node_type_id' => 'PLANT', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Storage Location belongs to Plant', 'sort_order' => 16],
            ['source_node_type_id' => 'VALUATION_AREA', 'target_node_type_id' => 'PLANT', 'cardinality' => '1:1', 'link_direction' => 'source_to_target', 'description' => 'Valuation Area maps to Plant (1:1 in S/4HANA)', 'sort_order' => 17],
            ['source_node_type_id' => 'SHIPPING_POINT', 'target_node_type_id' => 'PLANT', 'cardinality' => 'N:M', 'link_direction' => 'source_to_target', 'description' => 'Shipping Point assigns to Plant', 'sort_order' => 18],
            ['source_node_type_id' => 'LOADING_POINT', 'target_node_type_id' => 'SHIPPING_POINT', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Loading Point belongs to Shipping Point', 'sort_order' => 19],

            // ── MM Hierarchy ──
            ['source_node_type_id' => 'PURCH_ORG', 'target_node_type_id' => 'COMP_CODE', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Purchase Org assigns to Company Code', 'sort_order' => 20],
            ['source_node_type_id' => 'PURCH_ORG', 'target_node_type_id' => 'PLANT', 'cardinality' => 'N:M', 'link_direction' => 'source_to_target', 'description' => 'Purchase Org can assign to Plant', 'sort_order' => 21],
            ['source_node_type_id' => 'PURCH_GROUP', 'target_node_type_id' => 'PURCH_ORG', 'cardinality' => 'N:M', 'link_direction' => 'source_to_target', 'description' => 'Purchasing Group operates under Purchase Org', 'sort_order' => 22],

            // ── SD Hierarchy ──
            ['source_node_type_id' => 'SALES_ORG', 'target_node_type_id' => 'COMP_CODE', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Sales Org assigns to Company Code', 'sort_order' => 25],
            ['source_node_type_id' => 'DISTR_CHANNEL', 'target_node_type_id' => 'SALES_ORG', 'cardinality' => 'N:M', 'link_direction' => 'source_to_target', 'description' => 'Distribution Channel assigns to Sales Org', 'sort_order' => 26],
            ['source_node_type_id' => 'DIVISION', 'target_node_type_id' => 'SALES_ORG', 'cardinality' => 'N:M', 'link_direction' => 'source_to_target', 'description' => 'Division assigns to Sales Org', 'sort_order' => 27],
            ['source_node_type_id' => 'SALES_OFFICE', 'target_node_type_id' => 'SALES_ORG', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Sales Office assigns to Sales Org', 'sort_order' => 28],
            ['source_node_type_id' => 'SALES_GROUP', 'target_node_type_id' => 'SALES_OFFICE', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Sales Group belongs to Sales Office', 'sort_order' => 29],
            ['source_node_type_id' => 'PLANT', 'target_node_type_id' => 'SALES_ORG', 'cardinality' => 'N:M', 'link_direction' => 'source_to_target', 'description' => 'Plant can be assigned to Sales Org for distribution', 'sort_order' => 30],

            // ── HR Hierarchy ──
            ['source_node_type_id' => 'PERSONNEL_AREA', 'target_node_type_id' => 'COMP_CODE', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Personnel Area belongs to Company Code', 'sort_order' => 35],
            ['source_node_type_id' => 'PERSONNEL_SUBAREA', 'target_node_type_id' => 'PERSONNEL_AREA', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Personnel Subarea belongs to Personnel Area', 'sort_order' => 36],
            ['source_node_type_id' => 'HR_ORG_UNIT', 'target_node_type_id' => 'HR_ORG_UNIT', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'HR Org Unit reports to parent Org Unit (hierarchy)', 'sort_order' => 37],
            ['source_node_type_id' => 'POSITION', 'target_node_type_id' => 'HR_ORG_UNIT', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Position belongs to HR Org Unit', 'sort_order' => 38],
            ['source_node_type_id' => 'POSITION', 'target_node_type_id' => 'JOB', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Position is described by a Job', 'sort_order' => 39],
            ['source_node_type_id' => 'EMPLOYEE_SUBGROUP', 'target_node_type_id' => 'EMPLOYEE_GROUP', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Employee Subgroup belongs to Employee Group', 'sort_order' => 40],

            // ── Project Systems ──
            ['source_node_type_id' => 'WBS_ELEMENT', 'target_node_type_id' => 'COMP_CODE', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'WBS Element belongs to Company Code', 'sort_order' => 45],
            ['source_node_type_id' => 'WBS_ELEMENT', 'target_node_type_id' => 'PROFIT_CENTER', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'WBS Element can assign to Profit Center', 'sort_order' => 46],

            // ── Cross-domain assignments ──
            ['source_node_type_id' => 'PLANT', 'target_node_type_id' => 'PROFIT_CENTER', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Plant assigns default Profit Center', 'sort_order' => 50],
            ['source_node_type_id' => 'SALES_ORG', 'target_node_type_id' => 'CREDIT_CTRL_AREA', 'cardinality' => 'N:1', 'link_direction' => 'source_to_target', 'description' => 'Sales Org assigns to Credit Control Area', 'sort_order' => 51],
        ];

        foreach ($topologyRules as $rule) {
            TopologyRule::updateOrCreate(
                [
                    'source_node_type_id' => $rule['source_node_type_id'],
                    'target_node_type_id' => $rule['target_node_type_id'],
                ],
                array_merge($rule, ['is_active' => true])
            );
        }
    }
}
