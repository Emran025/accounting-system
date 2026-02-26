"use client";

import { Employee, EmployeeAllowance, EmployeeDeduction } from "../../../../types";
import { Label, Table, Column } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface FinancialTabProps {
    employee: Employee;
}

const FREQ_MAP: Record<string, string> = {
    monthly: "شهري",
    quarterly: "ربع سنوي",
    annual: "سنوي",
    one_time: "مرة واحدة",
};

function SectionHeader({ icon, title }: { icon: string; title: string }) {
    return (
        <div className="section-card-header">
            <i className={`fas ${icon} fa-lg`}></i>
            <h4 style={{ margin: 0 }}>{title}</h4>
        </div>
    );
}

export default function FinancialTab({ employee }: FinancialTabProps) {
    const allowanceCols: Column<EmployeeAllowance>[] = [
        { key: "allowance_name", header: "اسم البدل", dataLabel: "اسم البدل" },
        { key: "amount", header: "المبلغ", dataLabel: "المبلغ", render: (item) => formatCurrency(item.amount) },
        { key: "frequency", header: "التكرار", dataLabel: "التكرار", render: (item) => FREQ_MAP[item.frequency] || item.frequency },
        { key: "start_date", header: "من تاريخ", dataLabel: "من تاريخ" },
        { key: "end_date", header: "إلى تاريخ", dataLabel: "إلى تاريخ", render: (item) => item.end_date || "مستمر" },
        {
            key: "is_active", header: "الحالة", dataLabel: "الحالة", render: (item) => (
                <span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {item.is_active ? "فعّال" : "متوقف"}
                </span>
            )
        },
    ];

    const deductionCols: Column<EmployeeDeduction>[] = [
        { key: "deduction_name", header: "اسم الاستقطاع", dataLabel: "اسم الاستقطاع" },
        { key: "amount", header: "المبلغ", dataLabel: "المبلغ", render: (item) => formatCurrency(item.amount) },
        { key: "frequency", header: "التكرار", dataLabel: "التكرار", render: (item) => FREQ_MAP[item.frequency] || item.frequency },
        { key: "start_date", header: "من تاريخ", dataLabel: "من تاريخ" },
        { key: "end_date", header: "إلى تاريخ", dataLabel: "إلى تاريخ", render: (item) => item.end_date || "مستمر" },
        {
            key: "is_active", header: "الحالة", dataLabel: "الحالة", render: (item) => (
                <span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {item.is_active ? "فعّال" : "متوقف"}
                </span>
            )
        },
    ];

    return (
        <div className="employee-financial-tab animate-fade">
            {/* Salary Summary */}
            <div className="financial-summary-grid">
                <div className="financial-summary-card section-card sales-card">
                    <div className="financial-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <i className="fas fa-money-bill-wave"></i>
                    </div>
                    <div>
                        <Label className="text-muted" style={{ fontSize: '0.8rem' }}>الراتب الأساسي</Label>
                        <div className="fw-bold" style={{ fontSize: '1.25rem', color: '#10b981' }}>{formatCurrency(employee.base_salary)}</div>
                    </div>
                </div>
                <div className="financial-summary-card section-card sales-card">
                    <div className="financial-card-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                        <i className="fas fa-plus-circle"></i>
                    </div>
                    <div>
                        <Label className="text-muted" style={{ fontSize: '0.8rem' }}>إجمالي البدلات</Label>
                        <div className="fw-bold" style={{ fontSize: '1.25rem', color: '#6366f1' }}>
                            {formatCurrency(
                                (employee.allowances || []).filter(a => a.is_active).reduce((sum, a) => sum + a.amount, 0)
                            )}
                        </div>
                    </div>
                </div>
                <div className="financial-summary-card section-card sales-card">
                    <div className="financial-card-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                        <i className="fas fa-minus-circle"></i>
                    </div>
                    <div>
                        <Label className="text-muted" style={{ fontSize: '0.8rem' }}>إجمالي الاستقطاعات</Label>
                        <div className="fw-bold" style={{ fontSize: '1.25rem', color: '#ef4444' }}>
                            {formatCurrency(
                                (employee.deductions || []).filter(d => d.is_active).reduce((sum, d) => sum + d.amount, 0)
                            )}
                        </div>
                    </div>
                </div>
                <div className="financial-summary-card section-card sales-card">
                    <div className="financial-card-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
                        <i className="fas fa-calculator"></i>
                    </div>
                    <div>
                        <Label className="text-muted" style={{ fontSize: '0.8rem' }}>صافي الراتب التقديري</Label>
                        <div className="fw-bold" style={{ fontSize: '1.25rem', color: '#0ea5e9' }}>
                            {formatCurrency(
                                employee.base_salary
                                + (employee.allowances || []).filter(a => a.is_active && a.frequency === 'monthly').reduce((s, a) => s + a.amount, 0)
                                - (employee.deductions || []).filter(d => d.is_active && d.frequency === 'monthly').reduce((s, d) => s + d.amount, 0)
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Allowances Table */}
            <div className="settings-wrapper animate-fade">

                <div className="section-card sales-card mb-4" style={{ padding: '1.5rem' }}>
                    <SectionHeader icon="fa-hand-holding-usd" title="البدلات" />
                    {(employee.allowances || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            <i className="fas fa-inbox fa-2x" style={{ opacity: 0.3, marginBottom: '0.5rem' }}></i>
                            <p>لا توجد بدلات مسجلة لهذا الموظف</p>
                        </div>
                    ) : (
                        <Table
                            columns={allowanceCols}
                            data={employee.allowances || []}
                            keyExtractor={(item) => item.id}
                            emptyMessage="لا توجد بدلات"
                        />
                    )}
                </div>

                {/* Deductions Table */}
                <div className="section-card sales-card mb-4" style={{ padding: '1.5rem' }}>
                    <SectionHeader icon="fa-file-invoice-dollar" title="الاستقطاعات" />
                    {(employee.deductions || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            <i className="fas fa-inbox fa-2x" style={{ opacity: 0.3, marginBottom: '0.5rem' }}></i>
                            <p>لا توجد استقطاعات مسجلة لهذا الموظف</p>
                        </div>
                    ) : (
                        <Table
                            columns={deductionCols}
                            data={employee.deductions || []}
                            keyExtractor={(item) => item.id}
                            emptyMessage="لا توجد استقطاعات"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
