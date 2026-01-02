let purchases = [];
let products = [];
let currentPurchaseId = null;
let currentPage = 1;
let itemsPerPage = 20;
let totalItems = 0;

// Initialize
document.addEventListener("DOMContentLoaded", async function () {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;

  // Setup Search
  const searchInput = document.getElementById("params-search");
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1; // Reset to first page on search
        loadPurchases();
      }, 400); // 400ms debounce
    });
  }

  await loadProducts();
  await loadPurchases();
});

// Load purchases
async function loadPurchases() {
  try {
    const searchInput = document.getElementById("params-search");
    const searchValue = searchInput ? searchInput.value : "";

    const response = await fetch(
      `${API_BASE}?action=purchases&page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(
        searchValue
      )}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const result = await response.json();
    if (result.success) {
      purchases = result.data;
      totalItems = result.pagination.total_records;
      renderPurchases();

      // Centralized numeric pagination
      renderPagination(result.pagination, "pagination-controls", (newPage) => {
        currentPage = newPage;
        loadPurchases();
      });
    }
  } catch (error) {
    showAlert("alert-container", "خطأ في تحميل المشتريات", "error");
  }
}

// Load products for dropdown
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}?action=products`, {
      method: "GET",
      credentials: "include",
    });
    const result = await response.json();
    if (result.success) {
      products = result.data;
      const select = document.getElementById("purchase-product");
      if (!select) return;
      select.innerHTML = '<option value="">-- اختر منتجاً --</option>';
      products.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
      });
      select.addEventListener("change", onPurchaseUnitChange);
    }
  } catch (error) {
    console.error("Error loading products", error);
  }
}

function onPurchaseUnitChange() {
  const productId = document.getElementById("purchase-product").value;
  const unitType = document.getElementById("purchase-unit-type").value;
  const infoLabel = document.getElementById("unit-info-label");

  if (!productId) {
    if (infoLabel) infoLabel.textContent = "";
    return;
  }

  const p = products.find((item) => item.id == productId);
  if (!p) {
    if (infoLabel) infoLabel.textContent = "";
    return;
  }

  if (infoLabel) {
    if (unitType === "main") {
      infoLabel.textContent = `الكرتون الواحد يحتوي على ${
        p.items_per_unit || 1
      } ${p.sub_unit_name || "حبة"}`;
    } else {
      infoLabel.textContent = `الشراء بالوحدة الفردية (${
        p.sub_unit_name || "حبة"
      })`;
    }
  }
}

