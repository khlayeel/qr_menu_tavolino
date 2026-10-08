/* ============================================
   MENU JAVASCRIPT - QR MENU
   Menu Public pour les Clients (version Supabase)
   ============================================ */

let cafeData = null;
let allProducts = [];
let allCategories = [];
let filteredProducts = [];
let selectedCategoryId = null;
let currentLanguage = 'fr';

const translations = {
    fr: { search: 'Rechercher un produit...', menu: 'LA CARTE', discover: 'À découvrir', article: 'article', articles: 'articles', available: 'Disponible', unavailable: 'Non disponible', noResults: 'Aucun résultat', tryAgain: 'Essayez un autre mot ou une autre catégorie.', digital: 'Menu digital', address: 'Tunis, Tunisie', searchResults: 'Résultats de recherche', scrollVertical: 'Affichage vertical', scrollHorizontal: 'Affichage horizontal' },
    en: { search: 'Search for a product...', menu: 'THE MENU', discover: 'Discover', article: 'item', articles: 'items', available: 'Available', unavailable: 'Unavailable', noResults: 'No results', tryAgain: 'Try another word or category.', digital: 'Digital menu', address: 'Tunis, Tunisia', searchResults: 'Search results', scrollVertical: 'Vertical view', scrollHorizontal: 'Horizontal view' },
    ar: { search: 'ابحث عن منتج...', menu: 'القائمة', discover: 'اكتشف', article: 'منتج', articles: 'منتجات', available: 'متوفر', unavailable: 'غير متوفر', noResults: 'لا توجد نتائج', tryAgain: 'جرّب كلمة أو فئة أخرى.', digital: 'قائمة رقمية', address: 'تونس، تونس', searchResults: 'نتائج البحث', scrollVertical: 'عرض عمودي', scrollHorizontal: 'عرض أفقي' },
};

const demoImages = {
    logo: 'assets/cafe-logo.svg',
    coffee: 'assets/coffe-cup.png',
    juice: 'assets/boisson-gazeuse-avec-une-tranche-de-citron.png',
    pastry: 'assets/croissant.png',
    dessert: 'assets/gateau.png',
    snack: 'assets/tacos.png',
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Menu] Initialisation');

    const cafeSlug = getCafeSlugFromURL();
    loadCafeMenu(cafeSlug);

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    document.getElementById('search-clear')?.addEventListener('click', () => {
        const input = document.getElementById('search-input');
        if (!input) return;
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
    });

    document.getElementById('detail-close')?.addEventListener('click', closeProductDetail);
    document.getElementById('detail-backdrop')?.addEventListener('click', closeProductDetail);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeProductDetail();
    });

    document.getElementById('scroll-fab')?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();

    initHeaderParallax();
    initToolbarPin();
    initViewToggle();
    initLanguageMenu();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            syncToolbarHeight();
            moveTabIndicator(document.querySelector('.tab-button.active'));
        }, 150);
    });
});

/* ===== Sélecteur de langue : menu en position FIXED calculée en JS =====
   Le menu vit maintenant HORS du header (voir HTML), donc aucun overflow:hidden
   ou stacking context parent ne peut plus le couper ou le rendre non cliquable. */
function initLanguageMenu() {
    const toggleBtn = document.getElementById('language-toggle');
    const menu = document.getElementById('language-menu');
    if (!toggleBtn || !menu) {
        console.warn('[Menu] Sélecteur de langue introuvable dans le DOM');
        return;
    }

    function positionMenu() {
        const rect = toggleBtn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 8}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
    }

    function openMenu() {
        positionMenu();
        menu.classList.remove('hidden');
        toggleBtn.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
        menu.classList.add('hidden');
        toggleBtn.setAttribute('aria-expanded', 'false');
    }

    toggleBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (menu.classList.contains('hidden')) {
            openMenu();
        } else {
            closeMenu();
        }
    });

    menu.querySelectorAll('.language-option').forEach((option) => {
        option.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            setLanguage(option.dataset.language);
            closeMenu();
        });
    });

    document.addEventListener('click', (event) => {
        if (!menu.classList.contains('hidden') && !menu.contains(event.target) && event.target !== toggleBtn) {
            closeMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (!menu.classList.contains('hidden')) positionMenu();
    });
    window.addEventListener('scroll', () => {
        if (!menu.classList.contains('hidden')) positionMenu();
    }, { passive: true });
}

