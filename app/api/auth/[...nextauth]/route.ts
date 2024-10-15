// app/api/auth/[...nextauth]/route.ts

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Create handler from NextAuth using authOptions
const handler = NextAuth(authOptions);

// Export HTTP handlers for Next.js API route compliance
export { handler as GET, handler as POST };
