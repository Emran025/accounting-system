import { Dialog, FilterActions, Button, FilterGroup, DateRangePicker } from "@/components/ui";
import { Select } from "@/components/ui/select";

interface Filters {
    search: string;
    type: string;
    date_from: string;
    date_to: string;
}

interface LedgerFilterDialogProps {
    isOpen: boolean;
    onClose: () => void;
    filters: Filters;
    setFilters: (filters: Filters) => void;
    onApply: () => void;
}

export function LedgerFilterDialog({
    isOpen,
    onClose,
    filters,
    setFilters,
    onApply
}: LedgerFilterDialogProps) {
    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="تصفية العمليات"
            footer={
                <FilterActions>
                    <Button variant="secondary" onClick={onClose}>
                        إلغاء
                    </Button>
                    <Button variant="primary" onClick={onApply}>
                        تطبيق
                    </Button>
                </FilterActions>
            }
        >
            <div className="space-y-4">
                <FilterGroup label="الفترة">
                    <DateRangePicker
                        startDate={filters.date_from}
                        endDate={filters.date_to}
                        onStartDateChange={(val) => setFilters({ ...filters, date_from: val })}
                        onEndDateChange={(val) => setFilters({ ...filters, date_to: val })}
                    />
                </FilterGroup>
                <Select
                    label="نوع العملية"
                    id="filter-type"
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    options={[
                        { value: "", label: "الكل" },
                        { value: "invoice", label: "فاتورة مشتريات" },
                        { value: "payment", label: "سند صرف (دفعة)" },
                        { value: "return", label: "مرتجع" },
                    ]}
                />
            </div>
        </Dialog>
    );
}
