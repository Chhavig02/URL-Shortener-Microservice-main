// Corrected in-memory fallback that checks for duplicate aliases

const inMemoryDatabase = {};

function insertShortCode(short_code, long_url) {
    if (inMemoryDatabase[short_code]) {
        throw new Error('Duplicate short_code not allowed'); // Handle INSERT query error
    }
    inMemoryDatabase[short_code] = long_url;
}

// Example usage
try {
    insertShortCode('abc123', 'http://example.com');
    insertShortCode('abc123', 'http://example2.com'); // This should throw an error
} catch (error) {
    console.error(error.message);
}