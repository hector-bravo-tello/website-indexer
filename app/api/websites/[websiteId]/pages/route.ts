import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPagesByWebsiteId, getWebsiteById } from '@/models';
import { withErrorHandling } from '@/utils/apiUtils';
import { AuthenticationError, NotFoundError } from '@/utils/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new AuthenticationError('Unauthorized');
  }

  const websiteId = parseInt(request.nextUrl.pathname.split('/')[3]);
  const searchParams = request.nextUrl.searchParams;
  const all = searchParams.get('all') === 'true';
  const page = parseInt(searchParams.get('page') || '0');
  const pageSize = parseInt(searchParams.get('pageSize') || '25');
  const orderBy = searchParams.get('orderBy') || 'url';
  const order = searchParams.get('order') || 'asc';

  if (isNaN(websiteId)) {
    throw new NotFoundError('Invalid website ID');
  }

  const { website } = await getWebsiteById(websiteId);

  if (!website || website.user_id !== parseInt(session.user.id)) {
    throw new NotFoundError('Website not found');
  }

  const { pages, totalCount } = await getPagesByWebsiteId(websiteId, all, page, pageSize, orderBy, order);

  return NextResponse.json({ pages, totalCount });
});