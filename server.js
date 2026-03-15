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
app.use(express.static(ROOT));   // Serves index.html, styles.css, script.js etc.

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

// ── Error handler for multer ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message) {
        res.status(400).json({ error: err.message });
    } else {
        next(err);
    }
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅ LithoMATE server running!`);
    console.log(`   Shop:   http://localhost:${PORT}`);
    console.log(`   Admin:  http://localhost:${PORT}/admin/\n`);
});
