let currentPage = 1;
let itemsPerPage = 10;
let totalItems = 0;

document.addEventListener("DOMContentLoaded", async function () {
  const user = await checkAuth();
  if (!user) return;

  const isAdmin = user.role === "admin";

  // Role-based visibility for Tabs
  if (!isAdmin) {
    const adminTabs = document.querySelectorAll(
      '.tab-btn[data-tab="store"], .tab-btn[data-tab="invoices"]'
    );
    adminTabs.forEach((t) => (t.style.display = "none"));

    // Default to account tab for non-admins
    switchTab("account");

    // Update page title for non-admins
    const title = document.querySelector(".header-title h1");
    if (title) title.textContent = "إعدادات الحساب";
    const subTitle = document.querySelector(".header-title p");
    if (subTitle) subTitle.textContent = "تغيير كلمة المرور وإدارة الجلسات";
  } else {
    await loadSettings();
  }

  await loadSessions();

  // Tab Switching Logic
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // Save buttons (multiple sections)
  document.querySelectorAll(".save-trigger").forEach((btn) => {
    btn.addEventListener("click", saveSettings);
  });

  document
    .getElementById("preview-invoice-btn")
    ?.addEventListener("click", previewInvoice);

  document
    .getElementById("print-test-btn")
    ?.addEventListener("click", () => {
      const iframe = document.getElementById("preview-iframe");
      if (iframe) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    });

  // Enable Live Preview Updates
  const settingInputs = [
    "store_name",
    "store_address",
    "store_phone",
    "tax_number",
    "invoice_size",
    "footer_message",
    "currency_symbol",
  ];
  settingInputs.forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      const dialog = document.getElementById("preview-invoice-dialog");
      if (dialog && dialog.classList.contains("active")) {
        renderPreview();
      }
    });
  });

  document
    .getElementById("changePasswordForm")
    ?.addEventListener("submit", handlePasswordChange);
});

/**
 * Switch between settings tabs
 */
function switchTab(tabId) {
  // Update buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });

  // Update content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === `tab-${tabId}`);
  });
}

async function handlePasswordChange(e) {
  e.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (newPassword !== confirmPassword) {
    showToast("كلمتا المرور غير متطابقتين", "error");
    return;
  }

  try {
    const response = await fetchAPI("change_password", "POST", {
      current_password: currentPassword,
      new_password: newPassword,
    });

    if (response.success) {
      showToast("تم تغيير كلمة المرور بنجاح", "success");
      document.getElementById("changePasswordForm").reset();
    } else {
      showToast(response.message || "فشل تغيير كلمة المرور", "error");
    }
  } catch (error) {
    console.error("Error changing password:", error);
    showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
  }
}

async function loadSessions() {
  const tbody = document.getElementById("sessionsTable");
  if (!tbody) return;

  try {
    const response = await fetch(
      `${API_BASE}?action=my_sessions&page=${currentPage}&limit=${itemsPerPage}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const result = await response.json();
    if (result.success) {
      const sessions = result.data;
      totalItems = result.pagination.total_records;
      tbody.innerHTML = "";

      if (sessions.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="4" style="text-align: center; padding: 20px;">لا توجد جلسات نشطة</td></tr>';
        return;
      }

      sessions.forEach((session) => {
        const isCurrent = session.is_current;
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                        <div class="session-agent" title="${
                          session.user_agent
                        }" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">
                            <i class="fas fa-desktop"></i> ${getBrowserName(
                              session.user_agent
                            )}
                        </div>
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                      session.ip_address || "Unknown"
                    }</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 0.75rem;">${formatDate(
                      session.created_at
                    )}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                        ${
                          isCurrent
                            ? '<span class="badge badge-success" style="font-size: 0.7rem;">الحالية</span>'
                            : '<span class="badge badge-secondary" style="font-size: 0.7rem;">سابقة</span>'
                        }
                    </td>
                `;
        tbody.appendChild(row);
      });

      renderPagination(result.pagination, "pagination-controls", (newPage) => {
        currentPage = newPage;
        loadSessions();
      });
    }
  } catch (error) {
    console.error("Error loading sessions:", error);
  }
}

function getBrowserName(userAgent) {
  if (!userAgent) return "جهاز غير معروف";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "متصفح آخر";
}

async function previewInvoice() {
  const previewBtn = document.getElementById("preview-invoice-btn");
  const originalHtml = previewBtn.innerHTML;
  previewBtn.disabled = true;
  previewBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';

  try {
    await renderPreview();
    openDialog("preview-invoice-dialog");
  } catch (error) {
    console.error("Preview error", error);
    showToast("حدث خطأ أثناء المعاينة", "error");
  } finally {
    previewBtn.disabled = false;
    previewBtn.innerHTML = originalHtml;
  }
}

/**
 * Renders the current settings into the preview iframe
 */
async function renderPreview() {
  const keys = [
    "store_name",
    "store_address",
    "store_phone",
    "tax_number",
    "invoice_size",
    "footer_message",
    "currency_symbol",
  ];
  const settings = {};
  keys.forEach((key) => {
    const input = document.getElementById(key);
    if (input) settings[key] = input.value;
  });

  // Fetch a sample invoice for the preview (latest one)
  const res = await fetchAPI("invoices&page=1&per_page=1");
  if (!res.success || !res.data || res.data.length === 0) {
    showToast("لا توجد مبيعات سابقة لإجراء المعاينة", "error");
    return;
  }

  const sampleId = res.data[0].id;
  const detailRes = await fetchAPI(`invoice_details&id=${sampleId}`);
  if (!detailRes.success) return;

  const inv = detailRes.data;
  const content = generateInvoiceHTML(inv, settings);

  const iframe = document.getElementById("preview-iframe");
  if (iframe) {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(content);
    doc.close();
  }
}

async function loadSettings() {
  const result = await fetchAPI("settings");
  if (result.success) {
    const settings = result.data;
    for (const key in settings) {
      const input = document.getElementById(key);
      if (input) {
        input.value = settings[key];
      }
    }
  } else {
    showToast("فشل تحميل الإعدادات", "error");
  }
}

async function saveSettings() {
  const saveBtn = document.getElementById("save-settings-btn");
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = "جاري الحفظ...";

  const keys = [
    "store_name",
    "store_address",
    "store_phone",
    "tax_number",
    "invoice_size",
    "footer_message",
    "currency_symbol",
  ];
  const data = {};

  keys.forEach((key) => {
    const input = document.getElementById(key);
    if (input) {
      data[key] = input.value;
    }
  });

  try {
    const result = await fetchAPI("settings", "POST", data);
    if (result.success) {
      showToast("تم حفظ الإعدادات بنجاح", "success");
      if (typeof systemSettings !== "undefined") {
        systemSettings = null;
      }
    } else {
      showToast(result.message || "حدث خطأ أثناء الحفظ", "error");
    }
  } catch (error) {
    showToast("خطأ في الاتصال بالخادم", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}
