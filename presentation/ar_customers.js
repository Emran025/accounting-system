let currentPage = 1;
let currentLimit = 10;
let debounceTimer;

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  fetchCustomers();

  // Search input
  document.getElementById("params-search").addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchCustomers(1, e.target.value);
    }, 300);
  });
  // Real-time suggestions in Add/Edit Dialog
  const nameInput = document.getElementById("customer-name");
  nameInput.addEventListener("input", handleNameInput);
});

async function fetchCustomers(page = 1, search = "") {
  currentPage = page;
  const offset = (page - 1) * currentLimit;

  // Show loading
  const tbody = document.getElementById("customers-tbody");
  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align: center; padding: 2rem">جاري التحميل...</td></tr>';

  try {
    const result = await fetchAPI(
      `ar_customers?limit=${currentLimit}&offset=${offset}&search=${search}`
    );
    if (result.success) {
      renderTable(result.data, result.pagination);
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">${result.message}</td></tr>`;
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">فشل الاتصال بالخادم</td></tr>`;
  }
}

function renderTable(customers, pagination) {
  const tbody = document.getElementById("customers-tbody");
  tbody.innerHTML = "";

  if (!customers || customers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 2rem">لا يوجد عملاء</td></tr>';
    document.getElementById("pagination-controls").style.display = "none";
    return;
  }

  customers.forEach((customer) => {
    const tr = document.createElement("tr");
    const balance = parseFloat(customer.current_balance || 0);
    const balanceClass =
      balance > 0 ? "text-danger" : balance < 0 ? "text-success" : ""; // Positive = Debt (Debit), Negative = Credit (Overpaid) -> Usually AR: Positive is Owed by customer.

    tr.innerHTML = `
            <td>${customer.id}</td>
            <td style="font-weight: 500;">${customer.name}</td>
            <td>${customer.phone || "-"}</td>
            <td>${customer.tax_number || "-"}</td>
            <td class="${balanceClass}" style="direction: ltr; text-align: right;">${formatCurrency(
      balance
    )}</td>
            <td>
                <div class="action-buttons">
                    <button class="icon-btn view" onclick="viewLedger(${
                      customer.id
                    })" title="كشف حساب">${getIcon("eye")}</button>
                    <button class="icon-btn edit" onclick='openEditDialog(${JSON.stringify(
                      customer
                    )})' title="تعديل">${getIcon("edit")}</button>
                    <button class="icon-btn delete" onclick="deleteCustomer(${
                      customer.id
                    })" title="حذف">${getIcon("trash")}</button>
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
    (newPage) =>
      fetchCustomers(newPage, document.getElementById("params-search").value)
  );
}

function openAddDialog() {
  document.getElementById("customer-form").reset();
  document.getElementById("customer-id").value = "";
  document.getElementById("dialog-title").textContent = "إضافة عميل";
  document.getElementById("name-warning").style.display = "none";
  openDialog("customer-dialog");
}

function openEditDialog(customer) {
  document.getElementById("customer-form").reset();
  document.getElementById("customer-id").value = customer.id;
  document.getElementById("customer-name").value = customer.name;
  document.getElementById("customer-phone").value = customer.phone || "";
  document.getElementById("customer-email").value = customer.email || "";
  document.getElementById("customer-address").value = customer.address || "";
  document.getElementById("customer-tax").value = customer.tax_number || "";

  document.getElementById("dialog-title").textContent = "تعديل بيانات عميل";
  document.getElementById("name-warning").style.display = "none";
  openDialog("customer-dialog");
}

async function saveCustomer() {
  const id = document.getElementById("customer-id").value;
  const name = document.getElementById("customer-name").value;
  const phone = document.getElementById("customer-phone").value;
  const email = document.getElementById("customer-email").value;
  const address = document.getElementById("customer-address").value;
  const tax_number = document.getElementById("customer-tax").value;

  if (!name) {
    showToast("يرجى إدخال اسم العميل", "error");
    return;
  }

  const data = { name, phone, email, address, tax_number };
  if (id) data.id = id;

  const method = id ? "PUT" : "POST";
  const result = await fetchAPI("ar_customers", method, data);

  if (result.success) {
    showToast(
      id ? "تم تحديث البيانات بنجاح" : "تم إضافة العميل بنجاح",
      "success"
    );
    closeDialog("customer-dialog");
    fetchCustomers(currentPage);
  } else {
    showToast(result.message || "حدث خطأ", "error");
  }
}

async function deleteCustomer(id) {
  const confirmed = await showConfirm(
    "هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء."
  );
  if (!confirmed) return;

  const result = await fetchAPI(`ar_customers?id=${id}`, "DELETE");
  if (result.success) {
    showToast("تم الحذف بنجاح", "success");
    fetchCustomers(currentPage);
  } else {
    showToast(
      result.message || "لا يمكن حذف العميل (قد يكون لديه تعاملات)",
      "error"
    );
  }
}

function viewLedger(id) {
  window.location.href = `ar_ledger.html?customer_id=${id}`;
}

async function handleNameInput(e) {
  const value = e.target.value.trim();
  const suggestionsBox = document.getElementById("name-suggestions");
  const warning = document.getElementById("name-warning");

  if (value.length < 2) {
    suggestionsBox.style.display = "none";
    warning.style.display = "none";
    return;
  }

  // Only search if not currently editing (or search excluding self? backend doesn't support exclude yet)
  // For "Add", it's crucial.
  const isEdit = document.getElementById("customer-id").value !== "";
  if (isEdit) return;

  const result = await fetchAPI(`ar_customers?limit=5&search=${value}`);
  if (result.success && result.data.length > 0) {
    // Filter out exact matches if any
    const exactMatch = result.data.find(
      (c) => c.name.toLowerCase() === value.toLowerCase()
    );

    // Show warning
    warning.style.display = "block";
    warning.textContent = `يوجد ${result.data.length} عملاء بأسماء مشابهة!`;

    // Show suggestions
    suggestionsBox.innerHTML = result.data
      .map(
        (c) => `
            <div class="dropdown-item" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #eee;" onclick="alert('هذا العميل موجود بالفعل')">
                <strong>${c.name}</strong> - ${c.phone || ""}
            </div>
        `
      )
      .join("");
    suggestionsBox.style.display = "block";
  } else {
    suggestionsBox.style.display = "none";
    warning.style.display = "none";
  }
}
