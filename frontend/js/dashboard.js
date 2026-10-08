/* ============================================
   DASHBOARD JAVASCRIPT - QR MENU (version Supabase)
   ============================================ */

let currentCafe = null;
let categories = [];
let products = [];
let editingCategoryId = null;
let editingProductId = null;
let activeProductFilter = 'all';
let productSearchTerm = '';

// Avec Supabase Storage, image/logo sont déjà des URL publiques complètes
function resolveImage(path) {
    return path || '';
}

function displayName(value) {
    if (!value) return '';
    if (typeof value === 'object') return value.fr || value.en || value.ar || '';
    return value;
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Dashboard] Initialisation');

    if (!(await Auth.isLoggedIn())) {
        window.location.href = 'login.html';
        return;
    }

    await loadUserData();

    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.classList.contains('logout')) return;
        link.addEventListener('click', handleNavigation);
    });

    document.getElementById('cafe-form')?.addEventListener('submit', handleCafeUpdate);
    document.getElementById('category-form')?.addEventListener('submit', handleCategorySubmit);
    document.getElementById('product-form')?.addEventListener('submit', handleProductSubmit);

    document.getElementById('product-search')?.addEventListener('input', (e) => {
        productSearchTerm = e.target.value;
        renderProductsList();
    });

    document.getElementById('cafe-logo')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const preview = document.getElementById('cafe-logo-preview');
        const placeholder = document.querySelector('.logo-placeholder');
        preview.src = URL.createObjectURL(file);
        preview.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
    });

    document.querySelector('.nav-link.logout')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await Auth.logout();
        window.location.href = 'login.html';
    });
});

async function loadUserData() {
    try {
        const user = await Auth.getUser();
        if (!user) throw new Error('Utilisateur non connecté');

        const { data: cafe, error: cafeError } = await supabaseClient
            .from('cafes')
            .select('*')
            .eq('owner_id', user.id)
            .single();

        if (cafeError) throw cafeError;
        currentCafe = cafe;

        const { data: cats, error: catError } = await supabaseClient
            .from('categories')
            .select('*')
            .eq('cafe_id', currentCafe.id)
            .order('position');
        if (catError) throw catError;
        categories = cats || [];

        const { data: prods, error: prodError } = await supabaseClient
            .from('products')
            .select('*, categories!inner(cafe_id)')
            .eq('categories.cafe_id', currentCafe.id)
            .order('position');
        if (prodError) throw prodError;
        products = prods || [];

        updateDashboardUI();
        loadQRCode();
    } catch (error) {
        console.error('[Dashboard] Erreur lors du chargement:', error);
        Utils.showMessage('Erreur lors du chargement des données', 'error');
    }
}

function updateDashboardUI() {
    const greeting = document.getElementById('user-greeting');
    if (greeting) greeting.textContent = `Bonjour ! Bienvenue sur ${currentCafe.name}`;

    const cafeName = document.getElementById('cafe-name');
    if (cafeName) cafeName.textContent = currentCafe.name;

    document.getElementById('product-count').textContent = products.length;
    document.getElementById('category-count').textContent = categories.length;

    const cafeNameInput = document.getElementById('cafe-name-input');
    if (cafeNameInput) cafeNameInput.value = currentCafe.name || '';

    const cafeDescription = document.getElementById('cafe-description');
    if (cafeDescription) cafeDescription.value = currentCafe.description || '';

    const cafeAddress = document.getElementById('cafe-address');
    if (cafeAddress) cafeAddress.value = currentCafe.address || '';

    const cafePhone = document.getElementById('cafe-phone');
    if (cafePhone) cafePhone.value = currentCafe.phone || '';

    const logoPreview = document.getElementById('cafe-logo-preview');
    const logoPlaceholder = document.querySelector('.logo-placeholder');
    if (currentCafe.logo && logoPreview) {
        logoPreview.src = resolveImage(currentCafe.logo);
        logoPreview.classList.remove('hidden');
        if (logoPlaceholder) logoPlaceholder.classList.add('hidden');
    }

    populateCategorySelect();
    renderCategoriesList();
    renderProductCategoryTabs();
    renderProductsList();
}

