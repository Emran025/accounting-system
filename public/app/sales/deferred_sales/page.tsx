"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MainLayout, PageHeader } from "@/components/layout";
import { Table, Dialog, ConfirmDialog, Column, showAlert, NumberInput, SearchableSelect, SelectOption, SegmentedToggle } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDateTime, parseNumber } from "@/lib/utils";
import { User, getStoredUser, canAccess, getStoredPermissions, Permission, checkAuth } from "@/lib/auth";
import { Icon } from "@/lib/icons";
import { printInvoice } from "@/lib/invoice-utils";

interface GovernmentFee {
    id: number;
    name: string;
    percentage: number;
    fixed_amount: number;
    is_active: boolean;
}

interface Product {
  id: number;
  name: string;
  barcode?: string;
  stock_quantity: number;
  unit_price: number;
  items_per_unit: number;
  unit_name: string;
  sub_unit_name: string;
  latest_purchase_price?: number;
  minimum_profit_margin?: number;
  weighted_average_cost?: number;
}

interface Pagination {
  total_records: number;
  total_pages: number;
  current_page: number;
}
interface Customer {
  id: number;
  name: string;
  phone?: string;
}

interface InvoiceItem {
  product_id: number;
  product_name: string;
  display_name: string;
  quantity: number;
  unit_type: "sub" | "main";
  unit_name: string;
  total_sub_units: number;
  unit_price: number;
  subtotal: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  total_amount: number;
  item_count?: number;
  amount_paid: number;
  customer_name?: string;
  customer_phone?: string;
  customer_tax?: string;
  created_at: string;
  items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  subtotal?: number;
  discount_amount?: number;
  payment_type: string;
}

