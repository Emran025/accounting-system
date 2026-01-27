
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAPI, getSetting } from "@/lib/api";
import { showToast, Dialog } from "@/components/ui";
import { getIcon } from "@/lib/icons";
import { InvoiceSettings, StoreSettings } from "../types";
import { generateInvoiceHTML } from "@/lib/invoice-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/Textarea";
import type { InvoiceData } from "@/lib/invoice-utils";

export function InvoiceSettingsTab() {
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({
    show_logo: true,
    show_qr: true,
    zatca_enabled: false,
    footer_text: "",
    terms_text: "",
  });
  
  // Need store settings for preview
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  const [previewDialog, setPreviewDialog] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const loadInvoiceSettings = useCallback(async () => {
    try {
      const response = await fetchAPI("/api/settings/invoice");
      if (response.settings) {
        setInvoiceSettings(response.settings as InvoiceSettings);
      }
    } catch {
      console.error("Error loading invoice settings");
    }
  }, []);

  const loadStoreSettings = useCallback(async () => {
    try {
       const response = await fetchAPI("/api/settings/store");
       if (response.settings) {
         setStoreSettings(response.settings as StoreSettings);
       }
    } catch {
      console.error("Error loading store settings for preview");
    }
  }, []);

  useEffect(() => {
    loadInvoiceSettings();
    loadStoreSettings();
  }, [loadInvoiceSettings, loadStoreSettings]);

  const saveInvoiceSettings = async () => {
    try {
      await fetchAPI("/api/settings/invoice", {
        method: "PUT",
        body: JSON.stringify(invoiceSettings),
      });
      showToast("تم حفظ إعدادات الفاتورة", "success");
    } catch {
      showToast("خطأ في حفظ الإعدادات", "error");
    }
  };

  const previewInvoice = async () => {
    setIsGeneratingPreview(true);
    try {
      if (!storeSettings) {
         await loadStoreSettings(); // Ensure we have them
         if (!storeSettings) {
             showToast("فشل تحميل معلومات المتجر للمعاينة", "error");
             return;
         }
      }

      // Get latest invoice for preview
      const invoicesResponse = await fetchAPI("/api/invoices?page=1&limit=1");
      const invoices = invoicesResponse.invoices as InvoiceData[] | undefined;
      if (!invoicesResponse.success || !invoices || invoices.length === 0) {
        showToast("لا توجد فواتير سابقة لإجراء المعاينة", "error");
        return;
      }

      const sampleInvoice = invoices[0];
      const detailResponse = await fetchAPI(`/api/invoices/${sampleInvoice.id}`);
      if (!detailResponse.success && !detailResponse.invoice) {
        showToast("فشل تحميل تفاصيل الفاتورة", "error");
        return;
      }

      const invoice = detailResponse.invoice as InvoiceData;

      // Combine current form settings with store settings
      const settings: import("@/lib/invoice-utils").InvoiceSettings = {
        store_name: storeSettings!.store_name, // safe bang due to check above (though closure might have stale state, usually fine here or use ref/direct fetch result)
        store_address: storeSettings!.store_address,
        store_phone: storeSettings!.store_phone,
        tax_number: storeSettings!.tax_number,
        invoice_size: (invoiceSettings.show_qr ? "thermal" : "a4") as "thermal" | "a4",
        footer_message: invoiceSettings.footer_text,
        currency_symbol: getSetting("currency_symbol", "ر.ي"),
        show_logo: invoiceSettings.show_logo,
        show_qr: invoiceSettings.show_qr,
      };

      // Generate preview HTML
      const content = await generateInvoiceHTML(invoice, settings);

      // Render in iframe
      if (previewIframeRef.current) {
        const doc = previewIframeRef.current.contentDocument || previewIframeRef.current.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(content);
          doc.close();
        }
      }

      setPreviewDialog(true);
    } catch (error) {
      console.error("Preview error", error);
      showToast("حدث خطأ أثناء المعاينة", "error");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  return (
    <>
      <div className="sales-card">
        <h3>إعدادات الفاتورة</h3>
        <div className="settings-form-grid">
          <div className="form-group">
            <Checkbox
                id="show_logo"
                label="عرض الشعار"
                checked={invoiceSettings.show_logo}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, show_logo: e.target.checked })}
            />
          </div>
          <div className="form-group">
            <Checkbox
                id="show_qr"
                label="عرض رمز QR"
                checked={invoiceSettings.show_qr}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, show_qr: e.target.checked })}
            />
          </div>
          
          <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px dashed var(--border-color)" }}>
             <h4 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>الامتثال الضريبي والتكامل الحكومي</h4>
             <div className="form-group">
                <div className="checkbox-group" style={{ 
                    borderRight: "4px solid #10b981", 
                    transform: "none",
                    background: invoiceSettings.zatca_enabled ? "var(--bg-secondary)" : "transparent",
                    padding: "1rem",
                    borderRadius: "8px",
                    transition: "all 0.3s ease",
                    display: "flex", // Checkbox component is inline-flex, wrap it 
                    alignItems: "flex-start",
                    gap: "10px"
                }}>
                  <Checkbox
                    id="zatca_enabled"
                    checked={invoiceSettings.zatca_enabled}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, zatca_enabled: e.target.checked })}
                    style={{ marginTop: "4px" }} 
                  />
                  <div>
                    <label htmlFor="zatca_enabled" style={{ fontWeight: 600, display: "block", cursor: "pointer" }}>تفعيل الربط الحكومي (مثل هيئة الزكاة / ZATCA)</label>
                    <p style={{ marginTop: "0.25rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        تفعيل هذا الخيار سيقوم بتشغيل خصائص الفوترة الإلكترونية وإرسال الفواتير للمنصات الحكومية المعتمدة تلقائياً.
                        <br/>
                        <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>(مخصص للمنشآت الملزمة بالربط الضريبي والزكوي)</span>
                    </p>
                  </div>
                </div>
             </div>
          </div>
          <div className="form-group full-width">
            <Textarea
              label="نص التذييل"
              id="footer_text"
              value={invoiceSettings.footer_text}
              onChange={(e) => setInvoiceSettings({ ...invoiceSettings, footer_text: e.target.value })}
              rows={2}
            />
          </div>
          <div className="form-group full-width">
            <Textarea
              label="الشروط والأحكام"
              id="terms_text"
              value={invoiceSettings.terms_text}
              onChange={(e) => setInvoiceSettings({ ...invoiceSettings, terms_text: e.target.value })}
              rows={3}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button className="btn btn-secondary" onClick={previewInvoice} disabled={isGeneratingPreview}>
            {isGeneratingPreview ? "جاري التحميل..." : "معاينة الفاتورة"}
          </button>
          <button className="btn btn-primary" onClick={saveInvoiceSettings}>
            حفظ التغييرات
          </button>
        </div>
      </div>

       {/* Invoice Preview Dialog */}
       <Dialog
        isOpen={previewDialog}
        onClose={() => setPreviewDialog(false)}
        title="معاينة الفاتورة"
        maxWidth="900px"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (previewIframeRef.current?.contentWindow) {
                  previewIframeRef.current.contentWindow.focus();
                  previewIframeRef.current.contentWindow.print();
                }
              }}
            >
              {getIcon("print")} طباعة
            </button>
            <button className="btn btn-primary" onClick={() => setPreviewDialog(false)}>
              إغلاق
            </button>
          </>
        }
      >
        <div style={{ position: "relative", background: "#e2e8f0", padding: "1rem", borderRadius: "8px", height: "70vh", overflow: "auto" }}>
          <iframe
            ref={previewIframeRef}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              background: "white",
              borderRadius: "4px",
            }}
            title="Invoice Preview"
          />
        </div>
      </Dialog>
    </>
  );
}