/* Navbar de catégories au-dessus de la liste des produits, pour filtrer
   rapidement en combinaison avec la recherche par nom. */
function renderProductCategoryTabs() {
    const container = document.getElementById('product-category-tabs');
    if (!container) return;

    // Si la catégorie actuellement sélectionnée a été supprimée, on revient à "Tous".
    if (activeProductFilter !== 'all' && !categories.some(c => c.id === activeProductFilter)) {
        activeProductFilter = 'all';
    }

    const tabs = [{ id: 'all', label: 'Tous' }, ...categories.map(c => ({ id: c.id, label: displayName(c.name) }))];

    container.innerHTML = tabs.map(tab => `
        <button type="button" class="tab-btn ${activeProductFilter === tab.id ? 'active' : ''}" data-filter="${tab.id}">
            ${tab.label}
        </button>
    `).join('');

    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.dataset.filter;
            activeProductFilter = value === 'all' ? 'all' : parseInt(value);
            renderProductCategoryTabs();
            renderProductsList();
        });
    });
}

function populateCategorySelect() {
    const select = document.getElementById('product-category');
    if (!select) return;
    select.innerHTML = categories.map(cat => `<option value="${cat.id}">${displayName(cat.name)}</option>`).join('');
}

function renderCategoriesList() {
    const container = document.getElementById('categories-list');
    if (!container) return;
    if (categories.length === 0) {
        container.innerHTML = '<p class="empty-hint">Aucune catégorie pour le moment.</p>';
        return;
    }
    container.innerHTML = categories.map(cat => {
        const count = products.filter(p => p.category_id === cat.id).length;
        return `
        <div class="card category-card">
            <div class="card-body">
                <h3>${displayName(cat.name)}</h3>
                <span class="meta-tag">${count} ${count === 1 ? 'produit' : 'produits'}</span>
            </div>
            <div class="card-actions">
                <button class="btn-secondary" onclick="editCategory(${cat.id})">Modifier</button>
                <button type="button" class="btn-danger" onclick="deleteCategory(${cat.id})"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></svg>Supprimer</button>
            </div>
        </div>
    `;
    }).join('');
}

function renderProductCard(p, category) {
    const catName = category ? displayName(category.name) : '—';
    return `
        <div class="card product-admin-card">
            ${p.image
                ? `<img src="${resolveImage(p.image)}" alt="${displayName(p.name)}" class="card-image">`
                : `<div class="card-image card-image-placeholder">Pas de photo</div>`}
            <div class="card-body">
                <div class="card-top">
                    <h3>${displayName(p.name)}</h3>
                    <span class="card-price">${Utils.formatPrice(p.price)}</span>
                </div>
                <div class="card-meta">
                    <span class="meta-tag">${catName}</span>
                    <span class="status-pill ${p.available ? 'status-available' : 'status-unavailable'}">
                        ${p.available ? '● Disponible' : '● Indisponible'}
                    </span>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-secondary" onclick="editProduct(${p.id})">Modifier</button>
                <button type="button" class="btn-danger" onclick="deleteProduct(${p.id})"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></svg>Supprimer</button>
            </div>
        </div>
    `;
}

