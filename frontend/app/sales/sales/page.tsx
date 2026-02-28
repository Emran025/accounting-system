"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MainLayout } from "@/components/layout";
import { Table, Dialog, ConfirmDialog, Column, showAlert, NumberInput, SearchableSelect, SelectOption, showToast, SegmentedToggle, SelectableInvoiceTable, SalesReturnDialog, SelectedItem, SelectableInvoiceItem as UiInvoiceItem, InvoiceTableColumn, SelectableInvoice, ReturnData, Label } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatCurrency, formatDateTime, parseNumber } from "@/lib/utils";
import { User, getStoredUser, getStoredPermissions, Permission, checkAuth } from "@/lib/auth";
import { Icon } from "@/lib/icons";
import { printInvoice } from "@/lib/invoice-utils";
import { Currency } from "../../finance/currency/types";
import { PaginatedResponse } from "@/lib/types";

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

interface Pagination {
    total_records: number;
    total_pages: number;
    current_page: number;
}
interface Invoice {
    id: number;
    invoice_number: string;
    voucher_number?: string;
    total_amount: number;
    item_count?: number;
    salesperson_name?: string;
    created_at: string;
    items?: any[];
    payment_type: string;
    discount_amount: number;
    subtotal: number;
    vat_amount: number;
    vat_rate?: number;
    amount_paid?: number;
    customer_name?: string;
    customer_phone?: string;
    customer_tax?: string;
    customer?: { id: number; name: string };
}

