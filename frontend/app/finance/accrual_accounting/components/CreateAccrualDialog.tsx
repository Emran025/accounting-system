
import { useState } from "react";
import { Dialog, showAlert, Button, NumberInput } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { parseNumber } from "@/lib/utils";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/Textarea";

interface AccrualDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback to reload data in parent/siblings if needed
}

export function CreateAccrualDialog({ isOpen, onClose, onSuccess }: AccrualDialogProps) {
  const [accrualType, setAccrualType] = useState<"payroll" | "prepayment" | "unearned">("payroll");

  // Payroll fields
  const [payrollDate, setPayrollDate] = useState(new Date().toISOString().split("T")[0]);
  const [grossPay, setGrossPay] = useState("");
  const [deductions, setDeductions] = useState("0");
  const [payrollDescription, setPayrollDescription] = useState("كشف مرتب شهري");

  // Prepayment fields
  const [prepaymentDate, setPrepaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [prepaymentAmount, setPrepaymentAmount] = useState("");
  const [prepaymentMonths, setPrepaymentMonths] = useState("1");
  const [prepaymentDescription, setPrepaymentDescription] = useState("");
  const [prepaymentExpenseAccount, setPrepaymentExpenseAccount] = useState("");

  // Unearned fields
  const [unearnedDate, setUnearnedDate] = useState(new Date().toISOString().split("T")[0]);
  const [unearnedAmount, setUnearnedAmount] = useState("");
  const [unearnedMonths, setUnearnedMonths] = useState("1");
  const [unearnedDescription, setUnearnedDescription] = useState("");
  const [unearnedRevenueAccount, setUnearnedRevenueAccount] = useState("");

  const saveAccrual = async () => {
    let data: any = {};

    if (accrualType === "payroll") {
      if (!payrollDate || !grossPay) {
        showAlert("alert-container", "يرجى ملء جميع الحقول المطلوبة", "error");
        return;
      }
      data = {
        payroll_date: payrollDate,
        gross_pay: parseNumber(grossPay),
        deductions: parseNumber(deductions),
        description: payrollDescription,
      };
    } else if (accrualType === "prepayment") {
      if (!prepaymentDate || !prepaymentAmount || !prepaymentMonths) {
        showAlert("alert-container", "يرجى ملء جميع الحقول المطلوبة", "error");
        return;
      }
      data = {
        prepayment_date: prepaymentDate,
        total_amount: parseNumber(prepaymentAmount),
        months: parseInt(prepaymentMonths),
        description: prepaymentDescription,
        expense_account_code: prepaymentExpenseAccount || null,
      };
    } else if (accrualType === "unearned") {
      if (!unearnedDate || !unearnedAmount || !unearnedMonths) {
        showAlert("alert-container", "يرجى ملء جميع الحقول المطلوبة", "error");
        return;
      }
      data = {
        receipt_date: unearnedDate,
        total_amount: parseNumber(unearnedAmount),
        months: parseInt(unearnedMonths),
        description: unearnedDescription,
        revenue_account_code: unearnedRevenueAccount || null,
      };
    }

    try {
      const module =
        accrualType === "payroll"
          ? "payroll"
          : accrualType === "prepayment"
            ? "prepayments"
            : "unearned_revenue";

      const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.ACCRUAL}?module=${module}`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.success) {
        showAlert("alert-container", "تم حفظ القيد بنجاح", "success");
        onSuccess();
        onClose();
      } else {
        showAlert("alert-container", response.message || "فشل حفظ القيد", "error");
      }
    } catch {
      showAlert("alert-container", "خطأ في حفظ القيد", "error");
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        accrualType === "payroll"
          ? "إضافة كشف مرتب"
          : accrualType === "prepayment"
            ? "إضافة دفعة مقدمة"
            : "إضافة إيراد غير مكتسب"
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={saveAccrual}>
            حفظ
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveAccrual();
        }}
        className="space-y-4"
      >
        <Select
          label="نوع القيد *"
          id="accrual-type-select"
          value={accrualType}
          onChange={(e) =>
            setAccrualType(e.target.value as typeof accrualType)
          }
          options={[
            { value: "payroll", label: "كشف مرتبات" },
            { value: "prepayment", label: "مدفوعات مقدمة" },
            { value: "unearned", label: "إيرادات غير مكتسبة" },
          ]}
        />

        {/* Payroll Fields */}
        {accrualType === "payroll" && (
          <>
            <TextInput
              type="date"
              label="تاريخ الراتب *"
              id="payroll-date"
              value={payrollDate}
              onChange={(e) => setPayrollDate(e.target.value)}
              required
            />
            <div className="form-row">
              <NumberInput
                label="إجمالي الراتب *"
                id="gross-pay"
                value={grossPay}
                onChange={(val) => setGrossPay(val)}
                step={0.01}
                min={0}
                required
                className="flex-1"
              />
              <NumberInput
                label="الخصومات"
                id="deductions"
                value={deductions}
                onChange={(val) => setDeductions(val)}
                step={0.01}
                min={0}
                className="flex-1"
              />
            </div>
            <Textarea
              label="الوصف"
              id="payroll-description"
              value={payrollDescription}
              onChange={(e) => setPayrollDescription(e.target.value)}
              rows={2}
            />
          </>
        )}

        {/* Prepayment Fields */}
        {accrualType === "prepayment" && (
          <>
            <TextInput
              type="date"
              label="تاريخ الدفع *"
              id="prepayment-date"
              value={prepaymentDate}
              onChange={(e) => setPrepaymentDate(e.target.value)}
              required
            />
            <div className="form-row">
              <NumberInput
                label="المبلغ الإجمالي *"
                id="prepayment-amount"
                value={prepaymentAmount}
                onChange={(val) => setPrepaymentAmount(val)}
                step={0.01}
                min={0}
                required
                className="flex-1"
              />
              <NumberInput
                label="عدد الأشهر *"
                id="prepayment-months"
                value={prepaymentMonths}
                onChange={(val) => setPrepaymentMonths(val)}
                min={1}
                required
                className="flex-1"
              />
            </div>
            <TextInput
              label="حساب المصروف"
              id="prepayment-expense-account"
              value={prepaymentExpenseAccount}
              onChange={(e) => setPrepaymentExpenseAccount(e.target.value)}
              placeholder="رمز الحساب (اختياري)"
            />
            <Textarea
              label="الوصف *"
              id="prepayment-description"
              value={prepaymentDescription}
              onChange={(e) => setPrepaymentDescription(e.target.value)}
              rows={2}
              required
            />
          </>
        )}

        {/* Unearned Revenue Fields */}
        {accrualType === "unearned" && (
          <>
            <TextInput
              type="date"
              label="تاريخ الاستلام *"
              id="unearned-date"
              value={unearnedDate}
              onChange={(e) => setUnearnedDate(e.target.value)}
              required
            />
            <div className="form-row">
              <NumberInput
                label="المبلغ الإجمالي *"
                id="unearned-amount"
                value={unearnedAmount}
                onChange={(val) => setUnearnedAmount(val)}
                step={0.01}
                min={0}
                required
                className="flex-1"
              />
              <NumberInput
                label="عدد الأشهر *"
                id="unearned-months"
                value={unearnedMonths}
                onChange={(val) => setUnearnedMonths(val)}
                min={1}
                required
                className="flex-1"
              />
            </div>
            <TextInput
              label="حساب الإيراد"
              id="unearned-revenue-account"
              value={unearnedRevenueAccount}
              onChange={(e) => setUnearnedRevenueAccount(e.target.value)}
              placeholder="رمز الحساب (اختياري)"
            />
            <Textarea
              label="الوصف *"
              id="unearned-description"
              value={unearnedDescription}
              onChange={(e) => setUnearnedDescription(e.target.value)}
              rows={2}
              required
            />
          </>
        )}
      </form>
    </Dialog>
  );
}
