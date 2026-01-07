let currentPage = 1;
let currentLimit = 20;
let customerId = 0;
let activeFilters = {
  search: "",
  type: "",
  date_from: "",
  date_to: "",
  show_deleted: false,
};

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();

  const urlParams = new URLSearchParams(window.location.search);
  customerId = urlParams.get("customer_id");

  if (!customerId) {
    window.location.href = "ar_customers.html";
    return;
  }

  fetchCustomerDetails();
  fetchLedger();
});

async function fetchCustomerDetails() {
  const result = await fetchAPI(`ar_customers?id=${customerId}`);
  if (result.success && result.data.length > 0) {
    const customer = result.data[0];
    document.getElementById(
      "customer-name-header"
    ).textContent = `كشف حساب: ${customer.name}`;
    document.getElementById("customer-phone-header").textContent = `${
      customer.phone || ""
    } | ${customer.tax_number || ""}`;
  }
}

async function fetchLedger(page = 1) {
  currentPage = page;
  const offset = (page - 1) * currentLimit;

  // Check checkbox
  activeFilters.show_deleted = document.getElementById("show-deleted").checked;

  let params = `customer_id=${customerId}&limit=${currentLimit}&offset=${offset}&show_deleted=${activeFilters.show_deleted}`;
  if (activeFilters.search) params += `&search=${activeFilters.search}`;
  if (activeFilters.type) params += `&type=${activeFilters.type}`;
  if (activeFilters.date_from)
    params += `&date_from=${activeFilters.date_from}`;
  if (activeFilters.date_to) params += `&date_to=${activeFilters.date_to}`;

  const tbody = document.getElementById("ledger-tbody");
  tbody.innerHTML =
    '<tr><td colspan="8" class="text-center">جاري التحميل...</td></tr>';

  try {
    const result = await fetchAPI(`ar_ledger?${params}`);
    if (result.success) {
      renderTable(result.data, result.pagination);
      updateStats(result.stats);
    } else {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${result.message}</td></tr>`;
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">خطأ في الاتصال</td></tr>`;
  }
}

function renderTable(items, pagination) {
  const tbody = document.getElementById("ledger-tbody");
  tbody.innerHTML = "";

  if (!items || items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center">لا توجد عمليات</td></tr>';
    document.getElementById("pagination-controls").style.display = "none";
    return;
  }

  items.forEach((item) => {
    const tr = document.createElement("tr");
    const isDeleted = item.is_deleted == 1;
    if (isDeleted) tr.classList.add("deleted-row");

    const date = new Date(item.transaction_date).toLocaleString("ar-EG");
    let typeName = "";
    if (item.type === "invoice") typeName = "فاتورة مبيعات";
    else if (item.type === "payment") typeName = "سند قبض";
    else if (item.type === "return") typeName = "مرتجع";
    else typeName = item.type;

    // Debit (Invoice) vs Credit (Payment/Return)
    let debit = 0,
      credit = 0;
    if (item.type === "invoice") debit = parseFloat(item.amount);
    else credit = parseFloat(item.amount);

    const canEdit =
      !isDeleted &&
      new Date() - new Date(item.transaction_date) < 48 * 60 * 60 * 1000;

    tr.innerHTML = `
            <td>${item.id}</td>
            <td style="font-size: 0.9em; direction: ltr; text-align: right;">${date}</td>
            <td><span class="badge ${
              item.type === "invoice" ? "badge-primary" : "badge-success"
            }">${typeName}</span></td>
            <td>${item.description || "-"} ${isDeleted ? "(محذوف)" : ""}</td>
            <td class="text-danger font-bold">${
              debit > 0 ? formatCurrency(debit) : "-"
            }</td>
            <td class="text-success font-bold">${
              credit > 0 ? formatCurrency(credit) : "-"
            }</td>
            <td>${item.created_by || "-"}</td>
            <td>
                <div class="action-buttons">
                    ${
                      isDeleted
                        ? `<button class="icon-btn edit" onclick="restoreTransaction(${
                            item.id
                          })" title="استعادة">${getIcon("check")}</button>`
                        : `
                         ${
                           canEdit
                             ? `<button class="icon-btn edit" onclick='openEditTransaction(${JSON.stringify(
                                 item
                               )})' title="تعديل">${getIcon("edit")}</button>`
                             : ""
                         }
                         <button class="icon-btn delete" onclick="deleteTransaction(${
                           item.id
                         })" title="حذف">${getIcon("trash")}</button>
                        `
                    }
                    ${
                      item.reference_type === "invoices"
                        ? `<button class="icon-btn view" onclick="viewInvoice(${
                            item.reference_id
                          })" title="عرض الفاتورة">${getIcon("eye")}</button>`
                        : ""
                    }
                </div>
            </td>
        `;
    tbody.appendChild(tr);
  });

  renderPagination(
    {
      current_page: pagination.current_page,
      total_pages: pagination.total_pages,
      total_records: pagination.total_records,
      per_page: pagination.per_page,
    },
    "pagination-controls",
    (newPage) => fetchLedger(newPage)
  );
}

function updateStats(stats) {
  document.getElementById("stat-debit").textContent = formatCurrency(
    stats.total_debit || 0
  );
  document.getElementById("stat-credit").textContent = formatCurrency(
    stats.total_credit || 0
  );
  document.getElementById("stat-balance").textContent = formatCurrency(
    stats.balance || 0
  );
  document.getElementById("stat-count").textContent =
    stats.transaction_count || 0;

  const balanceEl = document.getElementById("stat-balance");
  const bal = parseFloat(stats.balance || 0);
  balanceEl.className =
    "value " + (bal > 0 ? "text-danger" : bal < 0 ? "text-success" : "");
}

function openFilterDialog() {
  openDialog("filter-dialog");
}

function applyFilter() {
  activeFilters.date_from = document.getElementById("filter-from").value;
  activeFilters.date_to = document.getElementById("filter-to").value;
  activeFilters.type = document.getElementById("filter-type").value;
  closeDialog("filter-dialog");
  fetchLedger(1);
}

function openAddTransactionDialog() {
  document.getElementById("trans-form").reset();
  document.getElementById("trans-id").value = "";
  document.getElementById("trans-date").valueAsDate = new Date();
  document.getElementById("trans-dialog-title").textContent =
    "تسجيل عملية جديدة";
  openDialog("transaction-dialog");
}

function openEditTransaction(item) {
  document.getElementById("trans-form").reset();
  document.getElementById("trans-id").value = item.id;
  document.getElementById("trans-type").value = item.type;
  document.getElementById("trans-type").disabled = true; // Cannot change type on edit
  document.getElementById("trans-amount").value = item.amount;

  // Parse date for input type=date (YYYY-MM-DD)
  const d = new Date(item.transaction_date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  document.getElementById("trans-date").value = `${yyyy}-${mm}-${dd}`;
  document.getElementById("trans-date").disabled = true; // Cannot change date usually

  document.getElementById("trans-desc").value = item.description;
  document.getElementById("trans-dialog-title").textContent = "تعديل عملية";
  openDialog("transaction-dialog");
}

async function saveTransaction() {
  const id = document.getElementById("trans-id").value;
  const type = document.getElementById("trans-type").value;
  const amount = document.getElementById("trans-amount").value;
  const date = document.getElementById("trans-date").value;
  const description = document.getElementById("trans-desc").value;

  if (!amount || amount <= 0) {
    showToast("المبلغ مطلوب", "error");
    return;
  }

  const data = {
    customer_id: customerId,
    type,
    amount,
    date,
    description,
  };
  if (id) data.id = id;

  // Use query param for action logic if needed, but PUT/POST separation handles it.
  // Wait, ArController logic checks method.
  // POST = create
  // PUT = update
  const method = id ? "PUT" : "POST";
  const url = id ? `ar_ledger` : `ar_ledger`;

  const result = await fetchAPI(url, method, data);

  if (result.success) {
    showToast("تم الحفظ بنجاح", "success");
    closeDialog("transaction-dialog");
    fetchLedger(currentPage);
    fetchCustomerDetails(); // refresh header balance if we added it?
  } else {
    showToast(result.message || "خطأ", "error");
  }
}

// Invoice Detail Viewing (Same as sales.js for consistent UI)
async function viewInvoice(id) {
  try {
    const response = await fetch(
      `${API_BASE}?action=invoice_details&id=${id}`,
      {
        credentials: "include",
      }
    );
    const result = await response.json();

    if (result.success) {
      const inv = result.data;
      const dialogBody = document.getElementById("view-dialog-body");

      dialogBody.innerHTML = `
                <div class="invoice-details-header" style="margin-bottom: 2rem; border-bottom: 2px solid var(--border-color); padding-bottom: 1rem;">
                    <div class="form-row">
                        <div class="summary-stat">
                            <span class="stat-label">رقم الفاتورة</span>
                            <span class="stat-value">${
                              inv.invoice_number
                            }</span>
                        </div>
                        <div class="summary-stat">
                            <span class="stat-label">التاريخ</span>
                            <span class="stat-value">${formatDate(
                              inv.created_at,
                              true
                            )}</span>
                        </div>
                        ${
                          inv.payment_type === "credit"
                            ? `
                            <div class="summary-stat">
                                <span class="stat-label">نوع الدفع</span>
                                <span class="stat-value"><span class="badge badge-warning">آجل (ذمم)</span></span>
                            </div>
                            `
                            : `
                            <div class="summary-stat">
                                <span class="stat-label">نوع الدفع</span>
                                <span class="stat-value"><span class="badge badge-success">نقدي</span></span>
                            </div>
                            `
                        }
                    </div>
                    ${
                      inv.customer_name
                        ? `
                        <div class="form-row" style="margin-top: 1rem; background: var(--surface-hover); padding: 1rem; border-radius: var(--radius-md);">
                            <div class="summary-stat">
                                <span class="stat-label">العميل</span>
                                <span class="stat-value">${
                                  inv.customer_name
                                }</span>
                            </div>
                            ${
                              inv.customer_phone
                                ? `
                                <div class="summary-stat">
                                    <span class="stat-label">الهاتف</span>
                                    <span class="stat-value">${inv.customer_phone}</span>
                                </div>
                            `
                                : ""
                            }
                            ${
                              inv.customer_tax
                                ? `
                                <div class="summary-stat">
                                    <span class="stat-label">الرقم الضريبي</span>
                                    <span class="stat-value">${inv.customer_tax}</span>
                                </div>
                            `
                                : ""
                            }
                        </div>
                    `
                        : ""
                    }
                    ${
                      inv.payment_type === "credit"
                        ? `
                        <div class="form-row" style="margin-top: 1rem;">
                            <div class="summary-stat">
                                <span class="stat-label">المبلغ المدفوع</span>
                                <span class="stat-value" style="color: var(--success-color);">${formatCurrency(
                                  inv.amount_paid || 0
                                )}</span>
                            </div>
                            <div class="summary-stat">
                                <span class="stat-label">المبلغ المتبقي</span>
                                <span class="stat-value" style="color: var(--danger-color); font-weight: 700;">${formatCurrency(
                                  inv.total_amount - (inv.amount_paid || 0)
                                )}</span>
                            </div>
                        </div>
                    `
                        : ""
                    }
                </div>

                <div class="invoice-items-minimal">
                    <h4 style="margin-bottom: 1rem;">المنتجات المباعة:</h4>
                    ${inv.items
                      .map(
                        (item) => `
                        <div class="item-row-minimal">
                            <div class="item-info-pkg">
                                <span class="item-name-pkg">${
                                  item.product_name
                                }</span>
                                <span class="item-meta-pkg">سعر الوحدة: ${formatCurrency(
                                  item.unit_price
                                )}</span>
                            </div>
                            <div class="item-info-pkg" style="text-align: left;">
                                <span class="item-name-pkg">${formatCurrency(
                                  item.subtotal
                                )}</span>
                                <span class="item-meta-pkg">الكمية: ${
                                  item.quantity
                                }</span>
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>

                <div class="sales-summary-bar" style="margin-top: 2rem; background: var(--grad-primary); color: white;">
                    <div class="summary-stat">
                        <span class="stat-label" style="color: rgba(255,255,255,0.8);">المبلغ الإجمالي</span>
                        <span class="stat-value highlight" style="color: white;">${formatCurrency(
                          inv.total_amount
                        )}</span>
                    </div>
                </div>
            `;
      openDialog("view-dialog");
    }
  } catch (error) {
    showToast("خطأ في جلب التفاصيل", "error");
  }
}

async function deleteTransaction(id) {
  const confirmed = await showConfirm(
    "هل أنت متأكد من حذف هذه العملية (حذف مؤقت)؟"
  );
  if (!confirmed) return;

  const result = await fetchAPI(`ar_ledger?id=${id}`, "DELETE");
  if (result.success) {
    showToast("تم الحذف بنجاح", "success");
    fetchLedger(currentPage);
  } else {
    showToast(result.message || "خطأ", "error");
  }
}

async function restoreTransaction(id) {
  const result = await fetchAPI(`ar_ledger&sub_action=restore`, "POST", { id });
  if (result.success) {
    showToast("تم الاستعادة بنجاح", "success");
    fetchLedger(currentPage);
  } else {
    showToast(result.message || "خطأ", "error");
  }
}
