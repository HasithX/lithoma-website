import { useState, useEffect, useCallback } from 'react'

const NEW_PHONE_1 = '+94706553979'
const NEW_PHONE_2 = '+94714278313'
const MAP_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31689.792584056628!2d79.85135641083987!3d6.863728899999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25a5a5c3a5fcb%3A0x3ab3ebfd292f9d8b!2sLitho%20Printers%20%26%20Litho%20Marketing%20Services!5e0!3m2!1sen!2slk!4v1773524571616!5m2!1sen!2slk'

export default function Shop() {
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const [displayLimit, setDisplayLimit] = useState(9)
    const [toasts, setToasts] = useState([])
    const [loading, setLoading] = useState(true)
    const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '', email: '', notes: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)

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

    const handleOrderSubmit = async (e) => {
        e.preventDefault()
        if (cart.length === 0) { alert('Your cart is empty!'); return }
        setIsSubmitting(true)
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkout: checkoutForm, cart, totalItems, totalPrice })
            })
            const data = await response.json()
            if (response.ok) {
                setToasts(prev => [...prev, { id: Date.now(), msg: 'Order placed successfully! We will email you shortly.' }])
                setCart([])
                setIsCheckoutOpen(false)
                setCheckoutForm({ name: '', phone: '', address: '', email: '', notes: '' })
            } else {
                alert('Failed to place order: ' + data.error)
            }
        } catch (error) {
            alert('An error occurred. Please try again later.')
        } finally {
            setIsSubmitting(false)
        }
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
                    <button className="btn btn-clear-cart w-full" onClick={clearCart} style={{ marginBottom: 16 }}>
                        <i className="ph ph-trash" /> Clear Cart
                    </button>
                    <button className="btn btn-primary w-full" onClick={() => setIsCheckoutOpen(true)}>
                        Proceed to Checkout
                    </button>
                </div>
            </div>

            {/* ── Checkout Modal ── */}
            <div className={`modal-overlay${isCheckoutOpen ? ' active' : ''}`} onClick={() => setIsCheckoutOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '1.6rem', color: 'var(--color-primary)', fontWeight: 800 }}>Complete Your Order</h2>
                        <button className="close-cart" onClick={() => setIsCheckoutOpen(false)}><i className="ph ph-x" /></button>
                    </div>

                    <form onSubmit={handleOrderSubmit}>
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input required className="form-input" type="text" placeholder="John Doe" value={checkoutForm.name} onChange={e => setCheckoutForm({ ...checkoutForm, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Phone Number *</label>
                            <input required className="form-input" type="tel" placeholder="07XXXXXXXX" value={checkoutForm.phone} onChange={e => setCheckoutForm({ ...checkoutForm, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input className="form-input" type="email" placeholder="john@example.com (Optional)" value={checkoutForm.email} onChange={e => setCheckoutForm({ ...checkoutForm, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Delivery Address *</label>
                            <textarea required className="form-input" rows="3" placeholder="123 Main St, Colombo" value={checkoutForm.address} onChange={e => setCheckoutForm({ ...checkoutForm, address: e.target.value })}></textarea>
                        </div>
                        <div className="form-group">
                            <label>Special Notes</label>
                            <textarea className="form-input" rows="2" placeholder="Any special instructions for delivery..." value={checkoutForm.notes} onChange={e => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}></textarea>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '1.2rem', fontWeight: 700 }}>
                            <span>Total to Pay:</span>
                            <span style={{ color: 'var(--color-primary)' }}>Rs. {totalPrice.toFixed(2)}</span>
                        </div>

                        <button disabled={isSubmitting} type="submit" className="btn btn-primary w-full" style={{ opacity: isSubmitting ? 0.7 : 1, fontSize: '1.1rem', padding: '16px' }}>
                            {isSubmitting ? 'Processing Order...' : 'Confirm Order'}
                        </button>
                    </form>
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
                            <a href={`https://wa.me/${NEW_PHONE_1.replace('+', '')}`} target="_blank" rel="noreferrer" className="social-btn whatsapp" title="WhatsApp Us">
                                <i className="ph ph-whatsapp-logo" />
                            </a>
                            <a href="mailto:info@lithomatelk.com" className="social-btn email" title="Email Us">
                                <i className="ph ph-envelope-simple" />
                            </a>
                            <a href="https://www.facebook.com/share/18TYq1mz68/" target="_blank" rel="noreferrer" className="social-btn facebook" title="Facebook" style={{ background: '#1877F2', color: 'white' }}>
                                <i className="ph ph-facebook-logo" />
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
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <a href={`tel:${NEW_PHONE_1}`}>+94 70 655 3979</a>
                                    <a href={`tel:${NEW_PHONE_2}`}>+94 71 427 8313</a>
                                </div>
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
