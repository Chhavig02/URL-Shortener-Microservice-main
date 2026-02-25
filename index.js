// Updated in-memory fallback to check for duplicate short_code aliases

// Assuming we have an array to store the in-memory data
let inMemoryUrlDatabase = [];

function insertUrl(short_code, url) {
    // Check for duplicate short_code
    const existing = inMemoryUrlDatabase.find(item => item.short_code === short_code);
    if (existing) {
        throw { status: 409, message: 'Duplicate short_code alias found!' };
    }
    // Insert into the in-memory "database"
    inMemoryUrlDatabase.push({ short_code, url });
}

// Example insert operation:
try {
    insertUrl('abc123', 'http://example.com');
} catch (error) {
    console.error(`Error: ${error.message} (status: ${error.status})`);
}