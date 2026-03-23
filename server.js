// ══════════════════════════════════════════════════════════════
// HealthHero Backend Server
// Handles API calls securely without exposing API keys
// ══════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'HealthHero' });
});

// ── Main Analyze Endpoint ──
app.post('/api/analyze', async (req, res) => {
  try {
    const { messages, language } = req.body;

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Invalid request: messages array required' 
      });
    }

    // Get API key from environment (NEVER expose to frontend)
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.error('❌ OPENROUTER_API_KEY not configured in .env');
      return res.status(500).json({ 
        error: 'Server configuration error: API key missing. Contact admin.' 
      });
    }

    console.log('📤 Sending request to OpenRouter...');

    // Call OpenRouter API
    const response = await fetch("https://api.openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://healthhero.app",
        "X-Title": "HealthHero",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: messages,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
      console.error('❌ API Error:', data);
      
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Authentication failed: Invalid API key' 
        });
      }
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limited: Too many requests. Try again later.' 
        });
      }

      return res.status(response.status).json({ 
        error: data.error?.message || 'API request failed',
        details: process.env.NODE_ENV === 'development' ? data : undefined
      });
    }

    console.log('✅ API response received');
    res.json(data);

  } catch (error) {
    console.error('❌ Server Error:', error.message);
    res.status(500).json({ 
      error: 'Server error: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ── Serve HealthHero.html ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'HealthHero.html'));
});

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  💚 HealthHero Server Started            ║');
  console.log(`║  🌐 http://localhost:${PORT}                ║`);
  console.log(`║  📡 API: http://localhost:${PORT}/api/analyze ║`);
  console.log('╚══════════════════════════════════════════╝\n');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('⚠️  WARNING: OPENROUTER_API_KEY not set in .env');
    console.warn('   Add it to .env file: OPENROUTER_API_KEY=sk_...\n');
  }
});

module.exports = app;
