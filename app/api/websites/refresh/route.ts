// File: app/api/websites/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { fetchAndStoreWebsites } from '@/lib/googleSearchConsole';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError } from '@/utils/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    throw new AuthenticationError('Unauthorized');
  }

  const userId = parseInt(session.user.id);
  await fetchAndStoreWebsites(userId);

  return NextResponse.json({ message: 'Websites refreshed successfully' });
});