# 🔗 Professional URL Shortener Microservice

A production-ready, feature-rich URL shortening service built with Node.js, Express, and PostgreSQL. This microservice provides a robust API for shortening URLs with analytics, custom aliases, and comprehensive error handling.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.21+-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- **🔗 URL Shortening**: Convert long URLs into short, shareable links
- **🎯 Custom Aliases**: Create memorable custom short codes (e.g., `/my-link`)
- **📊 Analytics**: Track clicks, creation dates, and last access times
- **🔄 Duplicate Detection**: Automatically reuses existing short URLs for duplicate submissions
- **✅ URL Validation**: Validates URLs using DNS resolution
- **🔒 Rate Limiting**: Built-in protection against abuse (100 requests/15min)
- **📝 Request Logging**: Comprehensive logging with Morgan
- **🎨 Modern UI**: Beautiful, responsive web interface
- **📚 API Documentation**: Built-in API docs endpoint
- **🧪 Comprehensive Testing**: Full test coverage with Jest

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/URL-Shortener-Microservice.git
   cd URL-Shortener-Microservice
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   Import the schema into your PostgreSQL database:
   ```bash
   psql -U your_user -d your_db -f schema.sql
   ```
   *(Note: The application will also try to auto-create the table on startup)*

4. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   PORT=3000
   ```

5. **Start the server**
   ```bash
   # Production
   npm start
   
   # Development (with auto-reload)
   npm run dev
   ```

6. **Run tests**
   ```bash
   npm test
   ```

The server will start on `http://localhost:3000`

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### `POST /api/shorturl`
Create a short URL

**Request Body:**
```json
{
  "url": "https://example.com",
  "customAlias": "my-link" // optional
}
```

**Response (201 Created):**
```json
{
  "original_url": "https://example.com",
  "short_url": "http://localhost:3000/api/shorturl/aB3cD",
  "short_code": "aB3cD",
  "clicks": 0,
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid URL format or invalid custom alias
- `409 Conflict`: Custom alias already exists

#### `GET /api/shorturl/:short_code`
Redirect to original URL and track click

**Response:**
- `302 Found`: Redirects to original URL
- `404 Not Found`: Short code doesn't exist

#### `GET /api/analytics/:short_code`
Get analytics for a short URL

**Response (200 OK):**
```json
{
  "short_code": "aB3cD",
  "original_url": "https://example.com",
  "clicks": 42,
  "created_at": "2024-01-15T10:30:00.000Z",
  "last_clicked": "2024-01-20T14:22:00.000Z"
}
```

#### `GET /api/docs`
Get API documentation

#### `GET /health`
Health check endpoint

## 🎨 Web Interface

Visit `http://localhost:3000` to access the modern web interface where you can:
- Shorten URLs with a user-friendly form
- Create custom aliases
- View analytics for your shortened URLs
- Copy short URLs with one click
- Test links directly from the interface

## 🏗️ Architecture

### Project Structure
```
├── index.js                 # Main server file
├── schema.sql               # PostgreSQL schema definition
├── utils/
│   ├── urlGenerator.js      # Base62 encoding & code generation
│   └── urlValidator.js      # URL validation utilities
├── views/
│   └── index.html           # Web interface
├── public/
│   └── style.css            # Styling
├── tests/
│   └── url.test.js          # Test suite
├── logs/                    # Server logs
└── package.json
```

### Key Technologies

- **Express.js**: Fast, minimalist web framework
- **PostgreSQL**: Relational database for URL storage
- **Base62 Encoding**: URL-friendly short code generation
- **DNS Validation**: Ensures URLs are reachable
- **Rate Limiting**: Prevents API abuse
- **Morgan**: HTTP request logging

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `undefined` |

### Rate Limiting

Default: 100 requests per 15 minutes per IP address. Configure in `index.js`:

```javascript
const limiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

The test suite includes:
- URL creation and validation
- Custom alias handling
- Duplicate URL detection
- Redirect functionality
- Analytics tracking
- Error handling

## 📊 Features in Detail

### Base62 Encoding
Short URLs use base62 encoding (0-9, a-z, A-Z) for compact, URL-friendly codes.

### Duplicate Detection
If you submit the same URL twice, the service returns the existing short URL instead of creating a duplicate.

### Analytics
Track how many times each short URL has been clicked and when it was last accessed.

### Custom Aliases
Create memorable short codes like `/my-product` or `/company-news` instead of random strings.

## 🚢 Deployment

### Deploy to Heroku

1. Create a `Procfile`:
   ```
   web: node index.js
   ```

2. Set environment variables in Heroku dashboard

3. Deploy:
   ```bash
   git push heroku main
   ```

### Deploy to Railway

1. Connect your GitHub repository
2. Set environment variables
3. Railway will auto-deploy

### Deploy to Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add PostgreSQL database and set `DATABASE_URL` environment variable

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👤 Author

**Chhavi**

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- Built with Express.js and PostgreSQL
- Inspired by modern URL shortening services
- UI design with modern CSS and responsive layouts

## 📈 Future Enhancements

- [ ] User authentication and private URLs
- [ ] QR code generation
- [ ] URL expiration dates
- [ ] Bulk URL shortening
- [ ] Advanced analytics (geographic data, referrers)
- [ ] API key authentication
- [ ] Webhook support for click events

---

⭐ If you find this project helpful, please give it a star!
