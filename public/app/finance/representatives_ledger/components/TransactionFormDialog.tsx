import { Dialog, Button, NumberInput } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";

interface TransactionFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    isCustomId: boolean;
    transactionType: "payment" | "adjustment";
    transactionAmount: string;
    transactionDate: string;
    transactionDescription: string;
    setTransactionType: (val: "payment" | "adjustment") => void;
    setTransactionAmount: (val: string) => void;
    setTransactionDate: (val: string) => void;
    setTransactionDescription: (val: string) => void;
    onSave: () => void;
}

export function TransactionFormDialog({
    isOpen,
    onClose,
    isCustomId,
    transactionType,
    transactionAmount,
    transactionDate,
    transactionDescription,
    setTransactionType,
    setTransactionAmount,
    setTransactionDate,
    setTransactionDescription,
    onSave
}: TransactionFormDialogProps) {
    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={isCustomId ? "تعديل عملية" : "تسجيل عملية جديدة"}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>
                        إلغاء
                    </Button>
                    <Button variant="primary" onClick={onSave}>
                        حفظ
                    </Button>
                </div>
            }
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSave();
                }}
                className="space-y-4"
            >
                <Select
                    label="نوع العملية *"
                    id="trans-type"
                    value={transactionType as string}
                    onChange={(e) => setTransactionType(e.target.value as "payment" | "adjustment")}
                    required
                    disabled={isCustomId}
                    options={[
                        { value: "payment", label: "سداد (دفعة للمندوب)" },
                        { value: "adjustment", label: "تسوية مالية" },
                    ]}
                />
                <div className="form-row">
                    <NumberInput
                        label="المبلغ *"
                        id="trans-amount"
                        value={transactionAmount}
                        onChange={(val) => setTransactionAmount(val)}
                        step={0.01}
                        required
                        className="flex-1"
                    />
                    <TextInput
                        type="date"
                        label="التاريخ *"
                        id="trans-date"
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        required
                        disabled={isCustomId}
                        className="flex-1"
                    />
                </div>
                <Textarea
                    label="الوصف / البيان"
                    id="trans-desc"
                    rows={3}
                    value={transactionDescription}
                    onChange={(e) => setTransactionDescription(e.target.value)}
                />
            </form>
        </Dialog>
    );
}
