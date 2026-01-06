document.addEventListener("DOMContentLoaded", async function () {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;

  await loadFinancialData();
});

async function loadFinancialData() {
  try {
    const result = await fetchAPI("balance_sheet");
    if (result.success) {
      const data = result.data;

      // Populate Assets
      document.getElementById("cash-estimate").textContent = formatCurrency(
        data.assets.cash_estimate
      );
      document.getElementById("stock-value").textContent = formatCurrency(
        data.assets.stock_value
      );
      document.getElementById("fixed-assets").textContent = formatCurrency(
        data.assets.fixed_assets
      );
      document.getElementById("accounts-receivable").textContent =
        formatCurrency(data.assets.accounts_receivable);
      document.getElementById("total-assets").textContent = formatCurrency(
        data.assets.total_assets
      );

      // Populate Income Statement
      document.getElementById("total-sales").textContent = formatCurrency(
        data.income_statement.total_sales
      );
      document.getElementById("other-revenues").textContent = formatCurrency(
        data.income_statement.other_revenues
      );
      document.getElementById("total-purchases").textContent =
        "-" + formatCurrency(data.income_statement.total_purchases);
      document.getElementById("total-expenses").textContent =
        "-" + formatCurrency(data.income_statement.total_expenses);

      const netProfit = data.income_statement.net_profit;
      const netProfitEl = document.getElementById("net-profit");
      netProfitEl.textContent = formatCurrency(netProfit);
      netProfitEl.className = netProfit >= 0 ? "value profit" : "value loss";
    } else {
      showAlert("alert-container", "فشل تحميل البيانات المالية", "error");
    }
  } catch (error) {
    console.error("Error loading financial data", error);
    showAlert("alert-container", "خطأ في الاتصال بالسيرفر", "error");
  }
}

function exportReport() {
  window.print();
}
