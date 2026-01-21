require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const RateLimit = require('express-rate-limit');
const cors = require('cors');
const { Pool } = require('pg');
const morgan = require('morgan');
const { encodeBase62, generateRandomCode, isValidAlias } = require('./utils/urlGenerator');
const { validateUrl } = require('./utils/urlValidator');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
let pool;

async function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL');

    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id SERIAL PRIMARY KEY,
        original_url TEXT NOT NULL,
        short_code VARCHAR(20) UNIQUE NOT NULL,
        clicks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_clicked TIMESTAMP
      );
    `);

    // Create indexes if they don't exist
    await client.query('CREATE INDEX IF NOT EXISTS idx_short_code ON urls(short_code);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_original_url ON urls(original_url);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_created_at ON urls(created_at);');

    client.release();
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
    console.log('Falling back to in-memory store for demonstration (Data will not persist)');
    // In-memory fallback (simplified)
    const _inMemory = [];
    pool = {
      query: async (text, params) => {
        if (text.includes('SELECT count(*)')) return { rows: [{ count: _inMemory.length }] };
        if (text.includes('INSERT INTO urls')) {
          const doc = { original_url: params[0], short_code: params[1], clicks: 0, created_at: new Date() };
          _inMemory.push(doc);
          return { rowCount: 1 };
        }
        if (text.includes('SELECT * FROM urls WHERE original_url = $1')) {
          return { rows: _inMemory.filter(d => d.original_url === params[0]) };
        }
        if (text.includes('SELECT * FROM urls WHERE short_code = $1')) {
          return { rows: _inMemory.filter(d => d.short_code === params[0]) };
        }
        if (text.includes('UPDATE urls SET')) {
          const code = params[params.length - 1];
          const item = _inMemory.find(d => d.short_code === code);
          if (item) {
            item.last_clicked = new Date();
            item.clicks++;
            return { rowCount: 1 };
          }
          return { rowCount: 0 };
        }
        return { rows: [] };
      }
    };
  }
}

// Rate limiting
const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Logging
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
const accessLogStream = fs.createWriteStream(path.join(logsDir, 'server.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

// Middleware
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'URL Shortener API',
    version: '2.0.0',
    endpoints: {
      'POST /api/shorturl': {
        description: 'Create a short URL',
        body: {
          url: 'string (required) - The URL to shorten',
          customAlias: 'string (optional) - Custom short code (3-20 chars, alphanumeric and hyphens)'
        },
        response: {
          success: {
            original_url: 'string',
            short_url: 'string',
            short_code: 'string',
            clicks: 0,
            created_at: 'ISO date string'
          },
          error: {
            error: 'string - Error message'
          }
        }
      },
      'GET /api/shorturl/:short_code': {
        description: 'Redirect to original URL and track click',
        response: '302 redirect to original URL'
      },
      'GET /api/analytics/:short_code': {
        description: 'Get analytics for a short URL',
        response: {
          short_code: 'string',
          original_url: 'string',
          clicks: 'number',
          created_at: 'ISO date string',
          last_clicked: 'ISO date string or null'
        }
      }
    }
  });
});

// Create short URL
app.post('/api/shorturl', async (req, res) => {
  try {
    const { url, customAlias } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    const validation = await validateUrl(url);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    let shortCode;

    // Handle custom alias
    if (customAlias) {
      if (!isValidAlias(customAlias)) {
        return res.status(400).json({
          error: 'Invalid custom alias. Must be 3-20 characters, alphanumeric and hyphens only.'
        });
      }

      // Check if this specific alias already exists for this URL
      const existingWithAlias = await pool.query(
        'SELECT * FROM urls WHERE original_url = $1 AND short_code = $2',
        [url, customAlias]
      );

      if (existingWithAlias.rows.length > 0) {
        const existingUrl = existingWithAlias.rows[0];
        return res.json({
          original_url: existingUrl.original_url,
          short_url: `${req.protocol}://${req.get('host')}/api/shorturl/${existingUrl.short_code}`,
          short_code: existingUrl.short_code,
          clicks: existingUrl.clicks || 0,
          created_at: existingUrl.created_at,
          message: 'URL already shortened with this alias'
        });
      }

      // Check if custom alias is already taken by ANOTHER URL
      const aliasResult = await pool.query('SELECT * FROM urls WHERE short_code = $1', [customAlias]);
      if (aliasResult.rows.length > 0) {
        return res.status(409).json({
          error: 'Custom alias already exists. Please choose a different one.'
        });
      }

      shortCode = customAlias;
    } else {
      // Check if URL already exists with a generic short code (non-custom)
      // This part reuses existing codes when no alias is requested
      const existingResult = await pool.query('SELECT * FROM urls WHERE original_url = $1', [url]);
      if (existingResult.rows.length > 0) {
        const existingUrl = existingResult.rows[0];
        return res.json({
          original_url: existingUrl.original_url,
          short_url: `${req.protocol}://${req.get('host')}/api/shorturl/${existingUrl.short_code}`,
          short_code: existingUrl.short_code,
          clicks: existingUrl.clicks || 0,
          created_at: existingUrl.created_at,
          message: 'URL already shortened'
        });
      }

      // Generate short code using base62 encoding
      const countResult = await pool.query('SELECT count(*) FROM urls');
      const count = parseInt(countResult.rows[0].count);
      shortCode = encodeBase62(count + 1000); // Start from 1000 to get longer codes

      // Ensure uniqueness (fallback to random if collision)
      let existsResult = await pool.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
      let attempts = 0;
      while (existsResult.rows.length > 0 && attempts < 10) {
        shortCode = generateRandomCode(6);
        existsResult = await pool.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
        attempts++;
      }
    }

    const createdAt = new Date().toISOString();
    await pool.query(
      'INSERT INTO urls (original_url, short_code, clicks, created_at, last_clicked) VALUES ($1, $2, $3, $4, $5)',
      [url, shortCode, 0, createdAt, null]
    );

    res.status(201).json({
      original_url: url,
      short_url: `${req.protocol}://${req.get('host')}/api/shorturl/${shortCode}`,
      short_code: shortCode,
      clicks: 0,
      created_at: createdAt
    });
  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redirect to original URL
app.get('/api/shorturl/:short_code', async (req, res) => {
  try {
    const { short_code } = req.params;
    const result = await pool.query('SELECT * FROM urls WHERE short_code = $1', [short_code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const urlDoc = result.rows[0];

    // Update click count and last clicked timestamp
    await pool.query(
      'UPDATE urls SET last_clicked = $1, clicks = clicks + 1 WHERE short_code = $2',
      [new Date().toISOString(), short_code]
    );

    res.redirect(302, urlDoc.original_url);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics for a short URL
app.get('/api/analytics/:short_code', async (req, res) => {
  try {
    const { short_code } = req.params;
    const result = await pool.query('SELECT * FROM urls WHERE short_code = $1', [short_code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const urlDoc = result.rows[0];

    res.json({
      short_code: urlDoc.short_code,
      original_url: urlDoc.original_url,
      clicks: urlDoc.clicks || 0,
      created_at: urlDoc.created_at,
      last_clicked: urlDoc.last_clicked
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize database and start server
async function startServer() {
  await initializeDatabase();

  if (require.main === module) {
    const server = app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📝 API Documentation: http://localhost:${port}/api/docs`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use.`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });
  }
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  if (pool && pool.end) {
    await pool.end();
  }
  process.exit(0);
});

// Export app for testing
module.exports = app;
