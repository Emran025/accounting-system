let purchases = [];
let products = [];
let currentPurchaseId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async function () {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    await loadProducts();
    await loadPurchases();
});

// Load purchases
async function loadPurchases() {
    try {
        const response = await fetch(`${API_BASE}?action=purchases`, {
            method: 'GET',
            credentials: 'include'
        });

        const result = await response.json();
        if (result.success) {
            // Sort by ID descending (newest first)
            purchases = result.data.sort((a, b) => b.id - a.id);
            renderPurchases();
        }
    } catch (error) {
        showAlert('alert-container', 'خطأ في تحميل المشتريات', 'error');
    }
}

// Load products for dropdown
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}?action=products`, {
            method: 'GET',
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            products = result.data;
            const select = document.getElementById('purchase-product');
            select.innerHTML = '<option value="">-- اختر منتجاً --</option>';
            products.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                select.appendChild(opt);
            });
            // Update unit info labels if a product is selected
            select.addEventListener('change', onPurchaseUnitChange);
        }
    } catch (error) {
        console.error('Error loading products');
    }
}

function onPurchaseUnitChange() {
    const productId = document.getElementById('purchase-product').value;
    const unitType = document.getElementById('purchase-unit-type').value;
    const infoLabel = document.getElementById('unit-info-label');

    if (!productId) {
        infoLabel.textContent = '';
        return;
    }

    const p = products.find(item => item.id == productId);
    if (!p) {
        infoLabel.textContent = '';
        return;
    }

    if (unitType === 'main') {
        infoLabel.textContent = `الكرتون الواحد يحتوي على ${p.items_per_unit || 1} ${p.sub_unit_name || 'حبة'}`;
    } else {
        infoLabel.textContent = `الشراء بالوحدة الفردية (${p.sub_unit_name || 'حبة'})`;
    }
}

function renderPurchases() {
    const tbody = document.getElementById('purchases-tbody');
    if (purchases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">لا توجد مشتريات مسجلة</td></tr>';
        return;
    }

    tbody.innerHTML = purchases.map(p => {
        // Restriction: check 24 hours
        const createdDate = new Date(p.purchase_date);
        const hoursPassed = (new Date() - createdDate) / (1000 * 60 * 60);
        const canEdit = hoursPassed < 24;

        return `
            <tr class="animate-fade">
                <td>#${p.id}</td>
                <td><strong>${p.product_name}</strong></td>
                <td>${p.quantity} ${p.unit_type === 'main' ? (p.unit_name || 'كرتون') : (p.sub_unit_name || 'حبة')}</td>
                <td>${formatCurrency(p.invoice_price)}</td>
                <td>${formatDate(p.purchase_date)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn view" onclick="viewPurchase(${p.id})">${getIcon('eye')}</button>
                        ${canEdit ? `
                            <button class="icon-btn edit" onclick="editPurchase(${p.id})">${getIcon('edit')}</button>
                            <button class="icon-btn delete" onclick="deletePurchase(${p.id})">${getIcon('trash')}</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddDialog() {
    currentPurchaseId = null;
    document.getElementById('purchase-dialog-title').textContent = 'إضافة شراء جديد';
    document.getElementById('purchase-form').reset();
    document.getElementById('purchase-date').value = new Date().toISOString().slice(0, 16);

    // Ensure fields are editable
    setFormDisabled(false);
    document.getElementById('save-purchase-btn').style.display = 'inline-flex';

    openDialog('purchase-dialog');
}

function viewPurchase(id) {

    const p = purchases.find(item => item.id == id);
    if (!p) return;

    const viewBody = document.getElementById('view-dialog-body');
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
                        <span class="item-name-pkg">${p.quantity} ${p.unit_type === 'main' ? (p.unit_name || 'كرتون') : (p.sub_unit_name || 'حبة')}</span>
                    </div>
                </div>
                <div class="item-row-minimal">
                    <div class="item-info-pkg">
                        <span class="stat-label">سعر الفاتورة</span>
                        <span class="item-name-pkg">${formatCurrency(p.invoice_price)}</span>
                    </div>
                </div>
            </div>
            <div class="item-row-minimal">
                <div class="item-info-pkg">
                    <span class="stat-label">تاريخ الشراء</span>
                    <span class="item-name-pkg">${formatDate(p.purchase_date)}</span>
                </div>
            </div>
        </div>
    `;
    openDialog('view-dialog');
}

function editPurchase(id) {
    const p = purchases.find(item => item.id == id);
    if (!p) return;

    currentPurchaseId = id;
    document.getElementById('purchase-dialog-title').textContent = 'تعديل بيانات الشراء';
    document.getElementById('purchase-product').value = p.product_id;
    document.getElementById('purchase-unit-type').value = p.unit_type || 'sub';
    document.getElementById('purchase-quantity').value = p.quantity;
    document.getElementById('purchase-price').value = p.invoice_price;
    document.getElementById('purchase-date').value = new Date(p.purchase_date).toISOString().slice(0, 16);
    onPurchaseUnitChange();

    setFormDisabled(false);
    document.getElementById('save-purchase-btn').style.display = 'inline-flex';

    openDialog('purchase-dialog');
}

function setFormDisabled(disabled) {
    const form = document.getElementById('purchase-form');
    const elements = form.querySelectorAll('input, select');
    elements.forEach(el => el.disabled = disabled);
}

async function savePurchase() {
    const product_id = document.getElementById('purchase-product').value;
    const quantity = document.getElementById('purchase-quantity').value;
    const unit_type = document.getElementById('purchase-unit-type').value;
    const invoice_price = document.getElementById('purchase-price').value;
    const purchase_date = document.getElementById('purchase-date').value;

    if (!product_id || !quantity || !invoice_price) {
        showAlert('alert-container', 'يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    const btn = document.getElementById('save-purchase-btn');
    btn.disabled = true;

    try {
        const method = currentPurchaseId ? 'PUT' : 'POST';
        const body = {
            product_id: parseInt(product_id),
            quantity: parseInt(quantity),
            unit_type: unit_type,
            invoice_price: parseFloat(invoice_price),
            purchase_date: purchase_date + ':00'
        };
        if (currentPurchaseId) body.id = currentPurchaseId;

        const response = await fetch(`${API_BASE}?action=purchases`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        });

        const result = await response.json();
        if (result.success) {
            showAlert('alert-container', 'تم الحفظ بنجاح', 'success');
            closeDialog('purchase-dialog');
            await loadPurchases();
        } else {
            showAlert('alert-container', result.message, 'error');
        }
    } catch (e) {
        showAlert('alert-container', 'خطأ في الاتصال بالسيرفر', 'error');
    } finally {
        btn.disabled = false;
    }
}

async function deletePurchase(id) {
    if (!await showConfirm('هل أنت متأكد من حذف هذا السجل؟')) return;

    try {
        const response = await fetch(`${API_BASE}?action=purchases&id=${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            showAlert('alert-container', 'تم الحذف بنجاح', 'success');
            await loadPurchases();
        } else {
            showAlert('alert-container', result.message, 'error');
        }
    } catch (e) {
        showAlert('alert-container', 'خطأ في الحذف', 'error');
    }
}
