// File: app/api/analytics/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getGA4AnalyticsSummary } from '@/lib/googleAnalytics';
import { getWebsiteById } from '@/models';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError, NotFoundError, ValidationError } from '@/utils/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new AuthenticationError('Unauthorized');
  }

  const { searchParams } = new URL(request.url);
  const websiteId = searchParams.get('websiteId');

  if (!websiteId) {
    throw new ValidationError('Website ID is required');
  }

  const { website } = await getWebsiteById(parseInt(websiteId));

  if (!website) {
    throw new NotFoundError('Website not found');
  }

  if (!website.ga4_property_id || !website.ga4_data_stream_id) {
    throw new ValidationError('Google Analytics 4 Property ID or Data Stream ID not set for this website');
  }

  const analyticsData = await getGA4AnalyticsSummary(website.ga4_property_id, website.ga4_data_stream_id, session.user.id);

  return NextResponse.json(analyticsData);
});
