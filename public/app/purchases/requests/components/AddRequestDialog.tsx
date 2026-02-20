import React, { useState } from "react";
import { Dialog, SearchableSelect, SelectOption, Button, showToast } from "@/components/ui";
import { Product } from "../types";

interface AddRequestDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { product_id: string; product_name: string; quantity: number; notes: string }) => Promise<void>;
    products: Product[];
}

export const AddRequestDialog: React.FC<AddRequestDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    products,
}) => {
    const [formData, setFormData] = useState({
        product_id: "",
        product_name: "",
        quantity: "",
        notes: "",
    });

    const [isSaving, setIsSaving] = useState(false);

    const productOptions: SelectOption[] = products.map((p) => ({
        value: p.id,
        label: p.name,
        subtitle: `المخزون: ${p.stock_quantity}`,
    }));

    const handleSubmit = async () => {
        if (!formData.quantity) {
            showToast("الرجاء إدخال الكمية", "error");
            return;
        }

        if (!formData.product_id && !formData.product_name) {
            showToast("الرجاء اختيار منتج أو إدخال اسمه", "error");
            return;
        }

        try {
            setIsSaving(true);
            await onSave({
                ...formData,
                quantity: parseFloat(formData.quantity) || 1,
            });
            setFormData({ product_id: "", product_name: "", quantity: "", notes: "" });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="طلب شراء جديد"
            maxWidth="600px"
            footer={
                <>
                    <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>إلغاء</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? "جاري الحفظ..." : "تأكيد الطلب"}
                    </button>
                </>
            }
        >
            <div className="form-group">
                <label>المنتج (إن وجد) *</label>
                <SearchableSelect
                    options={productOptions}
                    value={formData.product_id ? parseInt(formData.product_id) : null}
                    onChange={(val) => {
                        const prod = products.find(p => p.id === val);
                        setFormData({
                            ...formData,
                            product_id: val ? String(val) : "",
                            product_name: prod ? prod.name : "",
                        });
                    }}
                    placeholder="ابحث عن منتج..."
                />
            </div>
            {!formData.product_id && (
                <div className="form-group">
                    <label>أو أدخل اسم المنتج يدوياً</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="اسم الصنف أو المنتج"
                        value={formData.product_name}
                        onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    />
                </div>
            )}
            <div className="form-group">
                <label>الكمية المطلوبة *</label>
                <input
                    type="number"
                    className="form-control"
                    placeholder="الكمية"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    min="1"
                />
            </div>
            <div className="form-group">
                <label>ملاحظات إضافية</label>
                <textarea
                    className="form-control"
                    placeholder="سبب الطلب، مواصفات معينة الخ..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                />
            </div>
        </Dialog>
    );
};
