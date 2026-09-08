import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import userRoutes from "./routes/UserRoute.js";
import subscriptionRoute from "./routes/SubscriptionRoutes.js";
import assetRoute from "./routes/AssetRoute.js";
import activityLogRoute from "./routes/ActivityLogRoute.js";
import employeeRoute from "./routes/EmployeeRoute.js";
import formRecordRoute from "./routes/FormRecordRoute.js";
import uploadRoute from "./routes/UploadRoute.js";
import categoryRoute from "./routes/CategoryRoute.js";
import { Asset } from "./models/Asset.js";
import { seedCategories } from "./controllers/CategoryController.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = process.env.NODE_ENV === "production"
  ? false
  : ["http://localhost:5173"];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// app.use('/api/v1/departments', departmentRoute);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/subscriptions', subscriptionRoute);
app.use('/api/v1/assets', assetRoute);
app.use('/api/v1/activity-log', activityLogRoute);
app.use('/api/v1/employees',   employeeRoute);
app.use('/api/v1/form-records', formRecordRoute);
app.use('/api/v1/uploads', uploadRoute);
app.use('/api/v1/categories', categoryRoute);

// Serve uploaded files (images, PDFs, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Public asset view (QR scan target) ──────────────────────────────
// Each asset's QR encodes <origin>/asset/<deviceCode>. Scanning it opens this
// read-only page showing the full asset details — no login required so any
// phone on the network can view it. Registered BEFORE the SPA catch-all.
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const ORG_NAMES = {
  KHEALTH: 'Khealth Corporation',
  CAREVIEW: 'Careview Communications',
  GLOWFIND: 'Glowfind',
};

function assetViewPage(asset) {
  const org = ORG_NAMES[asset.company] || asset.company || '';
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
  const row = (label, value) => {
    if (value === undefined || value === null || String(value).trim() === '') return '';
    return `<tr><td class="k">${esc(label)}</td><td class="v">${esc(value)}</td></tr>`;
  };
  const employeeRows = [
    row('Assigned To', asset.assignedTo),
    row('ID No.', asset.employeeId),
    row('Position', asset.position),
    row('Department', asset.department),
  ].join('');
  const deviceRows = [
    row('Asset / Tag No.', asset.deviceCode),
    row('Item', asset.name),
    row('Category', asset.category),
    row('Brand / Model', [asset.brand, asset.model].filter(Boolean).join(' / ')),
    row('Serial Number', asset.serialNumber),
    row('Specifications', asset.specifications),
    row('Status', asset.status),
    row('Location', asset.location),
    row('Purchase Date', fmtDate(asset.purchaseDate)),
    row('Warranty Expiry', fmtDate(asset.warrantyExpiry)),
    row('Remarks', asset.notes),
  ].join('');
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(asset.deviceCode)} — Asset Details</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; background:#f1f5f9; color:#0f172a; }
  @media (prefers-color-scheme: dark){ body{ background:#0f172a; color:#e2e8f0; } .card{ background:#1e293b !important; border-color:#334155 !important; } .k{ color:#94a3b8 !important; } .sec{ color:#93c5fd !important; } }
  .wrap { max-width:560px; margin:0 auto; padding:20px 16px 40px; }
  .head { background:linear-gradient(135deg,#2563eb,#1e40af); color:#fff; border-radius:16px; padding:20px; }
  .head .org { font-size:12px; letter-spacing:.08em; text-transform:uppercase; opacity:.9; }
  .head .code { font-size:26px; font-weight:800; font-family:ui-monospace,Consolas,monospace; margin-top:4px; }
  .head .name { margin-top:6px; font-size:15px; opacity:.95; }
  .card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:6px 16px; margin-top:16px; }
  .sec { font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#2563eb; padding:14px 0 8px; }
  table { width:100%; border-collapse:collapse; }
  td { padding:9px 0; vertical-align:top; border-top:1px solid rgba(148,163,184,.2); font-size:14px; }
  tr:first-child td { border-top:none; }
  .k { color:#64748b; width:42%; padding-right:12px; }
  .v { font-weight:600; }
  .foot { text-align:center; margin-top:22px; font-size:12px; color:#94a3b8; }
</style></head><body>
<div class="wrap">
  <div class="head">
    <div class="org">${esc(org)}</div>
    <div class="code">${esc(asset.deviceCode)}</div>
    <div class="name">${esc(asset.name || '')}</div>
  </div>
  <div class="card">
    ${employeeRows ? `<div class="sec">Assignment</div><table>${employeeRows}</table>` : ''}
    <div class="sec">Asset Information</div>
    <table>${deviceRows}</table>
  </div>
  <div class="foot">Scanned from asset QR · ${esc(org)}</div>
</div>
</body></html>`;
}

app.get('/asset/:deviceCode', async (req, res) => {
  try {
    const asset = await Asset.findOne({ deviceCode: req.params.deviceCode });
    if (!asset) {
      return res.status(404).send(
        `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
        `<div style="font-family:system-ui;max-width:480px;margin:60px auto;text-align:center;color:#334155">` +
        `<h2>Asset not found</h2><p>No asset with code <b>${esc(req.params.deviceCode)}</b>.</p></div>`
      );
    }
    res.set('Content-Type', 'text/html; charset=utf-8').send(assetViewPage(asset));
  } catch (err) {
    res.status(500).send('Error loading asset.');
  }
});

// Serve React build
import { existsSync } from "fs";
const clientDist = path.join(__dirname, "../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");

    // Serial numbers no longer require uniqueness — drop the legacy unique
    // index if it still exists on the collection (safe to run every startup).
    try {
      await Asset.collection.dropIndex("serialNumber_1");
      console.log("🧹 Dropped legacy unique index on serialNumber");
    } catch (e) {
      // Index not present (already dropped or fresh DB) — nothing to do.
    }

    // Seed built-in categories on first run
    await seedCategories();

    // Bind to 0.0.0.0 so the app is reachable from other PCs on the LAN,
    // not just from this machine (localhost).
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      // Print the LAN addresses others can use to reach this server.
      const nets = os.networkInterfaces();
      const lanIPs = [];
      for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
          if (net.family === "IPv4" && !net.internal) lanIPs.push(net.address);
        }
      }
      console.log(`   Local:   http://localhost:${PORT}`);
      lanIPs.forEach(ip => console.log(`   Network: http://${ip}:${PORT}`));
    });

    process.on("SIGTERM", () => {
      console.log("SIGTERM received. Shutting down gracefully...");
      server.close(() => {
        console.log("💤 Process terminated");
      });
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });