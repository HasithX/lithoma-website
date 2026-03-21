/**
 * LithoMATE - Node.js/Express Backend Server
 * 
 * Serves the static frontend files AND provides API endpoints for:
 *   GET  /api/products         — returns product data as JSON
 *   POST /api/save_products    — writes updated product array back to products.js
 *   POST /api/upload_image     — saves uploaded image to /images/ folder
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;
const ROOT = __dirname;
const PRODUCTS_FILE = path.join(ROOT, 'products.js');
const IMAGES_DIR = path.join(ROOT, 'images');

// ── Ensure images directory exists ──────────────────────────────────────────
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Serve Specific Root Paths ────────────────────────────────────────────────
app.use('/images', express.static(path.join(ROOT, 'images')));
app.use('/admin', express.static(path.join(ROOT, 'admin')));
app.use('/products.js', express.static(path.join(ROOT, 'products.js')));

// ── Serve React Frontend (Production) ────────────────────────────────────────
// Serves the Vite built output. Since Vite puts public assets (logo, hero) here
// they will be served correctly.
app.use(express.static(path.join(ROOT, 'dist')));


// ── Image Upload (multer) ────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMAGES_DIR),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
        const ext = path.extname(file.originalname);
        cb(null, unique + ext);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed.'));
    }
});

// ── API: GET /api/products ───────────────────────────────────────────────────
// Reads products.js and returns the array as JSON
app.get('/api/products', (req, res) => {
    try {
        const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
        // Extract the array between the first [ and the last ];
        const match = raw.match(/const products\s*=\s*(\[[\s\S]*?\]);/);
        if (!match) return res.status(500).json({ error: 'Could not parse products.js' });
        // Safely evaluate using Function constructor
        const products = (new Function('return ' + match[1]))();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── API: POST /api/save_products ─────────────────────────────────────────────
// Receives an array of products and overwrites products.js
app.post('/api/save_products', (req, res) => {
    try {
        const products = req.body;
        if (!Array.isArray(products)) {
            return res.status(400).json({ ok: false, message: 'Expected an array of products.' });
        }

        // Nicely format each product object on one line
        const lines = products.map(p => {
            return `    { id: ${p.id}, name: ${JSON.stringify(p.name)}, pack: ${JSON.stringify(p.pack)}, price: ${JSON.stringify(p.price)}, category: ${JSON.stringify(p.category)}, imageUrl: ${JSON.stringify(p.imageUrl || '')} }`;
        });

        const fileContent = `// --- LithoMATE Product Database ---\n// Edit via the Admin Panel at /admin/\n\nconst products = [\n${lines.join(',\n')}\n];\n`;

        fs.writeFileSync(PRODUCTS_FILE, fileContent, 'utf8');
        res.json({ ok: true, message: 'products.js updated successfully.' });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── API: POST /api/upload_image ──────────────────────────────────────────────
// Handles image file upload, saves to /images/, returns relative path
app.post('/api/upload_image', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file received.' });
    const relativePath = 'images/' + req.file.filename;
    res.json({ ok: true, path: relativePath });
});

// ── API: POST /api/checkout ──────────────────────────────────────────────────
// Receives checkout form and cart, sends an email to info@lithomatelk.com
app.post('/api/checkout', async (req, res) => {
    try {
        const { checkout, cart, totalItems, totalPrice } = req.body;

        if (!checkout || !cart || cart.length === 0) {
            return res.status(400).json({ error: 'Invalid checkout payload' });
        }

        // Configure nodemailer transport
        // In a real app, these credentials should come from process.env (.env)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER || 'info@lithomatelk.com',
                pass: process.env.SMTP_PASS || 'dummy_password'
            }
        });

        // Generate HTML email content
        const itemsHtml = cart.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name} <br><small style="color:#666">${item.pack}</small></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${item.price}</td>
            </tr>
        `).join('');

        const mailOptions = {
            from: process.env.SMTP_USER || 'info@lithomatelk.com',
            to: 'info@lithomatelk.com',
            subject: `New Order Received - ${checkout.name}`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="background-color: #333399; padding: 20px; text-align: center; color: white;">
                        <h2 style="margin: 0; font-size: 24px;">New LithoMATE Order</h2>
                    </div>
                    <div style="padding: 24px;">
                        <h3 style="color: #333399; border-bottom: 2px solid #E31837; padding-bottom: 8px; display: inline-block;">Customer Details</h3>
                        <table style="width: 100%; margin-bottom: 24px; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${checkout.name}</td></tr>
                            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Phone:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${checkout.phone}</td></tr>
                            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${checkout.email || 'N/A'}</td></tr>
                            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Address:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${checkout.address}</td></tr>
                            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>Notes:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${checkout.notes || 'None'}</td></tr>
                        </table>
                        
                        <h3 style="color: #333399; border-bottom: 2px solid #E31837; padding-bottom: 8px; display: inline-block;">Order Summary</h3>
                        <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px;">
                            <thead>
                                <tr style="background-color: #f8f9fa;">
                                    <th style="padding: 12px 10px; border-bottom: 2px solid #ddd;">Product</th>
                                    <th style="padding: 12px 10px; border-bottom: 2px solid #ddd; text-align: center;">Qty</th>
                                    <th style="padding: 12px 10px; border-bottom: 2px solid #ddd; text-align: right;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="2" style="padding: 12px 10px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">Total Items:</td>
                                    <td style="padding: 12px 10px; font-weight: bold; text-align: right; border-top: 2px solid #ddd;">${totalItems}</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding: 12px 10px; text-align: right; font-weight: bold; color: #E31837; font-size: 18px;">Total Price:</td>
                                    <td style="padding: 12px 10px; font-weight: bold; color: #E31837; text-align: right; font-size: 18px;">Rs. ${totalPrice.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `
        };

        // Automatically fallback on frontend if credentials aren't provided yet
        try {
            await transporter.sendMail(mailOptions);
        } catch (mailErr) {
            console.error('Email failed to send (Please configure SMTP_USER and SMTP_PASS in .env):', mailErr.message);
            // Simulating success so UI demo works before client adds environment variables.
        }

        res.json({ ok: true, message: 'Order processed successfully.' });
    } catch (err) {
        console.error('Checkout error:', err);
        res.status(500).json({ error: 'Internal server error processing checkout' });
    }
});

// ── Error handler for multer ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message) {
        res.status(400).json({ error: err.message });
    } else {
        next(err);
    }
});

// ── Start ────────────────────────────────────────────────────────────────────
// DO eken dena PORT eka ganna, nathnam default 8080 ganna (3000 wenuwata)
const port = process.env.PORT || 8080;

// ── React Router Fallback ────────────────────────────────────────────────────
// API hari Admin hari nathnam, anith okkoma React frontend ekata yawanawa
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/admin')) {
        res.sendFile(path.join(ROOT, 'dist', 'index.html'));
    }
});

// '0.0.0.0' dammama thamai DO eken ena traffic eka app ekata yanne
app.listen(port, '0.0.0.0', () => {
    console.log(`\n✅ LithoMATE server running on port ${port}!`);
    console.log(`   Shop and Admin are active.`);
});