function renderProductsList() {
    const container = document.getElementById('products-list');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<p class="empty-hint">Aucun produit pour le moment.</p>';
        return;
    }

    let filtered = products;

    if (activeProductFilter !== 'all') {
        filtered = filtered.filter(p => p.category_id === activeProductFilter);
    }

    const term = productSearchTerm.trim().toLowerCase();
    if (term) {
        filtered = filtered.filter(p => displayName(p.name).toLowerCase().includes(term));
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-hint">Aucun produit ne correspond à votre recherche.</p>';
        return;
    }

    const groups = new Map();
    categories.forEach(cat => groups.set(cat.id, { category: cat, items: [] }));
    const orphans = [];

    filtered.forEach(p => {
        if (groups.has(p.category_id)) {
            groups.get(p.category_id).items.push(p);
        } else {
            orphans.push(p);
        }
    });

    let html = '';

    groups.forEach(group => {
        if (group.items.length === 0) return;
        html += `
        <div class="product-group">
            <h3 class="product-group-title">${displayName(group.category.name)} <span class="product-group-count">(${group.items.length})</span></h3>
            <div class="products-grid">
                ${group.items.map(p => renderProductCard(p, group.category)).join('')}
            </div>
        </div>
        `;
    });

    if (orphans.length > 0) {
        html += `
        <div class="product-group">
            <h3 class="product-group-title">Sans catégorie <span class="product-group-count">(${orphans.length})</span></h3>
            <div class="products-grid">
                ${orphans.map(p => renderProductCard(p, null)).join('')}
            </div>
        </div>
        `;
    }

    container.innerHTML = html || '<p class="empty-hint">Aucun produit pour le moment.</p>';
}

function handleNavigation(e) {
    e.preventDefault();
    const link = e.currentTarget;
    const href = link.getAttribute('href');
    if (!href) return;

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));

    document.querySelectorAll(`.nav-link[href="${href}"]`).forEach(l => l.classList.add('active'));
    const section = document.getElementById(`${href.substring(1)}-section`);
    if (section) section.classList.add('active');
}

async function handleCafeUpdate(e) {
    e.preventDefault();

    const payload = {
        name: document.getElementById('cafe-name-input').value,
        description: document.getElementById('cafe-description').value,
        address: document.getElementById('cafe-address').value,
        phone: document.getElementById('cafe-phone').value,
    };

    try {
        const logoFile = document.getElementById('cafe-logo')?.files[0];
        if (logoFile) {
            payload.logo = await uploadToStorage(logoFile, 'logos/');
        }

        const { data, error } = await supabaseClient
            .from('cafes')
            .update(payload)
            .eq('id', currentCafe.id)
            .select()
            .single();

        if (error) throw error;
        currentCafe = data;

        updateDashboardUI();
        Utils.showMessage('Les informations de votre café ont été mises à jour avec succès.', 'success');
    } catch (error) {
        console.error('[Dashboard] Erreur:', error);
        Utils.showMessage(`Erreur lors de la mise à jour : ${error.message || 'veuillez réessayer.'}`, 'error');
    }
}

function openCategoryModal(category = null) {
    editingCategoryId = category ? category.id : null;
    document.querySelector('#category-modal h3').textContent = category ? 'Modifier la catégorie' : 'Ajouter une catégorie';

    document.getElementById('category-name-fr').value = category ? (category.name.fr || '') : '';
    document.getElementById('category-name-en').value = category ? (category.name.en || '') : '';
    document.getElementById('category-name-ar').value = category ? (category.name.ar || '') : '';

    // La description peut être vide, un texte simple (ancien format) ou un objet {fr,en,ar}.
    const sub = category && category.subtitle
        ? (typeof category.subtitle === 'string' ? { fr: category.subtitle } : category.subtitle)
        : {};
    document.getElementById('category-subtitle-fr').value = sub.fr || '';
    document.getElementById('category-subtitle-en').value = sub.en || '';
    document.getElementById('category-subtitle-ar').value = sub.ar || '';

    document.getElementById('category-modal').classList.remove('hidden');
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.add('hidden');
    document.getElementById('category-form').reset();
    editingCategoryId = null;
}

function editCategory(id) {
    const category = categories.find(c => c.id === id);
    if (category) openCategoryModal(category);
}

