// ═══════════════════════════════════════════════════
// MedBuddy — server.js
// Node/Express backend for Render deployment
// ═══════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const admin   = require('firebase-admin');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Firebase Admin SDK ───────────────────────────
let firebaseReady = false;
try {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  if (sa.project_id) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    firebaseReady = true;
    console.log('✅ Firebase Admin ready:', sa.project_id);
  } else {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT missing — dev mode');
  }
} catch (e) {
  console.warn('⚠️  Firebase init error:', e.message);
}

// ── Middleware ───────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve root-level JS files (firebase-auth.js, medbuddy_db.js)
app.use(express.static(__dirname));
// Serve public/ folder (medbuddy.html)
app.use(express.static(path.join(__dirname, 'public')));

// ── /env.js — injects public env vars to frontend ─
app.get('/env.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(
    `window.__ENV__ = ${JSON.stringify({
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    })};`
  );
});

// ── Auth token verify endpoint ───────────────────
app.post('/api/auth/verify', async (req, res) => {
  // Dev mode — no Firebase Admin key needed
  if (!firebaseReady) {
    return res.json({
      ok: true,
      dev_mode: true,
      user: { uid: 'dev-001', name: 'Demo User', email: 'demo@medbuddy.app' },
    });
  }

  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  try {
    const d = await admin.auth().verifyIdToken(idToken);
    res.json({
      ok: true,
      user: {
        uid:      d.uid,
        email:    d.email          || null,
        phone:    d.phone_number   || null,
        name:     d.name || d.email || d.phone_number || 'User',
        picture:  d.picture        || null,
        provider: d.firebase?.sign_in_provider || 'unknown',
      },
    });
  } catch (e) {
    res.status(401).json({ error: 'Token verification failed', detail: e.message });
  }
});

// ── Health check ─────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', firebase: firebaseReady, ts: new Date().toISOString() })
);

// ── Catch-all: serve medbuddy.html with env injected ─
app.get('*', (req, res) => {
  try {
    let html = fs.readFileSync(
      path.join(__dirname, 'public', 'medbuddy.html'), 'utf8'
    );
    // Inject env.js as very first script so window.__ENV__ is ready
    html = html.replace(
      '<script src="https://www.gstatic.com/firebasejs',
      '<script src="/env.js"></script>\n  <script src="https://www.gstatic.com/firebasejs'
    );
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (e) {
    res.status(500).send('Error loading app: ' + e.message);
  }
});

// ── Start ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 MedBuddy → http://localhost:${PORT}`);
  console.log(`   Firebase: ${firebaseReady ? '✅ active' : '⚠️  dev mode (no token verify)'}\n`);
});
