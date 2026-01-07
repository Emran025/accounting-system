let revenues = [];
let currentRevenueId = null;
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
        loadRevenues();
      }, 400);
    });
  }

  await loadRevenues();
});

async function loadRevenues() {
  try {
    const searchValue = document.getElementById("params-search")?.value || "";
    const response = await fetch(
      `${API_BASE}?action=revenues&page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(
        searchValue
      )}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const result = await response.json();
    if (result.success) {
      revenues = result.data;
      renderRevenues();
      renderPagination(result.pagination, "pagination-controls", (newPage) => {
        currentPage = newPage;
        loadRevenues();
      });
    }
  } catch (error) {
    showAlert("alert-container", "خطأ في تحميل الإيرادات", "error");
  }
}

function renderRevenues() {
  const tbody = document.getElementById("revenues-tbody");
  if (!tbody) return;

  if (revenues.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center; padding: 2rem;">لا توجد إيرادات مسجلة</td></tr>';
    return;
  }

  tbody.innerHTML = revenues
    .map(
      (r) => `
        <tr class="animate-fade">
            <td>#${r.id}</td>
            <td><strong>${r.source}</strong></td>
            <td class="text-success" style="font-weight: 600;">${formatCurrency(
              r.amount
            )}</td>
            <td>${formatDate(r.revenue_date)}</td>
            <td>${r.description || "-"}</td>
            <td><span class="badge badge-secondary">${
              r.recorder_name || "النظام"
            }</span></td>
            <td>
                <div class="action-buttons">
                    <button class="icon-btn edit" onclick="editRevenue(${
                      r.id
                    })">${getIcon("edit")}</button>
                    <button class="icon-btn delete" onclick="deleteRevenue(${
                      r.id
                    })">${getIcon("trash")}</button>
                </div>
            </td>
        </tr>
    `
    )
    .join("");
}

function openAddDialog() {
  currentRevenueId = null;
  document.getElementById("revenue-dialog-title").textContent =
    "إضافة إيراد جديد";
  document.getElementById("revenue-form").reset();
  document.getElementById("revenue-date").value = new Date()
    .toISOString()
    .slice(0, 16);
  openDialog("revenue-dialog");
}

function editRevenue(id) {
  const r = revenues.find((item) => item.id == id);
  if (!r) return;

  currentRevenueId = id;
  document.getElementById("revenue-dialog-title").textContent = "تعديل الإيراد";
  document.getElementById("revenue-source").value = r.source;
  document.getElementById("revenue-amount").value = r.amount;
  document.getElementById("revenue-date").value = new Date(r.revenue_date)
    .toISOString()
    .slice(0, 16);
  document.getElementById("revenue-description").value = r.description || "";

  openDialog("revenue-dialog");
}

async function saveRevenue() {
  const source = document.getElementById("revenue-source").value;
  const amount = document.getElementById("revenue-amount").value;
  const date = document.getElementById("revenue-date").value;
  const description = document.getElementById("revenue-description").value;

  if (!source || !amount || !date) {
    showAlert("alert-container", "يرجى ملء جميع الحقول المطلوبة", "error");
    return;
  }

  const btn = document.getElementById("save-revenue-btn");
  btn.disabled = true;

  try {
    const method = currentRevenueId ? "PUT" : "POST";
    const body = {
      source,
      amount: parseFloat(amount),
      revenue_date: date + ":00",
      description,
    };
    if (currentRevenueId) body.id = currentRevenueId;

    const response = await fetch(`${API_BASE}?action=revenues`, {
      method: method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (result.success) {
      showAlert("alert-container", "تم الحفظ بنجاح", "success");
      closeDialog("revenue-dialog");
      loadRevenues();
    } else {
      showAlert("alert-container", result.message, "error");
    }
  } catch (e) {
    showAlert("alert-container", "خطأ في الاتصال بالسيرفر", "error");
  } finally {
    btn.disabled = false;
  }
}

async function deleteRevenue(id) {
  if (!(await showConfirm("هل أنت متأكد من حذف هذا السجل؟"))) return;

  try {
    const response = await fetch(`${API_BASE}?action=revenues&id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const result = await response.json();
    if (result.success) {
      showAlert("alert-container", "تم الحذف بنجاح", "success");
      loadRevenues();
    } else {
      showAlert("alert-container", result.message, "error");
    }
  } catch (e) {
    showAlert("alert-container", "خطأ في الحذف", "error");
  }
}
