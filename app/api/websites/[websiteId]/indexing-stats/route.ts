// Filename: /app/api/websites/[websiteId]/indexing-stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import { getIndexingStatsByWebsiteId } from '@/models';
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

  const indexingStats = await getIndexingStatsByWebsiteId(websiteId);
  return NextResponse.json({ indexingStats });
});