async function deleteCategory(id) {
    const category = categories.find(c => c.id === id);
    const label = category ? displayName(category.name) : 'cette catégorie';
    if (!confirm(`Supprimer la catégorie "${label}" ainsi que tous ses produits ? Cette action est irréversible.`)) return;
    try {
        const { error } = await supabaseClient.from('categories').delete().eq('id', id);
        if (error) throw error;
        categories = categories.filter(c => c.id !== id);
        products = products.filter(p => p.category_id !== id);
        updateDashboardUI();
        Utils.showMessage(`Catégorie "${label}" supprimée avec succès.`, 'success');
    } catch (error) {
        console.error('[Dashboard] Erreur:', error);
        Utils.showMessage(`Erreur lors de la suppression : ${error.message || 'veuillez réessayer.'}`, 'error');
    }
}

async function handleCategorySubmit(e) {
    e.preventDefault();

    const fr = document.getElementById('category-name-fr').value.trim();
    const en = document.getElementById('category-name-en').value.trim();
    const ar = document.getElementById('category-name-ar').value.trim();

    if (!fr) {
        Utils.showMessage('Le nom en français est obligatoire.', 'error');
        return;
    }

    const name = { fr, en: en || null, ar: ar || null };

    const subFr = document.getElementById('category-subtitle-fr').value.trim();
    const subEn = document.getElementById('category-subtitle-en').value.trim();
    const subAr = document.getElementById('category-subtitle-ar').value.trim();
    const subtitle = (subFr || subEn || subAr)
        ? { fr: subFr || null, en: subEn || null, ar: subAr || null }
        : null;

    try {
        if (editingCategoryId) {
            const { data, error } = await supabaseClient
                .from('categories')
                .update({ name, subtitle })
                .eq('id', editingCategoryId)
                .select()
                .single();
            if (error) throw error;
            categories = categories.map(c => c.id === editingCategoryId ? data : c);
            Utils.showMessage(`Catégorie "${fr}" modifiée avec succès.`, 'success');
        } else {
            const { data, error } = await supabaseClient
                .from('categories')
                .insert({ cafe_id: currentCafe.id, name, subtitle, position: categories.length })
                .select()
                .single();
            if (error) throw error;
            categories.push(data);
            Utils.showMessage(`Catégorie "${fr}" ajoutée avec succès.`, 'success');
        }
        updateDashboardUI();
        closeCategoryModal();
    } catch (error) {
        console.error('[Dashboard] Erreur:', error);
        Utils.showMessage(`Erreur lors de l'enregistrement de la catégorie : ${error.message || 'veuillez réessayer.'}`, 'error');
    }
}

function openProductModal(product = null) {
    editingProductId = product ? product.id : null;
    document.querySelector('#product-modal h3').textContent = product ? 'Modifier le produit' : 'Ajouter un produit';
    populateCategorySelect();

    document.getElementById('product-name-fr').value = product ? (product.name.fr || '') : '';
    document.getElementById('product-name-en').value = product ? (product.name.en || '') : '';
    document.getElementById('product-name-ar').value = product ? (product.name.ar || '') : '';

    document.getElementById('product-category').value = product ? product.category_id : (categories[0]?.id || '');

    const desc = product && product.description ? product.description : {};
    document.getElementById('product-description-fr').value = desc.fr || '';
    document.getElementById('product-description-en').value = desc.en || '';
    document.getElementById('product-description-ar').value = desc.ar || '';

    document.getElementById('product-price').value = product ? product.price : '';
    const availableCheckbox = document.getElementById('product-available');
    if (availableCheckbox) availableCheckbox.checked = product ? product.available : true;

    document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    document.getElementById('product-form').reset();
    editingProductId = null;
}

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) openProductModal(product);
}

