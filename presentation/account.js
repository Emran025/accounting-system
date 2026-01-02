let currentPage = 1;
let itemsPerPage = 20;
let totalItems = 0;

document.addEventListener("DOMContentLoaded", async () => {
  // Check auth
  const user = await checkAuth();
  if (!user) return;

  loadSessions();
});

document
  .getElementById("changePasswordForm")
  .addEventListener("submit", async (e) => {
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
  });

async function loadSessions() {
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
      const tbody = document.getElementById("sessionsTable");
      tbody.innerHTML = "";

      if (sessions.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="4" class="text-center">لا توجد جلسات نشطة</td></tr>';
        return;
      }

      sessions.forEach((session) => {
        const isCurrent = session.is_current;
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>
                        <div class="session-agent" title="${
                          session.user_agent
                        }">
                            <i class="fas fa-desktop"></i> ${getBrowserName(
                              session.user_agent
                            )}
                        </div>
                    </td>
                    <td>${session.ip_address || "Unknown"}</td>
                    <td>${formatDate(session.created_at)}</td>
                    <td>
                        ${
                          isCurrent
                            ? '<span class="badge badge-success">الحالية</span>'
                            : '<span class="badge badge-secondary">سابقة</span>'
                        }
                    </td>
                `;
        tbody.appendChild(row);
      });

      // Centralized numeric pagination
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
  if (!userAgent) return "Unknown Device";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "Other Browser";
}
