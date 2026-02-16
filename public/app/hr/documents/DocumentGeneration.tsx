"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Table, Column, Dialog, showToast, Select, ActionButtons, SearchableSelect } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { PageSubHeader } from "@/components/layout";
import { DocumentTemplate } from "@/app/hr/types";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { Employee } from "@/app/hr/types";

// ── Bilingual labels for every template type ──
const templateTypeLabels: Record<string, string> = {
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
const templateTypeBadgeClass: Record<string, string> = {
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
// Professional CSS Design System (shared across all templates)
// ═══════════════════════════════════════════════════
function docCSS(accent: string = '#0B2447', accentLight: string = '#E8EDF4'): string {
    return `<style>
@import url("https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap");
*{margin:0;padding:0;box-sizing:border-box}
.dw{font-family:"Tajawal","Noto Naskh Arabic","Traditional Arabic",sans-serif;max-width:210mm;margin:auto;padding:0;color:#1a1a1a;line-height:1.85;font-size:14px;direction:rtl;position:relative;background:#fff}
.dw::before{content:"";position:absolute;top:0;right:0;left:0;height:6px;background:linear-gradient(90deg,${accent} 0%,${accent}cc 50%,${accent}88 100%)}
.dw::after{content:"سري وموثوق";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:700;color:rgba(0,0,0,.025);pointer-events:none;white-space:nowrap;letter-spacing:8px;z-index:0}
.dp{padding:40px 50px 30px}
.dh{display:flex;justify-content:space-between;align-items:flex-start;padding:20px 0 18px;border-bottom:2px solid ${accent};margin-bottom:24px}
.dh-logo{width:80px;height:80px;border:2px solid ${accent}33;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;background:${accentLight}}
.dh-info{text-align:center;flex:1;padding:0 20px}
.dh-info h2{font-size:13px;color:${accent};font-weight:700;margin-bottom:2px;letter-spacing:.5px}
.dh-info p{font-size:10px;color:#888;margin:1px 0}
.dh-ref{text-align:left;font-size:10px;color:#666;min-width:140px}
.dh-ref span{display:block;margin:2px 0}
.dt{text-align:center;margin:20px 0 24px}
.dt h1{font-size:22px;color:${accent};font-weight:700;margin:0 0 4px;letter-spacing:1px}
.dt p{font-size:13px;color:#666;font-style:italic;margin:0}
.dt .dt-line{width:80px;height:3px;background:linear-gradient(90deg,${accent},transparent);margin:8px auto 0}
.di{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:0 0 20px;border:1px solid #e2e2e2;border-radius:6px;overflow:hidden}
.di-row{display:flex;border-bottom:1px solid #eee}
.di-row:last-child{border-bottom:none}
.di-label{background:${accentLight};padding:9px 14px;font-weight:600;font-size:12.5px;color:#333;width:40%;min-width:40%;border-left:1px solid #e2e2e2}
.di-value{padding:9px 14px;font-size:12.5px;color:#444;flex:1}
.di-full{grid-column:1/-1}
table.dtb{width:100%;border-collapse:collapse;margin:16px 0;font-size:12.5px}
table.dtb th{background:${accent};color:#fff;padding:10px 12px;font-weight:600;text-align:right;font-size:11.5px;letter-spacing:.3px}
table.dtb td{padding:9px 12px;border:1px solid #e5e5e5;vertical-align:middle}
table.dtb tr:nth-child(even) td{background:#fafafa}
table.dtb tr:hover td{background:${accentLight}}
.ds{margin:20px 0}
.ds h3{font-size:15px;color:${accent};font-weight:700;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid ${accent}33}
.ds p,.ds li{font-size:13px;line-height:2;color:#333}
.ds ol{padding-right:22px;margin:8px 0}
.ds .note-box{background:${accentLight};border-right:4px solid ${accent};padding:14px 18px;border-radius:0 6px 6px 0;margin:12px 0;font-size:12.5px}
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
.chk{display:inline-block;width:16px;height:16px;border:2px solid ${accent};border-radius:3px;vertical-align:middle;margin-left:6px}
@media print{.dw{max-width:none;padding:0}.dw::before{print-color-adjust:exact;-webkit-print-color-adjust:exact}table.dtb th{print-color-adjust:exact;-webkit-print-color-adjust:exact}@page{size:A4;margin:12mm 10mm}.dp{padding:30px 40px 20px}}
</style>`;
}

/** Reusable header block */
function docHeader(): string {
    return `<div class="dh">
<div class="dh-logo">شعار<br>المؤسسة</div>
<div class="dh-info"><h2>{{company_name}}</h2><p>المملكة العربية السعودية</p><p>Kingdom of Saudi Arabia</p></div>
<div class="dh-ref"><span><strong>رقم المرجع:</strong></span><span>{{reference_number}}</span><span><strong>التاريخ:</strong></span><span>{{today_date}}</span></div>
</div>`;
}

/** Reusable signatures block */
function docSigs(signers: { ar: string; en: string }[]): string {
    let html = '<div class="dsig">';
    for (const s of signers) {
        html += `<div class="dsig-block"><div class="dsig-line"><div class="dsig-name">${s.ar}</div><div class="dsig-title">${s.en}</div></div><div class="dsig-date">التاريخ: ___/___/______</div></div>`;
    }
    return html + '</div>';
}

/** Reusable footer */
function docFooter(): string {
    return `<div class="df"><div>هذا المستند صادر إلكترونياً ولا يحتاج إلى توقيع يدوي ما لم يُذكر خلاف ذلك | Electronically generated document</div><div class="df-qr">QR<br>Code</div></div>`;
}

/** Wrap with CSS + container */
function docWrap(accent: string, accentLight: string, content: string): string {
    return `${docCSS(accent, accentLight)}<div class="dw"><div class="dp">${content}</div></div>`;
}

// ═══════════════════════════════════════════════════
// Professional default templates per type
// ═══════════════════════════════════════════════════
const defaultTemplates: Record<string, string> = {
    contract: docWrap('#0B2447', '#E8EDF4',
        docHeader() +
        `<div class="dt"><h1>عقد عمل</h1><p>Employment Contract</p><div class="dt-line"></div></div>
<div class="di">
<div class="di-row di-full"><div class="di-label">اسم الموظف / Employee Name</div><div class="di-value">{{employee_name}}</div></div>
<div class="di-row"><div class="di-label">الرقم الوظيفي</div><div class="di-value">{{employee_code}}</div></div>
<div class="di-row"><div class="di-label">رقم الهوية</div><div class="di-value">{{employee_national_id}}</div></div>
<div class="di-row"><div class="di-label">القسم / Dept.</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">المسمى / Title</div><div class="di-value">{{role}}</div></div>
<div class="di-row"><div class="di-label">تاريخ التعيين</div><div class="di-value">{{hire_date}}</div></div>
<div class="di-row"><div class="di-label">نوع العقد</div><div class="di-value">{{contract_type}}</div></div>
<div class="di-row di-full"><div class="di-label">الراتب الأساسي / Base Salary</div><div class="di-value">{{base_salary}} ريال سعودي</div></div>
</div>
<div class="ds"><h3>البنود والشروط / Terms & Conditions</h3>
<ol>
<li>يلتزم الطرف الثاني بأداء المهام الموكلة إليه وفقاً للوصف الوظيفي المعتمد.</li>
<li>فترة التجربة ثلاثة (3) أشهر وفقاً للمادة (53) من نظام العمل.</li>
<li>ساعات العمل ثمان (8) ساعات يومياً.</li>
<li>يستحق الموظف إجازة سنوية لا تقل عن (21) يوماً مدفوعة الأجر.</li>
</ol>
<div class="note-box">✦ تم تحرير هذا العقد من نسختين أصليتين، لكل طرف نسخة للعمل بموجبها.</div>
</div>` +
        docSigs([
            { ar: 'توقيع الموظف', en: 'Employee Signature' },
            { ar: 'المدير المباشر', en: 'Direct Manager' },
            { ar: 'المدير المفوض', en: 'Authorized Signatory' },
        ]) +
        docFooter()
    ),

    clearance: docWrap('#7A1F1F', '#FBF0F0',
        docHeader() +
        `<div class="dt"><h1>نموذج إخلاء طرف</h1><p>Employee Clearance Form</p><div class="dt-line"></div></div>
<div class="di">
<div class="di-row"><div class="di-label">اسم الموظف</div><div class="di-value">{{employee_name}}</div></div>
<div class="di-row"><div class="di-label">الرقم الوظيفي</div><div class="di-value">{{employee_code}}</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">المسمى</div><div class="di-value">{{role}}</div></div>
</div>
<table class="dtb">
<tr><th style="width:5%">#</th><th>الجهة / Department</th><th style="width:12%">مخلص</th><th style="width:12%">غير مخلص</th><th style="width:18%">التوقيع</th></tr>
<tr><td style="text-align:center">1</td><td>الموارد البشرية</td><td style="text-align:center"><span class="chk"></span></td><td style="text-align:center"><span class="chk"></span></td><td></td></tr>
<tr><td style="text-align:center">2</td><td>تقنية المعلومات</td><td style="text-align:center"><span class="chk"></span></td><td style="text-align:center"><span class="chk"></span></td><td></td></tr>
<tr><td style="text-align:center">3</td><td>الشؤون المالية</td><td style="text-align:center"><span class="chk"></span></td><td style="text-align:center"><span class="chk"></span></td><td></td></tr>
<tr><td style="text-align:center">4</td><td>إدارة الأصول</td><td style="text-align:center"><span class="chk"></span></td><td style="text-align:center"><span class="chk"></span></td><td></td></tr>
</table>` +
        docSigs([{ ar: 'الموظف', en: 'Employee' }, { ar: 'مدير الموارد البشرية', en: 'HR Manager' }]) +
        docFooter()
    ),

    warning: docWrap('#7D4E00', '#FFF8EB',
        docHeader() +
        `<div class="dt"><h1>خطاب إنذار</h1><p>Warning Letter</p><div class="dt-line"></div></div>
<div class="di">
<div class="di-row di-full"><div class="di-label">الموظف / Employee</div><div class="di-value">{{employee_name}} ({{employee_code}})</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">المسمى</div><div class="di-value">{{role}}</div></div>
</div>
<div class="ds"><h3>تفاصيل المخالفة / Violation Details</h3>
<div class="warn-box">
<p style="margin:0 0 10px"><strong>نوع المخالفة:</strong> <span class="input-line">&nbsp;</span></p>
<p style="margin:0 0 10px"><strong>تاريخ المخالفة:</strong> <span class="input-line">&nbsp;</span></p>
<p style="margin:0"><strong>وصف المخالفة:</strong></p>
<div style="min-height:50px;border:1px dashed #D4A017;border-radius:4px;padding:10px;margin-top:6px;background:#fff"></div>
</div></div>` +
        docSigs([
            { ar: 'الموظف (بالعلم)', en: 'Employee (Acknowledged)' },
            { ar: 'المدير المباشر', en: 'Direct Manager' },
            { ar: 'الموارد البشرية', en: 'HR Department' },
        ]) +
        docFooter()
    ),

    id_card: `<style>
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
</div>`,

    certificate: docWrap('#14532D', '#ECFDF5',
        docHeader() +
        `<div class="dt"><h1>شهادة خبرة</h1><p>Experience Certificate</p><div class="dt-line"></div></div>
<div class="ds" style="text-align:center;margin:28px 0"><h3 style="border:none;text-align:center;font-size:16px">إلى من يهمه الأمر / To Whom It May Concern</h3></div>
<div class="ds"><p style="text-indent:30px;font-size:13.5px">نشهد نحن الموقعون أدناه بأن السيد/ة <strong>{{employee_name}}</strong>، رقم الهوية <strong>{{employee_national_id}}</strong>، قد عمل/ت لدى مؤسستنا:</p></div>
<div class="di">
<div class="di-row"><div class="di-label">المسمى الوظيفي</div><div class="di-value">{{role}}</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">تاريخ الالتحاق</div><div class="di-value">{{hire_date}}</div></div>
<div class="di-row"><div class="di-label">الرقم الوظيفي</div><div class="di-value">{{employee_code}}</div></div>
</div>
<div class="ds"><p style="text-indent:30px;font-size:13.5px">وقد أثبت/ت كفاءة عالية وحسن سلوك خلال فترة العمل.</p>
<div class="note-box">✦ أُعطيت هذه الشهادة بناءً على طلب المعني/ة دون أي التزام مالي على المؤسسة.</div></div>` +
        docSigs([{ ar: 'مدير الموارد البشرية', en: 'HR Manager' }, { ar: 'المدير العام', en: 'General Manager' }]) +
        docFooter()
    ),

    handover: docWrap('#581C87', '#F5F3FF',
        docHeader() +
        `<div class="dt"><h1>محضر تسليم واستلام</h1><p>Handover Report</p><div class="dt-line"></div></div>
<div class="di">
<div class="di-row"><div class="di-label">الموظف المُسلِّم</div><div class="di-value">{{employee_name}} ({{employee_code}})</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">المُستلِم</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
<div class="di-row"><div class="di-label">تاريخ التسليم</div><div class="di-value">{{today_date}}</div></div>
</div>
<table class="dtb">
<tr><th style="width:5%">#</th><th>البند / الأصل</th><th style="width:12%">الكمية</th><th style="width:14%">الحالة</th><th style="width:15%">ملاحظات</th></tr>
<tr><td style="text-align:center">1</td><td></td><td></td><td></td><td></td></tr>
<tr><td style="text-align:center">2</td><td></td><td></td><td></td><td></td></tr>
<tr><td style="text-align:center">3</td><td></td><td></td><td></td><td></td></tr>
</table>` +
        docSigs([
            { ar: 'المُسلِّم', en: 'Outgoing' },
            { ar: 'المُستلِم', en: 'Receiving' },
            { ar: 'اعتماد المدير', en: 'Manager' },
        ]) +
        docFooter()
    ),

    memo: docWrap('#334155', '#F1F5F9',
        docHeader() +
        `<div class="dt"><h1>مذكرة داخلية</h1><p>Internal Memorandum</p><div class="dt-line"></div></div>
<div class="di" style="grid-template-columns:1fr">
<div class="di-row"><div class="di-label" style="width:15%">إلى / To:</div><div class="di-value">{{employee_name}} — {{department}}</div></div>
<div class="di-row"><div class="di-label" style="width:15%">من / From:</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
<div class="di-row"><div class="di-label" style="width:15%">التاريخ:</div><div class="di-value">{{today_date}}</div></div>
<div class="di-row"><div class="di-label" style="width:15%">الموضوع:</div><div class="di-value"><span class="input-line">&nbsp;</span></div></div>
</div>
<div class="ds" style="margin-top:20px">
<div style="min-height:180px;border:1px dashed #94a3b8;border-radius:6px;padding:20px;background:#fafbfc">
<p style="color:#94a3b8;font-style:italic">نص المذكرة...</p>
</div>
</div>` +
        docSigs([{ ar: 'المُرسل', en: 'Sender' }, { ar: 'المُستلم (بالعلم)', en: 'Recipient' }]) +
        docFooter()
    ),

    other: docWrap('#5B21B6', '#F5F3FF',
        docHeader() +
        `<div class="dt"><h1>مستند رسمي</h1><p>Official Document</p><div class="dt-line"></div></div>
<div class="di">
<div class="di-row"><div class="di-label">اسم الموظف</div><div class="di-value">{{employee_name}}</div></div>
<div class="di-row"><div class="di-label">الرقم الوظيفي</div><div class="di-value">{{employee_code}}</div></div>
<div class="di-row"><div class="di-label">القسم</div><div class="di-value">{{department}}</div></div>
<div class="di-row"><div class="di-label">المسمى</div><div class="di-value">{{role}}</div></div>
</div>
<div class="ds" style="margin-top:20px">
<div style="min-height:150px;border:1px dashed #ddd;border-radius:6px;padding:20px;background:#fafbfc">
<p style="color:#999;font-style:italic">محتوى المستند...</p>
</div>
</div>` +
        docSigs([{ ar: 'الموظف', en: 'Employee' }, { ar: 'المدير المباشر', en: 'Manager' }]) +
        docFooter()
    ),
};

// ── Print CSS wrapper ──
const printCSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap');
* { box-sizing: border-box; }
body { margin: 0; padding: 0; }
@page { size: A4; margin: 10mm; }
@media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { page-break-inside: avoid; }
    .dsig { page-break-inside: avoid; }
}`;

export function DocumentGeneration() {
    const { canAccess } = useAuthStore();
    const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
    const [renderedHtml, setRenderedHtml] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const printRef = useRef<HTMLDivElement>(null);

    // ── Create form ──
    const [newTemplate, setNewTemplate] = useState({
        template_key: "",
        template_name_ar: "",
        template_name_en: "",
        template_type: "contract",
        body_html: "",
        description: "",
    });

    // ── Edit form ──
    const [editData, setEditData] = useState({
        template_name_ar: "",
        template_name_en: "",
        template_type: "",
        body_html: "",
        description: "",
    });

    useEffect(() => {
        loadTemplates();
        loadAllEmployees();
    }, [loadAllEmployees]);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const query = typeFilter ? `?type=${typeFilter}` : "";
            const res = await fetchAPI(`${API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.BASE}${query}`);
            setTemplates((res as any).data || []);
        } catch { console.error("Failed to load templates"); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { loadTemplates(); }, [typeFilter]);

    // ── Create handler ──
    const handleCreate = async () => {
        if (!newTemplate.template_key || !newTemplate.template_name_ar) {
            showToast("يرجى تعبئة الحقول المطلوبة", "error");
            return;
        }
        try {
            const body = newTemplate.body_html || defaultTemplates[newTemplate.template_type] || defaultTemplates.other;
            await fetchAPI(API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.BASE, {
                method: "POST",
                body: JSON.stringify({ ...newTemplate, body_html: body }),
            });
            showToast("تم إنشاء القالب بنجاح", "success");
            setShowCreate(false);
            setNewTemplate({ template_key: "", template_name_ar: "", template_name_en: "", template_type: "contract", body_html: "", description: "" });
            loadTemplates();
        } catch { showToast("فشل إنشاء القالب", "error"); }
    };

    // ── Edit handler ──
    const openEdit = (template: DocumentTemplate) => {
        setSelectedTemplate(template);
        setEditData({
            template_name_ar: template.template_name_ar,
            template_name_en: template.template_name_en || "",
            template_type: template.template_type,
            body_html: template.body_html,
            description: (template as any).description || "",
        });
        setShowEdit(true);
    };

    const handleUpdate = async () => {
        if (!selectedTemplate) return;
        try {
            await fetchAPI(API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.withId(selectedTemplate.id), {
                method: "PUT",
                body: JSON.stringify(editData),
            });
            showToast("تم تحديث القالب بنجاح", "success");
            setShowEdit(false);
            loadTemplates();
        } catch { showToast("فشل تحديث القالب", "error"); }
    };

    // ── Render / preview ──
    const handleRender = async (template: DocumentTemplate) => {
        if (!selectedEmployeeId) {
            showToast("يرجى اختيار موظف أولاً", "error");
            return;
        }
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.RENDER(template.id), {
                method: "POST",
                body: JSON.stringify({ employee_id: Number(selectedEmployeeId) }),
            });
            const resData = (res as any).data;
            setRenderedHtml(resData?.rendered_html || template.body_html);
            setSelectedTemplate(template);
            setShowPreview(true);
        } catch { showToast("فشل عرض المستند", "error"); }
    };

    // ── Print in new window with proper CSS ──
    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
<meta charset="UTF-8"><title>${selectedTemplate?.template_name_ar || 'مستند'}</title>
<style>${printCSS}</style></head><body>${renderedHtml}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 400);
        }
    };

    // ── Delete ──
    const handleDelete = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذا القالب؟")) return;
        try {
            await fetchAPI(API_ENDPOINTS.HR.DOCUMENT_TEMPLATES.withId(id), { method: "DELETE" });
            showToast("تم حذف القالب", "success");
            loadTemplates();
        } catch { showToast("فشل حذف القالب", "error"); }
    };

    // ── Table columns ──
    const columns: Column<DocumentTemplate>[] = [
        {
            key: "template_name_ar",
            header: "اسم القالب",
            dataLabel: "اسم القالب",
            render: (item) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{item.template_name_ar}</div>
                    {item.template_name_en && <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{item.template_name_en}</div>}
                </div>
            ),
        },
        {
            key: "template_type",
            header: "النوع",
            dataLabel: "النوع",
            render: (item) => (
                <span className={`badge ${templateTypeBadgeClass[item.template_type] || 'badge-secondary'}`}>
                    {templateTypeLabels[item.template_type] || item.template_type}
                </span>
            ),
        },
        { key: "template_key", header: "المفتاح", dataLabel: "المفتاح" },
        {
            key: "id",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <ActionButtons
                    actions={[
                        { icon: "eye", title: "معاينة وطباعة", variant: "view", onClick: () => handleRender(item) },
                        ...(canAccess("employees", "edit") ? [{ icon: "edit" as const, title: "تعديل", variant: "edit" as const, onClick: () => openEdit(item) }] : []),
                        ...(canAccess("employees", "delete") ? [{ icon: "trash" as const, title: "حذف", variant: "delete" as const, onClick: () => handleDelete(item.id) }] : [])
                    ]}
                />
            ),
        },
    ];

    // ═══════════════════════════
    //  RENDER
    // ═══════════════════════════
    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="المستندات والتقارير الرسمية"
                titleIcon="file-signature"
                searchInput={
                    <SearchableSelect
                        options={employees.map((e: Employee) => ({ value: e.id.toString(), label: `${e.full_name} (${e.employee_code})` }))}
                        value={selectedEmployeeId}
                        onChange={(val) => setSelectedEmployeeId(val?.toString() || "")}
                        placeholder="اختر موظف للمعاينة..."
                    />
                }
                actions={
                    <>
                        <Select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            placeholder="جميع الأنواع"
                            options={Object.entries(templateTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
                            style={{ minWidth: "140px" }}
                        />
                        {canAccess("employees", "create") && (
                            <Button variant="primary" icon="plus" onClick={() => setShowCreate(true)}>
                                قالب جديد
                            </Button>
                        )}
                    </>
                }
            />

            <Table columns={columns} data={templates} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد قوالب مسجلة" isLoading={isLoading} />

            {/* ── Create Template Dialog ── */}
            <Dialog isOpen={showCreate} onClose={() => setShowCreate(false)} title="إنشاء قالب جديد" footer={
                <>
                    <Button variant="secondary" onClick={() => setShowCreate(false)}>إلغاء</Button>
                    <Button variant="primary" onClick={handleCreate}>إنشاء</Button>
                </>
            }>
                <div className="space-y-4">
                    <TextInput label="مفتاح القالب *" value={newTemplate.template_key} onChange={(e) => setNewTemplate({ ...newTemplate, template_key: e.target.value })} placeholder="contract_standard" />
                    <TextInput label="اسم القالب بالعربي *" value={newTemplate.template_name_ar} onChange={(e) => setNewTemplate({ ...newTemplate, template_name_ar: e.target.value })} />
                    <TextInput label="اسم القالب بالإنجليزي" value={newTemplate.template_name_en} onChange={(e) => setNewTemplate({ ...newTemplate, template_name_en: e.target.value })} placeholder="Standard Contract" />
                    <Select label="نوع القالب" value={newTemplate.template_type} onChange={(e) => setNewTemplate({ ...newTemplate, template_type: e.target.value })}
                        options={Object.entries(templateTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
                    />
                    <TextInput label="الوصف (اختياري)" value={newTemplate.description} onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })} placeholder="وصف مختصر للقالب" />
                    <Textarea label="محتوى HTML (اختياري – يُستخدم قالب احترافي افتراضي إن ترك فارغاً)" value={newTemplate.body_html} onChange={(e) => setNewTemplate({ ...newTemplate, body_html: e.target.value })} rows={5} />
                </div>
            </Dialog>

            {/* ── Edit Template Dialog ── */}
            <Dialog isOpen={showEdit} onClose={() => setShowEdit(false)} title={`تعديل: ${selectedTemplate?.template_name_ar || ''}`} footer={
                <>
                    <Button variant="secondary" onClick={() => setShowEdit(false)}>إلغاء</Button>
                    <Button variant="primary" onClick={handleUpdate}>حفظ التعديلات</Button>
                </>
            }>
                <div className="space-y-4">
                    <TextInput label="اسم القالب بالعربي" value={editData.template_name_ar} onChange={(e) => setEditData({ ...editData, template_name_ar: e.target.value })} />
                    <TextInput label="اسم القالب بالإنجليزي" value={editData.template_name_en} onChange={(e) => setEditData({ ...editData, template_name_en: e.target.value })} />
                    <Select label="نوع القالب" value={editData.template_type} onChange={(e) => setEditData({ ...editData, template_type: e.target.value })}
                        options={Object.entries(templateTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
                    />
                    <TextInput label="الوصف" value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
                    <Textarea label="محتوى HTML" value={editData.body_html} onChange={(e) => setEditData({ ...editData, body_html: e.target.value })} rows={8} />
                </div>
            </Dialog>

            {/* ── Preview / Print Dialog ── */}
            <Dialog isOpen={showPreview} onClose={() => setShowPreview(false)} title={`معاينة: ${selectedTemplate?.template_name_ar || ''}`} footer={
                <>
                    <Button variant="secondary" onClick={() => setShowPreview(false)}>إغلاق</Button>
                    <Button variant="primary" icon="printer" onClick={handlePrint}>طباعة</Button>
                </>
            }>
                <div
                    ref={printRef}
                    className="document-preview"
                    style={{
                        background: "#f8f9fa",
                        padding: "24px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        minHeight: "500px",
                        maxHeight: "75vh",
                        overflowY: "auto",
                        boxShadow: "inset 0 2px 8px rgba(0,0,0,0.04)",
                    }}
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
            </Dialog>
        </div>
    );
}
