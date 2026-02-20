import { TemplateField } from "@/components/template-editor/types";

// ── HR Approved Keys ──
export const HR_APPROVED_KEYS: TemplateField[] = [
    { key: "company_name", description: "اسم المؤسسة", type: "string" },
    { key: "reference_number", description: "رقم المرجع", type: "string" },
    { key: "today_date", description: "تاريخ اليوم", type: "date" },
    { key: "employee_name", description: "اسم الموظف", type: "string" },
    { key: "employee_code", description: "الرقم الوظيفي", type: "string" },
    { key: "employee_national_id", description: "رقم الهوية", type: "string" },
    { key: "department", description: "القسم", type: "string" },
    { key: "role", description: "المسمى الوظيفي", type: "string" },
    { key: "hire_date", description: "تاريخ التعيين", type: "date" },
    { key: "contract_type", description: "نوع العقد", type: "string" },
    { key: "base_salary", description: "الراتب الأساسي", type: "number" },
    { key: "email", description: "البريد الإلكتروني", type: "string" },
    { key: "phone", description: "رقم الجوال", type: "string" },
];

// ── Mock data for preview ──
export const HR_MOCK_CONTEXT: Record<string, string> = {
    company_name: "شركة النور للتقنية",
    reference_number: "HR-2026-00142",
    today_date: "2026-02-20",
    employee_name: "أحمد محمد العتيبي",
    employee_code: "EMP-0057",
    employee_national_id: "1098765432",
    department: "تقنية المعلومات",
    role: "مطور برمجيات أول",
    hire_date: "2023-06-15",
    contract_type: "دوام كامل",
    base_salary: "12,500",
    email: "ahmed.m@alnoor-tech.sa",
    phone: "+966 55 123 4567",
};

// ── Bilingual labels for every template type ──
export const templateTypeLabels: Record<string, string> = {
    contract: "عقد عمل",
    clearance: "نموذج إخلاء طرف",
    warning: "خطاب إنذار",
    id_card: "بطاقة هوية",
    handover: "نموذج تسليم",
    certificate: "شهادة",
    memo: "مذكرة",
    other: "أخرى",
};

// ── Badge colors ──
export const templateTypeBadgeClass: Record<string, string> = {
    contract: "badge-primary",
    clearance: "badge-danger",
    warning: "badge-warning",
    id_card: "badge-info",
    handover: "badge-secondary",
    certificate: "badge-success",
    memo: "badge-default",
    other: "badge-secondary",
};

