document.addEventListener("DOMContentLoaded", async () => {
  // Check auth
  const user = await checkAuth();
  if (!user) return;

  loadDashboardStats();
});

async function loadDashboardStats() {
  try {
    const response = await fetchAPI("dashboard");

    if (!response.success && response.message === "Unauthorized") {
      // Already handled by checkAuth but double check
      return;
    }

    if (response.success) {
      const stats = response.data;

      document.getElementById("todaySales").textContent = formatCurrency(
        stats.todays_sales
      );
      document.getElementById("totalProducts").textContent =
        stats.total_products;
      document.getElementById("lowStock").textContent =
        stats.low_stock_products;
      document.getElementById("totalSales").textContent = formatCurrency(
        stats.total_sales
      );

      // Recent Sales
      const tbody = document.getElementById("recentSalesTable");
      tbody.innerHTML = "";

      if (stats.recent_sales && stats.recent_sales.length > 0) {
        stats.recent_sales.forEach((sale) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                        <td>#${sale.invoice_number}</td>
                        <td class="amount">${formatCurrency(
                          sale.total_amount
                        )}</td>
                        <td>${formatDate(sale.created_at)}</td>
                    `;
          tbody.appendChild(row);
        });
      } else {
        tbody.innerHTML =
          '<tr><td colspan="3" class="text-center">لا توجد مبيعات حديثة</td></tr>';
      }
    }
  } catch (error) {
    console.error("Error loading dashboard stats:", error);
  }
}
