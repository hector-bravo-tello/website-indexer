import NextAuth, { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getUserByEmail, createUser, updateUser } from '@/models';
import { fetchAndStoreWebsites } from '@/lib/googleSearchConsole';
import CONFIG from '@/config';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: CONFIG.google.clientId as string,
      clientSecret: CONFIG.google.clientSecret as string,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/indexing',
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const expiresAt = account.expires_at 
            ? new Date(account.expires_at * 1000).toISOString()
            : new Date(Date.now() + 3600 * 1000).toISOString(); // Default to 1 hour from now if expires_at is not provided

          const { user: dbUser } = await getUserByEmail(user.email);
          if (dbUser) {
            await updateUser(dbUser.id, {
              name: user.name,
              google_id: user.id,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: expiresAt
            });
            user.id = dbUser.id;
          } else {
            const newUser = await createUser({
              name: user.name,
              email: user.email,
              google_id: user.id,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: expiresAt
            });
            user.id = newUser.user.id;

            // Fetch and store websites for new users
            await fetchAndStoreWebsites(user.id, account.access_token);
          }
          return true;

        } catch (error) {
          console.error('Error saving user to database:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, account, user }) {
      // Initial sign-in
      if (account && user) {
        token.userId = user.id;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at * 1000; // Convert to milliseconds
      }

      // Return the previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Access token has expired, refresh it using the refresh token
      console.log('Access token has expired, attempting to refresh...');
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };