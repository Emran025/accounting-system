import { Dialog } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DetailedInvoice } from "../types";

interface InvoiceDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedInvoice: DetailedInvoice | null;
}

export function InvoiceDetailsDialog({ isOpen, onClose, selectedInvoice }: InvoiceDetailsDialogProps) {
    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="تفاصيل الفاتورة"
        // size="large"
        >
            {selectedInvoice && (
                <div>
                    <div style={{ marginBottom: "2rem", borderBottom: "2px solid var(--border-color)", paddingBottom: "1rem" }}>
                        <div className="form-row">
                            <div className="summary-stat">
                                <span className="stat-label">رقم الفاتورة</span>
                                <span className="stat-value">{selectedInvoice.invoice_number}</span>
                            </div>
                            <div className="summary-stat">
                                <span className="stat-label">التاريخ</span>
                                <span className="stat-value">{formatDate(selectedInvoice.created_at)}</span>
                            </div>
                            <div className="summary-stat">
                                <span className="stat-label">نوع الدفع</span>
                                <span className="stat-value">
                                    <span
                                        className={`badge ${selectedInvoice.payment_type === "credit" ? "badge-warning" : "badge-success"
                                            }`}
                                    >
                                        {selectedInvoice.payment_type === "credit" ? "آجل (ذمم)" : "نقدي"}
                                    </span>
                                </span>
                            </div>
                        </div>
                        {selectedInvoice.supplier_name && (
                            <div
                                className="form-row"
                                style={{
                                    marginTop: "1rem",
                                    background: "var(--surface-hover)",
                                    padding: "1rem",
                                    borderRadius: "var(--radius-md)",
                                }}
                            >
                                <div className="summary-stat">
                                    <span className="stat-label">المورد</span>
                                    <span className="stat-value">{selectedInvoice.supplier_name}</span>
                                </div>
                                {selectedInvoice.supplier_phone && (
                                    <div className="summary-stat">
                                        <span className="stat-label">الهاتف</span>
                                        <span className="stat-value">{selectedInvoice.supplier_phone}</span>
                                    </div>
                                )}
                                {selectedInvoice.supplier_tax && (
                                    <div className="summary-stat">
                                        <span className="stat-label">الرقم الضريبي</span>
                                        <span className="stat-value">{selectedInvoice.supplier_tax}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedInvoice.payment_type === "credit" && (
                            <div className="form-row" style={{ marginTop: "1rem" }}>
                                <div className="summary-stat">
                                    <span className="stat-label">المبلغ المدفوع</span>
                                    <span className="stat-value" style={{ color: "var(--success-color)" }}>
                                        {formatCurrency(selectedInvoice.amount_paid || 0)}
                                    </span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-label">المبلغ المتبقي</span>
                                    <span
                                        className="stat-value"
                                        style={{ color: "var(--danger-color)", fontWeight: 700 }}
                                    >
                                        {formatCurrency(
                                            selectedInvoice.total_amount - (selectedInvoice.amount_paid || 0)
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 style={{ marginBottom: "1rem" }}>المنتجات المشتراة:</h4>
                        {selectedInvoice.items.map((item, idx) => (
                            <div key={idx} className="item-row-minimal">
                                <div className="item-info-pkg">
                                    <span className="item-name-pkg">{item.product_name}</span>
                                    <span className="item-meta-pkg">سعر الوحدة: {formatCurrency(item.unit_price)}</span>
                                </div>
                                <div className="item-info-pkg" style={{ textAlign: "left" }}>
                                    <span className="item-name-pkg">{formatCurrency(item.subtotal)}</span>
                                    <span className="item-meta-pkg">الكمية: {item.quantity}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div
                        className="sales-summary-bar"
                        style={{
                            marginTop: "2rem",
                            background: "var(--grad-primary)",
                            color: "white",
                        }}
                    >
                        <div className="summary-stat">
                            <span className="stat-label" style={{ color: "rgba(255,255,255,0.8)" }}>
                                المبلغ الإجمالي
                            </span>
                            <span className="stat-value highlight" style={{ color: "white" }}>
                                {formatCurrency(selectedInvoice.total_amount)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </Dialog>
    );
}
