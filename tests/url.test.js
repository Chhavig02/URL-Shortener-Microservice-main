const request = require('supertest');
const app = require('../index');

describe('URL Shortener API', () => {
  beforeEach(async () => {
    // Wait a bit for database initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('POST /api/shorturl', () => {
    test('creates short url successfully', async () => {
      const res = await request(app)
        .post('/api/shorturl')
        .send({ url: 'https://example.com' });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('original_url', 'https://example.com');
      expect(res.body).toHaveProperty('short_url');
      expect(res.body).toHaveProperty('short_code');
      expect(res.body).toHaveProperty('clicks', 0);
      expect(res.body).toHaveProperty('created_at');
    });

    test('returns existing short url for duplicate URL', async () => {
      const firstRes = await request(app)
        .post('/api/shorturl')
        .send({ url: 'https://example.com/duplicate' });
      
      const secondRes = await request(app)
        .post('/api/shorturl')
        .send({ url: 'https://example.com/duplicate' });
      
      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.body.short_code).toBe(firstRes.body.short_code);
      expect(secondRes.body.message).toBe('URL already shortened');
    });

    test('creates short url with custom alias', async () => {
      const res = await request(app)
        .post('/api/shorturl')
        .send({ 
          url: 'https://example.com/custom',
          customAlias: 'my-custom-link'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.short_code).toBe('my-custom-link');
    });

    test('rejects invalid custom alias', async () => {
      const res = await request(app)
        .post('/api/shorturl')
        .send({ 
          url: 'https://example.com',
          customAlias: 'ab' // Too short
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('rejects duplicate custom alias', async () => {
      await request(app)
        .post('/api/shorturl')
        .send({ 
          url: 'https://example.com',
          customAlias: 'unique-alias'
        });
      
      const res = await request(app)
        .post('/api/shorturl')
        .send({ 
          url: 'https://example.com/other',
          customAlias: 'unique-alias'
        });
      
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    test('rejects invalid URL format', async () => {
      const res = await request(app)
        .post('/api/shorturl')
        .send({ url: 'not-a-url' });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('rejects missing URL', async () => {
      const res = await request(app)
        .post('/api/shorturl')
        .send({});
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('URL is required');
    });
  });

  describe('GET /api/shorturl/:short_code', () => {
    test('redirects to original URL', async () => {
      const postRes = await request(app)
        .post('/api/shorturl')
        .send({ url: 'https://example.com/page' });
      
      const shortCode = postRes.body.short_code;
      const res = await request(app)
        .get(`/api/shorturl/${shortCode}`)
        .redirects(0);
      
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('https://example.com/page');
    });

    test('returns 404 for non-existent short code', async () => {
      const res = await request(app)
        .get('/api/shorturl/nonexistent123');
      
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Short URL not found');
    });

    test('increments click count on redirect', async () => {
      const postRes = await request(app)
        .post('/api/shorturl')
        .send({ url: 'https://example.com/track' });
      
      const shortCode = postRes.body.short_code;
      
      await request(app)
        .get(`/api/shorturl/${shortCode}`)
        .redirects(0);
      
      const analyticsRes = await request(app)
        .get(`/api/analytics/${shortCode}`);
      
      expect(analyticsRes.body.clicks).toBe(1);
    });
  });

  describe('GET /api/analytics/:short_code', () => {
    test('returns analytics for short URL', async () => {
      const postRes = await request(app)
        .post('/api/shorturl')
        .send({ url: 'https://example.com/analytics' });
      
      const shortCode = postRes.body.short_code;
      const res = await request(app)
        .get(`/api/analytics/${shortCode}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('short_code', shortCode);
      expect(res.body).toHaveProperty('original_url', 'https://example.com/analytics');
      expect(res.body).toHaveProperty('clicks');
      expect(res.body).toHaveProperty('created_at');
    });

    test('returns 404 for non-existent short code', async () => {
      const res = await request(app)
        .get('/api/analytics/nonexistent123');
      
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Short URL not found');
    });
  });

  describe('GET /health', () => {
    test('returns health status', async () => {
      const res = await request(app).get('/health');
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/docs', () => {
    test('returns API documentation', async () => {
      const res = await request(app).get('/api/docs');
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('endpoints');
    });
  });
});
