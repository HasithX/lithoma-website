/* ═══════════════════════════════════════════════════
   LithoMATE Admin Panel — admin.js
   Handles: auth, render, add/edit/delete, image upload, 
            direct save to products.js via server API
═══════════════════════════════════════════════════ */
(() => {
    /* ── Auth ──────────────────────────────────────── */
    const AUTH_KEY = 'lm_admin_ok';
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');

    function boot() {
        if (sessionStorage.getItem(AUTH_KEY) === '1') {
            showDashboard();
        } else {
            loginScreen.classList.remove('d-none'); // ensure visible
        }
    }

    document.getElementById('loginForm').addEventListener('submit', e => {
        e.preventDefault();
        const u = document.getElementById('lgUser').value.trim();
        const p = document.getElementById('lgPass').value;
        if (u === 'admin' && p === 'admin098') {
            sessionStorage.setItem(AUTH_KEY, '1');
            document.getElementById('loginErr').classList.add('d-none');
            loginScreen.classList.add('d-none');
            showDashboard();
        } else {
            document.getElementById('loginErr').classList.remove('d-none');
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem(AUTH_KEY);
        location.reload();
    });

    /* ── State ─────────────────────────────────────── */
    let items = [];   // working copy

    async function loadFromSource() {
        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error('API error');
            items = await res.json();
        } catch (e) {
            // Fallback to window.products if server not running
            items = window.products ? window.products.map(p => ({ ...p })) : [];
            console.warn('Could not fetch /api/products, using static fallback:', e.message);
        }
    }

    async function showDashboard() {
        loginScreen.classList.add('d-none');
        dashboard.classList.remove('d-none');
        await loadFromSource();
        buildStats();
        buildCategoryFilter();
        renderTable();
    }

    /* ── Stats row ─────────────────────────────────── */
    function buildStats() {
        const cats = [...new Set(items.map(p => p.category))];
        const priced = items.filter(p => {
            const n = parseFloat((p.price || '').replace(/[^0-9.]/g, ''));
            return !isNaN(n) && n > 0;
        }).length;

        document.getElementById('statsRow').innerHTML = `
      <div class="col-6 col-md-4">
        <div class="stat-card blue">
          <div class="text-muted small mb-1">Total Products</div>
          <div class="stat-num text-primary">${items.length}</div>
        </div>
      </div>
      <div class="col-6 col-md-4">
        <div class="stat-card green">
          <div class="text-muted small mb-1">Categories</div>
          <div class="stat-num text-success">${cats.length}</div>
        </div>
      </div>
      <div class="col-6 col-md-4">
        <div class="stat-card orange">
          <div class="text-muted small mb-1">Priced Items</div>
          <div class="stat-num text-warning">${priced}</div>
        </div>
      </div>`;
    }

    function buildCategoryFilter() {
        const sel = document.getElementById('categoryFilter');
        const cats = [...new Set(items.map(p => p.category))].sort();
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            sel.appendChild(opt);
        });
    }

    /* ── Render Table ──────────────────────────────── */
    const tbody = document.getElementById('productsTbody');

    function filteredItems() {
        const q = document.getElementById('searchInput').value.toLowerCase();
        const cat = document.getElementById('categoryFilter').value;
        return items.filter(p =>
            (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) &&
            (!cat || p.category === cat)
        );
    }

    function renderTable() {
        const list = filteredItems();
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">No products match your search.</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(p => {
            const src = p.imageUrl
                ? (p.imageUrl.startsWith('http') ? p.imageUrl : '../' + p.imageUrl)
                : 'https://dummyimage.com/80x80/f0f0f0/999&text=?';
            return `<tr>
        <td class="text-muted fw-semibold">#${p.id}</td>
        <td><img src="${esc(src)}" class="product-img" onerror="this.src='https://dummyimage.com/80x80/f0f0f0/999&text=!'"></td>
        <td class="fw-semibold">${esc(p.name)}</td>
        <td><span class="badge bg-secondary">${esc(p.category)}</span></td>
        <td class="text-muted small">${esc(p.pack)}</td>
        <td class="fw-bold text-success">${esc(p.price)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-1" onclick="openEdit(${p.id})"><i class="fas fa-pen"></i></button>
          <button class="btn btn-sm btn-outline-danger"        onclick="askDelete(${p.id})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
        }).join('');
    }

    document.getElementById('searchInput').addEventListener('input', renderTable);
    document.getElementById('categoryFilter').addEventListener('change', renderTable);

    /* ── Modal helpers ─────────────────────────────── */
    const bsProductModal = new bootstrap.Modal(document.getElementById('productModal'));
    const bsDeleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    const fId = document.getElementById('fId');
    const fName = document.getElementById('fName');
    const fCategory = document.getElementById('fCategory');
    const fPack = document.getElementById('fPack');
    const fPrice = document.getElementById('fPrice');
    const fImageUrl = document.getElementById('fImageUrl');
    const imgPreview = document.getElementById('imgPreview');
    const previewWrap = document.getElementById('previewWrap');
    const uploadStatus = document.getElementById('uploadStatus');
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('uploadZone');
    const urlZone = document.getElementById('urlZone');

    let currentImageValue = '';  // final value saved to item

    /* Image tabs */
    document.getElementById('tabUpload').addEventListener('click', () => {
        document.getElementById('tabUpload').classList.replace('btn-outline-secondary', 'btn-primary');
        document.getElementById('tabUrl').classList.replace('btn-primary', 'btn-outline-secondary');
        uploadZone.classList.remove('d-none');
        urlZone.classList.add('d-none');
    });
    document.getElementById('tabUrl').addEventListener('click', () => {
        document.getElementById('tabUrl').classList.replace('btn-outline-secondary', 'btn-primary');
        document.getElementById('tabUpload').classList.replace('btn-primary', 'btn-outline-secondary');
        urlZone.classList.remove('d-none');
        uploadZone.classList.add('d-none');
    });

    /* Upload zone click / drag-drop */
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) uploadImage(file);
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) uploadImage(fileInput.files[0]);
    });

    async function uploadImage(file) {
        uploadStatus.textContent = 'Uploading…';
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/upload_image', { method: 'POST', body: fd });
            const json = await res.json();
            if (res.ok) {
                currentImageValue = json.path;   // e.g. "images/photo.jpg"
                showPreview('../' + json.path);
                uploadStatus.textContent = `✅ Saved as: ${json.path}`;
            } else {
                uploadStatus.textContent = '❌ ' + json.error;
            }
        } catch (e) {
            uploadStatus.textContent = '❌ Upload failed: ' + e.message;
        }
    }

    fImageUrl.addEventListener('input', () => {
        currentImageValue = fImageUrl.value.trim();
        if (currentImageValue) showPreview(currentImageValue.startsWith('http') ? currentImageValue : '../' + currentImageValue);
        else hidePreview();
    });

    function showPreview(src) {
        imgPreview.src = src;
        previewWrap.classList.remove('d-none');
    }
    function hidePreview() {
        previewWrap.classList.add('d-none');
    }

    /* ── Add Product ───────────────────────────────── */
    document.getElementById('addBtn').addEventListener('click', () => {
        clearForm();
        document.getElementById('modalTitle').textContent = 'Add New Product';
        bsProductModal.show();
    });

    /* ── Edit Product ──────────────────────────────── */
    window.openEdit = function (id) {
        const p = items.find(x => x.id === id);
        if (!p) return;
        fId.value = p.id;
        fName.value = p.name;
        fCategory.value = p.category;
        fPack.value = p.pack;
        fPrice.value = p.price;
        currentImageValue = p.imageUrl || '';
        fImageUrl.value = p.imageUrl || '';
        if (p.imageUrl) {
            const src = p.imageUrl.startsWith('http') ? p.imageUrl : '../' + p.imageUrl;
            showPreview(src);
        } else { hidePreview(); }
        uploadStatus.textContent = '';
        document.getElementById('modalTitle').textContent = 'Edit Product';
        bsProductModal.show();
    };

    function clearForm() {
        fId.value = ''; fName.value = ''; fCategory.value = '';
        fPack.value = ''; fPrice.value = 'Rs. 0.00';
        fImageUrl.value = ''; currentImageValue = '';
        uploadStatus.textContent = '';
        hidePreview();
    }

    /* ── Save (Add / Edit) ─────────────────────────── */
    document.getElementById('saveBtn').addEventListener('click', async () => {
        if (!fName.value.trim() || !fCategory.value.trim() || !fPack.value.trim() || !fPrice.value.trim()) {
            alert('Please fill in all required fields.'); return;
        }

        const isEdit = fId.value !== '';
        const newItem = {
            id: isEdit ? parseInt(fId.value) : nextId(),
            name: fName.value.trim(),
            category: fCategory.value.trim(),
            pack: fPack.value.trim(),
            price: fPrice.value.trim(),
            imageUrl: currentImageValue
        };

        if (isEdit) {
            const idx = items.findIndex(x => x.id === newItem.id);
            if (idx !== -1) items[idx] = newItem;
        } else {
            items.push(newItem);
        }

        bsProductModal.hide();
        await publishChanges();
        buildStats();
        renderTable();
    });

    /* ── Delete ────────────────────────────────────── */
    let pendingDeleteId = null;
    window.askDelete = function (id) {
        pendingDeleteId = id;
        bsDeleteModal.show();
    };
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        items = items.filter(x => x.id !== pendingDeleteId);
        bsDeleteModal.hide();
        await publishChanges();
        buildStats();
        renderTable();
    });

    /* ── Publish to products.js ────────────────────── */
    async function publishChanges() {
        const alertDiv = document.getElementById('saveAlert');
        try {
            const res = await fetch('/api/save_products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(items)
            });
            const json = await res.json();
            if (res.ok) {
                alertDiv.innerHTML = successAlert('Changes saved! Your site is updated.');
            } else {
                alertDiv.innerHTML = dangerAlert('Server error: ' + json.message);
            }
        } catch (e) {
            alertDiv.innerHTML = dangerAlert(
                'Could not reach server. Make sure <strong>server.py</strong> is running!<br><code>' + e.message + '</code>');
        }
        setTimeout(() => { alertDiv.innerHTML = ''; }, 5000);
    }

    /* ── Helpers ───────────────────────────────────── */
    function nextId() {
        return items.length ? Math.max(...items.map(x => x.id)) + 1 : 1;
    }
    function esc(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function successAlert(msg) {
        return `<div class="alert alert-success alert-dismissible fade show py-2" role="alert">
      <i class="fas fa-check-circle me-1"></i>${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    }
    function dangerAlert(msg) {
        return `<div class="alert alert-danger alert-dismissible fade show py-2" role="alert">
      <i class="fas fa-circle-exclamation me-1"></i>${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    }

    /* ── Boot ──────────────────────────────────────── */
    boot();
})();