function updateScrollProgress() {
    const fab = document.getElementById('scroll-fab');
    const ring = document.getElementById('scroll-fab-progress');
    if (!fab || !ring) return;
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    ring.style.strokeDashoffset = String(119.4 * (1 - percentage));
    fab.classList.toggle('visible', window.scrollY > 240);
}

function initHeaderParallax() {
    const header = document.querySelector('.menu-header');
    if (!header) return;
    let ticking = false;
    function update() {
        const height = header.offsetHeight || 1;
        const progress = Math.min(Math.max(window.scrollY / height, 0), 1);
        header.style.setProperty('--progress', progress.toFixed(3));
        ticking = false;
    }
    window.addEventListener('scroll', () => {
        if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
}

function initToolbarPin() {
    const toolbar = document.getElementById('menu-toolbar');
    const sentinel = document.getElementById('toolbar-sentinel');
    if (!toolbar || !sentinel) return;
    if (!('IntersectionObserver' in window)) {
        syncToolbarHeight();
        return;
    }
    const observer = new IntersectionObserver(([entry]) => {
        toolbar.classList.toggle('is-pinned', !entry.isIntersecting);
    }, { threshold: [1] });
    observer.observe(sentinel);
    syncToolbarHeight();
}

function syncToolbarHeight() {
    const toolbar = document.getElementById('menu-toolbar');
    if (!toolbar) return;
    document.documentElement.style.setProperty('--toolbar-h', `${toolbar.offsetHeight}px`);
}

function initViewToggle() {
    const buttons = document.querySelectorAll('.view-toggle-btn');
    const saved = localStorage.getItem('qr-menu-scroll-mode') || 'vertical';
    applyScrollMode(saved);
    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            applyScrollMode(btn.dataset.mode);
            localStorage.setItem('qr-menu-scroll-mode', btn.dataset.mode);
        });
    });
}

function applyScrollMode(mode) {
    document.getElementById('products-container')?.classList.toggle('mode-horizontal', mode === 'horizontal');
    document.querySelectorAll('.view-toggle-btn').forEach((btn) => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });
}

function initCardTilt(card) {
    const maxTilt = 6;
    card.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--ry', `${((px - 0.5) * maxTilt * 2).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((0.5 - py) * maxTilt * 2).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
    });
}

function getCafeSlugFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cafe') || 'bahri';
}

function localized(value) {
    if (value == null) return '';
    return typeof value === 'object' ? value[currentLanguage] || value.fr || '' : value;
}

/* Avec Supabase, les images (produits, catégories, logo) sont stockées
   comme URL publiques complètes (Supabase Storage) -> plus besoin de préfixer
   avec l'URL d'un backend. */
function resolveMenuImage(path, fallback) {
    return path || fallback;
}

async function loadCafeMenu(cafeSlug) {
    try {
        // Un seul aller-retour réseau : le café, ses catégories ET leurs produits
        // arrivent ensemble (imbrication Supabase), au lieu de 2-3 requêtes séparées.
        const { data: cafe, error: cafeError } = await supabaseClient
            .from('cafes')
            .select('*, categories(*, products(*))')
            .eq('slug', cafeSlug)
            .single();

        if (cafeError || !cafe) {
            showError('Café introuvable. Vérifiez le lien du QR code.');
            return;
        }

        cafeData = cafe;

        const rawCategories = (cafe.categories || []).slice().sort((a, b) => a.position - b.position);

        allCategories = rawCategories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            subtitle: cat.subtitle || null,
            icon: resolveMenuImage(cat.icon, null),
        }));

        const rawProducts = rawCategories.flatMap((cat) =>
            (cat.products || []).slice().sort((a, b) => a.position - b.position)
        );

        allProducts = rawProducts.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            price: parseFloat(p.price),
            category_id: p.category_id,
            available: p.available,
            image: p.image || null,
        }));

        // Seuls les produits marqués "disponible" par l'admin apparaissent sur le menu client.
        filteredProducts = allProducts.filter((product) => product.available);
        selectedCategoryId = allCategories[0]?.id ?? null;

        updateMenuUI();
        renderCategories();
        renderProducts();
        syncToolbarHeight();
    } catch (error) {
        console.error('[Menu] Erreur:', error);
        showError('Impossible de charger le menu.');
    }
}

