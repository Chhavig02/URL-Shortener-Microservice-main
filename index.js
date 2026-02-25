// Updated index.js with proper duplicate alias checking in the in-memory fallback

const express = require('express');
const bodyParser = require('body-parser');
const validUrl = require('valid-url');
const shortid = require('shortid');

const app = express();
app.use(bodyParser.json());

let urlDatabase = {}; // In-memory URL database
let aliasDatabase = {}; // In-memory alias database

app.post('/api/shorturl', (req, res) => {
    const { url, alias } = req.body;

    if (!validUrl.isWebUri(url)) {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    // Check for duplicate alias
    if (alias && aliasDatabase[alias]) {
        return res.status(400).json({ error: 'Alias already in use' });
    }

    const shortUrl = alias || shortid.generate();

    if (!alias) {
        aliasDatabase[shortUrl] = true; // Track the new alias
    }

    urlDatabase[shortUrl] = url;
    return res.json({ original_url: url, short_url: shortUrl });
});

app.get('/api/shorturl/:shorturl', (req, res) => {
    const shortUrl = req.params.shorturl;
    const originalUrl = urlDatabase[shortUrl];

    if (originalUrl) {
        return res.redirect(originalUrl);
    }
    return res.status(404).json({ error: 'Short URL not found' });
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
