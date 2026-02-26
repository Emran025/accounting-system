import { Dialog, FilterActions, Button, FilterGroup, DateRangePicker } from "@/components/ui";

interface Filters {
    search: string;
    type: string;
    date_from: string;
    date_to: string;
}

interface ReturnsFilterDialogProps {
    isOpen: boolean;
    onClose: () => void;
    filters: Filters;
    setFilters: (filters: Filters) => void;
    onApply: () => void;
}

export function ReturnsFilterDialog({
    isOpen,
    onClose,
    filters,
    setFilters,
    onApply,
}: ReturnsFilterDialogProps) {
    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="تصفية المرتجعات"
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
                        onStartDateChange={(val: string) => setFilters({ ...filters, date_from: val })}
                        onEndDateChange={(val: string) => setFilters({ ...filters, date_to: val })}
                    />
                </FilterGroup>
            </div>
        </Dialog>
    );
}
