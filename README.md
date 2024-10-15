# Website Indexer App

## Overview

The Website Indexer App is a web-based tool designed to streamline and automate the process of submitting web pages for indexing to Google Search Console. It provides more control and faster visibility of content for website owners and SEO professionals, overcoming the limitations of Google Search Console's daily indexing submission limits and lack of bulk submission features.

## Key Features

1. **Website Management**: Add, edit, and remove websites with an easy-to-use interface.
2. **Automated Indexing**: Daily job to submit pages for indexing, handling Google Search Console API interactions.
3. **Metrics**: Display impressions and clicks for each page (extracted from Google Search Console).
4. **User Authentication**: Secure login and logout functionality using NextAuth.js.
5. **Error Handling and Logging**: User-friendly error messages and detailed error logging for debugging.

## Technology Stack

- **Frontend**: Next.js with TypeScript, using App Router (/app folder)
- **UI Framework**: Material UI
- **Authentication**: NextAuth.js with Google provider
- **Backend**: Next.js API routes
- **Database**: PostgreSQL
- **ORM**: Raw SQL queries with parameterized statements for security and performance
- **APIs**: Google Search Console API

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- PostgreSQL database
- Google Cloud Console project with Search Console API enabled

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/website-indexer-app.git
   ```

2. Install dependencies:
   ```
   cd website-indexer-app
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following variables:
   ```
   DB_HOST=your_database_host
   DB_PORT=your_database_port
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CLIENT_EMAIL=your_service_account_email
   GOOGLE_PRIVATE_KEY=your_service_account_private_key
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   DAILY_INDEXING_API_KEY=your_daily_indexing_api_key
   ```

4. Run database migrations:
   ```
   npm run migrate
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Sign in using your Google account.
2. Add websites you want to manage from the dashboard.
3. Enable auto-indexing for websites you want to be automatically processed.
4. View indexing statistics and submit individual pages for indexing as needed.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Google Search Console API
- Next.js team for their excellent framework
- Material-UI team for the comprehensive UI component library