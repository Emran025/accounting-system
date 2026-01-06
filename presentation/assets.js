let assets = [];
let currentAssetId = null;
let currentPage = 1;
let itemsPerPage = 20;

document.addEventListener("DOMContentLoaded", async function () {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;

  const searchInput = document.getElementById("params-search");
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadAssets();
      }, 400);
    });
  }

  await loadAssets();
});

async function loadAssets() {
  try {
    const searchValue = document.getElementById("params-search")?.value || "";
    const response = await fetch(
      `${API_BASE}?action=assets&page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(
        searchValue
      )}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const result = await response.json();
    if (result.success) {
      assets = result.data;
      renderAssets();
      renderPagination(result.pagination, "pagination-controls", (newPage) => {
        currentPage = newPage;
        loadAssets();
      });
    }
  } catch (error) {
    showAlert("alert-container", "خطأ في تحميل الأصول", "error");
  }
}

function renderAssets() {
  const tbody = document.getElementById("assets-tbody");
  if (!tbody) return;

  if (assets.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align: center; padding: 2rem;">لا توجد أصول مسجلة</td></tr>';
    return;
  }

  tbody.innerHTML = assets
    .map(
      (a) => `
        <tr class="animate-fade">
            <td>#${a.id}</td>
            <td><strong>${a.name}</strong></td>
            <td>${formatCurrency(a.value)}</td>
            <td>${formatDate(a.purchase_date, false)}</td>
            <td>${a.depreciation_rate || 0}%</td>
            <td><span class="badge badge-${getStatusClass(
              a.status
            )}">${translateStatus(a.status)}</span></td>
            <td><span class="badge badge-secondary">${
              a.recorder_name || "النظام"
            }</span></td>
            <td>
                <div class="action-buttons">
                    <button class="icon-btn edit" onclick="editAsset(${
                      a.id
                    })">${getIcon("edit")}</button>
                    <button class="icon-btn delete" onclick="deleteAsset(${
                      a.id
                    })">${getIcon("trash")}</button>
                </div>
            </td>
        </tr>
    `
    )
    .join("");
}

function translateStatus(status) {
  const statuses = {
    active: "نشط",
    maintenance: "في الصيانة",
    disposed: "مستبعد",
  };
  return statuses[status] || status;
}

function getStatusClass(status) {
  const classes = {
    active: "success",
    maintenance: "warning",
    disposed: "danger",
  };
  return classes[status] || "secondary";
}

function openAddDialog() {
  currentAssetId = null;
  document.getElementById("asset-dialog-title").textContent = "إضافة أصل جديد";
  document.getElementById("asset-form").reset();
  document.getElementById("asset-date").value = new Date()
    .toISOString()
    .split("T")[0];
  openDialog("asset-dialog");
}

function editAsset(id) {
  const a = assets.find((item) => item.id == id);
  if (!a) return;

  currentAssetId = id;
  document.getElementById("asset-dialog-title").textContent =
    "تعديل بيانات الأصل";
  document.getElementById("asset-name").value = a.name;
  document.getElementById("asset-value").value = a.value;
  document.getElementById("asset-depreciation").value = a.depreciation_rate;
  document.getElementById("asset-date").value = a.purchase_date;
  document.getElementById("asset-status").value = a.status;
  document.getElementById("asset-description").value = a.description || "";

  openDialog("asset-dialog");
}

async function saveAsset() {
  const name = document.getElementById("asset-name").value;
  const value = document.getElementById("asset-value").value;
  const date = document.getElementById("asset-date").value;
  const depreciation = document.getElementById("asset-depreciation").value;
  const status = document.getElementById("asset-status").value;
  const description = document.getElementById("asset-description").value;

  if (!name || !value || !date) {
    showAlert("alert-container", "يرجى ملء جميع الحقول المطلوبة", "error");
    return;
  }

  const btn = document.getElementById("save-asset-btn");
  btn.disabled = true;

  try {
    const method = currentAssetId ? "PUT" : "POST";
    const body = {
      name,
      value: parseFloat(value),
      purchase_date: date,
      depreciation_rate: parseFloat(depreciation),
      status,
      description,
    };
    if (currentAssetId) body.id = currentAssetId;

    const response = await fetch(`${API_BASE}?action=assets`, {
      method: method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (result.success) {
      showAlert("alert-container", "تم الحفظ بنجاح", "success");
      closeDialog("asset-dialog");
      loadAssets();
    } else {
      showAlert("alert-container", result.message, "error");
    }
  } catch (e) {
    showAlert("alert-container", "خطأ في الاتصال بالسيرفر", "error");
  } finally {
    btn.disabled = false;
  }
}

async function deleteAsset(id) {
  if (!(await showConfirm("هل أنت متأكد من حذف هذا الأصل؟"))) return;

  try {
    const response = await fetch(`${API_BASE}?action=assets&id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const result = await response.json();
    if (result.success) {
      showAlert("alert-container", "تم الحذف بنجاح", "success");
      loadAssets();
    } else {
      showAlert("alert-container", result.message, "error");
    }
  } catch (e) {
    showAlert("alert-container", "خطأ في الحذف", "error");
  }
}
