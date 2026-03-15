// --- Configuration ---
const WHATSAPP_PHONE_NUMBER = "94700000000";

// --- State ---
let cart = [];
let products = []; // loaded from API
let displayLimit = 9;
let currentFilteredProducts = [];

// --- DOM Elements ---
const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const currentYearSpan = document.getElementById('current-year');

const cartIcon = document.getElementById('cart-icon');
const cartSidebar = document.getElementById('cart-sidebar');
const closeCartBtn = document.getElementById('close-cart');
const cartOverlay = document.getElementById('cart-overlay');
const cartItemsContainer = document.getElementById('cart-items');
const cartBadge = document.getElementById('cart-badge');
const cartTotalCount = document.getElementById('cart-total-count');
const cartTotalPrice = document.getElementById('cart-total-price');
const checkoutBtn = document.getElementById('checkout-btn');
const clearCartBtn = document.getElementById('clear-cart-btn');
const seeMoreBtn = document.getElementById('see-more-btn');
const seeMoreContainer = document.getElementById('see-more-container');

// --- Product Loading from API ---
async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to load products');
        products = await res.json();
    } catch (err) {
        console.warn('API not available, falling back to static products.js', err);
        // Fallback: if server is not running, try window.products
        products = window.products || [];
    }
    currentFilteredProducts = products;
    renderProducts(currentFilteredProducts);
    updateCart();
}

// --- Functions ---

/**
 * Render products to DOM based on a provided array
 */
function renderProducts(productsToRender) {
    productsGrid.innerHTML = '';

    if (productsToRender.length === 0) {
        productsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 40px; color: var(--color-text-light);">No products found matching your search.</p>';
        seeMoreContainer.style.display = 'none';
        return;
    }

    const itemsToShow = productsToRender.slice(0, displayLimit);

    if (productsToRender.length > displayLimit) {
        seeMoreContainer.style.display = 'block';
    } else {
        seeMoreContainer.style.display = 'none';
    }

    itemsToShow.forEach(product => {
        const card = document.createElement('div');
        card.classList.add('product-card');

        card.innerHTML = `
            <div class="product-image-container">
                <img src="${product.imageUrl}" alt="${product.name}" class="product-image" loading="lazy">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p style="font-size: 0.85rem; color: var(--color-text-light); margin-bottom: 8px;">${product.pack}</p>
                <div class="product-price">${product.price}</div>
                <div class="product-actions">
                    <button class="btn btn-add-cart" data-id="${product.id}">
                        <i class="ph ph-shopping-cart" style="font-size: 1.2rem;"></i>
                        Add to Cart
                    </button>
                    <span class="added-feedback" id="feedback-${product.id}" style="display:none; color: var(--color-whatsapp); font-size: 0.85rem; margin-top: 8px; text-align: center;">Added!</span>
                </div>
            </div>
        `;

        productsGrid.appendChild(card);
    });

    const addCartButtons = document.querySelectorAll('.btn-add-cart');
    addCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = parseInt(e.currentTarget.getAttribute('data-id'));
            addToCart(productId);

            const feedback = document.getElementById(`feedback-${productId}`);
            if (feedback) {
                feedback.style.display = 'block';
                setTimeout(() => { feedback.style.display = 'none'; }, 1500);
            }
        });
    });
}

// --- Cart Logic ---

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCart();
}

function updateCartItemQuantity(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(p => p.id !== productId);
        }
    }
    updateCart();
}

function updateCart() {
    let totalItems = 0;
    let totalPrice = 0;

    cart.forEach(item => {
        totalItems += item.quantity;

        const match = item.price.match(/[\d,]+(\.\d+)?/);
        if (match) {
            const priceValue = parseFloat(match[0].replace(/,/g, ''));
            if (!isNaN(priceValue)) {
                totalPrice += priceValue * item.quantity;
            }
        }
    });

    cartBadge.textContent = totalItems;
    cartTotalCount.textContent = totalItems;
    cartTotalPrice.textContent = "Rs. " + totalPrice.toFixed(2);

    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color: var(--color-text-lighter); margin-top:20px;">Your cart is empty.</p>';
        return;
    }

    cart.forEach(item => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateCartItemQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartItemQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
        cartItemsContainer.appendChild(el);
    });
}

// --- WhatsApp Checkout ---
function buildWhatsAppMessage() {
    if (cart.length === 0) return encodeURIComponent("Hello LithoMATE! I have a question about your products.");

    let text = "Hello LithoMATE! I would like to place an order for the following items:\n\n";
    let totalPrice = 0;

    cart.forEach((item, index) => {
        text += `${index + 1}. *${item.name}*\n`;
        text += `   Quantity: ${item.quantity} packs (${item.pack})\n`;

        const match = item.price.match(/[\d,]+(\.\d+)?/);
        if (match) {
            const priceValue = parseFloat(match[0].replace(/,/g, ''));
            if (!isNaN(priceValue)) {
                totalPrice += priceValue * item.quantity;
            }
        }
    });

    text += `\n*Total Estimated Price:* Rs. ${totalPrice.toFixed(2)}\n`;
    text += "\nPlease let me know how to proceed with payment and delivery. Thank you!";
    return encodeURIComponent(text);
}

// --- Cart Sidebar Controls ---
function openCart() {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// --- Event Listeners ---

mobileMenuBtn.addEventListener('click', () => {
    mobileMenuBtn.classList.toggle('active');
    navLinks.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenuBtn.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

cartIcon.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

clearCartBtn.addEventListener('click', () => {
    cart = [];
    updateCart();
});

checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        alert("Your cart is empty! Add some products first.");
        return;
    }
    const msg = buildWhatsAppMessage();
    window.open(`https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${msg}`, '_blank');
});

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    currentFilteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
    displayLimit = 9;
    renderProducts(currentFilteredProducts);
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const productsSection = document.getElementById('products');
        if (productsSection) {
            productsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
});

seeMoreBtn.addEventListener('click', () => {
    displayLimit += 9;
    renderProducts(currentFilteredProducts);
});

currentYearSpan.textContent = new Date().getFullYear();

// --- Initialize the page by loading from API ---
document.addEventListener('DOMContentLoaded', loadProducts);
