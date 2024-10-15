// File: app/api/websites/refresh/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import { fetchAndStoreWebsites } from '@/lib/googleSearchConsole';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError } from '@/utils/errors';

export const POST = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    throw new AuthenticationError('Unauthorized');
  }

  const userId = parseInt(session.user.id);
  await fetchAndStoreWebsites(userId);

  return NextResponse.json({ message: 'Websites refreshed successfully' });
});