"use client";

import { useState, useRef, useCallback, ReactNode, useEffect } from "react";
import { ExpandableTable, Column as ExpandableColumn } from "./ExpandableTable";
import { SelectableTable, SelectableColumn } from "./SelectableTable";
import { SearchableSelect, SelectOption } from "./SearchableSelect";
import { Icon } from "@/lib/icons";

// Re-export types for consumers
export type { ExpandableColumn as InvoiceTableColumn }; 

// Types
export interface InvoiceItem {
  id: number;
  product_id: number;
  product?: { name: string; barcode?: string };
  quantity: number;
  unit_price: number;
  subtotal: number;
  unit_type: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  total_amount: number;
  subtotal: number;
  vat_amount: number;
  discount_amount: number;
  payment_type: string;
  customer?: { id: number; name: string };
  items?: InvoiceItem[];
  items_count?: number;
  created_at: string;
}

export interface SelectedItem {
  invoiceId: number;
  invoiceItemId: number;
  quantity: number;
  maxQuantity: number;
  productName: string;
  unitPrice: number;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface SelectableInvoiceTableProps<T extends Invoice> {
  invoices: T[];
  columns: ExpandableColumn<T>[];
  keyExtractor: (item: T) => string | number;
  onSelectionChange: (selectedItems: SelectedItem[]) => void;
  onSearch: (query: string) => void;
  searchPlaceholder?: string;
  isLoading?: boolean;
  pagination?: PaginationProps;
  getInvoiceItems: (invoice: T) => Promise<InvoiceItem[]> | InvoiceItem[];
  emptyMessage?: string;
}

export function SelectableInvoiceTable<T extends Invoice>({
  invoices,
  columns,
  keyExtractor,
  onSelectionChange,
  onSearch,
  searchPlaceholder = "بحث برقم الفاتورة...",
  isLoading = false,
  pagination,
  getInvoiceItems,
  emptyMessage = "لا توجد فواتير",
}: SelectableInvoiceTableProps<T>) {
  // State
  const [invoiceItems, setInvoiceItems] = useState<Record<number, InvoiceItem[]>>({});
  const [loadingItems, setLoadingItems] = useState<Record<number, boolean>>({});
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredInvoices, setFilteredInvoices] = useState<T[]>(invoices);