// ═══════════════════════════════════════════════════
// Professional CSS Design System (Enhanced)
// ═══════════════════════════════════════════════════
function docCSS(accent: string = '#0B2447', accentLight: string = '#E8EDF4', accentDark: string = '#05101F'): string {
    return `<style>
@import url("https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;600;700&display=swap");
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Tajawal","Noto Naskh Arabic","Traditional Arabic",sans-serif;background:#f5f5f5}
.dw{font-family:"Tajawal","Noto Naskh Arabic","Traditional Arabic",sans-serif;max-width:210mm;margin:20px auto;padding:0;color:#1a1a1a;line-height:1.8;font-size:14px;direction:rtl;position:relative;background:#fff;box-shadow:0 0 20px rgba(0,0,0,0.1);border-radius:4px;overflow:hidden}
.dw::before{content:"";position:absolute;top:0;right:0;left:0;height:8px;background:linear-gradient(90deg,${accentDark} 0%,${accent} 50%,${accentDark} 100%);z-index:1}
.dw::after{content:"سري وموثوق";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:96px;font-weight:700;color:rgba(0,0,0,.02);pointer-events:none;white-space:nowrap;letter-spacing:12px;z-index:0;opacity:0.3}
.dp{padding:45px 55px 35px;position:relative;z-index:1}
.dh{display:flex;justify-content:space-between;align-items:flex-start;padding:25px 0 22px;border-bottom:3px solid ${accent};margin-bottom:28px;background:linear-gradient(to left,${accentLight},transparent);padding:25px 20px 22px;border-radius:6px}
.dh-logo{width:90px;height:90px;border:3px solid ${accent};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#666;background:${accentLight};font-weight:600;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.dh-info{text-align:center;flex:1;padding:0 25px}
.dh-info h2{font-size:16px;color:${accent};font-weight:700;margin-bottom:4px;letter-spacing:0.5px;text-transform:uppercase}
.dh-info p{font-size:11px;color:#666;margin:2px 0;font-weight:500}
.dh-ref{text-align:left;font-size:11px;color:#555;min-width:160px;background:#fff;padding:12px 15px;border-radius:6px;border:1px solid #e0e0e0;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
.dh-ref span{display:block;margin:4px 0;line-height:1.6}
.dh-ref strong{color:${accent};font-weight:600}
.dt{text-align:center;margin:28px 0 30px;position:relative}
.dt h1{font-size:26px;color:${accent};font-weight:700;margin:0 0 6px;letter-spacing:1px;text-shadow:0 1px 2px rgba(0,0,0,0.05)}
.dt p{font-size:14px;color:#777;font-style:italic;margin:0;font-weight:500}
.dt .dt-line{width:120px;height:4px;background:linear-gradient(90deg,transparent,${accent},transparent);margin:12px auto 0;border-radius:2px}
.di{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:0 0 24px;border:2px solid #e5e5e5;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.05)}
.di-row{display:flex;border-bottom:1px solid #eee;transition:background 0.2s}
.di-row:last-child{border-bottom:none}
.di-row:hover{background:#fafafa}
.di-label{background:linear-gradient(to left,${accentLight},#f8f9fa);padding:12px 16px;font-weight:600;font-size:13px;color:#333;width:42%;min-width:42%;border-left:2px solid ${accent};font-weight:700}
.di-value{padding:12px 16px;font-size:13px;color:#444;flex:1;font-weight:500}
.di-full{grid-column:1/-1}
table.dtb{width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;box-shadow:0 1px 4px rgba(0,0,0,0.05);border-radius:6px;overflow:hidden}
table.dtb th{background:linear-gradient(135deg,${accent},${accentDark});color:#fff;padding:12px 14px;font-weight:600;text-align:right;font-size:12px;letter-spacing:0.3px;text-transform:uppercase;border-right:1px solid rgba(255,255,255,0.2)}
table.dtb th:first-child{border-right:none}
table.dtb td{padding:11px 14px;border:1px solid #e8e8e8;vertical-align:middle;background:#fff}
table.dtb tr:nth-child(even) td{background:#f9f9f9}
table.dtb tr:hover td{background:${accentLight};transition:background 0.2s}
.ds{margin:24px 0}
.ds h3{font-size:17px;color:${accent};font-weight:700;margin:0 0 14px;padding-bottom:8px;border-bottom:2px solid ${accent}33;text-transform:uppercase;letter-spacing:0.5px}
.ds p,.ds li{font-size:14px;line-height:2.1;color:#333;text-align:justify}
.ds ol{padding-right:28px;margin:12px 0;counter-reset:item}
.ds ol li{margin:8px 0;position:relative;padding-right:8px}
.ds ol li::marker{font-weight:700;color:${accent}}
.ds .note-box{background:linear-gradient(to left,${accentLight},#f0f4f8);border-right:5px solid ${accent};padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.05);font-weight:500}
.ds .warn-box{background:linear-gradient(to left,#FFF8E7,#FFFBF0);border-right:5px solid #D4A017;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.05);font-weight:500}
.ds .error-box{background:linear-gradient(to left,#FEF2F2,#FFF5F5);border-right:5px solid #DC2626;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.05);font-weight:500}
.ds .input-line{border-bottom:2px dotted #999;display:inline-block;min-width:220px;margin:0 6px;padding-bottom:2px;color:#333;font-weight:500}
.dsig{display:flex;justify-content:space-between;margin:55px 0 25px;gap:35px;page-break-inside:avoid;padding:20px 0;border-top:2px dashed #ddd}
.dsig-block{text-align:center;flex:1;position:relative}
.dsig-line{border-top:3px solid #333;padding-top:10px;margin-top:50px;position:relative}
.dsig-line::before{content:"";position:absolute;top:-3px;left:50%;transform:translateX(-50%);width:60px;height:3px;background:${accent}}
.dsig-name{font-weight:700;font-size:14px;color:#222;margin-bottom:4px;letter-spacing:0.3px}
.dsig-title{font-size:12px;color:#666;margin-top:4px;font-weight:500}
.dsig-date{font-size:11px;color:#999;margin-top:8px;font-style:italic}
.df{margin-top:35px;padding-top:16px;border-top:2px solid #e0e0e0;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#999;background:#fafafa;padding:16px 20px;border-radius:6px}
.df-qr{width:60px;height:60px;border:2px solid #ddd;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#ccc;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.chk{display:inline-block;width:18px;height:18px;border:2.5px solid ${accent};border-radius:4px;vertical-align:middle;margin-left:8px;position:relative}
.chk.checked::after{content:"✓";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:${accent};font-weight:700;font-size:12px}
.seal{display:inline-block;width:80px;height:80px;border:3px solid ${accent};border-radius:50%;margin:10px auto;display:flex;align-items:center;justify-content:center;font-size:10px;color:${accent};font-weight:700;background:${accentLight};text-align:center;line-height:1.3;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
@media print{.dw{max-width:none;margin:0;box-shadow:none;border-radius:0}.dw::before{print-color-adjust:exact;-webkit-print-color-adjust:exact}table.dtb th{print-color-adjust:exact;-webkit-print-color-adjust:exact}@page{size:A4;margin:15mm 12mm}.dp{padding:35px 45px 25px}.dsig{page-break-inside:avoid}}
</style>`;
}

/** Enhanced reusable header block */
function docHeader(): string {
    return `<div class="dh">
<div class="dh-logo">شعار<br>المؤسسة</div>
<div class="dh-info">
<h2>{{company_name}}</h2>
<p>المملكة العربية السعودية</p>
<p>Kingdom of Saudi Arabia</p>
</div>
<div class="dh-ref">
<span><strong>رقم المرجع:</strong></span>
<span>{{reference_number}}</span>
<span><strong>التاريخ:</strong></span>
<span>{{today_date}}</span>
</div>
</div>`;
}

/** Enhanced reusable signatures block */
function docSigs(signers: { ar: string; en: string }[]): string {
    let html = '<div class="dsig">';
    for (const s of signers) {
        html += `<div class="dsig-block">
<div class="dsig-line">
<div class="dsig-name">${s.ar}</div>
<div class="dsig-title">${s.en}</div>
</div>
<div class="dsig-date">التاريخ: ___/___/______</div>
</div>`;
    }
    return html + '</div>';
}

/** Enhanced reusable footer */
function docFooter(): string {
    return `<div class="df">
<div>هذا المستند صادر إلكترونياً ولا يحتاج إلى توقيع يدوي ما لم يُذكر خلاف ذلك<br>Electronically generated document - No manual signature required unless otherwise stated</div>
<div class="df-qr">QR<br>Code</div>
</div>`;
}

/** Wrap with CSS + container */
function docWrap(accent: string, accentLight: string, accentDark: string, content: string): string {
    return `${docCSS(accent, accentLight, accentDark)}<div class="dw"><div class="dp">${content}</div></div>`;
}

// ═══════════════════════════════════════════════════
// Professional Official Templates
// ═══════════════════════════════════════════════════
export const defaultTemplates: Record<string, string> = {
    contract: docWrap('#0B2447', '#E8EDF4', '#05101F',
        docHeader() +
        `<div class="dt">
<h1>عقد عمل</h1>
<p>Employment Contract</p>
<div class="dt-line"></div>
</div>

<div class="di">
<div class="di-row di-full">
<div class="di-label">اسم الموظف / Employee Name</div>
<div class="di-value">{{employee_name}}</div>
</div>
<div class="di-row">
<div class="di-label">الرقم الوظيفي / Employee Code</div>
<div class="di-value">{{employee_code}}</div>
</div>
<div class="di-row">
<div class="di-label">رقم الهوية الوطنية / National ID</div>
<div class="di-value">{{employee_national_id}}</div>
</div>
<div class="di-row">
<div class="di-label">القسم / Department</div>
<div class="di-value">{{department}}</div>
</div>
<div class="di-row">
<div class="di-label">المسمى الوظيفي / Job Title</div>
<div class="di-value">{{role}}</div>
</div>
<div class="di-row">
<div class="di-label">تاريخ التعيين / Hire Date</div>
<div class="di-value">{{hire_date}}</div>
</div>
<div class="di-row">
<div class="di-label">نوع العقد / Contract Type</div>
<div class="di-value">{{contract_type}}</div>
</div>
<div class="di-row di-full">
<div class="di-label">الراتب الأساسي / Base Salary</div>
<div class="di-value">{{base_salary}} ريال سعودي / Saudi Riyals</div>
</div>
<div class="di-row">
<div class="di-label">البريد الإلكتروني / Email</div>
<div class="di-value">{{email}}</div>
</div>
<div class="di-row">
<div class="di-label">رقم الجوال / Phone</div>
<div class="di-value">{{phone}}</div>
</div>
</div>

<div class="ds">
<h3>البنود والشروط / Terms & Conditions</h3>
<ol>
<li>يلتزم الطرف الثاني (الموظف) بأداء المهام والمسؤوليات الموكلة إليه وفقاً للوصف الوظيفي المعتمد من قبل المؤسسة، وبذل الجهد اللازم لتحقيق أهداف العمل بكفاءة ومهنية عالية.</li>
<li>فترة التجربة ثلاثة (3) أشهر من تاريخ بدء العمل، وفقاً للمادة (53) من نظام العمل السعودي، يحق لأي من الطرفين إنهاء العقد خلال هذه الفترة دون إشعار مسبق.</li>
<li>ساعات العمل ثمان (8) ساعات يومياً، خمسة (5) أيام في الأسبوع، من الأحد إلى الخميس، مع الالتزام بمواعيد العمل الرسمية المحددة من قبل المؤسسة.</li>
<li>يستحق الموظف إجازة سنوية مدفوعة الأجر لا تقل عن واحد وعشرين (21) يوماً في السنة، وفقاً لنظام العمل السعودي، مع إمكانية ترحيل ما لا يزيد عن سبعة (7) أيام للعام التالي.</li>
<li>يستحق الموظف إجازة مرضية مدفوعة الأجر لمدة ثلاثين (30) يوماً في السنة، مع تقديم تقرير طبي معتمد من جهة صحية معتمدة.</li>
<li>يستحق الموظف إجازة أمومة مدفوعة الأجر لمدة عشرة (10) أسابيع وفقاً للأنظمة المعمول بها.</li>
<li>يحق للمؤسسة إنهاء العقد في حالة ارتكاب الموظف لأي مخالفة جسيمة أو عدم الالتزام بشروط العقد أو الأنظمة المعمول بها.</li>
<li>يحق للموظف إنهاء العقد بموجب إشعار كتابي قبل ثلاثين (30) يوماً من تاريخ الإنهاء.</li>
<li>جميع المعلومات الواردة في هذا العقد صحيحة ودقيقة، وأي تغيير في هذه المعلومات يتطلب إشعاراً كتابياً من الطرف المعني.</li>
<li>هذا العقد يخضع لقوانين وأنظمة المملكة العربية السعودية، وأي نزاع ينشأ عن هذا العقد يتم حله وفقاً للقوانين المعمول بها.</li>
</ol>
<div class="note-box">
✦ تم تحرير هذا العقد من نسختين أصليتين متطابقتين، لكل طرف نسخة للعمل بموجبها. هذا العقد ساري المفعول من تاريخ التوقيع عليه من كلا الطرفين.
</div>
</div>` +
        docSigs([
            { ar: 'توقيع الموظف / Employee Signature', en: 'Employee' },
            { ar: 'المدير المباشر / Direct Manager', en: 'Direct Manager' },
            { ar: 'المدير المفوض / Authorized Signatory', en: 'Authorized Signatory' },
        ]) +
        docFooter()
    ),

    clearance: docWrap('#7A1F1F', '#FBF0F0', '#4A1212',
        docHeader() +
        `<div class="dt">
<h1>نموذج إخلاء طرف</h1>
<p>Employee Clearance Form</p>
<div class="dt-line"></div>
</div>

<div class="di">
<div class="di-row di-full">
<div class="di-label">اسم الموظف / Employee Name</div>
<div class="di-value">{{employee_name}}</div>
</div>
<div class="di-row">
<div class="di-label">الرقم الوظيفي / Employee Code</div>
<div class="di-value">{{employee_code}}</div>
</div>
<div class="di-row">
<div class="di-label">القسم / Department</div>
<div class="di-value">{{department}}</div>
</div>
<div class="di-row">
<div class="di-label">المسمى الوظيفي / Job Title</div>
<div class="di-value">{{role}}</div>
</div>
<div class="di-row">
<div class="di-label">تاريخ التعيين / Hire Date</div>
<div class="di-value">{{hire_date}}</div>
</div>
<div class="di-row">
<div class="di-label">تاريخ الإنهاء / Termination Date</div>
<div class="di-value">{{today_date}}</div>
</div>
</div>

<div class="ds">
<h3>إخلاء الطرف من الأقسام / Department Clearance</h3>
<p style="margin-bottom:16px">يرجى من الأقسام التالية مراجعة التزامات الموظف والتأكد من إخلاء طرفه قبل التوقيع:</p>
<table class="dtb">
<tr>
<th style="width:5%">#</th>
<th>الجهة / Department</th>
<th style="width:15%">مخلص / Cleared</th>
<th style="width:15%">غير مخلص / Not Cleared</th>
<th style="width:20%">ملاحظات / Notes</th>
<th style="width:15%">التوقيع / Signature</th>
</tr>
<tr>
<td style="text-align:center;font-weight:700">1</td>
<td><strong>الموارد البشرية / Human Resources</strong><br><small style="color:#666">التحقق من الإجازات والرواتب</small></td>
<td style="text-align:center"><span class="chk"></span></td>
<td style="text-align:center"><span class="chk"></span></td>
<td style="font-size:11px;color:#666"></td>
<td></td>
</tr>
<tr>
<td style="text-align:center;font-weight:700">2</td>
<td><strong>تقنية المعلومات / IT Department</strong><br><small style="color:#666">استرجاع الأجهزة والأنظمة</small></td>
<td style="text-align:center"><span class="chk"></span></td>
<td style="text-align:center"><span class="chk"></span></td>
<td style="font-size:11px;color:#666"></td>
<td></td>
</tr>
<tr>
<td style="text-align:center;font-weight:700">3</td>
<td><strong>الشؤون المالية / Finance Department</strong><br><small style="color:#666">التسوية المالية والديون</small></td>
<td style="text-align:center"><span class="chk"></span></td>
<td style="text-align:center"><span class="chk"></span></td>
<td style="font-size:11px;color:#666"></td>
<td></td>
</tr>
<tr>
<td style="text-align:center;font-weight:700">4</td>
<td><strong>إدارة الأصول / Assets Management</strong><br><small style="color:#666">استرجاع الممتلكات والمفاتيح</small></td>
<td style="text-align:center"><span class="chk"></span></td>
<td style="text-align:center"><span class="chk"></span></td>
<td style="font-size:11px;color:#666"></td>
<td></td>
</tr>
<tr>
<td style="text-align:center;font-weight:700">5</td>
<td><strong>الأمن والسلامة / Security & Safety</strong><br><small style="color:#666">بطاقات الدخول والصلاحيات</small></td>
<td style="text-align:center"><span class="chk"></span></td>
<td style="text-align:center"><span class="chk"></span></td>
<td style="font-size:11px;color:#666"></td>
<td></td>
</tr>
</table>
<div class="note-box">
✦ يجب إتمام جميع الإجراءات أعلاه قبل إصدار شهادة إنهاء الخدمة. أي تأخير في إتمام الإجراءات قد يؤثر على تسوية المستحقات المالية.
</div>
</div>` +
        docSigs([
            { ar: 'الموظف / Employee', en: 'Employee Signature' },
            { ar: 'مدير الموارد البشرية / HR Manager', en: 'HR Manager Signature' },
        ]) +
        docFooter()
    ),

    warning: docWrap('#7D4E00', '#FFF8EB', '#4A2E00',
        docHeader() +
        `<div class="dt">
<h1>خطاب إنذار رسمي</h1>
<p>Official Warning Letter</p>
<div class="dt-line"></div>
</div>

<div class="di">
<div class="di-row di-full">
<div class="di-label">الموظف / Employee</div>
<div class="di-value">{{employee_name}} ({{employee_code}})</div>
</div>
<div class="di-row">
<div class="di-label">القسم / Department</div>
<div class="di-value">{{department}}</div>
</div>
<div class="di-row">
<div class="di-label">المسمى الوظيفي / Job Title</div>
<div class="di-value">{{role}}</div>
</div>
<div class="di-row">
<div class="di-label">تاريخ التعيين / Hire Date</div>
<div class="di-value">{{hire_date}}</div>
</div>
</div>

<div class="ds">
<h3>تفاصيل المخالفة / Violation Details</h3>
<div class="warn-box">
<p style="margin:0 0 12px"><strong>نوع المخالفة / Violation Type:</strong> <span class="input-line">&nbsp;</span></p>
<p style="margin:0 0 12px"><strong>تاريخ المخالفة / Violation Date:</strong> <span class="input-line">&nbsp;</span></p>
<p style="margin:0 0 12px"><strong>مكان المخالفة / Violation Location:</strong> <span class="input-line">&nbsp;</span></p>
<p style="margin:0 0 12px"><strong>وصف المخالفة / Violation Description:</strong></p>
<div style="min-height:80px;border:2px dashed #D4A017;border-radius:6px;padding:14px;margin-top:8px;background:#fff;line-height:1.8;color:#333"></div>
</div>

<h3>الإجراءات المتخذة / Actions Taken</h3>
<div class="warn-box">
<p style="margin:0 0 10px"><strong>بناءً على المخالفة المذكورة أعلاه، تم اتخاذ الإجراءات التالية:</strong></p>
<ol style="margin:8px 0;padding-right:20px">
<li>تم إصدار هذا الإنذار الرسمي للموظف.</li>
<li>يُطلب من الموظف الالتزام التام بسياسات وإجراءات المؤسسة.</li>
<li>في حالة تكرار المخالفة، سيتم اتخاذ إجراءات تأديبية أكثر صرامة قد تصل إلى إنهاء الخدمة.</li>
</ol>
</div>

<h3>التعهد / Commitment</h3>
<div class="note-box">
<p style="margin:0">أقر بالموافقة على محتوى هذا الإنذار وأتعهد بالالتزام بجميع السياسات والإجراءات المعمول بها في المؤسسة، وأن أتحمل المسؤولية الكاملة عن أي مخالفة مستقبلية.</p>
</div>
</div>` +
        docSigs([
            { ar: 'الموظف (بالعلم والموافقة) / Employee (Acknowledged)', en: 'Employee Signature' },
            { ar: 'المدير المباشر / Direct Manager', en: 'Direct Manager Signature' },
            { ar: 'الموارد البشرية / HR Department', en: 'HR Department Signature' },
        ]) +
        docFooter()
    ),

    id_card: `<style>
@import url("https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700&display=swap");
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Tajawal,sans-serif;background:#f0f0f0;padding:20px;display:flex;justify-content:center;align-items:center;min-height:100vh}
</style>
<div style="width:380px;height:240px;background:linear-gradient(145deg,#0B2447 0%,#19376D 40%,#576CBC 100%);border-radius:16px;padding:24px 22px 18px;color:#fff;font-family:Tajawal,sans-serif;position:relative;overflow:hidden;direction:rtl;box-shadow:0 8px 32px rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.1)">
<div style="position:absolute;top:-60px;left:-60px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.06);filter:blur(20px)"></div>
<div style="position:absolute;bottom:-40px;right:-40px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.05);filter:blur(15px)"></div>
<div style="position:absolute;top:0;right:0;left:0;height:4px;background:linear-gradient(90deg,#D4AF37 0%,#F5D061 50%,#D4AF37 100%);box-shadow:0 2px 8px rgba(212,175,55,0.4)"></div>
<div style="font-size:10px;text-align:center;letter-spacing:4px;opacity:0.85;margin-bottom:12px;text-transform:uppercase;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,0.2)">{{company_name}}</div>
<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px">
<div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.1));display:flex;align-items:center;justify-content:center;font-size:32px;border:3px solid rgba(212,175,55,0.6);flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,0.2);backdrop-filter:blur(10px)">👤</div>
<div style="flex:1;min-width:0">
<div style="font-size:17px;font-weight:700;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px rgba(0,0,0,0.2)">{{employee_name}}</div>
<div style="font-size:12px;opacity:0.9;margin-bottom:2px;font-weight:500">{{role}}</div>
<div style="font-size:11px;opacity:0.75;font-weight:400">{{department}}</div>
</div>
</div>
<div style="margin-top:16px;display:flex;justify-content:space-between;font-size:10px;border-top:2px solid rgba(255,255,255,0.2);padding-top:10px;align-items:center">
<div><span style="opacity:0.6;font-weight:400">الرقم الوظيفي: </span><span style="font-weight:700;letter-spacing:1px">{{employee_code}}</span></div>
<div><span style="opacity:0.6;font-weight:400">التعيين: </span><span style="font-weight:600">{{hire_date}}</span></div>
</div>
<div style="position:absolute;bottom:10px;left:14px;font-size:8px;opacity:0.4;letter-spacing:2px;font-weight:600;text-transform:uppercase">OFFICIAL ID</div>
<div style="position:absolute;top:20px;right:20px;width:50px;height:50px;border:2px solid rgba(255,255,255,0.3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:8px;opacity:0.5;background:rgba(255,255,255,0.05)">QR</div>
</div>`,

    certificate: docWrap('#14532D', '#ECFDF5', '#0A2E1A',
        docHeader() +
        `<div class="dt">
<h1>شهادة خبرة</h1>
<p>Experience Certificate</p>
<div class="dt-line"></div>
</div>

<div class="ds" style="text-align:center;margin:32px 0">
<h3 style="border:none;text-align:center;font-size:18px;color:#14532D;font-weight:700;margin-bottom:8px">إلى من يهمه الأمر</h3>
<p style="font-size:14px;color:#666;font-style:italic;margin:0">To Whom It May Concern</p>
</div>

<div class="ds">
<p style="text-indent:35px;font-size:15px;line-height:2.2;margin-bottom:20px">
نشهد نحن الموقعون أدناه بأن السيد/ة <strong style="color:#14532D;font-size:16px">{{employee_name}}</strong>، رقم الهوية الوطنية <strong>{{employee_national_id}}</strong>، قد عمل/ت لدى مؤسستنا خلال الفترة المحددة أدناه:
</p>
<p style="text-align:center;font-style:italic;color:#666;margin-bottom:24px;font-size:13px">
We hereby certify that Mr./Ms. <strong>{{employee_name}}</strong>, National ID <strong>{{employee_national_id}}</strong>, has worked for our organization during the period specified below:
</p>
</div>

<div class="di">
<div class="di-row">
<div class="di-label">المسمى الوظيفي / Job Title</div>
<div class="di-value">{{role}}</div>
</div>
<div class="di-row">
<div class="di-label">القسم / Department</div>
<div class="di-value">{{department}}</div>
</div>
<div class="di-row">
<div class="di-label">تاريخ الالتحاق / Joining Date</div>
<div class="di-value">{{hire_date}}</div>
</div>
<div class="di-row">
<div class="di-label">الرقم الوظيفي / Employee Code</div>
<div class="di-value">{{employee_code}}</div>
</div>
<div class="di-row">
<div class="di-label">نوع العقد / Contract Type</div>
<div class="di-value">{{contract_type}}</div>
</div>
<div class="di-row">
<div class="di-label">تاريخ الإنهاء / End Date</div>
<div class="di-value">{{today_date}}</div>
</div>
</div>

<div class="ds">
<p style="text-indent:35px;font-size:15px;line-height:2.2;margin-bottom:20px">
وقد أثبت/ت خلال فترة عمله/ها كفاءة عالية، والتزاماً تاماً بسياسات المؤسسة، وحسن سلوك وأخلاقيات مهنية راقية. وقد ترك/ت المؤسسة بموافقة الطرفين وبدون أي التزامات مالية أو قانونية.
</p>
<p style="text-align:center;font-style:italic;color:#666;margin-bottom:24px;font-size:13px">
During his/her tenure, he/she demonstrated high competence, full commitment to company policies, and excellent professional conduct and ethics. He/she left the organization by mutual consent with no financial or legal obligations.
</p>
<div class="note-box">
✦ أُعطيت هذه الشهادة بناءً على طلب المعني/ة دون أي التزام مالي أو قانوني على المؤسسة. هذه الشهادة صادرة للاستخدام الرسمي فقط.
<br><br>
This certificate is issued upon request without any financial or legal obligation on the organization. This certificate is issued for official use only.
</div>
</div>` +
        docSigs([
            { ar: 'مدير الموارد البشرية / HR Manager', en: 'HR Manager' },
            { ar: 'المدير العام / General Manager', en: 'General Manager' },
        ]) +
        `<div style="text-align:center;margin:30px 0">
<div class="seal">ختم<br>المؤسسة<br>Official<br>Seal</div>
</div>` +
        docFooter()
    ),

    handover: docWrap('#581C87', '#F5F3FF', '#3B1259',
        docHeader() +
        `<div class="dt">
<h1>محضر تسليم واستلام</h1>
<p>Handover Report</p>
<div class="dt-line"></div>
</div>

<div class="di">
<div class="di-row">
<div class="di-label">الموظف المُسلِّم / Outgoing Employee</div>
<div class="di-value">{{employee_name}} ({{employee_code}})</div>
</div>
<div class="di-row">
<div class="di-label">القسم / Department</div>
<div class="di-value">{{department}}</div>
</div>
<div class="di-row">
<div class="di-label">المسمى الوظيفي / Job Title</div>
<div class="di-value">{{role}}</div>
</div>
<div class="di-row">
<div class="di-label">المُستلِم / Receiving Employee</div>
<div class="di-value"><span class="input-line">&nbsp;</span></div>
</div>
<div class="di-row">
<div class="di-label">المسمى الوظيفي للمُستلِم / Receiver Title</div>
<div class="di-value"><span class="input-line">&nbsp;</span></div>
</div>
<div class="di-row">
<div class="di-label">تاريخ التسليم / Handover Date</div>
<div class="di-value">{{today_date}}</div>
</div>
</div>

<div class="ds">
<h3>قائمة الأصول والمستندات المُسلَّمة / Handed Over Items</h3>
<p style="margin-bottom:16px">يرجى توثيق جميع الأصول والمستندات والمسؤوليات المُسلَّمة:</p>
<table class="dtb">
<tr>
<th style="width:5%">#</th>
<th>البند / الأصل / Item</th>
<th style="width:12%">الكمية / Qty</th>
<th style="width:15%">الحالة / Condition</th>
<th style="width:18%">الرقم التسلسلي / Serial No.</th>
<th style="width:20%">ملاحظات / Notes</th>
</tr>
<tr>
<td style="text-align:center;font-weight:700">1</td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
</tr>
<tr>
<td style="text-align:center;font-weight:700">2</td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
</tr>
<tr>
<td style="text-align:center;font-weight:700">3</td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
</tr>
<tr>
<td style="text-align:center;font-weight:700">4</td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
</tr>
<tr>
<td style="text-align:center;font-weight:700">5</td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
<td><span class="input-line">&nbsp;</span></td>
</tr>
</table>

<h3>المسؤوليات والمهام المُسلَّمة / Handed Over Responsibilities</h3>
<div style="min-height:100px;border:2px dashed #581C87;border-radius:8px;padding:16px;margin-top:12px;background:#fafafa;line-height:2;color:#333">
<p style="color:#999;font-style:italic;margin:0">قائمة المسؤوليات والمهام المُسلَّمة...</p>
</div>

<div class="note-box">
✦ يجب التأكد من استلام جميع الأصول والمستندات والمسؤوليات المذكورة أعلاه قبل التوقيع. أي نقص أو تلف يجب توثيقه في قسم الملاحظات.
</div>
</div>` +
        docSigs([
            { ar: 'المُسلِّم / Outgoing Employee', en: 'Outgoing Signature' },
            { ar: 'المُستلِم / Receiving Employee', en: 'Receiving Signature' },
            { ar: 'اعتماد المدير المباشر / Manager Approval', en: 'Manager Signature' },
        ]) +
        docFooter()
    ),

    memo: docWrap('#334155', '#F1F5F9', '#1E293B',
        docHeader() +
        `<div class="dt">
<h1>مذكرة داخلية</h1>
<p>Internal Memorandum</p>
<div class="dt-line"></div>
</div>

<div class="di" style="grid-template-columns:1fr">
<div class="di-row">
<div class="di-label" style="width:18%">إلى / To:</div>
<div class="di-value">{{employee_name}} — {{department}}</div>
</div>
<div class="di-row">
<div class="di-label" style="width:18%">من / From:</div>
<div class="di-value"><span class="input-line">&nbsp;</span></div>
</div>
<div class="di-row">
<div class="di-label" style="width:18%">التاريخ / Date:</div>
<div class="di-value">{{today_date}}</div>
</div>
<div class="di-row">
<div class="di-label" style="width:18%">الموضوع / Subject:</div>
<div class="di-value"><span class="input-line">&nbsp;</span></div>
</div>
<div class="di-row">
<div class="di-label" style="width:18%">الأولوية / Priority:</div>
<div class="di-value">
<span style="display:inline-block;padding:4px 12px;background:#FEF2F2;color:#DC2626;border-radius:4px;font-size:11px;font-weight:600;margin-left:8px">عاجل / Urgent</span>
<span style="display:inline-block;padding:4px 12px;background:#FEF2F2;color:#DC2626;border-radius:4px;font-size:11px;font-weight:600;margin-left:8px">عادي / Normal</span>
</div>
</div>
</div>

<div class="ds" style="margin-top:24px">
<h3>محتوى المذكرة / Memorandum Content</h3>
<div style="min-height:200px;border:2px dashed #94a3b8;border-radius:8px;padding:22px;background:#fafbfc;line-height:2.1">
<p style="color:#94a3b8;font-style:italic;margin:0;text-align:center">نص المذكرة...</p>
</div>
</div>

<div class="ds">
<h3>المرفقات / Attachments</h3>
<div style="padding:12px;background:#f9fafb;border-radius:6px;border:1px dashed #cbd5e1">
<p style="margin:0;color:#64748b;font-size:12px">لا توجد مرفقات / No attachments</p>
</div>
</div>` +
        docSigs([
            { ar: 'المُرسل / Sender', en: 'Sender Signature' },
            { ar: 'المُستلم (بالعلم) / Recipient (Acknowledged)', en: 'Recipient Signature' },
        ]) +
        docFooter()
    ),

    other: docWrap('#5B21B6', '#F5F3FF', '#3C1A78',
        docHeader() +
        `<div class="dt">
<h1>مستند رسمي</h1>
<p>Official Document</p>
<div class="dt-line"></div>
</div>

<div class="di">
<div class="di-row di-full">
<div class="di-label">اسم الموظف / Employee Name</div>
<div class="di-value">{{employee_name}}</div>
</div>
<div class="di-row">
<div class="di-label">الرقم الوظيفي / Employee Code</div>
<div class="di-value">{{employee_code}}</div>
</div>
<div class="di-row">
<div class="di-label">رقم الهوية / National ID</div>
<div class="di-value">{{employee_national_id}}</div>
</div>
<div class="di-row">
<div class="di-label">القسم / Department</div>
<div class="di-value">{{department}}</div>
</div>
<div class="di-row">
<div class="di-label">المسمى الوظيفي / Job Title</div>
<div class="di-value">{{role}}</div>
</div>
<div class="di-row">
<div class="di-label">تاريخ التعيين / Hire Date</div>
<div class="di-value">{{hire_date}}</div>
</div>
<div class="di-row">
<div class="di-label">البريد الإلكتروني / Email</div>
<div class="di-value">{{email}}</div>
</div>
<div class="di-row">
<div class="di-label">رقم الجوال / Phone</div>
<div class="di-value">{{phone}}</div>
</div>
</div>

<div class="ds" style="margin-top:24px">
<h3>محتوى المستند / Document Content</h3>
<div style="min-height:180px;border:2px dashed #5B21B6;border-radius:8px;padding:22px;background:#fafbfc;line-height:2.1">
<p style="color:#999;font-style:italic;margin:0;text-align:center">محتوى المستند...</p>
</div>
</div>

<div class="note-box">
✦ هذا مستند رسمي صادر من {{company_name}}. يرجى التأكد من صحة جميع المعلومات الواردة فيه قبل التوقيع.
</div>` +
        docSigs([
            { ar: 'الموظف / Employee', en: 'Employee Signature' },
            { ar: 'المدير المباشر / Direct Manager', en: 'Manager Signature' },
        ]) +
        docFooter()
    ),
};

// ── Print CSS wrapper ──
export const printCSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: "Tajawal", "Noto Naskh Arabic", sans-serif; }
@page { size: A4; margin: 12mm 15mm; }
@media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { page-break-inside: avoid; }
    .dsig { page-break-inside: avoid; }
    .dw { box-shadow: none; margin: 0; }
    .dw::after { opacity: 0.15; }
}`;
