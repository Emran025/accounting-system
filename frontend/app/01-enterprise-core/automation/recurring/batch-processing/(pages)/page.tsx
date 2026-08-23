"use client";

import { useI18n, catalogText } from "@/lib/i18n";
import { MainLayout, PageSubHeader } from "@/components/layout";
import { Button, Column, ConfirmDialog, Dialog, Table, showToast } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { User, checkAuth, getStoredUser } from "@/lib/auth";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import { formatDate } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

const ITEMS_PER_PAGE = 20;

interface Batch {
  id: number;
  batch_name: string;
  batch_type: "journal_entry_import" | "expense_posting" | string;
  status: "pending" | "processing" | "completed" | "completed_with_errors" | "failed";
  total_items: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface BatchItem {
  id: number;
  item_data: Record<string, unknown>;
  status: "pending" | "success" | "completed" | "error" | "failed";
  error_message?: string;
}

export default function BatchProcessingPage() {
    const { t: i18n } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [createDialog, setCreateDialog] = useState(false);
  const [itemsDialog, setItemsDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deleteBatchId, setDeleteBatchId] = useState<number | null>(null);
  const [executeBatchId, setExecuteBatchId] = useState<number | null>(null);

  // Selected batch for items view
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Form
  const [batchName, setBatchName] = useState("");
  const [batchType, setBatchType] = useState("");
  const [batchDescription, setBatchDescription] = useState("");

  const loadBatches = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetchAPI(`${API_ENDPOINTS.ENTERPRISE_CORE.BATCH}?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (response.success && response.data) {
        setBatches(response.data as Batch[]);
        const total = Number(response.total) || 0;
        setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
        setCurrentPage(page);
      } else {
        showToast(response.message || i18n.catalog["enterpriseCore.batchProcessing.failedLoadBatches"], "error");
      }
    } catch {
      showToast(i18n.catalog["common.general.errorConnectingServer"], "error");
    } finally {
      setIsLoading(false);
    }
  }, [i18n.catalog]);

  useEffect(() => {
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      const authenticated = await checkAuth();
      if (!authenticated) return;

      setUser(getStoredUser());
      await loadBatches();
      refreshInterval = setInterval(() => {
        void loadBatches(currentPage);
      }, 30000);
    };

    void init();
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [loadBatches, currentPage]);

  const getBatchTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      journal_entry_import: i18n.catalog["common.general.importJournalEntries"],
      expense_posting: i18n.catalog["common.general.postExpenses"],
    };
    return types[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { class: string; text: string }> = {
      pending: { class: "badge-secondary", text: i18n.catalog["common.general.pending.alternative3"] },
      processing: { class: "badge-info", text: i18n.catalog["common.general.processing"] },
      completed: { class: "badge-success", text: i18n.catalog["common.general.completed.alternative2"] },
      completed_with_errors: { class: "badge-warning", text: i18n.catalog["enterpriseCore.batchProcessing.completedErrors"] },
      failed: { class: "badge-danger", text: i18n.catalog["common.general.failed.alternative3"] },
    };

    const statusLower = status?.toLowerCase() || "pending";
    const statusInfo = statusMap[statusLower] || { class: "badge-secondary", text: status };

    return <span className={`badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const openCreateDialog = () => {
    setBatchName("");
    setBatchType("");
    setBatchDescription("");
    setCreateDialog(true);
  };

  const closeCreateDialog = () => {
    setCreateDialog(false);
  };

  const closeItemsDialog = () => {
    setItemsDialog(false);
    setBatchItems([]);
  };

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!batchName || !batchType) {
      showToast(i18n.catalog["enterpriseCore.batchProcessing.pleaseEnterBatchNameType"], "error");
      return;
    }

    try {
      const response = await fetchAPI(API_ENDPOINTS.ENTERPRISE_CORE.BATCH, {
        method: "POST",
        body: JSON.stringify({
          batch_name: batchName,
          batch_type: batchType,
          description: batchDescription,
        }),
      });

      if (response.success && response.data) {
        const data = response.data as Batch;
        showToast(i18n.catalog["enterpriseCore.batchProcessing.batchCreatedSuccessfullyYouCanNowAddItems"], "success");
        setCreateDialog(false);
        await loadBatches(1);

        // Optionally open items modal
        if (data?.id) {
          setTimeout(() => {
            viewBatchItems(data.id);
          }, 500);
        }
      } else {
        showToast(response.message || i18n.catalog["enterpriseCore.batchProcessing.batchCreationFailed"], "error");
      }
    } catch {
      showToast(i18n.catalog["enterpriseCore.batchProcessing.errorCreatingBatch"], "error");
    }
  };

