# Website Indexer App

A Next.js application that helps website owners automate and manage Google Search Console indexing requests.

**Author: Hector Bravo**

## Features

- Google Search Console integration
- Automated daily indexing of pages
- Manual Page indexing requests
- Indexing status monitoring
- Email notifications for indexing results
- Material UI-based responsive interface

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript and App Router
- **UI Framework**: Material UI
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: PostgreSQL
- **Hosting**: Vercel/AWS compatible
- **APIs**: Google Search Console API

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Google Search Console API credentials
- SMTP server for email notifications

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CLIENT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_service_account_private_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# API Keys
DAILY_INDEXING_API_KEY=your_api_key_for_daily_indexing

# Email Configuration
EMAIL_HOST=your_smtp_host
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email_user
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=your_sender_email
```

Read GOOGLE-APIS.md for the instructions on getting the values for the Google API's environment variables

## Database Setup

1. Create a PostgreSQL database
2. Run the SQL schema from `database-schema.sql`

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Daily Indexing Job

The app includes an automated daily indexing system that processes websites that have auto-indexing enabled. Here's how to set it up:

### Configuration

1. Set up a cron job or scheduled task to trigger the daily indexing endpoint
2. The endpoint is: `POST /api/websites/daily-indexing`
3. Include the `x-api-key` header matching your `DAILY_INDEXING_API_KEY`

### Example Cron Setup

Using cURL in a cron job:

```bash
0 0 * * * curl -X POST https://your-domain.com/api/websites/daily-indexing \
  -H "x-api-key: your_daily_indexing_api_key"
```

Using wget:

```bash
0 0 * * * wget --header="x-api-key: your_daily_indexing_api_key" \
  --post-data="" https://your-domain.com/api/websites/daily-indexing
```

### How Daily Indexing Works

1. The job identifies websites that:
   - Have `enabled = true`
   - Have `auto_indexing_enabled = true`
   - Have `is_owner = true` (service account has owner permissions)
   - Haven't been auto-indexed in the last 21 hours

2. For each eligible website, the job:
   - Fetches the sitemap from robots.txt
   - Processes all relevant sitemaps (posts, pages, products)
   - Checks indexing status via Google Search Console API
   - Submits non-indexed pages for indexing
   - Updates database with results
   - Sends email notifications to website owners

3. Rate limiting and error handling:
   - Implements automatic rate limiting for API calls
   - Retries failed submissions
   - Logs errors for debugging
   - Sends failure notifications if needed

## API Routes

- `GET /api/websites`: List all websites
- `POST /api/websites/refresh`: Refresh websites from Google Search Console
- `GET /api/websites/:id`: Get website details
- `POST /api/websites/:id/toggle`: Enable/disable website or auto-indexing
- `GET /api/websites/:id/verify-ownership`: Verify GSC ownership
- `GET /api/websites/:id/pages`: List website pages
- `POST /api/websites/:id/pages/:pageId/submit-for-indexing`: Submit page for indexing
- `POST /api/websites/daily-indexing`: Trigger daily indexing job

## Security

- NextAuth.js handles authentication
- API routes are protected
- Database queries use parameterized statements
- Rate limiting implemented
- HTTPS required
- API key required for daily indexing job

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.