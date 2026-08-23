"use client";

import { useI18n, catalogText } from "@/lib/i18n";
import { MainLayout, PageSubHeader } from "@/components/layout";
import { Button, Column, ConfirmDialog, Dialog, Table, showAlert, showToast } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import { formatDate, parseNumber } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

interface RecurringTemplateData {
    account_code?: string;
    amount?: number;
    description?: string;
    entries?: Array<{
        account_code: string;
        entry_type: "DEBIT" | "CREDIT";
        amount: number;
        description: string;
    }>;
}

const ITEMS_PER_PAGE = 20;

interface RecurringTemplate {
    id: number;
    name: string;
    type: "expense" | "revenue" | "journal_voucher";
    frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually";
    next_due_date: string;
    last_generated_date?: string;
    template_data?: RecurringTemplateData;
}

export default function RecurringTransactionsPage() {
    const { t: i18n } = useI18n();
    const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    // Dialogs
    const [templateDialog, setTemplateDialog] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [deleteTemplateId, setDeleteTemplateId] = useState<number | null>(null);
    const [generateTemplateId, setGenerateTemplateId] = useState<number | null>(null);

    // Form
    const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
    const [templateName, setTemplateName] = useState("");
    const [templateType, setTemplateType] = useState<"expense" | "revenue" | "journal_voucher">("expense");
    const [templateFrequency, setTemplateFrequency] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "annually">("monthly");
    const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split("T")[0]);

    // Expense fields
    const [expenseAccount, setExpenseAccount] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseDescription, setExpenseDescription] = useState("");

    // Revenue fields
    const [revenueAccount, setRevenueAccount] = useState("");
    const [revenueAmount, setRevenueAmount] = useState("");
    const [revenueDescription, setRevenueDescription] = useState("");

    // Journal fields
    const [journalEntries, setJournalEntries] = useState("");

    const loadTemplates = useCallback(async (page: number = 1) => {
        try {
            setIsLoading(true);
            const response = await fetchAPI<RecurringTemplate[]>(`${API_ENDPOINTS.FINANCE.RECURRING.BASE}?page=${page}&limit=${ITEMS_PER_PAGE}`);
            if (response.success && response.data) {
                setTemplates(response.data);
                const total = Number(response.total) || 0;
                setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
                setCurrentPage(page);
            } else {
                showAlert("alert-container", response.message || i18n.catalog["enterpriseCore.recurringTransactions.failedLoadTemplates"], "error");
            }
        } catch {
            showAlert("alert-container", i18n.catalog["common.general.errorConnectingServer"], "error");
        } finally {
            setIsLoading(false);
        }
    }, [i18n.catalog]);

    useEffect(() => {
        const init = async () => {
            const authenticated = await checkAuth();
            if (!authenticated) return;

            await loadTemplates();
        };
        init();
    }, [loadTemplates]);

    const openCreateDialog = () => {
        setCurrentTemplateId(null);
        setTemplateName("");
        setTemplateType("expense");
        setTemplateFrequency("monthly");
        setNextDueDate(new Date().toISOString().split("T")[0]);
        setExpenseAccount("");
        setExpenseAmount("");
        setExpenseDescription("");
        setRevenueAccount("");
        setRevenueAmount("");
        setRevenueDescription("");
        setJournalEntries("");
        setTemplateDialog(true);
    };

    const viewTemplate = async (id: number) => {
        try {
            const response = await fetchAPI<RecurringTemplate | RecurringTemplate[]>(`${API_ENDPOINTS.FINANCE.RECURRING.BASE}?id=${id}`);
            if (response.success && response.data) {
                const template = Array.isArray(response.data) ? response.data[0] : response.data;
                if (template) {
                    alert(
                        catalogText(i18n, "enterpriseCore.recurringTransactions.nameTypeFrequencyDueDate", { value0: template.name, value1: template.type, value2: template.frequency, value3: formatDate(template.next_due_date) })
                    );
                }
            }
        } catch {
            showToast(i18n.catalog["common.general.errorLoadingTemplate"], "error");
        }
    };

    const editTemplate = async (id: number) => {
        try {
            const response = await fetchAPI<RecurringTemplate | RecurringTemplate[]>(`${API_ENDPOINTS.FINANCE.RECURRING.BASE}?id=${id}`);
            if (response.success && response.data) {
                const template = Array.isArray(response.data) ? response.data[0] : response.data;
                if (!template) {
                    showAlert("alert-container", i18n.catalog["enterpriseCore.recurringTransactions.templateNotFound"], "error");
                    return;
                }

                setCurrentTemplateId(template.id);
                setTemplateName(template.name);
                setTemplateType(template.type);
                setTemplateFrequency(template.frequency);
                setNextDueDate(template.next_due_date);

                const templateData = template.template_data || {};
                if (template.type === "expense") {
                    setExpenseAccount(templateData.account_code || "");
                    setExpenseAmount(String(templateData.amount || ""));
                    setExpenseDescription(templateData.description || "");
                } else if (template.type === "revenue") {
                    setRevenueAccount(templateData.account_code || "");
                    setRevenueAmount(String(templateData.amount || ""));
                    setRevenueDescription(templateData.description || "");
                } else if (template.type === "journal_voucher") {
                    setJournalEntries(JSON.stringify(templateData.entries || [], null, 2));
                }

                setTemplateDialog(true);
            }
        } catch {
            showAlert("alert-container", i18n.catalog["common.general.errorLoadingTemplate"], "error");
        }
    };

    const saveTemplate = async () => {
        if (!templateName || !nextDueDate) {
            showAlert("alert-container", i18n.catalog["common.general.pleaseFillAllRequiredFields"], "error");
            return;
        }

        let templateData: RecurringTemplateData = {};
        if (templateType === "expense") {
            if (!expenseAccount || !expenseAmount) {
                showAlert("alert-container", i18n.catalog["enterpriseCore.recurringTransactions.pleaseFillExpenseAccountAmount"], "error");
                return;
            }
            templateData = {
                account_code: expenseAccount,
                amount: parseNumber(expenseAmount),
                description: expenseDescription,
            };
        } else if (templateType === "revenue") {
            if (!revenueAccount || !revenueAmount) {
                showAlert("alert-container", i18n.catalog["enterpriseCore.recurringTransactions.pleaseFillRevenueAccountAmount"], "error");
                return;
            }
            templateData = {
                account_code: revenueAccount,
                amount: parseNumber(revenueAmount),
                description: revenueDescription,
            };
        } else if (templateType === "journal_voucher") {
            if (!journalEntries) {
                showAlert("alert-container", i18n.catalog["enterpriseCore.recurringTransactions.pleaseEnterEntries"], "error");
                return;
            }
            try {
                templateData = { entries: JSON.parse(journalEntries) };
            } catch {
                showAlert("alert-container", i18n.catalog["enterpriseCore.recurringTransactions.invalidJsonFormat"], "error");
                return;
            }
        }

        try {
            interface RecurringTemplateFormBody {
                name: string;
                type: "expense" | "revenue" | "journal_voucher";
                frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually";
                next_due_date: string;
                template_data: RecurringTemplateData;
                id?: number;
            }

            const body: RecurringTemplateFormBody = {
                name: templateName,
                type: templateType,
                frequency: templateFrequency,
                next_due_date: nextDueDate,
                template_data: templateData,
            };
            if (currentTemplateId) body.id = currentTemplateId;

            const response = await fetchAPI(API_ENDPOINTS.FINANCE.RECURRING.BASE, {
                method: currentTemplateId ? "PUT" : "POST",
                body: JSON.stringify(body),
            });

            if (response.success) {
                showAlert("alert-container", i18n.catalog["common.general.savedSuccessfully"], "success");
                setTemplateDialog(false);
                await loadTemplates(currentPage);
            } else {
                showAlert("alert-container", response.message || i18n.catalog["common.general.failedSave"], "error");
            }
        } catch {
            showAlert("alert-container", i18n.catalog["common.general.errorSaving"], "error");
        }
    };

    const confirmDeleteTemplate = (id: number) => {
        setDeleteTemplateId(id);
        setConfirmDialog(true);
    };

    const deleteTemplate = async () => {
        if (!deleteTemplateId) return;

        try {
            const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.RECURRING.BASE}?id=${deleteTemplateId}`, {
                method: "DELETE",
            });
            if (response.success) {
                showAlert("alert-container", i18n.catalog["common.general.templateDeletedSuccessfully"], "success");
                setConfirmDialog(false);
                setDeleteTemplateId(null);
                await loadTemplates(currentPage);
            } else {
                showAlert("alert-container", response.message || i18n.catalog["common.general.failedDeleteTemplate"], "error");
            }
        } catch {
            showAlert("alert-container", i18n.catalog["enterpriseCore.recurringTransactions.errorDeletingTemplate"], "error");
        }
    };

    const confirmGenerateTransaction = (id: number) => {
        setGenerateTemplateId(id);
        setConfirmDialog(true);
    };

    const generateTransaction = async () => {
        if (!generateTemplateId) return;

        try {
            const response = await fetchAPI(API_ENDPOINTS.FINANCE.RECURRING.PROCESS, {
                method: "POST",
                body: JSON.stringify({
                    template_id: generateTemplateId,
                    generation_date: new Date().toISOString().split("T")[0],
                }),
            });

            if (response.success && response.data) {
                showAlert(
                    "alert-container",
                    i18n.catalog["enterpriseCore.recurringTransactions.transactionWasCompletedSuccessfully"],
                    "success"
                );
                setConfirmDialog(false);
                setGenerateTemplateId(null);
                await loadTemplates(currentPage);
            } else {
                showAlert("alert-container", response.message || i18n.catalog["enterpriseCore.recurringTransactions.failedExecuteTransaction"], "error");
            }
        } catch {
            showAlert("alert-container", i18n.catalog["enterpriseCore.recurringTransactions.errorExecutingTransaction"], "error");
        }
    };

    const getTypeText = (type: string) => {
        const types: Record<string, string> = {
            expense: i18n.catalog["common.general.expense"],
            revenue: i18n.catalog["common.general.revenue.alternative2"],
            journal_voucher: i18n.catalog["common.general.journalVoucher"],
        };
        return types[type] || type;
    };

    const getFrequencyText = (frequency: string) => {
        const frequencies: Record<string, string> = {
            daily: i18n.catalog["common.general.daily"],
            weekly: i18n.catalog["common.general.weekly"],
            monthly: i18n.catalog["common.general.monthly"],
            quarterly: i18n.catalog["common.general.quarterly"],
            annually: i18n.catalog["common.general.annual"],
        };
        return frequencies[frequency] || frequency;
    };

    const getStatusBadge = (template: RecurringTemplate) => {
        const isDue =
            template.next_due_date && new Date(template.next_due_date) <= new Date();
        return (
            <span className={`badge ${isDue ? "badge-warning" : "badge-success"}`}>
                {isDue ? i18n.catalog["enterpriseCore.recurringTransactions.due"] : i18n.catalog["common.general.active"]}
            </span>
        );
    };

    const handleConfirm = () => {
        if (deleteTemplateId) {
            deleteTemplate();
        } else if (generateTemplateId) {
            generateTransaction();
        }
    };

    const columns: Column<RecurringTemplate>[] = [
        {
            key: "name",
            header: i18n.catalog["common.general.name"],
            dataLabel: i18n.catalog["common.general.name"],
            render: (item) => <strong>{item.name}</strong>,
        },
        {
            key: "type",
            header: i18n.catalog["common.general.type.alternative3"],
            dataLabel: i18n.catalog["common.general.type.alternative3"],
            render: (item) => getTypeText(item.type),
        },
        {
            key: "frequency",
            header: i18n.catalog["common.general.recurrence"],
            dataLabel: i18n.catalog["common.general.recurrence"],
            render: (item) => getFrequencyText(item.frequency),
        },
        {
            key: "next_due_date",
            header: i18n.catalog["common.general.nextDueDate"],
            dataLabel: i18n.catalog["common.general.nextDueDate"],
            render: (item) => (item.next_due_date ? formatDate(item.next_due_date) : "-"),
        },
        {
            key: "last_generated_date",
            header: i18n.catalog["common.general.lastExecution"],
            dataLabel: i18n.catalog["common.general.lastExecution"],
            render: (item) =>
                item.last_generated_date ? formatDate(item.last_generated_date) : i18n.catalog["enterpriseCore.recurringTransactions.notExecuted"],
        },
        {
            key: "status",
            header: i18n.catalog["common.general.status.alternative2"],
            dataLabel: i18n.catalog["common.general.status.alternative2"],
            render: (item) => getStatusBadge(item),
        },
        {
            key: "actions",
            header: i18n.catalog["common.general.actions"],
            dataLabel: i18n.catalog["common.general.actions"],
            render: (item) => (
                <div className="action-buttons">
                    <button className="icon-btn view" onClick={() => viewTemplate(item.id)} title={i18n.catalog["common.general.view"]}>
                        {getIcon("eye")}
                    </button>
                    <button className="icon-btn edit" onClick={() => editTemplate(item.id)} title={i18n.catalog["common.general.edit"]}>
                        {getIcon("edit")}
                    </button>
                    <button
                        className="icon-btn delete"
                        onClick={() => confirmDeleteTemplate(item.id)}
                        title={i18n.catalog["common.general.delete"]}
                    >
                        {getIcon("trash")}
                    </button>
                    <button
                        className="icon-btn"
                        onClick={() => confirmGenerateTransaction(item.id)}
                        title={i18n.catalog["enterpriseCore.recurringTransactions.executeNow"]}
                        style={{ background: "var(--success-color)", color: "white" }}
                    >
                        {getIcon("check")}
                    </button>
                </div>
            ),
        },
    ];

    return (
        <MainLayout requiredModule="recurring_transactions">
            <div id="alert-container"></div>

            <div className="sales-card animate-fade">
                <PageSubHeader
                    actions={
                        <Button
                            variant="primary"
                            onClick={openCreateDialog}
                            icon="plus"
                        >
                            {i18n.catalog["enterpriseCore.recurringTransactions.newTemplate"]}</Button>
                    }
                />
                <Table
                    columns={columns}
                    data={templates}
                    keyExtractor={(item) => item.id.toString()}
                    emptyMessage={i18n.catalog["enterpriseCore.recurringTransactions.noTemplates"]}
                    isLoading={isLoading}
                    pagination={{
                        currentPage,
                        totalPages,
                        onPageChange: loadTemplates,
                    }}
                />
            </div>

            {/* Template Dialog */}
            <Dialog
                isOpen={templateDialog}
                onClose={() => setTemplateDialog(false)}
                title={currentTemplateId ? i18n.catalog["enterpriseCore.recurringTransactions.editTemplate"] : i18n.catalog["enterpriseCore.recurringTransactions.newRecurringTransactionTemplate"]}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setTemplateDialog(false)}>
                            {i18n.catalog["common.general.cancel"]}</button>
                        <button className="btn btn-primary" onClick={saveTemplate}>
                            {i18n.catalog["common.general.save"]}</button>
                    </>
                }
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        saveTemplate();
                    }}
                >
                    <div className="form-group">
                        <label htmlFor="template-name">{i18n.catalog["enterpriseCore.recurringTransactions.templateName"]}</label>
                        <input
                            type="text"
                            id="template-name"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="template-type">{i18n.catalog["enterpriseCore.recurringTransactions.transactionType"]}</label>
                            <select
                                id="template-type"
                                value={templateType}
                                onChange={(e) =>
                                    setTemplateType(e.target.value as RecurringTemplate['type'])
                                }
                                required
                            >
                                <option value="expense">{i18n.catalog["common.general.expense"]}</option>
                                <option value="revenue">{i18n.catalog["common.general.revenue.alternative2"]}</option>
                                <option value="journal_voucher">{i18n.catalog["common.general.journalVoucher"]}</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="template-frequency">{i18n.catalog["enterpriseCore.recurringTransactions.frequency"]}</label>
                            <select
                                id="template-frequency"
                                value={templateFrequency}
                                onChange={(e) =>
                                    setTemplateFrequency(e.target.value as RecurringTemplate['frequency'])
                                }
                                required
                            >
                                <option value="daily">{i18n.catalog["common.general.daily"]}</option>
                                <option value="weekly">{i18n.catalog["common.general.weekly"]}</option>
                                <option value="monthly">{i18n.catalog["common.general.monthly"]}</option>
                                <option value="quarterly">{i18n.catalog["common.general.quarterly"]}</option>
                                <option value="annually">{i18n.catalog["common.general.annual"]}</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="next-due-date">{i18n.catalog["enterpriseCore.recurringTransactions.nextDueDate"]}</label>
                        <input
                            type="date"
                            id="next-due-date"
                            value={nextDueDate}
                            onChange={(e) => setNextDueDate(e.target.value)}
                            required
                        />
                    </div>

                    {/* Expense Fields */}
                    {templateType === "expense" && (
                        <div>
                            <div className="form-group">
                                <label htmlFor="expense-account">{i18n.catalog["enterpriseCore.recurringTransactions.expenseAccount"]}</label>
                                <input
                                    type="text"
                                    id="expense-account"
                                    value={expenseAccount}
                                    onChange={(e) => setExpenseAccount(e.target.value)}
                                    placeholder={i18n.catalog["common.general.accountCode"]}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="expense-amount">{i18n.catalog["common.general.amount.alternative3"]}</label>
                                <input
                                    type="number"
                                    id="expense-amount"
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="expense-description">{i18n.catalog["common.general.description.alternative2"]}</label>
                                <textarea
                                    id="expense-description"
                                    value={expenseDescription}
                                    onChange={(e) => setExpenseDescription(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}

                    {/* Revenue Fields */}
                    {templateType === "revenue" && (
                        <div>
                            <div className="form-group">
                                <label htmlFor="revenue-account">{i18n.catalog["enterpriseCore.recurringTransactions.revenueAccount"]}</label>
                                <input
                                    type="text"
                                    id="revenue-account"
                                    value={revenueAccount}
                                    onChange={(e) => setRevenueAccount(e.target.value)}
                                    placeholder={i18n.catalog["common.general.accountCode"]}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="revenue-amount">{i18n.catalog["common.general.amount.alternative3"]}</label>
                                <input
                                    type="number"
                                    id="revenue-amount"
                                    value={revenueAmount}
                                    onChange={(e) => setRevenueAmount(e.target.value)}
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="revenue-description">{i18n.catalog["common.general.description.alternative2"]}</label>
                                <textarea
                                    id="revenue-description"
                                    value={revenueDescription}
                                    onChange={(e) => setRevenueDescription(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}

                    {/* Journal Fields */}
                    {templateType === "journal_voucher" && (
                        <div>
                            <div className="form-group">
                                <label htmlFor="journal-entries">{i18n.catalog["enterpriseCore.recurringTransactions.constraintsJson"]}</label>
                                <textarea
                                    id="journal-entries"
                                    value={journalEntries}
                                    onChange={(e) => setJournalEntries(e.target.value)}
                                    rows={6}
                                    placeholder={i18n.catalog["enterpriseCore.recurringTransactions.accountCode1110EntryTypeDebitAmount1000DescriptionAccountCode5200EntryTy"]}
                                    required
                                />
                                <small style={{ color: "var(--text-secondary)" }}>
                                    {i18n.catalog["enterpriseCore.recurringTransactions.totalDebitsMustEqualTotalCredits"]}</small>
                            </div>
                        </div>
                    )}
                </form>
            </Dialog>

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog}
                onClose={() => {
                    setConfirmDialog(false);
                    setDeleteTemplateId(null);
                    setGenerateTemplateId(null);
                }}
                onConfirm={handleConfirm}
                title={i18n.catalog["common.general.confirm"]}
                message={
                    deleteTemplateId
                        ? i18n.catalog["common.general.areYouSureYouWantDeleteThisTemplate"]
                        : i18n.catalog["enterpriseCore.recurringTransactions.doYouWantExecuteThisTransactionNow"]
                }
                confirmText={i18n.catalog["common.general.confirm"]}
                confirmVariant={deleteTemplateId ? "danger" : "primary"}
            />
        </MainLayout>
    );
}

