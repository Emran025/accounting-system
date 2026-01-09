"use client";

import { useState, useEffect } from "react";
import { Table, Column } from "@/components/ui/Table";
import { PayrollCycle } from "../types";
import { useRouter } from "next/navigation";

export function PayrollTab() {
  const [payrollCycles, setPayrollCycles] = useState<PayrollCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadPayrollCycles();
  }, []);

  const loadPayrollCycles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/payroll/cycles');
      const data = await res.json();
      setPayrollCycles(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const generatePayroll = async () => {
    const start = new Date();
    start.setDate(1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if(!confirm("هل أنت متأكد من إنشاء مسير الرواتب لهذا الشهر؟")) return;

    try {
        const res = await fetch('/api/payroll/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                period_start: formatDate(start),
                period_end: formatDate(end)
            })
        });
        if(res.ok) {
            alert("تم إنشاء مسير الرواتب بنجاح");
            loadPayrollCycles();
        } else {
            const err = await res.json();
            alert("فشل إنشاء المسير: " + (err.error || err.message));
        }
    } catch(e) {
        console.error(e);
        alert("حدث خطأ");
    }
  };

  const handleApprove = async (id: number) => {
    if(!confirm("هل أنت متأكد من اعتماد مسير الرواتب؟ سيتم إنشاء قيود الاستحقاق.")) return;
    try {
        const res = await fetch(`/api/payroll/${id}/approve`, { method: 'POST' });
        if(res.ok) loadPayrollCycles();
        else alert("فشل الاعتماد");
    } catch(e) { console.error(e); }
  };

  const handlePayment = async (id: number) => {
      if(!confirm("هل أنت متأكد من صرف الرواتب؟ سيتم إنشاء قيود الصرف.")) return;
      try {
          const res = await fetch(`/api/payroll/${id}/process-payment`, { method: 'POST' });
          if(res.ok) loadPayrollCycles();
          else alert("فشل الصرف");
      } catch(e) { console.error(e); }
  };

  const columns: Column<PayrollCycle>[] = [
    { key: "cycle_name", header: "الدورة", dataLabel: "الدورة" },
    { key: "period_start", header: "من تاريخ", dataLabel: "من تاريخ" },
    { key: "period_end", header: "إلى تاريخ", dataLabel: "إلى تاريخ" },
    { key: "status", header: "الحالة", dataLabel: "الحالة", render: (item) => (
        <span className={`badge ${item.status === 'paid' ? 'badge-success' : item.status === 'approved' ? 'badge-info' : 'badge-warning'}`}>
            {item.status === 'draft' ? 'مسودة' : item.status === 'approved' ? 'معتمد' : item.status === 'paid' ? 'مدفوع' : item.status}
        </span>
    )},
    { key: "total_net", header: "إجمالي الصرف", dataLabel: "إجمالي الصرف", render: (item) => Number(item.total_net).toLocaleString() },
    { key: "id", header: "الإجراءات", dataLabel: "الإجراءات", render: (item) => (
       <div className="action-buttons">
          {item.status === 'draft' && (
              <button className="icon-btn success" title="اعتماد" onClick={() => handleApprove(item.id)}>
                  <i className="fas fa-check"></i>
              </button>
          )}
          {item.status === 'approved' && (
              <button className="icon-btn primary" title="صرف" onClick={() => handlePayment(item.id)}>
                  <i className="fas fa-money-bill-wave"></i>
              </button>
          )}
          {/* <button className="icon-btn view" title="التفاصيل"><i className="fas fa-eye"></i></button> */}
       </div>
    )},
  ];

  return (
    <div className="sales-card animate-fade">
      <div className="card-header-flex" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
        <h3>دورات الرواتب</h3>
        <button className="btn btn-primary" onClick={generatePayroll}>
          <i className="fas fa-plus"></i> دورة رواتب جديدة
        </button>
      </div>

      <Table
        columns={columns}
        data={payrollCycles}
        keyExtractor={(item) => item.id}
        emptyMessage="لا توجد دورات رواتب"
        isLoading={isLoading}
      />
    </div>
  );
}