export default function SalesPage() {
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);

    // Currency
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);

    // Government Fees
    const [governmentFees, setGovernmentFees] = useState<GovernmentFee[]>([]);

    // Products
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Customer
    const [selectedCustomer, setSelectedCustomer] = useState<{ id: number, name: string } | null>(null);

    // Sales Representative
    const [salesRepresentatives, setSalesRepresentatives] = useState<any[]>([]);
    const [selectedRepresentative, setSelectedRepresentative] = useState<{ id: number, name: string } | null>(null);

    // Invoice form
    const [quantity, setQuantity] = useState("1");
    const [unitType, setUnitType] = useState<"sub" | "main">("sub");
    const [unitPrice, setUnitPrice] = useState("");
    const [itemStock, setItemStock] = useState("");
    const [subtotal, setSubtotal] = useState(0);
    const [discountValue, setDiscountValue] = useState("0");

    const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
    const [vatRate, setVatRate] = useState(0.0); // Default 0%
    // fallback, will be updated from API

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

    // Returns
    const [returnDialog, setReturnDialog] = useState(false);
    const [selectedReturnItems, setSelectedReturnItems] = useState<SelectedItem[]>([]);
    const [invoicesMap, setInvoicesMap] = useState<Record<number, SelectableInvoice>>({});
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

    const [isLoading, setIsLoading] = useState(true);

    // Pricing Helpers
    const calculateSellingPrice = (basePrice: number) => {
        // basePrice is the Taxable amount (e.g. Price before fees/VAT)
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
        return sum + (basePrice * item.total_sub_units);
    }, 0);

    const totalVAT = baseItemsTotal * vatRate;

    const totalFees = invoiceItems.reduce((sum, item) => {
        const base = calculateBasePrice(item.unit_price);
        const feesPercentage = governmentFees.reduce((s, f) => s + (Number(f.percentage) || 0), 0) / 100;
        const fixedFees = governmentFees.reduce((s, f) => s + (Number(f.fixed_amount) || 0), 0);
        return sum + (base * feesPercentage + fixedFees) * item.total_sub_units;
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
            const response: any = await fetchAPI(API_ENDPOINTS.SYSTEM.TAX_ENGINE.SETUP);
            if (response.data && response.data.authorities) {
                const activeFees: any[] = [];
                response.data.authorities.forEach((auth: any) => {
                    if (auth.tax_types) {
                        auth.tax_types.forEach((type: any) => {
                            let areas = [];
                            try { areas = typeof type.applicable_areas === 'string' ? JSON.parse(type.applicable_areas) : type.applicable_areas; } catch { }

                            // Map Tax Engine rules to old fees model if it applies to sales
                            if (type.is_active && type.code !== 'VAT' && (areas.includes('sales') || areas.length === 0)) {
                                const defaultRate = type.tax_rates?.find((r: any) => r.is_default) || type.tax_rates?.[0];
                                activeFees.push({
                                    id: type.id,
                                    name: type.name,
                                    percentage: defaultRate?.rate ? defaultRate.rate * 100 : 0,
                                    fixed_amount: defaultRate?.fixed_amount || 0,
                                    is_active: type.is_active,
                                    calculation_type: type.calculation_type
                                });
                            }
                        });
                    }
                });
                setGovernmentFees(activeFees);
            }
        } catch (e) {
            console.error("Failed to load tax engine logic", e);
        }
    }, []);

    const loadProducts = useCallback(async () => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.INVENTORY.PRODUCTS}?include_purchase_price=1`);
            if (response.success && response.data) {
                const filtered = (response.data as Product[]).filter((p) => p.stock_quantity > 0);
                setProducts(filtered);
            }
        } catch (error) {
            showAlert("alert-container", "خطأ في تحميل المنتجات", "error");
        }
    }, []);

    const loadRepresentatives = useCallback(async () => {
        try {
            const response = await fetchAPI(API_ENDPOINTS.SALES.REPRESENTATIVES.BASE + "?per_page=1000");
            if (response.success && response.data) {
                const repData = (response.data as any).data || response.data;
                setSalesRepresentatives(repData);
            }
        } catch (error) {
            console.error("Failed to load representatives", error);
        }
    }, []);

    const loadInvoices = useCallback(async (page: number = 1) => {
        try {
            setIsLoading(true);
            const response = await fetchAPI(`${API_ENDPOINTS.SALES.INVOICES}?page=${page}&limit=${itemsPerPage}`);
            if (response.success && response.data && response.pagination) {
                // Type narrowing: response has data and pagination, so it's safe to cast
                const typedResponse = response as unknown as PaginatedResponse<Invoice>;
                setInvoices(typedResponse.data);
                setTotalPages(typedResponse.pagination.total_pages || 1);
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
            if (!authenticated || !authenticated.isAuthenticated) return;

            const storedUser = getStoredUser();
            const storedPermissions = getStoredPermissions();
            setUser(storedUser);
            setPermissions(storedPermissions);

            // Load currencies
            try {
                const res = await fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.BASE);
                if (res.success) {
                    const list = res.data as Currency[];
                    const activeList = list.filter(c => c.is_active);
                    setCurrencies(activeList);
                    const primary = activeList.find(c => c.is_primary);
                    if (primary) setSelectedCurrency(primary);
                }

            } catch (e) { console.error(e); }

            // Load Settings (VAT Rate)
            try {
                const settingsRes = await fetchAPI(API_ENDPOINTS.SYSTEM.SETTINGS.INDEX);
                if (settingsRes.success && settingsRes.data) {
                    const vatSetting = (settingsRes.data as any[]).find((s: any) => s.setting_key === 'vat_rate');
                    if (vatSetting) {
                        setVatRate(parseFloat(vatSetting.setting_value) / 100);
                    }
                }
            } catch (e) { console.error("Failed to load VAT rate", e); }



            await Promise.all([loadProducts(), loadInvoices(), loadFees(), loadRepresentatives()]);
            generateInvoiceNumber();
            setIsLoading(false);
        };
        init();
    }, [loadProducts, loadInvoices, generateInvoiceNumber, loadFees, loadRepresentatives]);


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

            // Price is set in handleProductSelect or maintained if editing
            // setUnitPrice(String(selectedProduct.unit_price)); // Removed to prevent overwriting calculation
            if (quantity === "1" && !unitPrice) {
                // Fallback if needed
            }

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

    const handleProductSelect = (value: string | number | null, option: SelectOption | null) => {
        if (!option) {
            setSelectedProduct(null);
            return;
        }
        const product = option.original as Product;
        setSelectedProduct(product);

        // Calculate initial display price: Base Price + Tax + Fees
        // Base Price is the starting price for calculation (Cost + Margin)
        const cost = Number(product.weighted_average_cost) || Number(product.unit_price) || 0;
        const margin = Number(product.minimum_profit_margin) || 0;
        const basePrice = cost + margin;

        // Set the display price (Final Price)
        const displayPrice = calculateSellingPrice(basePrice);

        // Store display price in the input for user to see/edit
        setUnitPrice(displayPrice.toFixed(2));
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
        const costBasis = parseNumber(selectedProduct.weighted_average_cost) || parseNumber(selectedProduct.latest_purchase_price);
        // We need to compare the "Base Price" (what we send to server) vs the "Minimum Price"
        const currentBasePrice = calculateBasePrice(price);
        const minProfitMargin = parseNumber(selectedProduct.minimum_profit_margin);
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

        try {
            const invoiceData = {
                invoice_number: invoiceNumber,
                currency_id: selectedCurrency?.id,
                exchange_rate: selectedCurrency?.exchange_rate,
                items: invoiceItems.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                    unit_type: item.unit_type,
                })),
                discount_amount: calculatedDiscount(),
                subtotal: baseItemsTotal,
                payment_type: 'cash',
                customer_id: selectedCustomer?.id,
                sales_representative_id: selectedRepresentative?.id,
                // Note: VAT rate is enforced server-side from config, not sent by client
            };

            // Convert prices back to Base Price (Cost+Margin) before sending
            // The backend expects unit_price to be the Taxable Base
            invoiceData.items = invoiceData.items.map(item => {
                // item.unit_price is the Display Price (Final)
                const basePrice = calculateBasePrice(item.unit_price);
                return {
                    ...item,
                    unit_price: Number(basePrice.toFixed(2)), // Round to 2 decimals for consistency
                    subtotal: Number((basePrice * item.quantity).toFixed(2)) // Recalculate subtotal based on base logic if needed by backend, though backend usually ignores subtotal
                };
            });

            // Recalculate total discount if it's percentage based, applied to the new subtotal?
            // Actually, calculatedDiscount() depends on itemsTotal (sum of subtotals).
            // If we change items to Base Price, the itemsTotal decreases.
            // The backend likely calculates the total from items.
            // We should trust the backend calculation. We just send the items with Base Price.

            // Ensure subtotal matches the items
            invoiceData.subtotal = invoiceData.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

            const response = await fetchAPI(API_ENDPOINTS.SALES.INVOICES, {
                method: "POST",
                body: JSON.stringify(invoiceData),
            });

            if (response.success) {
                showAlert("alert-container", "تمت العملية بنجاح. جاري الطباعة... (الإجمالي: " + formatCurrency(finalTotal) + ")", "success");

                // Submit to ZATCA if enabled (Backend handles feature flag check)
                if (response.id) {
                    try {
                        // We await this so the QR code is generated before printing
                        const zatcaRes = await fetchAPI(API_ENDPOINTS.SALES.ZATCA.SUBMIT(response.id as number), { method: "POST" });
                        if (zatcaRes.success) {
                            console.log("ZATCA Submitted", zatcaRes);
                        } else if (zatcaRes.status === 'skipped') {
                            // ZATCA disabled or not applicable
                        } else {
                            console.warn("ZATCA Submission Failed", zatcaRes);
                            showToast("تحذير: لم يتم إرسال الفاتورة لهيئة الزكاة", "warning");
                        }
                    } catch (zError) {
                        console.error("ZATCA Error:", zError);
                    }

                    // Auto-print
                    try {
                        await printInvoice(response.id as number);
                    } catch (printError) {
                        console.error("Print error:", printError);
                    }
                }

                // Reset
                setInvoiceItems([]);
                setDiscountValue("0");
                generateInvoiceNumber();
                setSelectedCustomer(null);
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
            const response = await fetchAPI(`${API_ENDPOINTS.SALES.INVOICE_DETAILS}?id=${id}`);
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
            const response = await fetchAPI(`${API_ENDPOINTS.SALES.INVOICES}?id=${deleteInvoiceId}`, {
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

    // Helper to fetch invoice items for the selectable table
    const getInvoiceItemsForTable = useCallback(async (invoice: Invoice): Promise<UiInvoiceItem[]> => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.SALES.INVOICE_DETAILS}?id=${invoice.id}`);
            if (response.success && response.data) {
                const detailedInvoice = response.data as any;
                // Map API items to UI items
                return detailedInvoice.items.map((item: any) => ({
                    id: item.id,
                    product_id: item.product_id,
                    product: { name: item.product?.name || item.product_name },
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                    unit_type: item.unit_type || 'main'
                }));
            }
            return [];
        } catch (error) {
            console.error("Error fetching items:", error);
            return [];
        }
    }, []);

    const handleReturnSelection = useCallback((items: SelectedItem[]) => {
        setSelectedReturnItems(items);
    }, []);

    const openReturnDialog = async () => {
        if (selectedReturnItems.length === 0) {
            showToast("يرجى تحديد عناصر للإرجاع أولاً", "warning");
            return;
        }

        // Fetch missing invoice details for calculation
        const uniqueInvoiceIds = Array.from(new Set(selectedReturnItems.map(i => i.invoiceId)));
        const missingIds = uniqueInvoiceIds.filter(id => !invoicesMap[id]);

        if (missingIds.length > 0) {
            setIsLoadingInvoices(true);
            try {
                const newMap = { ...invoicesMap };
                await Promise.all(missingIds.map(async (id) => {
                    const res = await fetchAPI(`${API_ENDPOINTS.SALES.INVOICE_DETAILS}?id=${id}`);
                    if (res.success && res.data) {
                        newMap[id] = res.data as SelectableInvoice;
                    }
                }));
                setInvoicesMap(newMap);
            } catch (error) {
                console.error("Failed to load invoice details", error);
                showToast("فشل تحميل بيانات الفواتير", "error");
            } finally {
                setIsLoadingInvoices(false);
            }
        }

        setReturnDialog(true);
    };

    const handleConfirmReturn = async (data: ReturnData | ReturnData[]) => {
        const dataArray = Array.isArray(data) ? data : [data];

        try {
            for (const returnData of dataArray) {
                const response = await fetchAPI(API_ENDPOINTS.SALES.RETURNS.BASE, {
                    method: "POST",
                    body: JSON.stringify(returnData),
                });

                if (!response.success) {
                    throw new Error(response.message || "فشل تسجيل المرتجع");
                }
            }

            showToast("تم تسجيل المرتجع بنجاح", "success");
        } catch (error: any) {
            showToast(error.message || "خطأ في تسجيل المرتجع", "error");
            throw error;
        }
    };

    const invoiceColumns: InvoiceTableColumn<Invoice>[] = [
        {
            key: "invoice_number",
            header: "رقم الفاتورة",
            dataLabel: "رقم الفاتورة",
            render: (item) => <strong>{item.invoice_number}</strong>,
        },
        {
            key: "total_amount",
            header: "المبلغ الإجمالي",
            dataLabel: "المبلغ الإجمالي",
            render: (item) => formatCurrency(item.total_amount),
        },
        {
            key: "item_count",
            header: "عدد العناصر",
            dataLabel: "عدد العناصر",
            render: (item) => item.item_count || 0,
        },
        {
            key: "created_at",
            header: "التاريخ والوقت",
            dataLabel: "التاريخ والوقت",
            render: (item) => formatDateTime(item.created_at),
        },
        {
            key: "salesperson_name",
            header: "البائع",
            dataLabel: "البائع",
            render: (item) => (
                <span className="badge badge-secondary">{item.salesperson_name || "النظام"}</span>
            ),
        },
        {
            key: "actions",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => {
                return (
                    <div className="action-buttons">
                        <button className="icon-btn view" onClick={() => viewInvoice(item.id)} title="عرض">
                            <Icon name="eye" />
                        </button>
                    </div>
                );
            },
        },
    ];

    const currentInvoiceColumns: Column<InvoiceItem>[] = [
        {
            key: "display_name",
            header: "المنتج",
            dataLabel: "المنتج",
        },
        {
            key: "quantity",
            header: "الكمية",
            dataLabel: "الكمية",
            render: (item) => `${item.quantity} ${item.unit_name}`,
        },
        {
            key: "unit_price",
            header: "السعر",
            dataLabel: "السعر",
            render: (item) => formatCurrency(item.unit_price),
        },
        {
            key: "subtotal",
            header: "المجموع",
            dataLabel: "المجموع",
            render: (item) => formatCurrency(item.subtotal),
        },
        {
            key: "actions",
            header: "",
            dataLabel: "الإجراءات",
            render: (_, index) => (
                <button className="icon-btn delete" onClick={() => removeInvoiceItem(index)}>
                    <Icon name="trash" />
                </button>
            ),
        },
    ];

    return (
        <MainLayout>

            <div id="alert-container"></div>

            <div className="sales-layout">
                <div className="sales-top-grids">
                    {/* Left: Input Form */}
                    <div className="sales-card compact animate-slide">
                        <div className="card-header-flex">
                            <h3> المبيعات / الفواتير</h3>
                            <div className="invoice-badge-group" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                                            {selectedProduct?.items_per_unit || 1} {selectedProduct?.sub_unit_name || "حبة"})
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

                            <div className="summary-stat-box">
                                <div className="stat-item">
                                    <span className="stat-label">المجموع الفرعي</span>
                                    <span id="item-subtotal" className="stat-value highlight">
                                        {formatCurrency(subtotal)}
                                    </span>
                                </div>
                                <button type="button" className="btn btn-primary btn-add" onClick={addItemToInvoice} data-icon="plus">
                                    إضافة للفاتورة
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right: Current Invoice Items */}
                    <div className="sales-card animate-slide" style={{ animationDelay: "0.1s" }}>
                        <h3>عناصر الفاتورة الحالية</h3>
                        <div className="current-invoice-table">
                            <Table
                                columns={currentInvoiceColumns}
                                data={invoiceItems}
                                keyExtractor={(_, index) => index}
                                emptyMessage="لا توجد عناصر مضافة"
                            />
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

                                <div className="form-group" style={{ marginBottom: 0, minWidth: '250px' }}>
                                    <Label title="المندوب (اختياري)" />
                                    <SearchableSelect

                                        options={salesRepresentatives.map((r) => ({
                                            value: r.id,
                                            label: r.name,
                                            subtitle: r.phone || "بدون هاتف"
                                        }))}
                                        value={selectedRepresentative?.id || ""}
                                        onChange={(val, opt) => {
                                            setSelectedRepresentative(opt ? { id: Number(opt.value), name: opt.label } : null);
                                        }}
                                        placeholder="اختر المندوب..."
                                    />
                                </div>
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
                                    <span className="stat-label">ضريبة القيمة المضافة ({(vatRate * 100).toFixed(0)}%)</span>
                                    <span className="stat-value">{formatCurrency(totalVAT)}</span>
                                </div>
                            )}

                            <div className="summary-stat">
                                <span className="stat-label">إجمالي الفاتورة</span>
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
                                disabled={invoiceItems.length === 0}
                            >
                                إنهاء الفاتورة
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Invoice History */}
                <div className="sales-card animate-slide" style={{ animationDelay: "0.2s" }}>
                    <h3>سجل الفواتير السابقة</h3>
                    <div className="table-container">
                        <div className="table-wrapper">
                            <SelectableInvoiceTable
                                invoices={invoices}
                                columns={invoiceColumns}
                                keyExtractor={(item) => item.id}
                                emptyMessage="لا توجد فواتير سابقة"
                                isLoading={isLoading}
                                pagination={{
                                    currentPage,
                                    totalPages,
                                    onPageChange: loadInvoices,
                                }}
                                getInvoiceItems={getInvoiceItemsForTable}
                                onSelectionChange={handleReturnSelection}
                                onSearch={(q) => {
                                    // Implement local filter or server search if needed
                                    // currently loadInvoices doesn't utilize this directly in the simple implementation
                                    // assuming loadInvoices uses a state or we can just ignore if we want simple table filtering
                                }}
                                openReturnDialog={openReturnDialog}

                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Return Dialog */}
            <SalesReturnDialog
                isOpen={returnDialog}
                onClose={() => setReturnDialog(false)}
                selectedItems={selectedReturnItems}
                invoicesMap={invoicesMap}
                onConfirmReturn={handleConfirmReturn}
                onSuccess={() => {
                    setReturnDialog(false);
                    setSelectedReturnItems([]);
                    loadInvoices(currentPage);
                    loadProducts();
                }}
            />

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
                                        <span className="badge badge-success">نقدي</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="invoice-items-minimal">
                            <h4 style={{ marginBottom: "1rem" }}>المنتجات المباعة:</h4>
                            {selectedInvoice.items?.map((item, index) => (
                                <div key={index} className="item-row-minimal" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderBottom: "1px solid var(--border-color)", opacity: item.quantity === 0 ? 0.6 : 1 }}>
                                    <div className="item-info-pkg">
                                        <span className="item-name-pkg" style={{ display: "block", fontWeight: "600", textDecoration: item.quantity === 0 ? 'line-through' : 'none' }}>{item.product_name}</span>
                                        <span className="item-meta-pkg" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                            سعر الوحدة: {formatCurrency(item.unit_price)}
                                            {item.returned_quantity > 0 && (
                                                <span style={{ color: item.quantity === 0 ? 'var(--danger-color)' : 'var(--warning-color)', marginRight: '8px' }}>
                                                    {item.quantity === 0 ? '(مسترجع بالكامل)' : `(مسترجع: ${item.returned_quantity})`}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="item-info-pkg" style={{ textAlign: "left" }}>
                                        <span className="item-name-pkg" style={{ display: "block", fontWeight: "600" }}>{formatCurrency(item.unit_price * item.quantity)}</span>
                                        <span className="item-meta-pkg" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                            {item.quantity} {item.quantity !== item.original_quantity && `(من ${item.original_quantity})`}
                                        </span>
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
