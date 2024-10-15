// File: app/api/websites/[websiteId]/metrics/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import { getWebsiteById } from '@/models';
import { getPageImpressionsAndClicks } from '@/lib/googleSearchConsole';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError, NotFoundError, ValidationError } from '@/utils/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new AuthenticationError('Unauthorized');
  }

  const websiteId = parseInt(request.nextUrl.pathname.split('/')[3]);
  
  if (isNaN(websiteId)) {
    throw new ValidationError('Invalid website ID');
  }

  const { website } = await getWebsiteById(websiteId);

  if (!website || website.user_id !== parseInt(session.user.id)) {
    throw new NotFoundError('Website not found');
  }

  const body = await request.json();
  const { urls } = body;

  if (!Array.isArray(urls)) {
    throw new ValidationError('Invalid request body. Expected "urls" array.');
  }

  const metricsData = await getPageImpressionsAndClicks(websiteId, urls);
  return NextResponse.json({ 
    data: metricsData, 
    message: Object.keys(metricsData).length === 0 ? 'No data returned from Google Search Console' : 'Metrics retrieved successfully' 
  });
});