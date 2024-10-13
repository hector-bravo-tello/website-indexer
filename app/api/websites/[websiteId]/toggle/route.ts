// File: app/api/websites/[websiteId]/toggle-indexing/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getWebsiteById, updateWebsite } from '@/models';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError, NotFoundError, ValidationError } from '@/utils/errors';
import jobQueue from '@/lib/jobQueue';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new AuthenticationError('Unauthorized');
  }

  const websiteId = parseInt(request.url.split('/').slice(-2)[0]);

  if (isNaN(websiteId)) {
    throw new ValidationError('Invalid website ID');
  }

  const { website } = await getWebsiteById(websiteId);
  if (!website) {
    throw new NotFoundError('Website not found');
  }

  if (website.user_id !== parseInt(session.user.id)) {
    throw new AuthenticationError('You do not have permission to modify this website');
  }

  const body = await request.json();
  const { enabled, auto_indexing_enabled } = body;

  if (typeof enabled !== 'boolean' && typeof auto_indexing_enabled !== 'boolean') {
    throw new ValidationError('Invalid request body. Expected "enabled" or "auto_indexing_enabled" boolean field.');
  }

  const { website: updatedWebsite } = await updateWebsite(websiteId, { enabled: enabled, auto_indexing_enabled: auto_indexing_enabled });

  let message: string = '';
  let shouldRunJob: boolean = false;

  if (enabled) {
    if (auto_indexing_enabled) {
      message = 'Website enabled. Auto-indexing enabled.';
      shouldRunJob = !website.last_robots_scan || new Date(website.last_robots_scan).getTime() < Date.now() - 24 * 60 * 60 * 1000;
    } else { 
      message = 'Website enabled. Auto-indexing disabled.'; 
    }

    if (shouldRunJob) {
      try {
        await jobQueue.addJob(websiteId, 'ui');
        message = 'Auto-indexing enabled. Fetching data from Google Search Console...';

      } catch (error) {
        console.error(`Failed to start indexing job for website ${websiteId}:`, error);
      }
    }
  } else {  
    message = 'Website disabled.';
  }

  return NextResponse.json({ 
    website: updatedWebsite, 
    message,
    initialScanTime: website.last_robots_scan?.toISOString()
  });
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new AuthenticationError('Unauthorized');
  }

  const websiteId = parseInt(request.url.split('/').slice(-2)[0]);
  const initialScanTime = request.nextUrl.searchParams.get('initialScanTime');

  if (isNaN(websiteId) || !initialScanTime) {
    throw new ValidationError('Invalid website ID or initial scan time');
  }

  const { website } = await getWebsiteById(websiteId);
  
  if (!website || website.user_id !== parseInt(session.user.id)) {
    throw new NotFoundError('Website not found');
  }

  const isCompleted = website.last_robots_scan && new Date(website.last_robots_scan) > new Date(initialScanTime);

  return NextResponse.json({ 
    isCompleted,
    lastScanTime: website.last_robots_scan?.toISOString()
  });
});