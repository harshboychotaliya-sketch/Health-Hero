// ═══════════════════════════════════════════════
// MedBuddy — server.js
// Express server for Render deployment
// Auth handled by Clerk (frontend only — no backend needed)
// ═══════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve root JS files (firebase-auth.js, medbuddy_db.js)
app.use(express.static(__dirname));
// Serve public/ (medbuddy.html)
app.use(express.static(path.join(__dirname, 'public')));

// Inject OPENROUTER_API_KEY safely to frontend
app.get('/env.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`window.__ENV__ = ${JSON.stringify({
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  })};`);
});

// Health check
app.get('/health', (req, res) =>
  res.json({ status: 'ok', ts: new Date().toISOString() })
);

// Catch-all: serve medbuddy.html with env.js injected
app.get('*', (req, res) => {
  try {
    let html = fs.readFileSync(
      path.join(__dirname, 'public', 'medbuddy.html'), 'utf8'
    );
    // Inject env.js as first script
    html = html.replace(
      '<script src="https://www.gstatic.com/firebasejs',
      '<script src="/env.js"></script>\n  <script src="https://www.gstatic.com/firebasejs'
    );
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});

app.listen(PORT, () => {
  console.log(`\n🌿 MedBuddy → http://localhost:${PORT}\n`);
});
