<?php

namespace Database\Seeders;

use App\Models\DocumentTemplate;
use Illuminate\Database\Seeder;

class DocumentTemplateSeeder extends Seeder
{
    /**
     * Shared professional CSS design system embedded in every template.
     * Uses class-based styling for clean, maintainable markup.
     */
    private function css(string $accent = '#0B2447', string $accentLight = '#E8EDF4'): string
    {
        return '<style>
@import url("https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap");
*{margin:0;padding:0;box-sizing:border-box}
.dw{font-family:"Tajawal","Noto Naskh Arabic","Traditional Arabic",sans-serif;max-width:210mm;margin:auto;padding:0;color:#1a1a1a;line-height:1.85;font-size:14px;direction:rtl;position:relative;background:#fff}
.dw::before{content:"";position:absolute;top:0;right:0;left:0;height:6px;background:linear-gradient(90deg,' . $accent . ' 0%,' . $accent . 'cc 50%,' . $accent . '88 100%)}
.dw::after{content:"سري وموثوق";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:700;color:rgba(0,0,0,.025);pointer-events:none;white-space:nowrap;letter-spacing:8px;z-index:0}
.dp{padding:40px 50px 30px}
.dh{display:flex;justify-content:space-between;align-items:flex-start;padding:20px 0 18px;border-bottom:2px solid ' . $accent . ';margin-bottom:24px}
.dh-logo{width:80px;height:80px;border:2px solid ' . $accent . '33;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;background:' . $accentLight . '}
.dh-info{text-align:center;flex:1;padding:0 20px}
.dh-info h2{font-size:13px;color:' . $accent . ';font-weight:700;margin-bottom:2px;letter-spacing:.5px}
.dh-info p{font-size:10px;color:#888;margin:1px 0}
.dh-ref{text-align:left;font-size:10px;color:#666;min-width:140px}
.dh-ref span{display:block;margin:2px 0}
.dt{text-align:center;margin:20px 0 24px}
.dt h1{font-size:22px;color:' . $accent . ';font-weight:700;margin:0 0 4px;letter-spacing:1px}
.dt p{font-size:13px;color:#666;font-style:italic;margin:0}
.dt .dt-line{width:80px;height:3px;background:linear-gradient(90deg,' . $accent . ',transparent);margin:8px auto 0}
.di{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:0 0 20px;border:1px solid #e2e2e2;border-radius:6px;overflow:hidden}
.di-row{display:flex;border-bottom:1px solid #eee}
.di-row:last-child{border-bottom:none}
.di-label{background:' . $accentLight . ';padding:9px 14px;font-weight:600;font-size:12.5px;color:#333;width:40%;min-width:40%;border-left:1px solid #e2e2e2}
.di-value{padding:9px 14px;font-size:12.5px;color:#444;flex:1}
.di-full{grid-column:1/-1}
table.dtb{width:100%;border-collapse:collapse;margin:16px 0;font-size:12.5px}
table.dtb th{background:' . $accent . ';color:#fff;padding:10px 12px;font-weight:600;text-align:right;font-size:11.5px;letter-spacing:.3px}
table.dtb td{padding:9px 12px;border:1px solid #e5e5e5;vertical-align:middle}
table.dtb tr:nth-child(even) td{background:#fafafa}
table.dtb tr:hover td{background:' . $accentLight . '}
.ds{margin:20px 0}
.ds h3{font-size:15px;color:' . $accent . ';font-weight:700;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid ' . $accent . '33}
.ds p,.ds li{font-size:13px;line-height:2;color:#333}
.ds ol{padding-right:22px;margin:8px 0}
.ds .note-box{background:' . $accentLight . ';border-right:4px solid ' . $accent . ';padding:14px 18px;border-radius:0 6px 6px 0;margin:12px 0;font-size:12.5px}
.ds .warn-box{background:#FFF8E7;border-right:4px solid #D4A017;padding:14px 18px;border-radius:0 6px 6px 0;margin:12px 0}
.ds .input-line{border-bottom:1px dotted #999;display:inline-block;min-width:200px;margin:0 4px}
.dsig{display:flex;justify-content:space-between;margin:50px 0 20px;gap:30px;page-break-inside:avoid}
.dsig-block{text-align:center;flex:1}
.dsig-line{border-top:2px solid #333;padding-top:8px;margin-top:40px}
.dsig-name{font-weight:700;font-size:13px;color:#222}
.dsig-title{font-size:11px;color:#777;margin-top:2px}
.dsig-date{font-size:10px;color:#999;margin-top:6px}
.df{margin-top:30px;padding-top:12px;border-top:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#aaa}
.df-qr{width:50px;height:50px;border:1px solid #ddd;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:7px;color:#ccc}
.badge-status{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:600}
.chk{display:inline-block;width:16px;height:16px;border:2px solid ' . $accent . ';border-radius:3px;vertical-align:middle;margin-left:6px}
@media print{.dw{max-width:none;padding:0}.dw::before{print-color-adjust:exact;-webkit-print-color-adjust:exact}table.dtb th{print-color-adjust:exact;-webkit-print-color-adjust:exact}@page{size:A4;margin:12mm 10mm}.dp{padding:30px 40px 20px}}
</style>';
    }

    /** Document header block with company area + reference. */
    private function header(string $refPrefix = 'DOC'): string
    {
        return '<div class="dh">
<div class="dh-logo">شعار<br>المؤسسة</div>
<div class="dh-info"><h2>{{company_name}}</h2><p>المملكة العربية السعودية</p><p>Kingdom of Saudi Arabia</p></div>
<div class="dh-ref"><span><strong>رقم المرجع:</strong></span><span>{{reference_number}}</span><span><strong>التاريخ:</strong></span><span>{{today_date}}</span></div>
</div>';
    }

    /** Standard signature block. */
    private function signatures(array $signers): string
    {
        $html = '<div class="dsig">';
        foreach ($signers as $s) {
            $html .= '<div class="dsig-block"><div class="dsig-line"><div class="dsig-name">' . $s['ar'] . '</div><div class="dsig-title">' . ($s['en'] ?? '') . '</div></div><div class="dsig-date">التاريخ: ___/___/______</div></div>';
        }
        return $html . '</div>';
    }

    /** Standard document footer. */
    private function footer(): string
    {
        return '<div class="df">
<div>هذا المستند صادر إلكترونياً ولا يحتاج إلى توقيع يدوي ما لم يُذكر خلاف ذلك | Electronically generated document</div>
<div class="df-qr">QR<br>Code</div>
</div>';
    }

    private function wrap(string $accent, string $accentLight, string $content): string
    {
        return $this->css($accent, $accentLight) . '<div class="dw"><div class="dp">' . $content . '</div></div>';
    }

    public function run(): void
    {
        $templates = [
            // ═══ CONTRACT: Standard ═══
            [
                'template_key' => 'contract_standard',
                'template_name_ar' => 'عقد عمل قياسي',
                'template_name_en' => 'Standard Employment Contract',
                'template_type' => 'contract',
                'body_html' => $this->wrap('#0B2447', '#E8EDF4',
                    $this->header('CTR') .
                    '<div class="dt"><h1>عقد عمل</h1><p>Employment Contract</p><div class="dt-line"></div></div>
<div class="di">
<div class="di-row di-full"><div class="di-label">اسم الموظف / Employee Name</div><div class="di-value">{{employee_name}}</div></div>
<div class="di-row"><div class="di-label">الرقم الوظيفي</div><div class="di-value">{{employee_code}}</div></div>
<div class="di-row"><div class="di-label">رقم الهوية</div><div class="di-value">{{employee_national_id}}</div></div>
<div class="di-row"><div class="di-label">القسم / Dept.</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">المسمى / Title</div><div class="di-value">{{role}}</div></div>
<div class="di-row"><div class="di-label">تاريخ التعيين</div><div class="di-value">{{hire_date}}</div></div>
<div class="di-row"><div class="di-label">نوع العقد</div><div class="di-value">{{contract_type}}</div></div>
<div class="di-row di-full"><div class="di-label">الراتب الأساسي / Base Salary</div><div class="di-value">{{base_salary}} ريال سعودي / SAR</div></div>
</div>
<div class="ds"><h3>البنود والشروط / Terms & Conditions</h3>
<ol>
<li>يلتزم الطرف الثاني بأداء المهام الموكلة إليه وفقاً للوصف الوظيفي المعتمد.</li>
<li>فترة التجربة ثلاثة (3) أشهر تبدأ من تاريخ مباشرة العمل وفقاً للمادة (53) من نظام العمل.</li>
<li>ساعات العمل ثمان (8) ساعات يومياً، وفقاً لجدول العمل المعتمد.</li>
<li>يستحق الموظف إجازة سنوية لا تقل عن واحد وعشرين (21) يوماً مدفوعة الأجر وفقاً للمادة (109).</li>
<li>يخضع هذا العقد لأحكام نظام العمل السعودي ولوائحه التنفيذية الصادرة بالمرسوم الملكي رقم (م/51).</li>
<li>أي نزاع ينشأ عن هذا العقد تختص به الجهات القضائية المختصة في المملكة العربية السعودية.</li>
</ol>
<div class="note-box">✦ تم تحرير هذا العقد من نسختين أصليتين، لكل طرف نسخة للعمل بموجبها.</div>
</div>' .
                    $this->signatures([
                        ['ar' => 'توقيع الموظف', 'en' => 'Employee Signature'],
                        ['ar' => 'المدير المباشر', 'en' => 'Direct Manager'],
                        ['ar' => 'المدير المفوض', 'en' => 'Authorized Signatory'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => json_encode(['contract_type', 'reference_number']),
                'is_active' => true,
            ],

            // ═══ CONTRACT: Probation ═══
            [
                'template_key' => 'contract_probation',
                'template_name_ar' => 'عقد عمل تحت التجربة',
                'template_name_en' => 'Probationary Employment Contract',
                'template_type' => 'contract',
                'body_html' => $this->wrap('#1B3A5C', '#E6EEF6',
                    $this->header('PRB') .
                    '<div class="dt"><h1>عقد عمل – فترة تجربة</h1><p>Probationary Employment Contract</p><div class="dt-line"></div></div>
<p style="font-size:13.5px;margin-bottom:16px">إنه في يوم <strong>{{today_date}}</strong> تم الاتفاق بين المؤسسة (الطرف الأول) والسيد/ة <strong>{{employee_name}}</strong> حامل/ة هوية رقم <strong>{{employee_national_id}}</strong> (الطرف الثاني) على الآتي:</p>
<div class="di">
<div class="di-row"><div class="di-label">المسمى الوظيفي</div><div class="di-value">{{role}}</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">تاريخ المباشرة</div><div class="di-value">{{hire_date}}</div></div>
<div class="di-row"><div class="di-label">مدة التجربة</div><div class="di-value">تسعون (90) يوماً ميلادياً</div></div>
<div class="di-row di-full"><div class="di-label">الراتب أثناء التجربة</div><div class="di-value">{{base_salary}} ريال سعودي شهرياً</div></div>
</div>
<div class="ds">
<div class="warn-box">⚠ وفقاً للمادة (53) من نظام العمل: يحق لأي من الطرفين إنهاء العقد خلال فترة التجربة دون إشعار مسبق ودون تعويض أو مكافأة نهاية خدمة.</div>
</div>' .
                    $this->signatures([
                        ['ar' => 'الموظف', 'en' => 'Employee'],
                        ['ar' => 'صاحب العمل', 'en' => 'Employer'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => json_encode(['reference_number']),
                'is_active' => true,
            ],

            // ═══ CLEARANCE: Standard ═══
            [
                'template_key' => 'clearance_form',
                'template_name_ar' => 'نموذج إخلاء طرف',
                'template_name_en' => 'Employee Clearance Form',
                'template_type' => 'clearance',
                'body_html' => $this->wrap('#7A1F1F', '#FBF0F0',
                    $this->header('CLR') .
                    '<div class="dt"><h1>نموذج إخلاء طرف</h1><p>Employee Clearance Form</p><div class="dt-line"></div></div>
<div class="di">
<div class="di-row"><div class="di-label">اسم الموظف</div><div class="di-value">{{employee_name}}</div></div>
<div class="di-row"><div class="di-label">الرقم الوظيفي</div><div class="di-value">{{employee_code}}</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">المسمى</div><div class="di-value">{{role}}</div></div>
<div class="di-row"><div class="di-label">تاريخ الالتحاق</div><div class="di-value">{{hire_date}}</div></div>
<div class="di-row"><div class="di-label">آخر يوم عمل</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
</div>
<div class="ds"><h3>جدول إخلاء الطرف / Clearance Checklist</h3></div>
<table class="dtb">
<tr><th style="width:5%">#</th><th>الجهة / Department</th><th style="width:12%">مخلص</th><th style="width:12%">غير مخلص</th><th style="width:18%">التوقيع</th><th style="width:14%">التاريخ</th></tr>
<tr><td style="text-align:center">1</td><td>الموارد البشرية / Human Resources</td><td style="text-align:center"><span class="chk"></span></td><td style="text-align:center"><span class="chk"></span></td><td></td><td></td></tr>
<tr><td style="text-align:center">2</td><td>تقنية المعلومات / Information Technology</td><td style="text-align:center"><span class="chk"></span></td><td style="text-align:center"><span class="chk"></span></td><td></td><td></td></tr>
<tr><td style="text-align:center">3</td><td>الشؤون المالية / Finance</td><td style="text-align:center"><span class="chk"></span></td><td style="text-align:center"><span class="chk"></span></td><td></td><td></td></tr>
<tr><td style="text-align:center">4</td><td>إدارة الأصول / Asset Management</td><td style="text-align:center"><span class="chk"></span></td><td style="text-align:center"><span class="chk"></span></td><td></td><td></td></tr>
<tr><td style="text-align:center">5</td><td>الشؤون الإدارية / General Admin</td><td style="text-align:center"><span class="chk"></span></td><td style="text-align:center"><span class="chk"></span></td><td></td><td></td></tr>
<tr><td style="text-align:center">6</td><td>الشؤون القانونية / Legal Affairs</td><td style="text-align:center"><span class="chk"></span></td><td style="text-align:center"><span class="chk"></span></td><td></td><td></td></tr>
</table>' .
                    $this->signatures([
                        ['ar' => 'الموظف', 'en' => 'Employee'],
                        ['ar' => 'مدير الموارد البشرية', 'en' => 'HR Manager'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => json_encode(['reference_number']),
                'is_active' => true,
            ],

            // ═══ CLEARANCE: Final Settlement ═══
            [
                'template_key' => 'clearance_final_settlement',
                'template_name_ar' => 'مخالصة نهائية',
                'template_name_en' => 'Final Settlement Statement',
                'template_type' => 'clearance',
                'body_html' => $this->wrap('#6B1D1D', '#FAF0F0',
                    $this->header('FNL') .
                    '<div class="dt"><h1>مخالصة نهائية</h1><p>Final Settlement Statement</p><div class="dt-line"></div></div>
<p style="font-size:13px;margin-bottom:14px">أقر أنا الموقع أدناه <strong>{{employee_name}}</strong>، الرقم الوظيفي <strong>{{employee_code}}</strong>، رقم الهوية <strong>{{employee_national_id}}</strong>، بأنني استلمت كافة مستحقاتي المالية:</p>
<table class="dtb">
<tr><th style="width:5%">#</th><th>البند / Item</th><th style="width:25%">المبلغ (ريال) / Amount</th></tr>
<tr><td style="text-align:center">1</td><td>الراتب الأساسي المستحق / Due Base Salary</td><td style="text-align:center">{{base_salary}}</td></tr>
<tr><td style="text-align:center">2</td><td>بدل الإجازات المتبقية / Unused Leave Balance</td><td style="text-align:center"><span class="input-line">&nbsp;</span></td></tr>
<tr><td style="text-align:center">3</td><td>مكافأة نهاية الخدمة / End-of-Service Award</td><td style="text-align:center"><span class="input-line">&nbsp;</span></td></tr>
<tr><td style="text-align:center">4</td><td>خصومات / Deductions</td><td style="text-align:center"><span class="input-line">&nbsp;</span></td></tr>
<tr style="font-weight:700"><td></td><td>الصافي المستحق / Net Amount Due</td><td style="text-align:center;font-size:14px"><span class="input-line">&nbsp;</span></td></tr>
</table>
<div class="ds"><div class="note-box">✦ بموجب هذا الإقرار، أبرئ ذمة المؤسسة من أي مطالبات عمالية أو مالية حالية أو مستقبلية تتعلق بعلاقة العمل.</div></div>' .
                    $this->signatures([
                        ['ar' => 'الموظف', 'en' => 'Employee'],
                        ['ar' => 'الشؤون المالية', 'en' => 'Finance Dept.'],
                        ['ar' => 'مدير الموارد البشرية', 'en' => 'HR Manager'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => null,
                'is_active' => true,
            ],

            // ═══ WARNING: First ═══
            [
                'template_key' => 'warning_letter',
                'template_name_ar' => 'خطاب إنذار أول',
                'template_name_en' => 'First Warning Letter',
                'template_type' => 'warning',
                'body_html' => $this->wrap('#7D4E00', '#FFF8EB',
                    $this->header('WRN') .
                    '<div class="dt"><h1>خطاب إنذار – أول</h1><p>First Written Warning</p><div class="dt-line"></div></div>
<div class="di">
<div class="di-row di-full"><div class="di-label">الموظف / Employee</div><div class="di-value">{{employee_name}} ({{employee_code}})</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">المسمى</div><div class="di-value">{{role}}</div></div>
</div>
<div class="ds"><h3>تفاصيل المخالفة / Violation Details</h3>
<div class="warn-box">
<p style="margin:0 0 10px"><strong>نوع المخالفة:</strong> <span class="input-line">&nbsp;</span></p>
<p style="margin:0 0 10px"><strong>تاريخ المخالفة:</strong> <span class="input-line">&nbsp;</span></p>
<p style="margin:0 0 10px"><strong>وصف المخالفة:</strong></p>
<div style="min-height:50px;border:1px dashed #D4A017;border-radius:4px;padding:10px;margin-top:6px;background:#fff"></div>
</div>
<p style="margin-top:14px;font-size:13px">نأمل الالتزام بلوائح العمل الداخلية، علماً بأن تكرار المخالفة سيعرّض الموظف لإجراءات تأديبية أشد وفقاً لنظام العمل السعودي.</p>
</div>' .
                    $this->signatures([
                        ['ar' => 'الموظف (بالعلم)', 'en' => 'Employee (Acknowledged)'],
                        ['ar' => 'المدير المباشر', 'en' => 'Direct Manager'],
                        ['ar' => 'الموارد البشرية', 'en' => 'HR Department'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => json_encode(['reference_number']),
                'is_active' => true,
            ],

            // ═══ WARNING: Final ═══
            [
                'template_key' => 'warning_final',
                'template_name_ar' => 'إنذار نهائي',
                'template_name_en' => 'Final Warning Notice',
                'template_type' => 'warning',
                'body_html' => $this->wrap('#8B0000', '#FFF0F0',
                    $this->header('FWR') .
                    '<div class="dt"><h1>⚠ إنذار نهائي</h1><p>Final Warning Notice</p><div class="dt-line"></div></div>
<div class="di">
<div class="di-row di-full"><div class="di-label">الموظف</div><div class="di-value">{{employee_name}} — {{employee_code}}</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">المسمى</div><div class="di-value">{{role}}</div></div>
</div>
<div class="ds">
<div class="warn-box" style="border-right-color:#8B0000;background:#FFF0F0">
<p style="color:#8B0000;font-weight:700;font-size:14px;margin:0 0 10px">⚠ هذا إنذار نهائي قبل اتخاذ الإجراء التأديبي النهائي</p>
<p style="margin:0 0 6px"><strong>الإنذارات السابقة:</strong> <span class="input-line">&nbsp;</span></p>
<p style="margin:0 0 6px"><strong>المخالفة الحالية:</strong> <span class="input-line">&nbsp;</span></p>
<p style="margin:0"><strong>تاريخ المخالفة:</strong> <span class="input-line">&nbsp;</span></p>
</div>
<p style="font-size:13px;margin-top:14px">استناداً للمادة <strong>(80)</strong> من نظام العمل السعودي، فإن تكرار المخالفة أو أي مخالفة جسيمة قد يترتب عليها <strong>إنهاء العلاقة التعاقدية</strong> دون مكافأة أو تعويض.</p>
</div>' .
                    $this->signatures([
                        ['ar' => 'الموظف', 'en' => 'Employee'],
                        ['ar' => 'المدير العام', 'en' => 'General Manager'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => json_encode(['reference_number']),
                'is_active' => true,
            ],

            // ═══ ID CARD ═══
            [
                'template_key' => 'id_card_standard',
                'template_name_ar' => 'بطاقة هوية موظف',
                'template_name_en' => 'Employee ID Card',
                'template_type' => 'id_card',
                'body_html' => '<style>
@import url("https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap");
*{margin:0;padding:0;box-sizing:border-box}
</style>
<div style="width:350px;height:220px;background:linear-gradient(145deg,#0B2447 0%,#19376D 45%,#576CBC 100%);border-radius:14px;padding:22px 20px 16px;color:#fff;font-family:Tajawal,sans-serif;position:relative;overflow:hidden;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,.2)">
<div style="position:absolute;top:-50px;left:-50px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.05)"></div>
<div style="position:absolute;bottom:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.04)"></div>
<div style="position:absolute;top:0;right:0;left:0;height:3px;background:linear-gradient(90deg,#D4AF37,#F5D061,#D4AF37)"></div>
<div style="font-size:9px;text-align:center;letter-spacing:3px;opacity:.7;margin-bottom:10px;text-transform:uppercase">{{company_name}}</div>
<div style="display:flex;gap:14px;align-items:center">
<div style="width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:24px;border:2px solid rgba(212,175,55,.5);flex-shrink:0">👤</div>
<div style="flex:1;min-width:0">
<div style="font-size:15px;font-weight:700;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{employee_name}}</div>
<div style="font-size:11px;opacity:.85;margin-bottom:1px">{{role}}</div>
<div style="font-size:10px;opacity:.65">{{department}}</div>
</div></div>
<div style="margin-top:14px;display:flex;justify-content:space-between;font-size:9.5px;border-top:1px solid rgba(255,255,255,.15);padding-top:8px">
<div><span style="opacity:.5">الرقم الوظيفي: </span><span style="font-weight:700">{{employee_code}}</span></div>
<div><span style="opacity:.5">تاريخ التعيين: </span>{{hire_date}}</div>
</div>
<div style="position:absolute;bottom:8px;left:12px;font-size:7px;opacity:.35;letter-spacing:1px">OFFICIAL ID</div>
</div>',
                'editable_fields' => null,
                'is_active' => true,
            ],

            // ═══ CERTIFICATE: Experience ═══
            [
                'template_key' => 'experience_certificate',
                'template_name_ar' => 'شهادة خبرة',
                'template_name_en' => 'Experience Certificate',
                'template_type' => 'certificate',
                'body_html' => $this->wrap('#14532D', '#ECFDF5',
                    $this->header('EXP') .
                    '<div class="dt"><h1>شهادة خبرة</h1><p>Experience Certificate</p><div class="dt-line"></div></div>
<div class="ds" style="text-align:center;margin:28px 0"><h3 style="border:none;text-align:center;font-size:16px">إلى من يهمه الأمر / To Whom It May Concern</h3></div>
<div class="ds"><p style="text-indent:30px;font-size:13.5px;margin-bottom:12px">نشهد نحن الموقعون أدناه بأن السيد/ة <strong>{{employee_name}}</strong>، ويحمل/تحمل رقم الهوية <strong>{{employee_national_id}}</strong>، قد عمل/ت لدى مؤسستنا وفق البيانات التالية:</p></div>
<div class="di">
<div class="di-row"><div class="di-label">المسمى الوظيفي</div><div class="di-value">{{role}}</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">تاريخ الالتحاق</div><div class="di-value">{{hire_date}}</div></div>
<div class="di-row"><div class="di-label">الرقم الوظيفي</div><div class="di-value">{{employee_code}}</div></div>
</div>
<div class="ds"><p style="text-indent:30px;font-size:13.5px">وقد أثبت/ت كفاءة عالية وحسن سلوك خلال فترة العمل، ونتمنى له/ها التوفيق في مسيرته/ها المهنية.</p>
<div class="note-box">✦ أُعطيت هذه الشهادة بناءً على طلب المعني/ة دون أي التزام أو مسؤولية مالية على المؤسسة.</div></div>' .
                    $this->signatures([
                        ['ar' => 'مدير الموارد البشرية', 'en' => 'HR Manager'],
                        ['ar' => 'المدير العام', 'en' => 'General Manager'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => json_encode(['reference_number']),
                'is_active' => true,
            ],

            // ═══ CERTIFICATE: Salary ═══
            [
                'template_key' => 'salary_certificate',
                'template_name_ar' => 'تعريف بالراتب',
                'template_name_en' => 'Salary Certificate',
                'template_type' => 'certificate',
                'body_html' => $this->wrap('#0F766E', '#F0FDFA',
                    $this->header('SAL') .
                    '<div class="dt"><h1>خطاب تعريف بالراتب</h1><p>Salary Certificate / Employment Verification</p><div class="dt-line"></div></div>
<div class="ds" style="text-align:center;margin:28px 0"><h3 style="border:none;text-align:center;font-size:16px">إلى من يهمه الأمر / To Whom It May Concern</h3></div>
<div class="ds"><p style="text-indent:30px;font-size:13.5px">نفيد بأن السيد/ة <strong>{{employee_name}}</strong>، رقم الهوية <strong>{{employee_national_id}}</strong>، يعمل/تعمل لدى مؤسستنا بالتفاصيل التالية:</p></div>
<div class="di">
<div class="di-row"><div class="di-label">المسمى الوظيفي</div><div class="di-value">{{role}}</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">تاريخ الالتحاق</div><div class="di-value">{{hire_date}}</div></div>
<div class="di-row"><div class="di-label">نوع العقد</div><div class="di-value">{{contract_type}}</div></div>
<div class="di-row di-full"><div class="di-label">الراتب الأساسي / Base Salary</div><div class="di-value" style="font-weight:700;font-size:15px">{{base_salary}} ريال سعودي / SAR</div></div>
</div>
<div class="ds"><div class="note-box">✦ أُعطي هذا الخطاب بناءً على طلب المعني/ة لتقديمه للجهة المختصة دون أي التزام على المؤسسة.</div></div>' .
                    $this->signatures([
                        ['ar' => 'مدير الموارد البشرية', 'en' => 'HR Manager'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => json_encode(['reference_number']),
                'is_active' => true,
            ],

            // ═══ HANDOVER ═══
            [
                'template_key' => 'handover_form',
                'template_name_ar' => 'محضر تسليم واستلام',
                'template_name_en' => 'Handover Report',
                'template_type' => 'handover',
                'body_html' => $this->wrap('#581C87', '#F5F3FF',
                    $this->header('HND') .
                    '<div class="dt"><h1>محضر تسليم واستلام</h1><p>Handover Report</p><div class="dt-line"></div></div>
<div class="di">
<div class="di-row"><div class="di-label">الموظف المُسلِّم</div><div class="di-value">{{employee_name}} ({{employee_code}})</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">الموظف المُستلِم</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
<div class="di-row"><div class="di-label">تاريخ التسليم</div><div class="di-value">{{today_date}}</div></div>
</div>
<div class="ds"><h3>العهد والأصول المسلّمة / Items & Assets</h3></div>
<table class="dtb">
<tr><th style="width:5%">#</th><th>البند / الأصل / Item</th><th style="width:12%">الكمية</th><th style="width:14%">الحالة</th><th style="width:10%">رقم تسلسلي</th><th style="width:15%">ملاحظات</th></tr>
<tr><td style="text-align:center">1</td><td></td><td></td><td></td><td></td><td></td></tr>
<tr><td style="text-align:center">2</td><td></td><td></td><td></td><td></td><td></td></tr>
<tr><td style="text-align:center">3</td><td></td><td></td><td></td><td></td><td></td></tr>
<tr><td style="text-align:center">4</td><td></td><td></td><td></td><td></td><td></td></tr>
<tr><td style="text-align:center">5</td><td></td><td></td><td></td><td></td><td></td></tr>
</table>' .
                    $this->signatures([
                        ['ar' => 'الموظف المُسلِّم', 'en' => 'Outgoing Employee'],
                        ['ar' => 'الموظف المُستلِم', 'en' => 'Receiving Employee'],
                        ['ar' => 'اعتماد المدير', 'en' => 'Manager Approval'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => null,
                'is_active' => true,
            ],

            // ═══ MEMO: Internal ═══
            [
                'template_key' => 'internal_memo',
                'template_name_ar' => 'مذكرة داخلية',
                'template_name_en' => 'Internal Memorandum',
                'template_type' => 'memo',
                'body_html' => $this->wrap('#334155', '#F1F5F9',
                    $this->header('MEM') .
                    '<div class="dt"><h1>مذكرة داخلية</h1><p>Internal Memorandum</p><div class="dt-line"></div></div>
<div class="di" style="grid-template-columns:1fr">
<div class="di-row"><div class="di-label" style="width:15%">إلى / To:</div><div class="di-value">{{employee_name}} — {{department}}</div></div>
<div class="di-row"><div class="di-label" style="width:15%">من / From:</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
<div class="di-row"><div class="di-label" style="width:15%">التاريخ:</div><div class="di-value">{{today_date}}</div></div>
<div class="di-row"><div class="di-label" style="width:15%">الموضوع:</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
</div>
<div class="ds" style="margin-top:20px">
<div style="min-height:200px;border:1px dashed #94a3b8;border-radius:6px;padding:20px;background:#fafbfc">
<p style="color:#94a3b8;font-style:italic">نص المذكرة...</p>
</div>
</div>' .
                    $this->signatures([
                        ['ar' => 'المُرسل', 'en' => 'Sender'],
                        ['ar' => 'المُستلم (بالعلم)', 'en' => 'Recipient (Acknowledged)'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => null,
                'is_active' => true,
            ],

            // ═══ MEMO: Promotion ═══
            [
                'template_key' => 'promotion_memo',
                'template_name_ar' => 'مذكرة ترقية',
                'template_name_en' => 'Promotion Memorandum',
                'template_type' => 'memo',
                'body_html' => $this->wrap('#0E4DA4', '#EFF6FF',
                    $this->header('PRM') .
                    '<div class="dt"><h1>مذكرة ترقية</h1><p>Promotion Memorandum</p><div class="dt-line"></div></div>
<div class="ds"><p style="font-size:13.5px">يسر إدارة الموارد البشرية الإعلان عن ترقية الموظف/ة <strong>{{employee_name}}</strong> ({{employee_code}}) وفق التفاصيل التالية:</p></div>
<div class="di">
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">المسمى الحالي</div><div class="di-value">{{role}}</div></div>
<div class="di-row"><div class="di-label">المسمى الجديد</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
<div class="di-row"><div class="di-label">الراتب الحالي</div><div class="di-value">{{base_salary}} ريال</div></div>
<div class="di-row"><div class="di-label">الراتب الجديد</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
<div class="di-row"><div class="di-label">تاريخ سريان الترقية</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
</div>
<div class="ds"><div class="note-box">✦ نتمنى للموظف/ة مزيداً من التوفيق والنجاح في المسمى الوظيفي الجديد.</div></div>' .
                    $this->signatures([
                        ['ar' => 'مدير الموارد البشرية', 'en' => 'HR Manager'],
                        ['ar' => 'المدير العام', 'en' => 'General Manager'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => null,
                'is_active' => true,
            ],

            // ═══ OTHER: Return to Work ═══
            [
                'template_key' => 'return_to_work',
                'template_name_ar' => 'نموذج مباشرة عمل',
                'template_name_en' => 'Return to Work Form',
                'template_type' => 'other',
                'body_html' => $this->wrap('#5B21B6', '#F5F3FF',
                    $this->header('RTW') .
                    '<div class="dt"><h1>نموذج مباشرة عمل بعد إجازة</h1><p>Return to Work Form</p><div class="dt-line"></div></div>
<div class="di">
<div class="di-row"><div class="di-label">اسم الموظف</div><div class="di-value">{{employee_name}}</div></div>
<div class="di-row"><div class="di-label">الرقم الوظيفي</div><div class="di-value">{{employee_code}}</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">المسمى</div><div class="di-value">{{role}}</div></div>
<div class="di-row"><div class="di-label">نوع الإجازة</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
<div class="di-row"><div class="di-label">من تاريخ</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
<div class="di-row"><div class="di-label">إلى تاريخ</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
<div class="di-row"><div class="di-label">تاريخ المباشرة الفعلية</div><div class="di-value">{{today_date}}</div></div>
</div>' .
                    $this->signatures([
                        ['ar' => 'الموظف', 'en' => 'Employee'],
                        ['ar' => 'المدير المباشر', 'en' => 'Direct Manager'],
                        ['ar' => 'الموارد البشرية', 'en' => 'HR Department'],
                    ]) .
                    $this->footer()
                ),
                'editable_fields' => null,
                'is_active' => true,
            ],
        ];

        foreach ($templates as $template) {
            DocumentTemplate::updateOrCreate(
                ['template_key' => $template['template_key']],
                $template
            );
        }
    }
}
