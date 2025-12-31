const API_BASE = '../domain/api.php';

// SVG Icons
const icons = {
    plus: '<svg class="icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    edit: '<svg class="icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    trash: '<svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    eye: '<svg class="icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    print: '<svg class="icon" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
    box: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    download: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    cart: '<svg class="icon" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',
    logout: '<svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
    x: '<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    alert: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
};

function getIcon(name) {
    return icons[name] || '';
}

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}?action=check`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = 'login.html';
            return false;
        }

        const result = await response.json();
        if (result.success) {
            return true;
        } else {
            window.location.href = 'login.html';
            return false;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Logout
async function logout() {
    try {
        await fetch(`${API_BASE}?action=logout`, {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = 'login.html';
    } catch (error) {
        window.location.href = 'login.html';
    }
}

// Dialog management
function openDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) {
        dialog.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scroll
    }
}

function closeDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) {
        dialog.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Close dialog on overlay click
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('dialog-overlay')) {
        closeDialog(e.target.id);
    }
});

// Show alert
function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    if (container) {
        const icon = type === 'success' ? getIcon('check') : getIcon('alert');
        container.innerHTML = `<div class="alert alert-${type}">${icon} ${message}</div>`;
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP'
    }).format(amount);
}

// Format date
function formatDate(dateString, includeTime = true) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return date.toLocaleString('ar-EG', options);
}

// Initialize navigation
function initNavigation() {
    const path = window.location.pathname;
    const currentPage = path.split('/').pop() || 'products.html';
    const navLinks = document.querySelectorAll('.sidebar-nav a');

    // Icon mapping
    const navIcons = {
        'products.html': 'box',
        'purchases.html': 'download',
        'sales.html': 'cart',
        '#': 'logout'
    };

    navLinks.forEach(link => {
        const href = link.getAttribute('href');

        // Inject icon
        // const iconName = navIcons[href] || 'box';
        // const span = link.querySelector('span');
        // if (span) {
        //     link.innerHTML = `${getIcon(iconName)} <span>${span.textContent}</span>`;
        // }

        if (href === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    initNavigation();

    // Auto-inject icons for elements with data-icon attribute
    document.querySelectorAll('[data-icon]').forEach(el => {
        const iconName = el.getAttribute('data-icon');
        const iconSvg = getIcon(iconName);
        if (iconSvg) {
            // Check if element has text content to decide spacing
            if (el.textContent.trim()) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = iconSvg;
                const svgNode = tempDiv.firstChild;
                el.prepend(' '); // space
                el.prepend(svgNode);
            } else {
                el.innerHTML = iconSvg;
            }
        }
    });

    // Close confirm dialog on overlay click specifically if needed, 
    // though the general listener above handles closing. 
    // But we need to ensure the promise resolves false if closed via overlay/X.
    const confirmOverlay = document.getElementById('confirm-dialog');
    if (confirmOverlay) {
        // The generic click listener calls closeDialog, which just hides it.
        // We need to intercept the closing to resolve false if not already resolved.
        // However, MutationObserver or just overriding the close function might be complex.
        // A simpler way: The generic listener calls closeDialog.
        // We can modify closeDialog to handle it, or just generic "on close" event.
        // Or simpler: we update the generic listener to check if it's the confirm dialog.
    }
});

// Confirmation Dialog Promise
let confirmResolve = null;

function showConfirm(message) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirm-dialog');
        const messageEl = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('confirm-yes-btn');

        if (!dialog || !messageEl || !yesBtn) {
            // Fallback if dialog DOM is missing
            resolve(confirm(message));
            return;
        }

        messageEl.textContent = message;
        messageEl.style.whiteSpace = 'pre-line'; // Allow newlines
        confirmResolve = resolve;


        // Remove previous listeners
        const newYesBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);

        newYesBtn.addEventListener('click', () => {
            closeConfirmDialog(true);
        });

        openDialog('confirm-dialog');
    });
}

function closeConfirmDialog(result) {
    const resolve = confirmResolve;
    confirmResolve = null;
    closeDialog('confirm-dialog');
    if (resolve) {
        resolve(result);
    }
}

// Override closeDialog to ensure promise resolves false if strictly closed without choice
const originalCloseDialog = closeDialog;
closeDialog = function (dialogId) {
    originalCloseDialog(dialogId);
    if (dialogId === 'confirm-dialog' && confirmResolve) {
        const resolve = confirmResolve;
        confirmResolve = null;
        resolve(false);
    }
};
