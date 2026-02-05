<?php

namespace Database\Seeders;

use App\Models\CurrencyPolicy;
use Illuminate\Database\Seeder;

/**
 * Currency Policy Seeder
 * 
 * Seeds the three standard currency policies as defined in the
 * Multi-Currency Architecture report. Organizations can then
 * activate the policy that matches their operational model.
 */
class CurrencyPolicySeeder extends Seeder
{
    public function run(): void
    {
        // Policy Type C: Normalization (Default for most organizations)
        CurrencyPolicy::updateOrCreate(
            ['code' => 'POLICY_C'],
            [
                'name' => 'التوحيد القياسي',
                'code' => 'POLICY_C',
                'description' => 'السياسة الافتراضية للمؤسسات التي تعمل بشكل أساسي بعملة واحدة. ' .
                    'تُحوَّل جميع المعاملات بالعملات الأجنبية فورًا إلى العملة المرجعية عند التسجيل. ' .
                    'هذا نموذج المحاسبة التقليدي المستخدم من قبل معظم الشركات المحلية.',
                'policy_type' => 'NORMALIZATION',
                'requires_reference_currency' => true,
                'allow_multi_currency_balances' => false,
                'conversion_timing' => 'POSTING',
                'revaluation_enabled' => false,
                'revaluation_frequency' => null,
                'exchange_rate_source' => 'MANUAL',
                'is_active' => true, // Set as default active policy
            ]
        );

        // Policy Type A: Unit of Measure
        CurrencyPolicy::updateOrCreate(
            ['code' => 'POLICY_A'],
            [
                'name' => 'وحدة قياس متعددة العملات',
                'code' => 'POLICY_A',
                'description' => 'مناسبة للمؤسسات التي تحتفظ وتعمل بنشاط بعدة عملات. ' .
                    'تُعامل كل عملة كوحدة قياس مستقلة، ولا يحدث تحويل تلقائي. ' .
                    'تُحفظ أرصدة دفاتر الأستاذ لكل عملة على حدة. مثالية لشركات الاستيراد/التصدير، ' .
                    'وتجار الفوركس أو البيئات ذات ندرة العملة.',
                'policy_type' => 'UNIT_OF_MEASURE',
                'requires_reference_currency' => false,
                'allow_multi_currency_balances' => true,
                'conversion_timing' => 'NEVER',
                'revaluation_enabled' => false,
                'revaluation_frequency' => null,
                'exchange_rate_source' => 'MANUAL',
                'is_active' => false,
            ]
        );

        // Policy Type B: Valued Asset
        CurrencyPolicy::updateOrCreate(
            ['code' => 'POLICY_B'],
            [
                'name' => 'أصل مقوَّم مع إعادة تقييم',
                'code' => 'POLICY_B',
                'description' => 'مناسبة للمؤسسات ذات تعرض كبير للعملات الأجنبية وتحتاج إلى إعادة تقييم دورية. ' .
                    'تُحفظ المبالغ بالعملة الأصلية مع تحويل اختياري. تُعاد تقييم الأرصدة بالعملات الأجنبية بشكل دوري ' .
                    'لتعكس تغيّرات أسعار الصرف مع الاعتراف بالفروقات (أرباح/خسائر). مناسبة للأعمال التي لديها ' .
                    'حسابات مستحقة أو مستحقة بالعملات الأجنبية بشكل كبير.',
                'policy_type' => 'VALUED_ASSET',
                'requires_reference_currency' => true,
                'allow_multi_currency_balances' => true,
                'conversion_timing' => 'SETTLEMENT',
                'revaluation_enabled' => true,
                'revaluation_frequency' => 'PERIOD_END',
                'exchange_rate_source' => 'MANUAL',
                'is_active' => false,
            ]
        );

        // Hybrid Policy for international operations
        CurrencyPolicy::updateOrCreate(
            ['code' => 'POLICY_HYBRID'],
            [
                'name' => 'هجين للعمليات الدولية',
                'code' => 'POLICY_HYBRID',
                'description' => 'مناسبة للعمليات متعددة الجنسيات التي تتطلب كلًا من التقارير الموحدة وتتبع متعدد العملات. ' .
                    'تُخزن المعاملات بالعملة الأصلية مع تحويل فوري لأغراض التقارير. تدعم إدارة العملات التشغيلية ' .
                    'والقوائم المالية المجمعة.',
                'policy_type' => 'VALUED_ASSET',
                'requires_reference_currency' => true,
                'allow_multi_currency_balances' => true,
                'conversion_timing' => 'POSTING',
                'revaluation_enabled' => true,
                'revaluation_frequency' => 'MONTHLY',
                'exchange_rate_source' => 'MANUAL',
                'is_active' => false,
            ]
        );
    }
}
