import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getWebsitesByUserId } from '@/models';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError } from '@/utils/errors';
import { verifyWebsiteOwnership } from '@/lib/googleSearchConsole';
import { Website } from '@/types';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new AuthenticationError('Unauthorized');
  }

  const userId = parseInt(session.user.id);
  const { websites } = await getWebsitesByUserId(userId);

  if (!websites || websites.length === 0) {
    return NextResponse.json([]);
  }

  const websitesWithOwnership: Website[] = await Promise.all(
    websites.map(async (website) => {
      try {
        const isOwner = await verifyWebsiteOwnership(website.domain);
        return { ...website, is_owner: isOwner };

      } catch (error) {
        console.error(`Error verifying ownership for ${website.domain}:`, error);
        return { ...website, is_owner: null };
      }
    })
  );

  return NextResponse.json(websitesWithOwnership);
});