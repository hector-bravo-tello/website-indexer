import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import { getWebsiteById, getPageById, updatePageData } from '@/models';
import { submitUrlForIndexing } from '@/lib/googleSearchConsole';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError, NotFoundError, ValidationError } from '@/utils/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new AuthenticationError('Unauthorized');
  }

  const websiteId = parseInt(request.nextUrl.pathname.split('/')[3]);
  const pageId = parseInt(request.nextUrl.pathname.split('/')[5]);

  if (isNaN(websiteId) || isNaN(pageId)) {
    throw new ValidationError('Invalid website ID or page ID');
  }

  const { website } = await getWebsiteById(websiteId);
  const { page } = await getPageById(pageId);

  if (!website || !page || website.id !== page.website_id) {
    throw new NotFoundError('Website or page not found');
  }

  if (website.user_id !== parseInt(session.user.id)) {
    throw new AuthenticationError('You do not have permission to submit this page');
  }

  // Check if 24 hours have passed since the last submission
  const lastSubmissionDate = new Date(page.last_submitted_date as Date);
  const currentDate = new Date();
  const hoursSinceLastSubmission = (currentDate.getTime() - lastSubmissionDate.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastSubmission < 24) {
    throw new ValidationError('You can only submit a page for indexing once every 24 hours');
  }
 
  // Submit the URL for indexing
  await submitUrlForIndexing(website.domain, page.url);

  // Update the page's last indexed date
  await updatePageData(websiteId, page.url, 'Submitted', page.last_crawled_date, new Date());

  return NextResponse.json({ message: 'Page submitted for indexing successfully' });
});