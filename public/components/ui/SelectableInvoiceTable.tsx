"use client";

import { useState, useEffect } from "react";
import { ExpandableTable, Column as ExpandableColumn } from "./ExpandableTable";
import { SelectableTable, SelectableColumn } from "./SelectableTable";
import { SearchableSelect, SelectOption } from "./SearchableSelect";
import { FloatingActionTableBar } from "./FloatingActionBar";
import { ConfirmDialog } from "./Dialog";
import { formatCurrency } from "@/lib/utils";
import { PageSubHeader } from "../layout";

// Re-export types for consumers
export type { ExpandableColumn as InvoiceTableColumn };

// Types
export interface InvoiceItem {
  id: number;
  product_id: number;
  product?: { name: string; barcode?: string };
  quantity: number;
  original_quantity?: number;
  returned_quantity?: number;
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
  originalQuantity?: number;
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
  multiInvoiceSelection?: boolean;
  isExpandable?: (item: T) => boolean;
  openReturnDialog: () => void;
  renderCustomExpandedRow?: (item: T) => React.ReactNode;
  invoiceIdExtractor?: (item: T) => number;
  FilterTabNavigation?: React.ReactNode;
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
  multiInvoiceSelection = false,
  isExpandable,
  openReturnDialog,
  renderCustomExpandedRow,
  invoiceIdExtractor = (item: T) => item.id,
  FilterTabNavigation,
}: SelectableInvoiceTableProps<T>) {
  // State
  const [invoiceItems, setInvoiceItems] = useState<Record<number, InvoiceItem[]>>({});
  const [loadingItems, setLoadingItems] = useState<Record<number, boolean>>({});
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Confirmation state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    onConfirm: () => void;
    message: string;
  } | null>(null);

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
    subtitle: `الإجمالي: ${formatCurrency(inv.total_amount)}`
  }));

  // Fetch items when expanding
  const handleExpand = async (invoice: T, isExpanded: boolean) => {
    const invId = invoiceIdExtractor(invoice);
    if (isExpanded && !invoiceItems[invId] && !loadingItems[invId]) {
      setLoadingItems(prev => ({ ...prev, [invId]: true }));
      try {
        const items = await getInvoiceItems(invoice);
        setInvoiceItems(prev => ({ ...prev, [invId]: items }));
      } catch (error) {
        console.error("Failed to load items", error);
      } finally {
        setLoadingItems(prev => ({ ...prev, [invId]: false }));
      }
    }
  };

  // Handle Inner Table Selection
  const handleItemSelectionChange = (selectedIds: (string | number)[], invoiceId: number) => {
    // Process the selection change
    const processSelection = () => {
      const items = invoiceItems[invoiceId] || [];
      const invoiceSelectedItems: SelectedItem[] = items
        .filter(item => selectedIds.includes(item.id))
        .map(item => ({
          invoiceId: Number(invoiceId),
          invoiceItemId: Number(item.id),
          quantity: item.quantity,
          maxQuantity: item.quantity,
          productName: item.product?.name || (item as any).product_name || `منتج #${item.product_id}`,
          unitPrice: item.unit_price,
          originalQuantity: item.original_quantity,
        }));

      let newSelectedItems: SelectedItem[];
      if (multiInvoiceSelection) {
        // Merge with existing items from other invoices
        const itemsFromOtherInvoices = selectedItems.filter(si => si.invoiceId !== invoiceId);
        newSelectedItems = [...itemsFromOtherInvoices, ...invoiceSelectedItems];
      } else {
        newSelectedItems = invoiceSelectedItems;
      }

      setSelectedItems(newSelectedItems);
      setSelectionMode(newSelectedItems.length > 0);
      onSelectionChange(newSelectedItems);
    };

    // Enforce Single Invoice Constraint if not multi-invoice
    if (!multiInvoiceSelection && currentInvoiceId && currentInvoiceId !== invoiceId && selectedIds.length > 0) {
      setConfirmData({
        message: "هل تريد إلغاء تحديد العناصر من الفاتورة السابقة والبدء في هذه؟",
        onConfirm: processSelection
      });
      setShowConfirm(true);
      return;
    }

    processSelection();
  };

  // Inner Columns definition
  const itemColumns: SelectableColumn<InvoiceItem>[] = [
    {
      key: "product_name",
      header: "المنتج",
      render: (item) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{item.product?.name || (item as any).product_name || item.product_id}</span>
          {item.returned_quantity && item.returned_quantity > 0 && (
            <span style={{
              fontSize: '10px',
              color: item.quantity === 0 ? 'var(--danger-color)' : 'var(--warning-color)',
              fontWeight: 'bold'
            }}>
              {item.quantity === 0 ? '(مسترجع بالكامل)' : `(تم إرجاع ${item.returned_quantity})`}
            </span>
          )}
        </div>
      )
    },
    {
      key: "quantity",
      header: "الكمية",
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {item.original_quantity !== undefined && item.original_quantity !== item.quantity && (
            <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.9em' }}>
              {item.original_quantity}
            </span>
          )}
          <span style={{
            fontWeight: 'bold',
            color: item.quantity === 0 ? 'var(--danger-color)' : 'inherit'
          }}>
            {item.quantity}
          </span>
        </div>
      )
    },
    { key: "unit_price", header: "السعر", render: (item) => formatCurrency(item.unit_price) },
    { key: "subtotal", header: "الإجمالي", render: (item) => formatCurrency(item.unit_price * item.quantity) },
  ];

  const clearSelection = () => {
    setSelectedItems([]);
    setSelectionMode(false);
    onSelectionChange([]);
  };



  return (
    <div className="selectable-invoice-table">
      {/* Search Bar 

      */}


      <PageSubHeader
        title="قائمة الفواتير"
        titleIcon="receipt"
        actions={
          <>
            {FilterTabNavigation}
          </>
        }

      />
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
        <FloatingActionTableBar
          isVisible={selectionMode}
          message={`تم تحديد ${selectedItems.length} عنصر من ${new Set(selectedItems.map(i => i.invoiceId)).size} فاتورة`}
          actions={[
            {
              label: "تسجيل مرتجع",
              icon: "repeat",
              onClick: openReturnDialog,
              variant: "primary"
            },
            {
              label: "إلغاء التحديد",
              icon: "shield-check",
              onClick: clearSelection,
              variant: "secondary"
            }
          ]}
        />
      </div>

      {/* Main Table */}
      <ExpandableTable
        data={filteredInvoices}
        columns={columns}
        keyExtractor={keyExtractor}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        onExpand={handleExpand}
        isExpandable={isExpandable}
        renderExpandedRow={(invoice) => {
          if (renderCustomExpandedRow) {
            const custom = renderCustomExpandedRow(invoice);
            if (custom) return custom;
          }

          const invId = invoiceIdExtractor(invoice);
          const isLoading = loadingItems[invId];
          const items = invoiceItems[invId] || [];

          // Calculate selected IDs for this specific invoice table
          const currentInvoiceSelectedIds = selectedItems
            .filter(si => si.invoiceId === invId)
            .map(si => si.invoiceItemId);

          return (
            <>
              {isLoading ? (
                <div className="p-4 text-center text-secondary">جاري تحميل العناصر...</div>
              ) : (
                <div className="inner-table-container">

                  <SelectableTable
                    data={items}
                    columns={itemColumns}
                    keyExtractor={(item) => item.id}
                    selectedIds={currentInvoiceSelectedIds}
                    onSelectionChange={(ids) => handleItemSelectionChange(ids, invId)}
                    selectionMode={true} // Always allow selection in expanded row
                    isRowSelectable={(item) => item.quantity > 0}
                    emptyMessage="لا توجد عناصر في هذه الفاتورة"
                  // If user wants long press to toggle "selection mode" visually (checkboxes), pass state.
                  // Here we just enable checkboxes always for clarity or logic.
                  // User "Selection is not long-pressed" fix: 
                  // We enable strict selection mode.
                  />
                </div>
              )}
            </>
          );
        }}
      />

      {/* Ready-made Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => confirmData?.onConfirm()}
        message={confirmData?.message || ""}
        title="تأكيد التغيير"
        confirmText="نعم، ابدأ جديد"
        cancelText="إلغاء"
      />

    </div>
  );
}
