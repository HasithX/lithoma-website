import { useState, useEffect } from 'react'

const ADMIN_USER = 'admin'
const ADMIN_PASS = 'admin098'
const AUTH_KEY = 'lm_admin_ok'

const EMPTY_PRODUCT = { name: '', category: '', pack: '', price: 'Rs. 0.00', imageUrl: '' }

export default function Admin() {
    const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1')
    const [loginUser, setLoginUser] = useState('')
    const [loginPass, setLoginPass] = useState('')
    const [loginErr, setLoginErr] = useState(false)

    const [items, setItems] = useState([])
    const [search, setSearch] = useState('')
    const [catFilter, setCatFilter] = useState('')
    const [alert, setAlert] = useState(null) // { type, msg }

    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null) // null = new
    const [form, setForm] = useState(EMPTY_PRODUCT)
    const [imgTab, setImgTab] = useState('upload') // 'upload' | 'url'
    const [preview, setPreview] = useState('')
    const [uploadStatus, setUploadStatus] = useState('')

    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteId, setDeleteId] = useState(null)

    // Load products on login
    useEffect(() => {
        if (authed) {
            fetch('/api/products')
                .then(r => r.json())
                .then(setItems)
                .catch(() => showAlert('danger', 'Could not load products from server.'))
        }
    }, [authed])

    // ── Auth ──
    const handleLogin = (e) => {
        e.preventDefault()
        if (loginUser.trim() === ADMIN_USER && loginPass === ADMIN_PASS) {
            sessionStorage.setItem(AUTH_KEY, '1')
            setAuthed(true)
            setLoginErr(false)
        } else {
            setLoginErr(true)
        }
    }

    const handleLogout = () => {
        sessionStorage.removeItem(AUTH_KEY)
        setAuthed(false)
    }

    // ── Helpers ──
    const showAlert = (type, msg) => {
        setAlert({ type, msg })
        setTimeout(() => setAlert(null), 5000)
    }

    const categories = [...new Set(items.map(p => p.category))].sort()

    const searchWords = search.toLowerCase().split(/\s+/).filter(w => w.length > 0)
    const filteredItems = items.filter(p => {
        const textMatch = searchWords.length === 0 || searchWords.every(w =>
            p.name.toLowerCase().includes(w) || p.category.toLowerCase().includes(w)
        )
        const catMatch = !catFilter || p.category === catFilter
        return textMatch && catMatch
    })

    const nextId = () => items.length ? Math.max(...items.map(x => x.id)) + 1 : 1

    // ── Publish ──
    const publish = async (newItems) => {
        try {
            const res = await fetch('/api/save_products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItems)
            })
            const json = await res.json()
            if (res.ok) {
                setItems(newItems)
                showAlert('success', 'Changes saved! Products updated.')
            } else {
                showAlert('danger', 'Server error: ' + json.message)
            }
        } catch (e) {
            showAlert('danger', 'Could not reach server. Make sure npm start is running!\n' + e.message)
        }
    }

    // ── Modal ──
    const openAdd = () => {
        setEditItem(null)
        setForm(EMPTY_PRODUCT)
        setPreview('')
        setUploadStatus('')
        setImgTab('upload')
        setShowModal(true)
    }

    const openEdit = (p) => {
        setEditItem(p)
        setForm({ name: p.name, category: p.category, pack: p.pack, price: p.price, imageUrl: p.imageUrl || '' })
        setPreview(p.imageUrl ? (p.imageUrl.startsWith('http') ? p.imageUrl : '/' + p.imageUrl) : '')
        setUploadStatus('')
        setImgTab(p.imageUrl && !p.imageUrl.startsWith('http') ? 'upload' : 'url')
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim() || !form.category.trim() || !form.pack.trim() || !form.price.trim()) {
            alert('Please fill in all required fields.'); return
        }
        let newItems
        if (editItem) {
            newItems = items.map(x => x.id === editItem.id ? { ...form, id: editItem.id } : x)
        } else {
            newItems = [...items, { ...form, id: nextId() }]
        }
        setShowModal(false)
        await publish(newItems)
    }

    // ── Delete ──
    const askDelete = (id) => { setDeleteId(id); setShowDeleteModal(true) }
    const confirmDelete = async () => {
        const newItems = items.filter(x => x.id !== deleteId)
        setShowDeleteModal(false)
        await publish(newItems)
    }

    // ── Image Upload ──
    const handleFileUpload = async (file) => {
        if (!file) return
        setUploadStatus('Uploading…')
        const fd = new FormData()
        fd.append('file', file)
        try {
            const res = await fetch('/api/upload_image', { method: 'POST', body: fd })
            const json = await res.json()
            if (res.ok) {
                setForm(f => ({ ...f, imageUrl: json.path }))
                setPreview('/' + json.path)
                setUploadStatus('✅ Saved as: ' + json.path)
            } else {
                setUploadStatus('❌ ' + json.error)
            }
        } catch (e) {
            setUploadStatus('❌ Upload failed: ' + e.message)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) handleFileUpload(file)
    }

    // ── Stats ──
    const priced = items.filter(p => { const n = parseFloat((p.price || '').replace(/[^0-9.]/g, '')); return !isNaN(n) && n > 0 }).length

    // ── Login Screen ──
    if (!authed) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a5e, #333399)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-family)' }}>
                <div style={{ background: 'white', borderRadius: 20, padding: '48px 40px', width: '100%', maxWidth: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#333399,#5c5cba)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, color: 'white' }}>
                            <i className="ph ph-lock" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Admin Panel</h2>
                        <p style={{ color: '#64748b', fontSize: '.9rem', marginTop: 4 }}>LithoMATE Product Manager</p>
                    </div>
                    {loginErr && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '.9rem' }}>Incorrect username or password.</div>}
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>USERNAME</label>
                            <input value={loginUser} onChange={e => setLoginUser(e.target.value)} required placeholder="admin"
                                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: '1rem', outline: 'none', fontFamily: 'inherit' }} />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>PASSWORD</label>
                            <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required placeholder="••••••••"
                                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: '1rem', outline: 'none', fontFamily: 'inherit' }} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: 10 }}>Sign In</button>
                    </form>
                </div>
            </div>
        )
    }

    // ── Dashboard ──
    return (
        <div style={{ fontFamily: 'var(--font-family)', background: '#f1f5f9', minHeight: '100vh' }}>
            {/* Topbar */}
            <header style={{ background: 'white', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#333399,#5c5cba)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>
                        <i className="ph ph-package" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>Litho<span style={{ color: 'var(--color-accent)' }}>MATE</span></span>
                    <span style={{ color: '#94a3b8', fontSize: '.9rem' }}>Admin Panel</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <a href="/" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '.9rem', fontWeight: 500, background: 'white', cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <i className="ph ph-arrow-square-out" /> View Site
                    </a>
                    <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fca5a5', fontSize: '.9rem', fontWeight: 500, background: 'white', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ph ph-sign-out" /> Logout
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                    {[
                        { label: 'Total Products', value: items.length, color: '#3b82f6', bg: '#eff6ff' },
                        { label: 'Categories', value: categories.length, color: '#22c55e', bg: '#f0fdf4' },
                        { label: 'Priced Items', value: priced, color: '#f59e0b', bg: '#fffbeb' },
                    ].map(s => (
                        <div key={s.label} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                            <div style={{ fontSize: '.85rem', color: '#64748b', marginBottom: 8 }}>{s.label}</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>

                {/* Alert */}
                {alert && (
                    <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: alert.type === 'success' ? '#f0fdf4' : '#fef2f2', color: alert.type === 'success' ? '#16a34a' : '#dc2626', border: `1px solid ${alert.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                        <i className={`ph ${alert.type === 'success' ? 'ph-check-circle' : 'ph-warning-circle'}`} /> {alert.msg}
                    </div>
                )}

                {/* Table header */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, flex: '1 1 auto' }}>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
                            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '.9rem', outline: 'none', flex: '1 1 200px', fontFamily: 'inherit' }} />
                        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '.9rem', fontFamily: 'inherit', flex: '1 1 150px' }}>
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={openAdd} style={{ padding: '10px 20px', borderRadius: 10, fontSize: '.9rem', whiteSpace: 'nowrap' }}>
                        <i className="ph ph-plus" style={{ marginRight: 6 }} /> Add Product
                    </button>
                </div>

                {/* Table */}
                <div style={{ background: 'white', borderRadius: 16, overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                    <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#1e293b', color: 'white' }}>
                                {['#', 'Image', 'Name', 'Category', 'Pack', 'Price', 'Actions'].map(h => (
                                    <th key={h} className={['#', 'Category', 'Pack'].includes(h) ? 'hide-on-mobile' : ''} style={{ padding: '14px 16px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: '.85rem', fontWeight: 600 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0
                                ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No products match your search.</td></tr>
                                : filteredItems.map((p, idx) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                                        <td className="hide-on-mobile" style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: '.85rem' }}>#{p.id}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <img src={p.imageUrl ? (p.imageUrl.startsWith('http') ? p.imageUrl : '/' + p.imageUrl) : 'https://dummyimage.com/60x60/f0f0f0/999&text=?'}
                                                style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }}
                                                onError={e => { e.target.src = 'https://dummyimage.com/60x60/f0f0f0/999&text=!' }} alt="" />
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.9rem' }}>{p.name}</td>
                                        <td className="hide-on-mobile" style={{ padding: '12px 16px' }}>
                                            <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 10px', borderRadius: 20, fontSize: '.8rem', fontWeight: 600 }}>{p.category}</span>
                                        </td>
                                        <td className="hide-on-mobile" style={{ padding: '12px 16px', color: '#64748b', fontSize: '.85rem' }}>{p.pack}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>{p.price}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <button onClick={() => openEdit(p)} title="Edit"
                                                style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', marginRight: 6 }}>
                                                <i className="ph ph-pencil" />
                                            </button>
                                            <button onClick={() => askDelete(p.id)} title="Delete"
                                                style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 7, padding: '7px 12px', cursor: 'pointer' }}>
                                                <i className="ph ph-trash" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* ── Add/Edit Modal ── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,.3)' }}>
                        <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{editItem ? 'Edit Product' : 'Add New Product'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}><i className="ph ph-x" /></button>
                        </div>
                        <div style={{ padding: 24 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, marginBottom: 6 }}>Product Name *</label>
                                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. A5 Note Book 100 Pages" required
                                        style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: '1rem', fontFamily: 'inherit', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, marginBottom: 6 }}>Category *</label>
                                    <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        list="catList" placeholder="Notebooks"
                                        style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: '1rem', fontFamily: 'inherit', outline: 'none' }} />
                                    <datalist id="catList">
                                        {['Notebooks', 'Pads', 'Office', 'Paper', 'Maps', 'Drawing'].map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, marginBottom: 6 }}>Price *</label>
                                    <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                        placeholder="Rs. 250.00"
                                        style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: '1rem', fontFamily: 'inherit', outline: 'none' }} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, marginBottom: 6 }}>Pack Details *</label>
                                    <input value={form.pack} onChange={e => setForm(f => ({ ...f, pack: e.target.value }))}
                                        placeholder="12 pcs in a pack"
                                        style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: '1rem', fontFamily: 'inherit', outline: 'none' }} />
                                </div>
                            </div>

                            {/* Image section */}
                            <hr style={{ margin: '16px 0', borderColor: '#f1f5f9' }} />
                            <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, marginBottom: 10 }}>Product Image</label>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                {['upload', 'url'].map(tab => (
                                    <button key={tab} onClick={() => setImgTab(tab)}
                                        style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 600, background: imgTab === tab ? 'var(--color-primary)' : 'white', color: imgTab === tab ? 'white' : '#64748b' }}>
                                        {tab === 'upload' ? '⬆ Upload Image' : '🔗 Use URL'}
                                    </button>
                                ))}
                            </div>

                            {imgTab === 'upload' && (
                                <div
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('fileInput').click()}
                                    style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}>
                                    <i className="ph ph-cloud-arrow-up" style={{ fontSize: '2rem', color: '#94a3b8', display: 'block', marginBottom: 8 }} />
                                    <p style={{ fontSize: '.9rem', color: '#64748b' }}>Drag & drop or click to select image</p>
                                    <input id="fileInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); e.target.value = '' }} />
                                    {uploadStatus && <p style={{ marginTop: 8, fontSize: '.85rem', color: '#64748b' }}>{uploadStatus}</p>}
                                </div>
                            )}

                            {imgTab === 'url' && (
                                <input value={form.imageUrl} onChange={e => { setForm(f => ({ ...f, imageUrl: e.target.value })); setPreview(e.target.value) }}
                                    placeholder="https://... or images/photo.jpg"
                                    style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: '1rem', fontFamily: 'inherit', outline: 'none' }} />
                            )}

                            {preview && (
                                <div style={{ marginTop: 12 }}>
                                    <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 10, border: '1px solid #e5e7eb' }}
                                        onError={e => { e.target.style.display = 'none' }} />
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '0 24px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: '1 1 auto', padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
                            <button onClick={handleSave} className="btn btn-primary" style={{ flex: '1 1 auto', padding: '10px 24px', borderRadius: 10, fontSize: '1rem' }}>
                                <i className="ph ph-floppy-disk" style={{ marginRight: 6 }} /> Save & Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ── */}
            {showDeleteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 360, boxShadow: '0 25px 50px rgba(0,0,0,.3)' }}>
                        <i className="ph ph-warning" style={{ fontSize: '2.5rem', color: '#ef4444', display: 'block', marginBottom: 16 }} />
                        <h4 style={{ fontWeight: 700, marginBottom: 10 }}>Delete Product?</h4>
                        <p style={{ color: '#64748b', fontSize: '.9rem', marginBottom: 24 }}>This will be removed from your live site.</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button onClick={() => setShowDeleteModal(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
                            <button onClick={confirmDelete} style={{ padding: '10px 20px', borderRadius: 10, background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