function renderPurchases() {
  const tbody = document.getElementById("purchases-tbody");
  if (!tbody) return;

  if (purchases.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center; padding: 2rem;">لا توجد مشتريات مسجلة</td></tr>';
    return;
  }

  tbody.innerHTML = purchases
    .map((p) => {
      const createdDate = new Date(p.purchase_date);
      const hoursPassed = (new Date() - createdDate) / (1000 * 60 * 60);
      const canEdit = hoursPassed < 24;

      return `
            <tr class="animate-fade">
                <td>#${p.id}</td>
                <td><strong>${p.product_name}</strong></td>
                <td>${p.quantity} ${
        p.unit_type === "main"
          ? p.unit_name || "كرتون"
          : p.sub_unit_name || "حبة"
      }</td>
                <td>${formatCurrency(p.invoice_price)}</td>
                <td>${formatDate(p.purchase_date)}</td>
                <td><span class="badge badge-secondary">${
                  p.recorder_name || "النظام"
                }</span></td>
                <td>

                    <div class="action-buttons">
                        <button class="icon-btn view" onclick="viewPurchase(${
                          p.id
                        })">${getIcon("eye")}</button>
                        ${
                          canEdit
                            ? `
                            <button class="icon-btn edit" onclick="editPurchase(${
                              p.id
                            })">${getIcon("edit")}</button>
                            <button class="icon-btn delete" onclick="deletePurchase(${
                              p.id
                            })">${getIcon("trash")}</button>
                        `
                            : ""
                        }
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

function openAddDialog() {
  currentPurchaseId = null;
  const title = document.getElementById("purchase-dialog-title");
  if (title) title.textContent = "إضافة شراء جديد";

  const form = document.getElementById("purchase-form");
  if (form) form.reset();

  const dateInput = document.getElementById("purchase-date");
  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 16);
  }

  setFormDisabled(false);
  const saveBtn = document.getElementById("save-purchase-btn");
  if (saveBtn) saveBtn.style.display = "inline-flex";

  openDialog("purchase-dialog");
}

function viewPurchase(id) {
  const p = purchases.find((item) => item.id == id);
  if (!p) return;

  const viewBody = document.getElementById("view-dialog-body");
  if (!viewBody) return;

  viewBody.innerHTML = `
        <div class="invoice-items-minimal">
            <div class="item-row-minimal">
                <div class="item-info-pkg">
                    <span class="stat-label">المنتج</span>
                    <span class="item-name-pkg">${p.product_name}</span>
                </div>
            </div>
            <div class="form-row">
                <div class="item-row-minimal">
                    <div class="item-info-pkg">
                        <span class="stat-label">الكمية</span>
                        <span class="item-name-pkg">${p.quantity} ${
    p.unit_type === "main" ? p.unit_name || "كرتون" : p.sub_unit_name || "حبة"
  }</span>
                    </div>
                </div>
                <div class="item-row-minimal">
                    <div class="item-info-pkg">
                        <span class="stat-label">سعر الفاتورة</span>
                        <span class="item-name-pkg">${formatCurrency(
                          p.invoice_price
                        )}</span>
                    </div>
                </div>
            </div>
            <div class="item-row-minimal">
                <div class="item-info-pkg">
                    <span class="stat-label">تاريخ الشراء</span>
                    <span class="item-name-pkg">${formatDate(
                      p.purchase_date
                    )}</span>
                </div>
            </div>
        </div>
    `;
  openDialog("view-dialog");
}

function editPurchase(id) {
  const p = purchases.find((item) => item.id == id);
  if (!p) return;

  currentPurchaseId = id;
  const title = document.getElementById("purchase-dialog-title");
  if (title) title.textContent = "تعديل بيانات الشراء";

  document.getElementById("purchase-product").value = p.product_id;
  document.getElementById("purchase-unit-type").value = p.unit_type || "sub";
  document.getElementById("purchase-quantity").value = p.quantity;
  document.getElementById("purchase-price").value = p.invoice_price;
  document.getElementById("purchase-date").value = new Date(p.purchase_date)
    .toISOString()
    .slice(0, 16);
  onPurchaseUnitChange();

  setFormDisabled(false);
  const saveBtn = document.getElementById("save-purchase-btn");
  if (saveBtn) saveBtn.style.display = "inline-flex";

  openDialog("purchase-dialog");
}

function setFormDisabled(disabled) {
  const form = document.getElementById("purchase-form");
  if (!form) return;
  const elements = form.querySelectorAll("input, select");
  elements.forEach((el) => (el.disabled = disabled));
}

async function savePurchase() {
  const product_id = document.getElementById("purchase-product").value;
  const quantity = document.getElementById("purchase-quantity").value;
  const unit_type = document.getElementById("purchase-unit-type").value;
  const invoice_price = document.getElementById("purchase-price").value;
  const purchase_date = document.getElementById("purchase-date").value;

  if (!product_id || !quantity || !invoice_price) {
    showAlert("alert-container", "يرجى ملء جميع الحقول المطلوبة", "error");
    return;
  }

  const btn = document.getElementById("save-purchase-btn");
  if (btn) btn.disabled = true;

  try {
    const method = currentPurchaseId ? "PUT" : "POST";
    const body = {
      product_id: parseInt(product_id),
      quantity: parseInt(quantity),
      unit_type: unit_type,
      invoice_price: parseFloat(invoice_price),
      purchase_date: purchase_date + ":00",
    };
    if (currentPurchaseId) body.id = currentPurchaseId;

    const response = await fetch(`${API_BASE}?action=purchases`, {
      method: method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (result.success) {
      showAlert("alert-container", "تم الحفظ بنجاح", "success");
      closeDialog("purchase-dialog");
      await loadPurchases();
    } else {
      showAlert("alert-container", result.message, "error");
    }
  } catch (e) {
    showAlert("alert-container", "خطأ في الاتصال بالسيرفر", "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function deletePurchase(id) {
  if (!(await showConfirm("هل أنت متأكد من حذف هذا السجل؟"))) return;

  try {
    const response = await fetch(`${API_BASE}?action=purchases&id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const result = await response.json();
    if (result.success) {
      showAlert("alert-container", "تم الحذف بنجاح", "success");
      await loadPurchases();
    } else {
      showAlert("alert-container", result.message, "error");
    }
  } catch (e) {
    showAlert("alert-container", "خطأ في الحذف", "error");
  }
}