async function deleteProduct(id) {
    const product = products.find(p => p.id === id);
    const label = product ? displayName(product.name) : 'ce produit';
    if (!confirm(`Supprimer le produit "${label}" ? Cette action est irréversible.`)) return;
    try {
        const { error } = await supabaseClient.from('products').delete().eq('id', id);
        if (error) throw error;
        products = products.filter(p => p.id !== id);
        updateDashboardUI();
        Utils.showMessage(`Produit "${label}" supprimé avec succès.`, 'success');
    } catch (error) {
        console.error('[Dashboard] Erreur:', error);
        Utils.showMessage(`Erreur lors de la suppression : ${error.message || 'veuillez réessayer.'}`, 'error');
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const nameFr = document.getElementById('product-name-fr').value.trim();
    const nameEn = document.getElementById('product-name-en').value.trim();
    const nameAr = document.getElementById('product-name-ar').value.trim();
    const categoryId = document.getElementById('product-category').value;
    const descFr = document.getElementById('product-description-fr').value.trim();
    const descEn = document.getElementById('product-description-en').value.trim();
    const descAr = document.getElementById('product-description-ar').value.trim();
    const price = document.getElementById('product-price').value;
    const available = document.getElementById('product-available')?.checked ?? true;
    const imageFile = document.getElementById('product-image')?.files[0];

    const missing = [];
    if (!nameFr) missing.push('nom (français)');
    if (!nameEn) missing.push('nom (anglais)');
    if (!nameAr) missing.push('nom (arabe)');
    if (!categoryId) missing.push('catégorie');
    if (!price) missing.push('prix');
    if (!editingProductId && !imageFile) missing.push('image');

    if (missing.length > 0) {
        Utils.showMessage(`Champs obligatoires manquants : ${missing.join(', ')}.`, 'error');
        return;
    }

    const payload = {
        name: { fr: nameFr, en: nameEn, ar: nameAr },
        description: { fr: descFr, en: descEn, ar: descAr },
        category_id: parseInt(categoryId),
        price: parseFloat(price),
        available,
        position: editingProductId
            ? undefined
            : products.filter((p) => p.category_id === parseInt(categoryId)).length,
    };
    if (payload.position === undefined) delete payload.position;

    try {
        if (imageFile) {
            payload.image = await uploadToStorage(imageFile, 'products/');
        }

        let data, error;
        if (editingProductId) {
            ({ data, error } = await supabaseClient
                .from('products')
                .update(payload)
                .eq('id', editingProductId)
                .select()
                .single());
        } else {
            ({ data, error } = await supabaseClient
                .from('products')
                .insert(payload)
                .select()
                .single());
        }

        if (error) throw error;

        if (editingProductId) {
            products = products.map(p => p.id === data.id ? data : p);
            Utils.showMessage(`Produit "${nameFr}" modifié avec succès.`, 'success');
        } else {
            products.push(data);
            Utils.showMessage(`Produit "${nameFr}" ajouté avec succès.`, 'success');
        }

        updateDashboardUI();
        closeProductModal();
    } catch (error) {
        console.error('[Dashboard] Erreur:', error);
        Utils.showMessage(`Erreur lors de l'enregistrement du produit : ${error.message || 'veuillez réessayer.'}`, 'error');
    }
}

/* QR code généré directement dans le navigateur (plus besoin de backend).
   Nécessite la librairie qrcode.js (voir instructions HTML). */
async function loadQRCode() {
    try {
        const menuUrl = new URL(`menu.html?cafe=${currentCafe.slug}`, window.location.href).href;
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, menuUrl, { width: 300 });
        const dataUrl = canvas.toDataURL('image/png');

        const img = document.getElementById('qr-image');
        if (img) img.src = dataUrl;
        window.__qrDataUrl = dataUrl;
    } catch (error) {
        console.error('[Dashboard] Erreur QR code:', error);
    }
}

function downloadQR() {
    if (!window.__qrDataUrl) {
        Utils.showMessage('QR code non chargé', 'error');
        return;
    }
    const a = document.createElement('a');
    a.href = window.__qrDataUrl;
    a.download = `qrcode-${currentCafe?.slug || 'menu'}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    Utils.showMessage('QR Code téléchargé avec succès.', 'success');
}