import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import { getWebsiteById } from '@/models';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError, NotFoundError } from '@/utils/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new AuthenticationError('Unauthorized');
  }

  const websiteId = parseInt(request.nextUrl.pathname.split('/')[3]);

  if (isNaN(websiteId)) {
    throw new NotFoundError('Invalid website ID');
  }

  const { website } = await getWebsiteById(websiteId);

  if (!website || website.user_id !== parseInt(session.user.id)) {
    throw new NotFoundError('Website not found');
  }

  return NextResponse.json(website);
});