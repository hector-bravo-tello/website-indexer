# Instructions for obtaining Google OAuth and Service Account Credentials to be used with Google API's

## Part 1: Google OAuth Credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)

1. Go to the Google Cloud Console: https://console.cloud.google.com/
2. Create a new project or select an existing one.
3. In the sidebar, navigate to "APIs & Services" > "Credentials".
4. Click on "Create Credentials" and select "OAuth client ID".
5. If you haven't configured the OAuth consent screen, you'll be prompted to do so:
   - Choose "External" if you want to allow any Google user to access your app, or "Internal" if you're using Google Workspace and want to restrict access to your organization.
   - Fill in the required information in the OAuth consent screen setup.
6. Once the consent screen is configured, go back to creating the OAuth client ID:
   - Choose "Web application" as the application type.
   - Give your OAuth 2.0 client a name.
   - Add authorized JavaScript origins (e.g., http://localhost:3000 for local development).
   - Add authorized redirect URIs (e.g., http://localhost:3000/api/auth/callback/google for NextAuth.js).
7. Click "Create".
8. You'll see a modal with your client ID and client secret. These are your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.

## Part 2: Service Account Credentials (GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY)

1. In the Google Cloud Console, ensure you're in the same project as before.
2. Navigate to "IAM & Admin" > "Service Accounts" in the sidebar.
3. Click on "Create Service Account" at the top of the page.
4. Enter a name for your service account and an optional description.
5. Click "Create and Continue".
6. In the "Grant this service account access to project" section, assign the necessary roles:
   - For Google Search Console access, add the "Search Console API" role.
   - You may need to add other roles depending on your specific needs.
7. Click "Continue" and then "Done".
8. In the list of service accounts, find the one you just created and click on it.
9. In the "Keys" tab, click "Add Key" > "Create new key".
10. Choose "JSON" as the key type and click "Create".
11. A JSON file will be downloaded to your computer. This file contains your service account credentials.
12. Open the JSON file:
    - The `client_email` field is your GOOGLE_CLIENT_EMAIL.
    - The `private_key` field is your GOOGLE_PRIVATE_KEY.

## Important Notes:

- Keep these credentials secure and never commit them to version control.
- For the GOOGLE_PRIVATE_KEY, you may need to replace `\n` with actual newline characters in your environment variables.
- Ensure you've enabled the necessary APIs for your project (e.g., Google Search Console API and Indexing API) in the Google Cloud Console under "APIs & Services" > "Library".
- When using these credentials, make sure to follow Google's terms of service and any applicable laws and regulations.