function updateMenuUI() {
    const cafeName = document.getElementById('cafe-name');
    const cafeDescription = document.getElementById('cafe-description');
    const cafeLogo = document.getElementById('cafe-logo');
    if (cafeName) cafeName.textContent = cafeData.name;
    if (cafeDescription) cafeDescription.textContent = cafeData.description || '';
    if (cafeLogo) cafeLogo.src = resolveMenuImage(cafeData.logo, demoImages.logo);

    const cafeAddress = document.getElementById('cafe-address');
    const cafeHours = document.getElementById('cafe-hours');
    const footerCafeName = document.getElementById('footer-cafe-name');
    if (cafeAddress) cafeAddress.textContent = cafeData.address || '';
    if (cafeHours) cafeHours.textContent = cafeData.opening_hours || '';
    if (footerCafeName) footerCafeName.textContent = cafeData.name;
}

function scrollToCategory(categoryId) {
    const section = document.querySelector(`.category-section[data-category-id="${categoryId}"]`);
    if (!section) return;
    const toolbar = document.getElementById('menu-toolbar');
    const offset = (toolbar?.offsetHeight || 0) + 12;
    const top = section.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
}

function renderCategories() {
    const tabsContainer = document.getElementById('tabs-container');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = '<span class="tab-indicator" id="tab-indicator" aria-hidden="true"></span>';

    allCategories.forEach((category) => {
        const button = document.createElement('button');
        button.className = `tab-button ${category.id === selectedCategoryId ? 'active' : ''}`;
        button.innerHTML = `${category.icon ? `<img src="${category.icon}" alt="" class="tab-icon">` : ''}<span>${localized(category.name)}</span>`;
        button.dataset.categoryId = String(category.id);
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', String(category.id === selectedCategoryId));
        button.addEventListener('click', () => {
            const searchInput = document.getElementById('search-input');
            if (searchInput && searchInput.value) {
                searchInput.value = '';
                document.getElementById('search-clear')?.classList.add('hidden');
                filteredProducts = allProducts.filter((product) => product.available);
                renderProducts();
                requestAnimationFrame(() => scrollToCategory(category.id));
            } else {
                scrollToCategory(category.id);
            }
        });
        tabsContainer.appendChild(button);
    });

    requestAnimationFrame(() => {
        const activeBtn = tabsContainer.querySelector('.tab-button.active') || tabsContainer.querySelector('.tab-button');
        moveTabIndicator(activeBtn);
    });

    const tabsScroll = document.querySelector('.category-tabs');
    if (tabsScroll) tabsScroll.scrollLeft = 0;
}

function moveTabIndicator(button) {
    const indicator = document.getElementById('tab-indicator');
    if (!indicator || !button) return;
    indicator.style.width = `${button.offsetWidth}px`;
    indicator.style.transform = `translateX(${button.offsetLeft}px)`;
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    document.getElementById('search-clear')?.classList.toggle('hidden', e.target.value.length === 0);

    const availableProducts = allProducts.filter((product) => product.available);

    if (!searchTerm) {
        filteredProducts = availableProducts;
        renderProducts();
        return;
    }

    filteredProducts = availableProducts.filter(product => {
        // Les champs traduits (fr/ar/en) peuvent contenir null quand une langue n'est pas renseignée.
        const contains = (value) => typeof value === 'string' && value.toLowerCase().includes(searchTerm);
        const matchesIn = (field) => typeof field === 'string' ? contains(field) : Object.values(field || {}).some(contains);
        return matchesIn(product.name) || matchesIn(product.description);
    });
    renderProducts();
}

function renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;
    const text = translations[currentLanguage];

    if (filteredProducts.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⌕</div><h3>${text.noResults}</h3><p>${text.tryAgain}</p></div>`;
        updateResultsCount(0);
        return;
    }

    updateResultsCount(filteredProducts.length);

    const searchTerm = document.getElementById('search-input')?.value.trim() || '';

// Que ce soit avec ou sans recherche, on regroupe toujours par catégorie —
// seules les catégories ayant des produits correspondants s'affichent.
const categorySections = allCategories.map((category) => ({
    ...category,
    products: filteredProducts.filter((product) => product.category_id === category.id),
})).filter((category) => category.products.length > 0);

    container.innerHTML = categorySections.map((section) => `
        <section class="category-section" data-category-id="${section.id}" aria-labelledby="category-${section.id}">
            <div class="category-heading">
                <div class="category-heading-text">
                    <h3 id="category-${section.id}">${localized(section.name)}</h3>
                    ${section.subtitle && localized(section.subtitle) ? `
                    <div class="category-subtitle-wrap">
                        <span class="category-subtitle-rule" aria-hidden="true"></span>
                        <p class="category-subtitle">${localized(section.subtitle)}</p>
                    </div>` : ''}
                </div>
                <span class="count">${section.products.length} ${section.products.length === 1 ? text.article : text.articles}</span>
            </div>
            <div class="product-rail">
                ${section.products.map(product => `
        <article class="product-card ${!product.image ? 'no-media' : ''}" data-product-id="${product.id}" tabindex="0">
            ${product.image ? `
            <div class="product-media">
                <img src="${product.image}" alt="${localized(product.name)}" class="product-image" loading="lazy">
            </div>` : ''}
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${localized(product.name)}</h3>
                    <div class="product-price">${formatPrice(product.price)}</div>
                </div>
                ${localized(product.description) ? `<p class="product-description">${localized(product.description)}</p>` : ''}
            </div>
        </article>
                `).join('')}
            </div>
        </section>
    `).join('');

    container.querySelectorAll('.product-card').forEach((card) => {
        const product = allProducts.find((item) => item.id === Number(card.dataset.productId));
        card.addEventListener('click', () => openProductDetail(product));
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') openProductDetail(product);
        });
    });

    container.querySelectorAll('.product-card').forEach(initCardTilt);

    observeProductCards(container);
    observeCategorySections(container);
    observeCategorySubtitles(container);
    syncToolbarHeight();
}

/* Révèle le sous-titre de catégorie (effet rideau) à chaque fois que la
   section entre à l'écran ; le nom de la catégorie reste toujours visible. */
function observeCategorySubtitles(container) {
    const wraps = container.querySelectorAll('.category-subtitle-wrap');
    if (wraps.length === 0) return;
    if (!('IntersectionObserver' in window)) {
        wraps.forEach((el) => el.classList.add('is-visible'));
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
    }, { threshold: 0.05 });
    wraps.forEach((el) => observer.observe(el));
}

// Relance les animations d'entrée (header, logo, titre, meta) comme au premier chargement
function replayEntranceAnimations() {
    const selectors = ['.header-topline', '.logo-frame', '.menu-header h1', '.menu-header p', '.cafe-meta'];
    selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
            el.style.animation = 'none';
            void el.offsetWidth; // force le navigateur à "oublier" l'ancienne animation
            el.style.animation = '';
        });
    });
}

function observeProductCards(container) {
    const cards = container.querySelectorAll('.product-card');
    if (!('IntersectionObserver' in window)) {
        cards.forEach((card) => card.classList.add('is-visible'));
        return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                currentObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    cards.forEach((card) => observer.observe(card));
}

function observeCategorySections(container) {
    if (!('IntersectionObserver' in window)) return;
    const sections = container.querySelectorAll('.category-section[data-category-id]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const categoryIdRaw = entry.target.dataset.categoryId;
            if (categoryIdRaw === 'results') return;
            selectedCategoryId = Number(categoryIdRaw);
            document.querySelectorAll('.tab-button').forEach((tab) => {
                const isActive = tab.dataset.categoryId === categoryIdRaw;
                tab.classList.toggle('active', isActive);
                if (isActive) {
                    moveTabIndicator(tab);
                    tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        });
    }, { rootMargin: '-28% 0px -58% 0px' });
    sections.forEach((section) => observer.observe(section));
}

function updateResultsCount(count) {
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) {
        const text = translations[currentLanguage];
        resultsCount.textContent = `${count} ${count === 1 ? text.article : text.articles}`;
    }
}

function openProductDetail(product) {
    if (!product || !product.available) return;
    const detailImage = document.getElementById('detail-image');
    if (detailImage) {
        if (product.image) {
            detailImage.src = product.image;
            detailImage.alt = localized(product.name);
            detailImage.style.display = '';
        } else {
            detailImage.style.display = 'none';
        }
    }
    document.getElementById('detail-name').textContent = localized(product.name);
    const detailDescription = document.getElementById('detail-description');
    detailDescription.textContent = localized(product.description);
    detailDescription.style.display = detailDescription.textContent ? '' : 'none';
    document.getElementById('detail-price').textContent = formatPrice(product.price);
    // Tout produit affiché est par définition disponible : pas besoin de le repréciser ici.
    const detailStatus = document.getElementById('detail-status');
    if (detailStatus) detailStatus.style.display = 'none';
    document.getElementById('product-detail').classList.remove('hidden');
    document.body.classList.add('detail-open');
    document.getElementById('detail-close').focus();
}

function closeProductDetail() {
    document.getElementById('product-detail')?.classList.add('hidden');
    document.body.classList.remove('detail-open');
}

function setLanguage(language) {
    if (!translations[language]) return;
    currentLanguage = language;
    localStorage.setItem('qr-menu-language', currentLanguage);
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('language-toggle').textContent = currentLanguage.toUpperCase();
    document.querySelectorAll('.language-option').forEach((option) => {
        const isActive = option.dataset.language === currentLanguage;
        option.classList.toggle('active', isActive);
        option.setAttribute('aria-selected', String(isActive));
    });
    applyTranslations();
    renderCategories();
    renderProducts();
    updateMenuUI();
    replayEntranceAnimations();
    syncToolbarHeight();
}

function applyTranslations() {
    const text = translations[currentLanguage];
    document.getElementById('search-input').placeholder = text.search;
    document.getElementById('search-input').setAttribute('aria-label', text.search);
    document.querySelector('.eyebrow').textContent = text.menu;
    document.querySelector('.menu-intro h2').textContent = text.discover;
    document.getElementById('footer-details').textContent = `${text.digital} · ${text.address}`;
    document.getElementById('mode-vertical')?.setAttribute('title', text.scrollVertical);
    document.getElementById('mode-vertical')?.setAttribute('aria-label', text.scrollVertical);
    document.getElementById('mode-horizontal')?.setAttribute('title', text.scrollHorizontal);
    document.getElementById('mode-horizontal')?.setAttribute('aria-label', text.scrollHorizontal);
}

function formatPrice(price) {
    return `${parseFloat(price).toFixed(3)} DT`;
}

function showLoading(show = true) {
    const container = document.getElementById('products-container');
    if (!container) return;
    if (show) {
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement du menu...</p></div>';
    }
}

function showError(message) {
    const container = document.getElementById('products-container');
    if (!container) return;
    container.innerHTML = `<div class="empty-state"><p>❌ ${message}</p></div>`;
}