import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import { getWebsitesByUserId } from '@/models';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError } from '@/utils/errors';

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new AuthenticationError('Unauthorized');
  }

  const userId = parseInt(session.user.id);
  const { websites } = await getWebsitesByUserId(userId);

  if (!websites || websites.length === 0) {
    return NextResponse.json([]);
  }

  return NextResponse.json(websites);
});