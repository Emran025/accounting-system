"use client";

import { useState, useMemo } from "react";
import { Dialog } from "./Dialog";
import { type SelectedItem, type Invoice } from "./SelectableInvoiceTable";
import { formatCurrency } from "@/lib/utils";

interface ReturnData {
  invoice_id: number;
  items: Array<{
    invoice_item_id: number;
    return_quantity: number;
  }>;
  reason: string | null;
}

interface SalesReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: SelectedItem[];
  originalInvoice: Invoice | null;
  onConfirmReturn: (returnData: ReturnData) => Promise<void>;
}

export function SalesReturnDialog({
  isOpen,
  onClose,
  selectedItems,
  originalInvoice,
  onConfirmReturn,
}: SalesReturnDialogProps) {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"review" | "confirm">("review");

  // Initialize quantities from selected items
  useMemo(() => {
    const initial: Record<number, number> = {};
    selectedItems.forEach(item => {
      if (quantities[item.invoiceItemId] === undefined) {
        initial[item.invoiceItemId] = item.quantity;
      }
    });
    if (Object.keys(initial).length > 0) {
      setQuantities(prev => ({ ...prev, ...initial }));
    }
  }, [selectedItems]);

  // Calculate return amounts
  const calculations = useMemo(() => {
    if (!originalInvoice) return null;

    let returnSubtotal = 0;
    selectedItems.forEach(item => {
      const qty = quantities[item.invoiceItemId] ?? item.quantity;
      returnSubtotal += item.unitPrice * qty;
    });

    // Calculate proportional VAT and fees
    const proportion = originalInvoice.subtotal > 0 
      ? returnSubtotal / originalInvoice.subtotal 
      : 0;
    
    const returnVat = originalInvoice.vat_amount * proportion;
    const returnTotal = returnSubtotal + returnVat;

    return {
      subtotal: returnSubtotal,
      vat: returnVat,
      total: returnTotal,
      proportion: proportion * 100,
    };
  }, [selectedItems, quantities, originalInvoice]);

  // Handle quantity change
  const handleQuantityChange = (itemId: number, value: number, maxQty: number) => {
    const clampedValue = Math.max(1, Math.min(value, maxQty));
    setQuantities(prev => ({ ...prev, [itemId]: clampedValue }));
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!originalInvoice || !calculations) return;

    if (step === "review") {
      setStep("confirm");
      return;
    }

    setIsSubmitting(true);
    try {
      const returnData: ReturnData = {
        invoice_id: originalInvoice.id,
        items: selectedItems.map(item => ({
          invoice_item_id: item.invoiceItemId,
          return_quantity: quantities[item.invoiceItemId] ?? item.quantity,
        })),
        reason: reason.trim() || null,
      };

      await onConfirmReturn(returnData);
      
      // Reset state
      setStep("review");
      setReason("");
      setQuantities({});
      onClose();
    } catch (error) {
      console.error("Return error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isSubmitting) {
      setStep("review");
      setReason("");
      onClose();
    }
  };

  if (!originalInvoice) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={step === "review" ? "مرتجع مبيعات" : "تأكيد المرتجع"}
      maxWidth="700px"
      footer={
        <div className="dialog-actions">
          <button 
            className="btn btn-secondary" 
            onClick={step === "confirm" ? () => setStep("review") : handleClose}
            disabled={isSubmitting}
          >
            {step === "confirm" ? "رجوع" : "إلغاء"}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={isSubmitting || selectedItems.length === 0}
          >
            {isSubmitting ? "جاري المعالجة..." : step === "review" ? "متابعة" : "تأكيد المرتجع"}
          </button>
        </div>
      }
    >
      <div className="return-dialog-content">
        {/* Invoice Info */}
        <div className="invoice-info">
          <div className="info-row">
            <span className="label">رقم الفاتورة:</span>
            <span className="value">{originalInvoice.invoice_number}</span>
          </div>
          <div className="info-row">
            <span className="label">نوع البيع:</span>
            <span className="value badge">
              {originalInvoice.payment_type === "credit" ? "آجل" : "نقدي"}
            </span>
          </div>
          {originalInvoice.customer && (
            <div className="info-row">
              <span className="label">العميل:</span>
              <span className="value">{originalInvoice.customer.name}</span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="items-section">
          <h4>العناصر المراد إرجاعها</h4>
          <table className="return-items-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>السعر</th>
                <th>الكمية المرتجعة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map(item => {
                const qty = quantities[item.invoiceItemId] ?? item.quantity;
                return (
                  <tr key={item.invoiceItemId}>
                    <td>{item.productName}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>
                      {step === "review" ? (
                        <div className="quantity-input">
                          <button
                            onClick={() => handleQuantityChange(item.invoiceItemId, qty - 1, item.maxQuantity)}
                            disabled={qty <= 1}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={qty}
                            onChange={(e) => handleQuantityChange(item.invoiceItemId, parseInt(e.target.value) || 1, item.maxQuantity)}
                            min={1}
                            max={item.maxQuantity}
                          />
                          <button
                            onClick={() => handleQuantityChange(item.invoiceItemId, qty + 1, item.maxQuantity)}
                            disabled={qty >= item.maxQuantity}
                          >
                            +
                          </button>
                          <span className="max-qty">/ {item.maxQuantity}</span>
                        </div>
                      ) : (
                        <span>{qty} / {item.maxQuantity}</span>
                      )}
                    </td>
                    <td>{formatCurrency(item.unitPrice * qty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculations Summary */}
        {calculations && (
          <div className="calculations-section">
            <div className="calc-row">
              <span>الإجمالي الفرعي:</span>
              <span>{formatCurrency(calculations.subtotal)}</span>
            </div>
            <div className="calc-row">
              <span>ضريبة القيمة المضافة ({calculations.proportion.toFixed(1)}%):</span>
              <span>{formatCurrency(calculations.vat)}</span>
            </div>
            <div className="calc-row total">
              <span>إجمالي المرتجع:</span>
              <span>{formatCurrency(calculations.total)}</span>
            </div>
          </div>
        )}

        {/* Reason Field */}
        {step === "review" && (
          <div className="reason-section">
            <label htmlFor="return-reason">سبب الإرجاع (اختياري)</label>
            <textarea
              id="return-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="أدخل سبب الإرجاع..."
              rows={3}
            />
          </div>
        )}

        {/* Confirmation Warning */}
        {step === "confirm" && (
          <div className="confirm-warning">
            <svg viewBox="0 0 24 24" width="24" height="24" className="warning-icon">
              <path
                d="M12 9v4m0 4h.01M12 2l10 18H2L12 2z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <strong>تأكيد العملية</strong>
              <p>سيتم إنشاء مرتجع بقيمة <strong>{formatCurrency(calculations?.total || 0)}</strong> وتعديل المخزون والقيود المحاسبية وفقاً لذلك.</p>
              {originalInvoice.payment_type === "credit" && (
                <p>سيتم تخفيض رصيد العميل بمبلغ المرتجع.</p>
              )}
              {originalInvoice.payment_type === "cash" && (
                <p>سيتم تسجيل قيد استرداد نقدي.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .return-dialog-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .invoice-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-color);
          border-radius: var(--radius-md);
        }

        .info-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .info-row .label {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .info-row .value {
          font-weight: 600;
        }

        .info-row .badge {
          padding: 0.25rem 0.75rem;
          background: var(--primary-subtle);
          color: var(--primary-dark);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
        }

        .items-section h4 {
          margin: 0 0 0.75rem;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .return-items-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .return-items-table th {
          background: #f8fafc;
          padding: 0.75rem;
          text-align: right;
          font-size: 0.85rem;
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
        }

        .return-items-table td {
          padding: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }

        .return-items-table tr:last-child td {
          border-bottom: none;
        }

        .quantity-input {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .quantity-input button {
          width: 28px;
          height: 28px;
          border: 1px solid var(--border-color);
          background: white;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .quantity-input button:hover:not(:disabled) {
          background: var(--primary-subtle);
          border-color: var(--primary-light);
        }

        .quantity-input button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quantity-input input {
          width: 50px;
          text-align: center;
          padding: 0.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }

        .max-qty {
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        .calculations-section {
          padding: 1rem;
          background: var(--bg-color);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .calc-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
        }

        .calc-row.total {
          padding-top: 0.75rem;
          margin-top: 0.5rem;
          border-top: 2px solid var(--primary-light);
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--primary-dark);
        }

        .reason-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .reason-section label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .reason-section textarea {
          resize: vertical;
          min-height: 80px;
        }

        .confirm-warning {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: var(--radius-md);
          color: #92400e;
        }

        .warning-icon {
          flex-shrink: 0;
          color: #f59e0b;
        }

        .confirm-warning strong {
          display: block;
          margin-bottom: 0.5rem;
        }

        .confirm-warning p {
          margin: 0.25rem 0;
          font-size: 0.9rem;
        }

        .dialog-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }
      `}</style>
    </Dialog>
  );
}