  const viewBatchItems = async (batchId: number) => {
    setIsLoadingItems(true);
    setItemsDialog(true);

    try {
      const response = await fetchAPI(`${API_ENDPOINTS.ENTERPRISE_CORE.BATCH}?action=status&batch_id=${batchId}`);
      if (response.success && response.data) {
        const items = (response.data as { items?: BatchItem[] }).items || [];
        setBatchItems(items);
      } else {
        showToast(response.message || i18n.catalog["enterpriseCore.batchProcessing.failedLoadItems.alternative2"], "error");
        setItemsDialog(false);
      }
    } catch {
      showToast(i18n.catalog["enterpriseCore.batchProcessing.failedLoadItems"], "error");
      setItemsDialog(false);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const confirmExecuteBatch = (batchId: number) => {
    setExecuteBatchId(batchId);
    setConfirmDialog(true);
  };

  const executeBatch = async () => {
    if (!executeBatchId) return;

    try {
      const response = await fetchAPI(`${API_ENDPOINTS.ENTERPRISE_CORE.BATCH}?action=execute`, {
        method: "POST",
        body: JSON.stringify({ batch_id: executeBatchId }),
      });

      if (response.success) {
        showToast(i18n.catalog["enterpriseCore.batchProcessing.paymentExecutedSuccessfully"], "success");
        setConfirmDialog(false);
        setExecuteBatchId(null);
        await loadBatches(currentPage);
      } else {
        showToast(response.message || i18n.catalog["enterpriseCore.batchProcessing.failedExecuteBatch"], "error");
      }
    } catch {
      showToast(i18n.catalog["enterpriseCore.batchProcessing.errorExecutingPayment"], "error");
    }
  };

  const confirmDeleteBatch = (batchId: number) => {
    setDeleteBatchId(batchId);
    setConfirmDialog(true);
  };

  const deleteBatch = async () => {
    if (!deleteBatchId) return;

    try {
      const response = await fetchAPI(catalogText(i18n, "common.general.message", { value0: API_ENDPOINTS.ENTERPRISE_CORE.BATCH, value1: deleteBatchId }), { method: "DELETE" });

      if (response.success) {
        showToast(i18n.catalog["enterpriseCore.batchProcessing.batchDeletedSuccessfully"], "success");
        setConfirmDialog(false);
        setDeleteBatchId(null);
        await loadBatches(currentPage);
      } else {
        showToast(response.message || i18n.catalog["enterpriseCore.batchProcessing.failedDeleteBatch"], "error");
      }
    } catch {
      showToast(i18n.catalog["enterpriseCore.batchProcessing.errorDeletingPayment"], "error");
    }
  };

  const handleConfirm = () => {
    if (deleteBatchId) {
      deleteBatch();
    } else if (executeBatchId) {
      executeBatch();
    }
  };

  const getItemStatusBadge = (status: string) => {
    const statusMap: Record<string, { class: string; text: string }> = {
      pending: { class: "badge-secondary", text: i18n.catalog["common.general.pending.alternative3"] },
      success: { class: "badge-success", text: i18n.catalog["common.general.completed.alternative2"] },
      completed: { class: "badge-success", text: i18n.catalog["common.general.completed.alternative2"] },
      error: { class: "badge-danger", text: i18n.catalog["common.general.failed.alternative3"] },
      failed: { class: "badge-danger", text: i18n.catalog["common.general.failed.alternative3"] },
    };

    const statusLower = status?.toLowerCase() || "pending";
    const statusInfo = statusMap[statusLower] || { class: "badge-secondary", text: status };

    return <span className={`badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const columns: Column<Batch>[] = [
    {
      key: "batch_name",
      header: i18n.catalog["common.general.paymentName"],
      dataLabel: i18n.catalog["common.general.paymentName"],
      render: (item) => <strong>{item.batch_name}</strong>,
    },
    {
      key: "batch_type",
      header: i18n.catalog["common.general.paymentType"],
      dataLabel: i18n.catalog["common.general.paymentType"],
      render: (item) => getBatchTypeLabel(item.batch_type),
    },
    {
      key: "status",
      header: i18n.catalog["common.general.status.alternative2"],
      dataLabel: i18n.catalog["common.general.status.alternative2"],
      render: (item) => getStatusBadge(item.status),
    },
    {
      key: "total_items",
      header: i18n.catalog["common.general.numberItems"],
      dataLabel: i18n.catalog["common.general.numberItems"],
      render: (item) => item.total_items || 0,
    },
    {
      key: "created_at",
      header: i18n.catalog["common.general.creationDate"],
      dataLabel: i18n.catalog["common.general.creationDate"],
      render: (item) => formatDate(item.created_at),
    },
    {
      key: "started_at",
      header: i18n.catalog["common.general.startDate.alternative2"],
      dataLabel: i18n.catalog["common.general.startDate.alternative2"],
      render: (item) => item.started_at ? formatDate(item.started_at) : "-",
    },
    {
      key: "completed_at",
      header: i18n.catalog["common.general.completionDate"],
      dataLabel: i18n.catalog["common.general.completionDate"],
      render: (item) => item.completed_at ? formatDate(item.completed_at) : "-",
    },
    {
      key: "actions",
      header: i18n.catalog["common.general.actions"],
      dataLabel: i18n.catalog["common.general.actions"],
      render: (item) => {
        const isPending = item.status?.toLowerCase() === "pending";
        return (
          <div className="action-buttons">
            <button
              className="icon-btn view"
              onClick={() => viewBatchItems(item.id)}
              title={i18n.catalog["enterpriseCore.batchProcessing.viewItems"]}
            >
              {getIcon("eye")}
            </button>
            {isPending && (
              <>
                <button
                  className="icon-btn edit"
                  onClick={() => confirmExecuteBatch(item.id)}
                  title={i18n.catalog["common.general.execute"]}
                >
                  {getIcon("check")}
                </button>
                <button
                  className="icon-btn delete"
                  onClick={() => confirmDeleteBatch(item.id)}
                  title={i18n.catalog["common.general.delete"]}
                >
                  {getIcon("trash")}
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const itemColumns: Column<BatchItem>[] = [
    {
      key: "id",
      header: "#",
      dataLabel: "#",
      render: (item, index) => index + 1,
    },
    {
      key: "item_data",
      header: i18n.catalog["common.general.itemDetails"],
      dataLabel: i18n.catalog["common.general.itemDetails"],
      render: (item) => {
        const dataStr = JSON.stringify(item.item_data || {}, null, 2);
        const truncated = dataStr.length > 100 ? dataStr.substring(0, 100) + "..." : dataStr;
        return (
          <span title={dataStr} style={{ maxWidth: "300px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {truncated}
          </span>
        );
      },
    },
    {
      key: "status",
      header: i18n.catalog["common.general.status.alternative2"],
      dataLabel: i18n.catalog["common.general.status.alternative2"],
      render: (item) => getItemStatusBadge(item.status),
    },
    {
      key: "error_message",
      header: i18n.catalog["common.general.errorMessage"],
      dataLabel: i18n.catalog["common.general.errorMessage"],
      render: (item) => item.error_message || "-",
    },
  ];

  return (
    <MainLayout requiredModule="batch_processing">

      <div className="sales-card animate-fade">
        <PageSubHeader
          user={user}
          showDate={true}
          actions={
            <Button
              variant="primary"
              onClick={openCreateDialog}
              icon="plus"
            >
              {i18n.catalog["enterpriseCore.batchProcessing.newPayment"]}</Button>
          }
        />
        <Table
          columns={columns}
          data={batches}
          keyExtractor={(item) => item.id}
          emptyMessage={i18n.catalog["enterpriseCore.batchProcessing.noPayments"]}
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: loadBatches,
          }}
        />
      </div>

      {/* Create Batch Dialog */}
      <Dialog
        isOpen={createDialog}
        onClose={closeCreateDialog}
        title={i18n.catalog["enterpriseCore.batchProcessing.createNewBatch"]}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeCreateDialog}>
              {i18n.catalog["common.general.cancel"]}</button>
            <button className="btn btn-primary" onClick={createBatch}>
              {i18n.catalog["common.general.create"]}</button>
          </>
        }
      >
        <form onSubmit={createBatch}>
          <div className="form-group">
            <label htmlFor="batch-name">{i18n.catalog["enterpriseCore.batchProcessing.batchName"]}</label>
            <input
              type="text"
              id="batch-name"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="batch-type">{i18n.catalog["enterpriseCore.batchProcessing.paymentType"]}</label>
            <select
              id="batch-type"
              value={batchType}
              onChange={(e) => setBatchType(e.target.value)}
              required
            >
              <option value="">{i18n.catalog["enterpriseCore.batchProcessing.selectPaymentType"]}</option>
              <option value="journal_entry_import">{i18n.catalog["common.general.importJournalEntries"]}</option>
              <option value="expense_posting">{i18n.catalog["common.general.postExpenses"]}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="batch-description">{i18n.catalog["common.general.description.alternative2"]}</label>
            <textarea
              id="batch-description"
              value={batchDescription}
              onChange={(e) => setBatchDescription(e.target.value)}
              rows={3}
            />
          </div>
        </form>
      </Dialog>

      {/* View Items Dialog */}
      <Dialog
        isOpen={itemsDialog}
        onClose={closeItemsDialog}
        title={i18n.catalog["enterpriseCore.batchProcessing.batchItems"]}
        maxWidth="900px"
      >
        {isLoadingItems ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
            <p style={{ marginTop: "1rem" }}>{i18n.catalog["common.general.loading"]}</p>
          </div>
        ) : batchItems.length === 0 ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
            {i18n.catalog["common.general.noItems.alternative2"]}</p>
        ) : (
          <Table
            columns={itemColumns}
            data={batchItems}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            emptyMessage={i18n.catalog["common.general.noItems.alternative2"]}
          />
        )}
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog}
        onClose={() => {
          setConfirmDialog(false);
          setDeleteBatchId(null);
          setExecuteBatchId(null);
        }}
        onConfirm={handleConfirm}
        title={i18n.catalog["common.general.confirm"]}
        message={
          deleteBatchId
            ? i18n.catalog["enterpriseCore.batchProcessing.areYouSureYouWantDeleteThisPayment"]
            : i18n.catalog["enterpriseCore.batchProcessing.areYouSureYouWantExecuteThisBatch"]
        }
        confirmText={deleteBatchId ? i18n.catalog["common.general.delete"] : i18n.catalog["common.general.execute"]}
        confirmVariant={deleteBatchId ? "danger" : "primary"}
      />
    </MainLayout>
  );
}
