import GoogleProvider from 'next-auth/providers/google';
import { getUserByEmail, createUser, updateUser } from '@/models';
import { fetchAndStoreWebsites } from '@/lib/googleSearchConsole';
import { AuthOptions } from 'next-auth';
import CONFIG from '@/config';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: CONFIG.google.clientId as string,
      clientSecret: CONFIG.google.clientSecret as string,
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const { user: dbUser } = await getUserByEmail(user.email);
          if (dbUser) {
            await updateUser(dbUser.id, {
              name: user.name,
              google_id: user.id,
            });
            user.id = dbUser.id.toString(); // Convert to string
          } else {
            const newUser = await createUser({
              name: user.name,
              email: user.email,
              google_id: user.id,
            });
            user.id = newUser.user.id.toString(); // Convert to string

            // Fetch and store websites for new users
            await fetchAndStoreWebsites(parseInt(user.id)); // Convert back to number for our internal function
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
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
};
