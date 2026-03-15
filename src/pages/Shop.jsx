import { useState, useEffect, useCallback } from 'react'

const WHATSAPP_PHONE_NUMBER = '94781270908'
const MAP_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31689.792584056628!2d79.85135641083987!3d6.863728899999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25a5a5c3a5fcb%3A0x3ab3ebfd292f9d8b!2sLitho%20Printers%20%26%20Litho%20Marketing%20Services!5e0!3m2!1sen!2slk!4v1773524571616!5m2!1sen!2slk'

export default function Shop() {
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const [displayLimit, setDisplayLimit] = useState(9)
    const [toasts, setToasts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/products')
            .then(r => r.json())
            .then(data => { setProducts(data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    useEffect(() => {
        document.body.style.overflow = isCartOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [isCartOpen])

    const searchWords = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0)
    const filtered = products.filter(p => {
        const textMatch = searchWords.length === 0 || searchWords.every(w =>
            p.name.toLowerCase().includes(w) || p.category.toLowerCase().includes(w)
        )
        const catMatch = !selectedCategory || p.category === selectedCategory
        return textMatch && catMatch
    })

    const categories = [...new Set(products.map(p => p.category))].sort()

    const totalItems = cart.reduce((s, i) => s + i.quantity, 0)
    const totalPrice = cart.reduce((s, i) => {
        const m = (i.price || '').match(/[\d,]+(\.\d+)?/)
        return m ? s + parseFloat(m[0].replace(/,/g, '')) * i.quantity : s
    }, 0)

    const addToCart = useCallback((product) => {
        setCart(prev => {
            const ex = prev.find(x => x.id === product.id)
            return ex
                ? prev.map(x => x.id === product.id ? { ...x, quantity: x.quantity + 1 } : x)
                : [...prev, { ...product, quantity: 1 }]
        })

        // Add Toast
        const toastId = Date.now()
        setToasts(prev => [...prev, { id: toastId, msg: `Added ${product.name} to cart!` }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId))
        }, 3000)
    }, [])

    const updateQty = (id, delta) => {
        setCart(prev =>
            prev.map(x => x.id === id ? { ...x, quantity: x.quantity + delta } : x)
                .filter(x => x.quantity > 0)
        )
    }

    const clearCart = () => setCart([])

    const handleCheckout = () => {
        if (cart.length === 0) { alert('Your cart is empty!'); return }
        let text = 'Hello LithoMATE! I would like to place an order:\n\n'
        cart.forEach((item, i) => {
            text += `${i + 1}. *${item.name}*\n   Qty: ${item.quantity} packs (${item.pack})\n`
        })
        const total = cart.reduce((s, i) => {
            const m = (i.price || '').match(/[\d,]+(\.\d+)?/)
            return m ? s + parseFloat(m[0].replace(/,/g, '')) * i.quantity : s
        }, 0)
        text += `\n*Total: Rs. ${total.toFixed(2)}*\n\nPlease advise on payment & delivery. Thank you!`
        window.open(`https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(text)}`, '_blank')
    }

    const handleSearchKey = (e) => {
        if (e.key === 'Enter') document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <>
            {/* ── Mobile Menu Overlay ── */}
            <div
                className={`mobile-menu-overlay${isMobileMenuOpen ? ' active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* ── Header ── */}
            <header className="header">
                <nav className="navbar">
                    <div className="logo">
                        <a href="#home">
                            <img src="/logo.webp" alt="LithoMATE" className="brand-logo" style={{ height: 44 }} />
                        </a>
                    </div>
                    <ul className={`nav-links${isMobileMenuOpen ? ' active' : ''}`}>
                        <li><a href="#home" onClick={() => setIsMobileMenuOpen(false)}>Home</a></li>
                        <li><a href="#products" onClick={() => setIsMobileMenuOpen(false)}>Products</a></li>
                        <li><a href="#about" onClick={() => setIsMobileMenuOpen(false)}>About Us</a></li>
                        <li><a href="#contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</a></li>
                    </ul>
                    <div className="nav-actions">
                        <div className="cart-icon" onClick={() => setIsCartOpen(true)}>
                            <i className="ph ph-shopping-cart" />
                            <span className="cart-badge">{totalItems}</span>
                        </div>
                        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(v => !v)}>
                            <i className={`ph ${isMobileMenuOpen ? 'ph-x' : 'ph-list'}`} />
                        </button>
                    </div>
                </nav>
            </header>

            {/* ── Cart Overlay + Sidebar ── */}
            <div className={`cart-overlay${isCartOpen ? ' active' : ''}`} onClick={() => setIsCartOpen(false)} />
            <div className={`cart-sidebar${isCartOpen ? ' active' : ''}`}>
                <div className="cart-header">
                    <h2>Your Cart</h2>
                    <button className="close-cart" onClick={() => setIsCartOpen(false)}><i className="ph ph-x" /></button>
                </div>
                <div className="cart-items">
                    {cart.length === 0
                        ? <p style={{ textAlign: 'center', color: 'var(--color-text-lighter)', marginTop: 20 }}>Your cart is empty.</p>
                        : cart.map(item => (
                            <div key={item.id} className="cart-item">
                                <img src={item.imageUrl} alt={item.name} className="cart-item-img" />
                                <div className="cart-item-info">
                                    <div className="cart-item-title">{item.name}</div>
                                    <div className="cart-item-controls">
                                        <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
                <div className="cart-footer">
                    <div className="cart-total"><span>Total Items:</span><span>{totalItems}</span></div>
                    <div className="cart-total" style={{ color: 'var(--color-primary)', fontSize: '1.4rem' }}>
                        <span>Total Price:</span><span>Rs. {totalPrice.toFixed(2)}</span>
                    </div>
                    <button className="btn btn-clear-cart w-full" onClick={clearCart} style={{ marginBottom: 12 }}>
                        <i className="ph ph-trash" /> Clear Cart
                    </button>
                    <button className="btn btn-whatsapp w-full" onClick={handleCheckout}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" style={{ fill: 'currentColor', width: 20, height: 20, marginRight: 8 }}>
                            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 413.3c-32.9 0-65.1-8.7-93.5-25.2l-6.7-4-69.5 18.2 18.6-67.8-4.4-7.1c-18.4-29.5-28.2-63.5-28.2-98.1 0-101.4 82.5-183.8 183.9-183.8 49.1 0 95.3 19.1 130 53.8 34.7 34.7 53.8 81 53.8 130.2 0 101.5-82.5 183.8-183.6 183.8h-.1zM324.9 295.1c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                        </svg>
                        Order via WhatsApp
                    </button>
                </div>
            </div>

            <main>
                {/* ── Hero ── */}
                <section id="home" className="hero section">
                    <div className="hero-content">
                        <h1 className="hero-title">Welcome to <span className="brand-highlight2">Litho</span><span className="brand-highlight">MATE</span></h1>
                        <p className="hero-subtitle">Sri Lanka's premium stationery for your education.</p>
                        <a href="#products" className="btn btn-primary">Shop Now</a>
                    </div>
                </section>

                {/* ── Products ── */}
                <section id="products" className="products section" style={{ paddingTop: 60 }}>
                    <div className="container">
                        <h2 className="section-title">Our Collection</h2>

                        {/* Search Bar + Category Filter */}
                        <div className="search-container">
                            <div className="search-box">
                                <i className="ph ph-magnifying-glass search-icon" />
                                <input
                                    id="search-input"
                                    type="text"
                                    placeholder="Search for notebooks, maps, paper..."
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setDisplayLimit(9) }}
                                    onKeyDown={handleSearchKey}
                                />
                            </div>
                            <select
                                value={selectedCategory}
                                onChange={e => { setSelectedCategory(e.target.value); setDisplayLimit(9) }}
                                className="category-select"
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {loading
                            ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 20 }}>
                                    <div className="loading-spinner" />
                                    <p style={{ color: 'var(--color-text-lighter)', fontWeight: 500, fontSize: '1rem' }}>Loading products…</p>
                                </div>
                            )
                            : <>
                                <div className="products-grid">
                                    {filtered.length === 0
                                        ? <p style={{ textAlign: 'center', gridColumn: '1/-1', padding: 40 }}>No products found.</p>
                                        : filtered.slice(0, displayLimit).map(product => (
                                            <div key={product.id} className="product-card">
                                                <div className="product-image-container">
                                                    <img src={product.imageUrl} alt={product.name} className="product-image" loading="lazy" />
                                                </div>
                                                <div className="product-info">
                                                    <span className="product-category-badge">{product.category}</span>
                                                    <h3 className="product-name">{product.name}</h3>
                                                    <p style={{ fontSize: '.85rem', color: 'var(--color-text-light)', marginBottom: 8 }}>{product.pack}</p>
                                                    <div className="product-price">{product.price}</div>
                                                    <div className="product-actions">
                                                        <button className="btn btn-add-cart" onClick={() => addToCart(product)}>
                                                            <i className="ph ph-shopping-cart" style={{ fontSize: '1.2rem' }} />
                                                            Add to Cart
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                                {filtered.length > displayLimit && (
                                    <div style={{ textAlign: 'center', marginTop: 40 }}>
                                        <button className="btn btn-primary" onClick={() => setDisplayLimit(d => d + 9)}>Load More</button>
                                    </div>
                                )}
                            </>
                        }
                    </div>
                </section>

                {/* ── About Us ── */}
                <section id="about" className="about section">
                    <div className="container">
                        <div className="about-content">
                            <h2 className="section-title">Our Story</h2>
                            <p>At LithoMATE, we are dedicated to providing the best stationery for your education. From high-quality notebooks to detailed educational maps and cash books, we bring you a thoughtfully curated selection of items to elevate your everyday learning and office experience.</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* ── Footer ── */}
            <footer id="contact" className="footer">
                <div className="container footer-top">
                    <div className="footer-brand-block">
                        <img src="/logo.webp" alt="LithoMATE" style={{ height: 48, marginBottom: 16 }} />
                        <p className="footer-tagline">Quality stationery for a brighter tomorrow.</p>
                        <div className="footer-social">
                            <a href="https://wa.me/94756833333" target="_blank" rel="noreferrer" className="social-btn whatsapp" title="WhatsApp">
                                <i className="ph ph-whatsapp-logo" />
                            </a>
                            <a href="mailto:info@lithomatelk.com" className="social-btn email" title="Email Us">
                                <i className="ph ph-envelope-simple" />
                            </a>
                        </div>
                    </div>

                    <div className="footer-contact-block">
                        <h4 className="footer-heading">Contact Us</h4>
                        <ul className="footer-contact-list">
                            <li>
                                <i className="ph ph-map-pin footer-contact-icon" />
                                <span>88A Sunethradevi Rd, Nugegoda, Sri Lanka</span>
                            </li>
                            <li>
                                <i className="ph ph-phone footer-contact-icon" />
                                <a href="tel:+94756833333">+94 75 683 3333</a>
                            </li>
                            <li>
                                <i className="ph ph-envelope-simple footer-contact-icon" />
                                <a href="mailto:info@lithomatelk.com">info@lithomatelk.com</a>
                            </li>
                        </ul>
                    </div>

                    <div className="footer-map-block">
                        <h4 className="footer-heading">Find Us</h4>
                        <div className="footer-map-frame">
                            <iframe
                                src={MAP_EMBED}
                                width="100%" height="100%"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="LithoMATE Location">
                            </iframe>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} LithoMATE. All rights reserved.</p>
                </div>
            </footer>

            {/* ── Toast Notifications ── */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className="toast">
                        <i className="ph ph-check-circle toast-icon" />
                        <span className="toast-msg">{toast.msg}</span>
                    </div>
                ))}
            </div>
        </>
    )
}
