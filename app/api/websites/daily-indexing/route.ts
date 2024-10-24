import { NextRequest, NextResponse } from 'next/server';
import { getWebsitesForIndexing } from '@/models';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthorizationError } from '@/utils/errors';
import CONFIG from '@/config';
import jobQueue from '@/lib/jobQueue';

export const GET = withErrorHandling(async (request: NextRequest) => {
  if (request.headers.get('Authorization') !== `Bearer ${CONFIG.Authorization.cronSecret}`) {
    throw new AuthorizationError('Invalid Cron Secret');
  }

  console.log('Starting daily indexing job');
  
  const { websites } = await getWebsitesForIndexing();

  console.log(`Found ${websites.length} websites to process`);

  for (const website of websites) {
    try {
      console.log(`Adding website to job queue: ${website.domain}`);
      await jobQueue.addJob(website.id, 'scheduled');

    } catch (error) {
      console.error(`Error adding website ${website.domain} to job queue:`, error);
    }
  }     

  console.log('All websites added to job queue for processing');

  return NextResponse.json({ message: 'Daily indexing job initiated successfully' });
});