export default function DeferredSalesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Government Fees
  const [governmentFees, setGovernmentFees] = useState<GovernmentFee[]>([]);
  const [vatRate, setVatRate] = useState(0.0); // Default 0%

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");

  // Invoice form
  const [quantity, setQuantity] = useState("1");
  const [unitType, setUnitType] = useState<"sub" | "main">("sub");
  const [unitPrice, setUnitPrice] = useState("");
  const [itemStock, setItemStock] = useState("");
  const [subtotal, setSubtotal] = useState(0);
  const [discountValue, setDiscountValue] = useState("0");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [amountPaid, setAmountPaid] = useState("");

  // Current invoice items
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Invoice history
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Dialogs
  const [viewDialog, setViewDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Pricing Helpers
  const calculateSellingPrice = (basePrice: number) => {
    // basePrice is the amount subject to fees and VAT
    const feesPercentage = governmentFees.reduce((sum, fee) => sum + (Number(fee.percentage) || 0), 0) / 100;
    const fixedFees = governmentFees.reduce((sum, fee) => sum + (Number(fee.fixed_amount) || 0), 0);
    
    // Fee amount based on base price
    const variableFeeAmount = basePrice * feesPercentage;
    
    // VAT is calculated on base price (Taxable Base)
    const vatAmount = basePrice * vatRate;

    // Final = Base + Fees + VAT + Fixed
    return basePrice + variableFeeAmount + vatAmount + fixedFees;
  };

  const calculateBasePrice = (finalPrice: number) => {
    // Reverse calculation to extract Base Price from Final Price
    const feesPercentage = governmentFees.reduce((sum, fee) => sum + (Number(fee.percentage) || 0), 0) / 100;
    const fixedFees = governmentFees.reduce((sum, fee) => sum + (Number(fee.fixed_amount) || 0), 0);
    
    // Formula: Final = Base * (1 + fee% + vat%) + Fixed
    // Base = (Final - Fixed) / (1 + fee% + vat%)
    
    const divisor = 1 + feesPercentage + vatRate;
    const base = (finalPrice - fixedFees) / divisor;
    return base > 0 ? base : 0;
  };

  const baseItemsTotal = invoiceItems.reduce((sum, item) => {
    const basePrice = calculateBasePrice(item.unit_price);
    return sum + (basePrice * item.quantity);
  }, 0);

  const totalVAT = baseItemsTotal * vatRate;

  const totalFees = invoiceItems.reduce((sum, item) => {
    const base = calculateBasePrice(item.unit_price);
    const feesPercentage = governmentFees.reduce((s, f) => s + (Number(f.percentage) || 0), 0) / 100;
    const fixedFees = governmentFees.reduce((s, f) => s + (Number(f.fixed_amount) || 0), 0);
    return sum + (base * feesPercentage + fixedFees) * item.quantity;
  }, 0);

  const calculatedDiscount = useCallback(() => {
    const val = parseNumber(discountValue);
    if (discountType === "percent") {
      return (baseItemsTotal * val) / 100;
    }
    return val;
  }, [discountValue, discountType, baseItemsTotal]);

  const finalTotal = baseItemsTotal + totalFees + totalVAT - calculatedDiscount();

  const generateInvoiceNumber = useCallback(() => {
    // Use last 6 digits of timestamp + 4 digits of randomness
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const num = "INV-" + ts + rand;
    setInvoiceNumber(num);
  }, []);

  const loadFees = useCallback(async () => {
    try {
        const response: any = await fetchAPI("government_fees");
        if (response.success && response.data && response.data.fees) {
            setGovernmentFees(response.data.fees.filter((f: GovernmentFee) => f.is_active));
        }
    } catch (e) {
        console.error("Failed to load fees", e);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetchAPI(`products?include_purchase_price=1`);
      if (response.success && response.data) {
        const filtered = (response.data as Product[]).filter((p) => p.stock_quantity > 0);
        setProducts(filtered);
      }
    } catch (error) {
      showAlert("alert-container", "خطأ في تحميل المنتجات", "error");
    }
  }, []);

  const loadCustomers = useCallback(async (search: string = "") => {
    if (search.length < 2) {
      setCustomers([]);
      return;
    }
    try {
      const response = await fetchAPI(`ar_customers?limit=10&search=${encodeURIComponent(search)}`);
      if (response.success && response.data) {
        setCustomers(response.data as Customer[]);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  const loadInvoices = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetchAPI(`invoices?page=${page}&limit=${itemsPerPage}&payment_type=credit`);
      if (response.success && response.data) {
        setInvoices(response.data as Invoice[]);

        setTotalPages((response.pagination as any)?.total_pages || 1);
        setCurrentPage(page);
      }
    } catch {
      showAlert("alert-container", "خطأ في تحميل السجل", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const authenticated = await checkAuth();
      if (!authenticated) return;

      const storedUser = getStoredUser();
      const storedPermissions = getStoredPermissions();
      setUser(storedUser);
      setPermissions(storedPermissions);

      // Load Settings (VAT Rate)
      try {
        const settingsRes = await fetchAPI("/api/settings");
        if (settingsRes.success && settingsRes.data) {
             const vatSetting = (settingsRes.data as any[]).find((s: any) => s.setting_key === 'vat_rate');
             if (vatSetting) {
                 setVatRate(parseFloat(vatSetting.setting_value) / 100);
             }
        }
      } catch (e) { console.error("Failed to load VAT rate", e); }

      await Promise.all([loadProducts(), loadInvoices(), loadFees()]);
      generateInvoiceNumber();
      setIsLoading(false);
    };
    init();
  }, [loadProducts, loadInvoices, generateInvoiceNumber, loadFees]);


  // Customer search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(customerSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchTerm, loadCustomers]);

  // Calculate subtotal
  useEffect(() => {
    if (!selectedProduct) {
      setSubtotal(0);
      return;
    }
    const qty = parseNumber(quantity);
    const price = parseNumber(unitPrice);
    let calcSubtotal = 0;
    if (unitType === "main") {
      calcSubtotal = qty * price * (selectedProduct.items_per_unit || 1);
    } else {
      calcSubtotal = qty * price;
    }
    setSubtotal(calcSubtotal);
  }, [quantity, unitPrice, unitType, selectedProduct]);

  // Update stock and price when product selected
  useEffect(() => {
    if (selectedProduct) {
      const cartItemEntries = invoiceItems.filter(
        (item) => item.product_id === selectedProduct.id
      );
      const cartQtyInSubUnits = cartItemEntries.reduce(
        (sum, item) => sum + item.total_sub_units,
        0
      );
      const availableStock = selectedProduct.stock_quantity - cartQtyInSubUnits;
      setItemStock(String(availableStock));

      // setUnitPrice(String(selectedProduct.unit_price)); // Removed to prevent overwriting calculation
      setQuantity("1");

      if (availableStock <= 0) {
        setQuantity("0");
      }
    } else {
      setItemStock("");
      setUnitPrice("");
      setQuantity("1");
    }
  }, [selectedProduct, invoiceItems]);



  const productOptions: SelectOption[] = products.map((p) => ({
    value: p.id,
    label: p.name,
    subtitle: `${p.stock_quantity} ${p.sub_unit_name || "حبة"}`,
    original: p,
  }));

  const customerOptions: SelectOption[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
    subtitle: c.phone || "",
    original: c,
  }));

  const handleProductSelect = (value: string | number | null, option: SelectOption | null) => {
    if (!option) {
      setSelectedProduct(null);
      return;
    }
    const product = option.original as Product;
    setSelectedProduct(product);
    
    // Calculate initial display price: (Cost + Margin) + Tax + Fees
    // Use weighted_average_cost if available as it is the system's true cost, otherwise fallback to unit_price or purchase_price
    const cost = Number(product.weighted_average_cost) || Number(product.unit_price) || 0;
    const margin = Number(product.minimum_profit_margin) || 0;
    const basePrice = cost + margin;
    
    // Set the display price (Final Price)
    const displayPrice = calculateSellingPrice(basePrice);
    
    // Store display price in the input for user to see/edit
    setUnitPrice(displayPrice.toFixed(2));
  };

  const handleCustomerSelect = (value: string | number | null, option: SelectOption | null) => {
    if (!option) {
      setSelectedCustomer(null);
      setCustomerSearchTerm("");
      return;
    }
    const customer = option.original as Customer;
    setSelectedCustomer(customer);
    setCustomerSearchTerm(customer.name);
  };

  const calculateSubtotal = () => {
    if (!selectedProduct) return;
    const qty = parseNumber(quantity);
    const price = parseNumber(unitPrice);
    let calcSubtotal = 0;
    if (unitType === "main") {
      calcSubtotal = qty * price * (selectedProduct.items_per_unit || 1);
    } else {
      calcSubtotal = qty * price;
    }
    setSubtotal(calcSubtotal);
  };

  const addItemToInvoice = async () => {
    if (!selectedProduct) {
      showAlert("alert-container", "يرجى اختيار منتج أولاً", "error");
      return;
    }

    const qty = parseNumber(quantity);
    const price = parseNumber(unitPrice);
    const itemsPerUnit = selectedProduct.items_per_unit || 1;
    const totalSubUnits = unitType === "main" ? qty * itemsPerUnit : qty;

    // Validate stock
    const cartItemEntries = invoiceItems.filter(
      (item) => item.product_id === selectedProduct.id
    );
    const cartQtyInSubUnits = cartItemEntries.reduce(
      (sum, item) => sum + item.total_sub_units,
      0
    );
    const totalQtyInSubUnits = cartQtyInSubUnits + totalSubUnits;

    if (qty <= 0 || totalQtyInSubUnits > selectedProduct.stock_quantity) {
      showAlert(
        "alert-container",
        `الكمية غير صحيحة. المخزون المتاح: ${selectedProduct.stock_quantity - cartQtyInSubUnits}`,
        "error"
      );
      return;
    }

    // Check minimum profit margin
    const costBasis = Number(selectedProduct.weighted_average_cost) || 0;
    const minProfitMargin = Number(selectedProduct.minimum_profit_margin) || 0;
    
    // We need to compare the "Base Price" (what we send to server) vs the "Minimum Price"
    const currentBasePrice = calculateBasePrice(price);
    const minAllowedBasePrice = costBasis + minProfitMargin;

    if (costBasis > 0 && currentBasePrice < minAllowedBasePrice) {
      const displayMinPrice = calculateSellingPrice(minAllowedBasePrice);
      const confirmMsg = `تحذير: السعر النهائي (${formatCurrency(price)}) أقل من الحد الأدنى المسموح به (${formatCurrency(displayMinPrice)}).\n(التكلفة: ${formatCurrency(costBasis)} + الهامش: ${formatCurrency(minProfitMargin)} + الرسوم والضريبة)\n\nهل تريد الاستمرار؟`;
      const confirmed = window.confirm(confirmMsg);
      if (!confirmed) {
        return;
      }
    }

    const calcSubtotal = unitType === "main" ? qty * price * itemsPerUnit : qty * price;
    const unitName = unitType === "main" ? selectedProduct.unit_name : selectedProduct.sub_unit_name;

    const newItem: InvoiceItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      display_name: `${selectedProduct.name} (${qty} ${unitName})`,
      quantity: qty,
      unit_type: unitType,
      unit_name: unitName,
      total_sub_units: totalSubUnits,
      unit_price: price,
      subtotal: calcSubtotal,
    };

    setInvoiceItems([...invoiceItems, newItem]);

    // Reset form
    setSelectedProduct(null);
    setQuantity("1");
    setUnitPrice("");
    setItemStock("");
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };


  const finishInvoice = async () => {
    if (invoiceItems.length === 0) {
      showAlert("alert-container", "الفاتورة فارغة!", "error");
      return;
    }

    if (!selectedCustomer) {
      showAlert("alert-container", "يرجى اختيار العميل للفاتورة الآجلة", "error");
      return;
    }

    try {
      const invoiceData = {
        invoice_number: invoiceNumber,
        items: invoiceItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.total_sub_units,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
        payment_type: "credit",
        customer_id: selectedCustomer.id,
        amount_paid: parseNumber(amountPaid),
        discount_amount: calculatedDiscount(),
        subtotal: baseItemsTotal,
      };

      // Convert prices back to Base Price (Cost+Margin) before sending
      // The backend expects unit_price to be the Taxable Base
      invoiceData.items = invoiceData.items.map(item => {
        // item.unit_price is the Display Price (Final)
        const basePrice = calculateBasePrice(item.unit_price);
        return {
            ...item,
            unit_price: Number(basePrice.toFixed(2)),
            subtotal: Number((basePrice * item.quantity).toFixed(2))
        };
      });

      // Ensure subtotal matches the items
      invoiceData.subtotal = invoiceData.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

      const response = await fetchAPI("invoices", {
        method: "POST",
        body: JSON.stringify(invoiceData),
      });

      if (response.success) {
        showAlert("alert-container", "تمت العملية بنجاح. جاري الطباعة...", "success");

        // Auto-print
        if (response.id) {
          try {
            await printInvoice(response.id as number);
          } catch (printError) {
            console.error("Print error:", printError);
          }
        }

        // Reset
        setInvoiceItems([]);
        setDiscountValue("0");
        setSelectedCustomer(null);
        setCustomerSearchTerm("");
        setAmountPaid("");
        generateInvoiceNumber();
        await loadProducts();
        await loadInvoices();
      } else {
        showAlert("alert-container", response.message || "فشل حفظ الفاتورة", "error");
        // Regenerate if it might be a duplicate number error
        if (response.message?.includes("UNIQUE") || response.message?.includes("exists") || response.message?.includes("موجود")) {
          generateInvoiceNumber();
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "خطأ غير معروف";
      showAlert("alert-container", "خطأ: " + msg, "error");
      if (msg.includes("UNIQUE") || msg.includes("exists") || msg.includes("موجود")) {
        generateInvoiceNumber();
      }
    }
  };

  const viewInvoice = async (id: number) => {
    try {
      const response = await fetchAPI(`invoice_details?id=${id}`);
      if (response.success && response.data) {
        setSelectedInvoice(response.data as Invoice);
        setViewDialog(true);
      }
    } catch {
      showAlert("alert-container", "خطأ في جلب التفاصيل", "error");
    }
  };

  const confirmDeleteInvoice = (id: number) => {
    setDeleteInvoiceId(id);
    setConfirmDialog(true);
  };

  const deleteInvoice = async () => {
    if (!deleteInvoiceId) return;

    const confirmed = window.confirm("هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إرجاع المنتجات للمخزون.");
    if (!confirmed) {
      setConfirmDialog(false);
      setDeleteInvoiceId(null);
      return;
    }

    try {
      const response = await fetchAPI(`invoices?id=${deleteInvoiceId}`, {
        method: "DELETE",
      });
      if (response.success) {
        showAlert("alert-container", "تم الحذف بنجاح", "success");
        await loadInvoices();
        await loadProducts();
      } else {
        showAlert("alert-container", response.message || "فشل الحذف", "error");
      }
    } catch {
      showAlert("alert-container", "خطأ في الحذف", "error");
    } finally {
      setConfirmDialog(false);
      setDeleteInvoiceId(null);
    }
  };

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: "invoice_number",
      header: "رقم الفاتورة",
      dataLabel: "رقم الفاتورة",
      render: (item) => (
        <>
          <strong>{item.invoice_number}</strong>{" "}
          <span className="badge badge-warning" style={{ fontSize: "0.7em" }}>
            آجل
          </span>
        </>
      ),
    },
    {
      key: "total_amount",
      header: "المبلغ الإجمالي",
      dataLabel: "المبلغ الإجمالي",
      render: (item) => formatCurrency(item.total_amount),
    },
    {
      key: "amount_paid",
      header: "المدفوع / المتبقي",
      dataLabel: "المدفوع / المتبقي",
      render: (item) => (
        <div style={{ fontSize: "0.85rem" }}>
          <span className="text-success">{formatCurrency(item.amount_paid || 0)}</span> /{" "}
          <span className="text-danger">
            {formatCurrency(item.total_amount - (item.amount_paid || 0))}
          </span>
        </div>
      ),
    },
    {
      key: "customer_name",
      header: "العميل",
      dataLabel: "العميل",
      render: (item) => item.customer_name || "-",
    },
    {
      key: "created_at",
      header: "التاريخ والوقت",
      dataLabel: "التاريخ والوقت",
      render: (item) => formatDateTime(item.created_at),
    },
    {
      key: "actions",
      header: "الإجراءات",
      dataLabel: "الإجراءات",
      render: (item) => {
        const hoursDiff = (new Date().getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60);
        const canDelete = hoursDiff < 48;
        return (
          <div className="action-buttons">
            <button className="icon-btn view" onClick={() => viewInvoice(item.id)} title="عرض">
              <Icon name="eye" />
            </button>
            {canDelete && canAccess(permissions, "sales", "delete") && (
              <button
                className="icon-btn delete"
                onClick={() => confirmDeleteInvoice(item.id)}
                title="حذف"
              >
                <Icon name="trash" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <MainLayout requiredModule="deferred_sales">
      <PageHeader title="المبيعات الآجلة (ذمم)" user={user} />

      <div id="alert-container"></div>

      <div className="sales-layout">
        <div className="sales-top-grids">
          {/* Left: Input Panels */}
          <div className="side-panel">
            <div className="sales-card compact animate-slide">
              <div className="card-header-flex" style={{ marginBottom: "1rem" }}>
                <h3 style={{ margin: 0 }}>إضافة منتجات</h3>
                <div className="invoice-badge">
                  <span className="stat-label">رقم الفاتورة:</span>
                  <input
                    type="text"
                    id="invoice-number"
                    value={invoiceNumber}
                    readOnly
                    className="minimal-input"
                  />
                </div>
              </div>

              <form
                id="invoice-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  addItemToInvoice();
                }}
              >
                <div className="form-group">
                  <label htmlFor="product-select">اختر المنتج *</label>
                  <SearchableSelect
                    id="product-select"
                    options={productOptions}
                    value={selectedProduct?.id || null}
                    onChange={handleProductSelect}
                    placeholder="ابحث عن منتج..."
                    required
                    filterOption={(opt, term) => 
                      opt.label.toLowerCase().includes(term.toLowerCase()) || 
                      (opt.original?.barcode && opt.original.barcode.includes(term))
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="item-unit-type">نوع الوحدة</label>
                    <select
                      id="item-unit-type"
                      value={unitType}
                      onChange={(e) => {
                        setUnitType(e.target.value as "sub" | "main");
                        calculateSubtotal();
                      }}
                      className="glass"
                    >
                      <option value="sub">{selectedProduct?.sub_unit_name || "حبة"}</option>
                      <option value="main">
                        {selectedProduct?.unit_name || "كرتون"} (
                        {selectedProduct?.items_per_unit || 1}{" "}
                        {selectedProduct?.sub_unit_name || "حبة"})
                      </option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="item-stock">المخزون المتوفر</label>
                    <input
                      type="text"
                      id="item-stock"
                      value={itemStock}
                      readOnly
                      className="glass highlight-input"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <NumberInput
                      id="item-quantity"
                      label="الكمية *"
                      min={1}
                      value={quantity}
                      onChange={(val) => setQuantity(val)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <NumberInput
                      id="item-unit-price"
                      label="سعر بيع الوحدة *"
                      min={0}
                      step={0.01}
                      value={unitPrice}
                      onChange={(val) => setUnitPrice(val)}
                      required
                    />
                  </div>
                </div>

                <div className="summary-stat-box" style={{ marginTop: "1rem" }}>
                  <div className="stat-item">
                    <span className="stat-label">المجموع الفرعي</span>
                    <span id="item-subtotal" className="stat-value highlight">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <button type="button" className="btn btn-primary btn-add" onClick={addItemToInvoice} data-icon="plus">
                    إضافة
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Customer Info & Current Invoice Items */}
          <div className="side-panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Card 1: Customer Info */}
            <div className="sales-card compact animate-slide">
              <h3>بيانات العميل</h3>
              <div className="form-row" style={{ marginTop: "1rem" }}>
                <div className="form-group">
                  <label htmlFor="customer-select">اختر العميل *</label>
                  <SearchableSelect
                    id="customer-select"
                    options={customerOptions}
                    value={selectedCustomer?.id || null}
                    onChange={handleCustomerSelect}
                    onSearch={(term) => setCustomerSearchTerm(term)}
                    placeholder="ابحث عن عميل..."
                    required
                    noResultsText={customerSearchTerm.length < 2 ? "اكتب حرفين على الأقل للبحث" : "لا يوجد عملاء"}
                  />
                </div>

                <div className="form-group">
                    <NumberInput
                      id="item-unit-price"
                      label="المبلغ المدفوع (نقدًا)"
                      min={0}
                      step={0.01}
                      value={amountPaid}
                      onChange={(val) => setAmountPaid(val)}
                      required
                    />
                </div>
              </div>
              <small style={{ color: "var(--text-light)", display: "block" }}>
                المبلغ الذي سيسدده العميل حالياً من قيمة الفاتورة
              </small>
            </div>

            {/* Card 3: Current Invoice Items */}
            <div className="sales-card animate-slide" style={{ animationDelay: "0.1s" }}>
              <h3>عناصر الفاتورة الحالية</h3>
              <div className="table-container" style={{ maxHeight: "430px", overflowY: "auto" }}>
                <table id="invoice-items-table">
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>الكمية</th>
                      <th>السعر</th>
                      <th>المجموع</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="invoice-items-tbody">
                    {invoiceItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          لا توجد عناصر مضافة
                        </td>
                      </tr>
                    ) : (
                      invoiceItems.map((item, index) => (
                        <tr key={index} className="animate-slide-up">
                          <td data-label="المنتج">{item.display_name}</td>
                          <td data-label="الكمية">
                            {item.quantity} {item.unit_name}
                          </td>
                          <td data-label="السعر">{formatCurrency(item.unit_price)}</td>
                          <td data-label="المجموع">{formatCurrency(item.subtotal)}</td>
                          <td data-label="الإجراءات">
                            <button className="icon-btn delete" onClick={() => removeInvoiceItem(index)}>
                              <Icon name="trash" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

                <div className="invoice-adjustments">
                  <div className="discount-section">
                    <div className="form-group" style={{ marginBottom: 0, width: '200px' }}>
                        <NumberInput
                            id="invoice-discount"
                            label="قيمة الخصم"
                            value={discountValue}
                            onChange={(val) => setDiscountValue(val)}
                            min={0}
                            placeholder="0.00"
                        />
                    </div>
                    
                    <SegmentedToggle
                        label="نوع التخفيض"
                        value={discountType}
                        onChange={(val) => setDiscountType(val as "fixed" | "percent")}
                        options={[
                            { value: "fixed", label: "مبلغ" },
                            { value: "percent", label: "نسبة" }
                        ]}
                    />
                  </div>

                  {calculatedDiscount() > 0 && (
                    <div className="summary-stat animate-fade" style={{ marginRight: 'auto', borderRight: '1px solid var(--border-color)', paddingRight: '1.5rem' }}>
                        <span className="stat-label">إجمالي الخصم</span>
                        <span className="stat-value text-danger" style={{ fontSize: '1.1rem' }}>
                            -{formatCurrency(calculatedDiscount())}
                        </span>
                    </div>
                  )}
                </div>

              <div className="sales-summary-bar">
                <div className="summary-stat">
                  <span className="stat-label">مجموع المنتجات</span>
                  <span className="stat-value">{formatCurrency(baseItemsTotal)}</span>
                </div>

                {/* Show EACH government fee specifically */}
                {governmentFees.map((fee) => {
                    const feeAmount = invoiceItems.reduce((sum, item) => {
                        const base = calculateBasePrice(item.unit_price);
                        const variable = (base * (Number(fee.percentage) || 0) / 100);
                        const fixed = (Number(fee.fixed_amount) || 0);
                        return sum + (variable + fixed) * item.quantity;
                    }, 0);

                    if (feeAmount <= 0) return null;

                    return (
                        <div className="summary-stat" key={fee.id}>
                            <span className="stat-label">{fee.name} (التزام)</span>
                            <span className="stat-value">{formatCurrency(feeAmount)}</span>
                        </div>
                    );
                })}
                
                {totalVAT > 0 && (
                    <div className="summary-stat">
                        <span className="stat-label">ضريبة القيمة المضافة ({ (vatRate * 100).toFixed(0) }%)</span>
                        <span className="stat-value">{formatCurrency(totalVAT)}</span>
                    </div>
                )}

                <div className="summary-stat">
                  <span className="stat-label">المبلغ الإجمالي</span>
                  <span id="total-amount" className="stat-value highlight">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-add"
                  onClick={finishInvoice}
                  id="finish-btn"
                  data-icon="check"
                >
                  حفظ الفاتورة
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Invoice History */}
        <div className="sales-card animate-slide" style={{ animationDelay: "0.2s" }}>
          <h3>سجل الفواتير السابقة</h3>
          <div className="table-container">
            <div className="table-wrapper">
              <Table
                columns={invoiceColumns}
                data={invoices}
                keyExtractor={(item) => item.id}
                emptyMessage="لا توجد فواتير سابقة"
                isLoading={isLoading}
                pagination={{
                  currentPage,
                  totalPages,
                  onPageChange: loadInvoices,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* View Invoice Dialog */}
      <Dialog
        isOpen={viewDialog}
        onClose={() => setViewDialog(false)}
        title="تفاصيل الفاتورة"
      >
        {selectedInvoice && (
          <div id="view-dialog-body">
            <div
              className="invoice-details-header"
              style={{
                marginBottom: "2rem",
                borderBottom: "2px solid var(--border-color)",
                paddingBottom: "1rem",
              }}
            >
              <div className="form-row">
                <div className="summary-stat">
                  <span className="stat-label">رقم الفاتورة</span>
                  <span className="stat-value">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">التاريخ</span>
                  <span className="stat-value">{formatDateTime(selectedInvoice.created_at)}</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">نوع الدفع</span>
                  <span className="stat-value">
                    <span className="badge badge-warning">آجل (ذمم)</span>
                  </span>
                </div>
              </div>
              {selectedInvoice.customer_name && (
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
                    <span className="stat-label">العميل</span>
                    <span className="stat-value">{selectedInvoice.customer_name}</span>
                  </div>
                  {selectedInvoice.customer_phone && (
                    <div className="summary-stat">
                      <span className="stat-label">الهاتف</span>
                      <span className="stat-value">{selectedInvoice.customer_phone}</span>
                    </div>
                  )}
                  {selectedInvoice.customer_tax && (
                    <div className="summary-stat">
                      <span className="stat-label">الرقم الضريبي</span>
                      <span className="stat-value">{selectedInvoice.customer_tax}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="form-row" style={{ marginTop: "1rem" }}>
                <div className="summary-stat">
                  <span className="stat-label">المبلغ المدفوع</span>
                  <span className="stat-value" style={{ color: "var(--success-color)" }}>
                    {formatCurrency(selectedInvoice.amount_paid || 0)}
                  </span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">المبلغ المتبقي</span>
                  <span className="stat-value" style={{ color: "var(--danger-color)", fontWeight: 700 }}>
                    {formatCurrency(selectedInvoice.total_amount - (selectedInvoice.amount_paid || 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="invoice-items-minimal">
              <h4 style={{ marginBottom: "1rem" }}>المنتجات المباعة:</h4>
              {selectedInvoice.items?.map((item, index) => (
                <div key={index} className="item-row-minimal" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderBottom: "1px solid var(--border-color)" }}>
                    <div className="item-info-pkg">
                        <span className="item-name-pkg" style={{ display: "block", fontWeight: "600" }}>{item.product_name}</span>
                        <span className="item-meta-pkg" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>سعر الوحدة: {formatCurrency(item.unit_price)}</span>
                    </div>
                    <div className="item-info-pkg" style={{ textAlign: "left" }}>
                        <span className="item-name-pkg" style={{ display: "block", fontWeight: "600" }}>{formatCurrency(item.subtotal)}</span>
                        <span className="item-meta-pkg" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>الكمية: {item.quantity}</span>
                    </div>
                </div>
              ))}
            </div>

            <div
              className="sales-summary-bar"
              style={{ marginTop: "2rem", background: "var(--grad-primary)", color: "white" }}
            >
              <div className="summary-stat">
                <span className="stat-label" style={{ color: "rgba(255,255,255,0.8)" }}>عدد الأصناف</span>
                <span className="stat-value" style={{ color: "white", fontSize: "1.2rem" }}>
                    {selectedInvoice.item_count || 0}
                </span>
              </div>
              <div className="summary-stat">
                <span className="stat-label" style={{ color: "rgba(255,255,255,0.8)" }}>المجموع الفرعي</span>
                <span className="stat-value" style={{ color: "white", fontSize: "1.2rem" }}>
                    {formatCurrency(selectedInvoice.subtotal || 0)}
                </span>
              </div>
              {selectedInvoice.discount_amount && selectedInvoice.discount_amount > 0 && (
                <div className="summary-stat">
                    <span className="stat-label" style={{ color: "rgba(255,255,255,0.8)" }}>الخصم</span>
                    <span className="stat-value" style={{ color: "#ffccd5", fontSize: "1.2rem" }}>
                        -{formatCurrency(selectedInvoice.discount_amount)}
                    </span>
                </div>
              )}
              <div className="summary-stat">
                <span className="stat-label" style={{ color: "rgba(255,255,255,0.8)" }}>الإجمالي</span>
                <span className="stat-value highlight" style={{ color: "white" }}>
                    {formatCurrency(selectedInvoice.total_amount)}
                </span>
              </div>
              <button
                type="button"
                className="btn"
                style={{ background: "white", color: "var(--primary-color)" }}
                onClick={async () => {
                  if (selectedInvoice.id) {
                    try {
                      await printInvoice(selectedInvoice.id);
                    } catch (error) {
                      console.error("Print error:", error);
                    }
                  }
                }}
              >
                <Icon name="print" /> طباعة نسخة
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog}
        onClose={() => {
          setConfirmDialog(false);
          setDeleteInvoiceId(null);
        }}
        onConfirm={deleteInvoice}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إرجاع المنتجات للمخزون."
        confirmText="نعم، متابعة"
        confirmVariant="primary"
      />
    </MainLayout>
  );
}
