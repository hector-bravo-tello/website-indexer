import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getWebsitesByUserId, getWebsiteIndexingStats, startIndexingJob } from '@/models';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError, NotFoundError } from '@/utils/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new AuthenticationError('Unauthorized');
  }

  const websiteId = parseInt(request.nextUrl.pathname.split('/')[3]);

  if (isNaN(websiteId)) {
    throw new ValidationError('Invalid website ID');
  }

  // Check if the website belongs to the current user
  const { websites } = await getWebsitesByUserId(session.user.id);
  const website = websites.find(w => w.id === websiteId);

  if (!website) {
    throw new NotFoundError('Website not found');
  }

  const { stats } = await getWebsiteIndexingStats(websiteId);

  // Trigger a new indexing job if there are pages to be indexed
  if (stats.not_indexed_pages > 0) {
    await startIndexingJob(websiteId, 100); // Process 100 pages per job
  }

  return NextResponse.json({ stats });
});