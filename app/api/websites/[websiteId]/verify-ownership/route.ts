// File: app/api/websites/[websiteId]/verify-ownership/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getWebsiteById } from '@/models';
import { verifyWebsiteOwnership } from '@/lib/googleSearchConsole';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError, NotFoundError, ValidationError } from '@/utils/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
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
    throw new AuthenticationError('You do not have permission to verify this website');
  }

  const isOwner = await verifyWebsiteOwnership(website.domain);

  return NextResponse.json({ 
    is_owner: isOwner,
    message: isOwner ? 'Ownership verified successfully.' : 'No Ownership permissions.'
  });
});