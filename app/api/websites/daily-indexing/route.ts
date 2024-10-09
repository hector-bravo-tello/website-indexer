import { NextRequest, NextResponse } from 'next/server';
import { getWebsitesForIndexing } from '@/models';
import { processWebsiteForScheduledJob } from '@/lib/scheduledSitemapProcessor';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthorizationError } from '@/utils/errors';
import CONFIG from '@/config';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Check for a secret token to ensure this route is only called by authorized systems
  if (request.headers.get('x-api-key') !== CONFIG.apiKeys.dailyIndexing) {
    throw new AuthorizationError('Invalid API key');
  }

  console.log('Starting daily indexing job');
  
  const { websites } = await getWebsitesForIndexing();

  console.log(`Found ${websites.length} websites to process`);

  for (const website of websites) {
    try {
      console.log(`Processing website: ${website.domain}`);
      await processWebsiteForScheduledJob(website);
      console.log(`Finished processing website: ${website.domain}`);

    } catch (error) {
      console.error(`Error processing website ${website.domain}:`, error);
    }
  }     

  console.log('Daily indexing job completed');

  return NextResponse.json({ message: 'Daily indexing job completed successfully' });
});