  // Filter invoices when search changes or invoices update
  useEffect(() => {
    if (!searchQuery) {
      setFilteredInvoices(invoices);
    } else {
      setFilteredInvoices(invoices.filter(inv => 
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    }
  }, [searchQuery, invoices]);


  // Current invoice being selected from
  const currentInvoiceId = selectedItems.length > 0 ? selectedItems[0].invoiceId : null;

  // Search Handler
  const handleSearchChange = (value: string | number | null, option: SelectOption | null) => {
    const query = option ? option.label : "";
    setSearchQuery(query);
    onSearch(query);
  };

  // Convert invoices to options for SearchableSelect
  const searchOptions: SelectOption[] = invoices.map(inv => ({
    value: inv.id,
    label: inv.invoice_number,
    subtitle: `الإجمالي: ${inv.total_amount.toFixed(2)}`
  }));

  // Fetch items when expanding
  const handleExpand = async (invoice: T, isExpanded: boolean) => {
    if (isExpanded && !invoiceItems[invoice.id] && !loadingItems[invoice.id]) {
        setLoadingItems(prev => ({ ...prev, [invoice.id]: true }));
        try {
            const items = await getInvoiceItems(invoice);
            setInvoiceItems(prev => ({ ...prev, [invoice.id]: items }));
        } catch (error) {
            console.error("Failed to load items", error);
        } finally {
            setLoadingItems(prev => ({ ...prev, [invoice.id]: false }));
        }
    }
  };

  // Handle Inner Table Selection
  const handleItemSelectionChange = (selectedIds: (string | number)[], invoiceId: number) => {
    // Enforce Single Invoice Constraint
    if (currentInvoiceId && currentInvoiceId !== invoiceId && selectedIds.length > 0) {
        // If user tries to select from another invoice while one is active
        // Ideally we should alert or reset. 
        // For now, we'll reset previous selection if they explicitly interact with a new table?
        // But the constraint is "Single invoice". Better to prevent or warn.
        // Actually, let's allow switching invoice by clearing previous selection implicitly IF they explicitly select here.
        // But user might lose work. 
        // User logic: "returns to unselected state" complaint implies they want stable selection.
        // I will clear previous selection and start new if different invoice.
        // Or strictly enforce.
        if (!confirm("هل تريد إلغاء تحديد العناصر من الفاتورة السابقة والبدء في هذه؟")) {
            return;
        }
    }

    const items = invoiceItems[invoiceId] || [];
    const newSelectedItems: SelectedItem[] = items
        .filter(item => selectedIds.includes(item.id))
        .map(item => ({
            invoiceId,
            invoiceItemId: item.id,
            quantity: item.quantity,
            maxQuantity: item.quantity,
            productName: item.product?.name || `منتج #${item.product_id}`,
            unitPrice: item.unit_price,
        }));

    setSelectedItems(newSelectedItems);
    setSelectionMode(newSelectedItems.length > 0);
    onSelectionChange(newSelectedItems);
  };

  // Inner Columns definition
  const itemColumns: SelectableColumn<InvoiceItem>[] = [
    { key: "product_name", header: "المنتج", render: (item) => item.product?.name || item.product_id },
    { key: "quantity", header: "الكمية" },
    { key: "unit_price", header: "السعر", render: (item) => item.unit_price.toFixed(2) },
    { key: "subtotal", header: "الإجمالي", render: (item) => item.subtotal.toFixed(2) },
  ];

  const clearSelection = () => {
      setSelectedItems([]);
      setSelectionMode(false);
      onSelectionChange([]);
  };

  return (
    <div className="selectable-invoice-table">
      {/* Search Bar */}
      <div className="table-controls">
        <div className="search-wrapper">
            <SearchableSelect
                options={searchOptions}
                value={null} // Controlled manually via query interaction usually, but SearchableSelect handles input. 
                // Using it as a filter input mainly.
                onChange={handleSearchChange}
                placeholder={searchPlaceholder}
                className="invoice-search"
                // On search generic
                onSearch={(term) => {
                    setSearchQuery(term);
                    onSearch(term);
                }}
            />
        </div>
        
        {selectionMode && (
          <div className="selection-actions animate-fade-in">
             <span className="selection-info">تم تحديد {selectedItems.length} عنصر</span>
             <button onClick={clearSelection} className="btn btn-sm btn-secondary">إلغاء التحديد</button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <ExpandableTable
        data={filteredInvoices}
        columns={columns}
        keyExtractor={keyExtractor}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        onExpand={handleExpand}
        renderExpandedRow={(invoice) => {
            const isLoading = loadingItems[invoice.id];
            const items = invoiceItems[invoice.id] || [];
            
            // Calculate selected IDs for this specific invoice table
            const currentInvoiceSelectedIds = selectedItems
                .filter(si => si.invoiceId === invoice.id)
                .map(si => si.invoiceItemId);

            return (
                <div className="inner-table-container">
                    {isLoading ? (
                        <div className="p-4 text-center text-secondary">جاري تحميل العناصر...</div>
                    ) : (
                        <SelectableTable
                            data={items}
                            columns={itemColumns}
                            keyExtractor={(item) => item.id}
                            selectedIds={currentInvoiceSelectedIds}
                            onSelectionChange={(ids) => handleItemSelectionChange(ids, invoice.id)}
                            selectionMode={true} // Always allow selection in expanded row
                            emptyMessage="لا توجد عناصر في هذه الفاتورة"
                            // If user wants long press to toggle "selection mode" visually (checkboxes), pass state.
                            // Here we just enable checkboxes always for clarity or logic.
                            // User "Selection is not long-pressed" fix: 
                            // We enable strict selection mode.
                        />
                    )}
                </div>
            );
        }}
      />
      
      <style jsx>{`
        .selectable-invoice-table {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .table-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
            margin-bottom: 0.5rem;
        }
        .search-wrapper {
            flex: 1;
            min-width: 300px;
        }
        .selection-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
            background: var(--primary-subtle);
            padding: 0.5rem 1rem;
            border-radius: var(--radius-md);
            border: 1px solid var(--primary-light);
        }
        .selection-info {
            font-weight: 600;
            color: var(--primary-dark);
        }
        .inner-table-container {
            background: #fff;
            border-radius: var(--radius-md);
            overflow: hidden;
            box-shadow: inset 0 0 4px rgba(0,0,0,0.05);
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
