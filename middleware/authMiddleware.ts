import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getValidAccessToken } from '@/lib/tokenManager';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  try {
    // The token should contain userId and potentially an access token
    const userId = token.userId as number;

    // Retrieve or refresh the Google OAuth access token
    const validAccessToken = await getValidAccessToken(userId);

    // Add the valid access token to the request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-Access-Token', validAccessToken); // Adding Google OAuth token for API requests

    // Create a new request with the updated headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;
  } catch (error) {
    console.error('Error in token middleware:', error);

    // Token-related errors should redirect the user to the sign-in page
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    return NextResponse.redirect(url);
  }
}

// Only match requests that are not static files, API calls, or auth-related routes
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
};
