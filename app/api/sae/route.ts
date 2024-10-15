// File: app/api/sae/route.ts

import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/utils/apiUtils';
import CONFIG from '@/config';

// returns the service account email used for the Google Search Console API
export const GET = withErrorHandling(async () => {
  const email = CONFIG.google.clientEmail;

  if (!email) {
    return NextResponse.json({ error: 'Service account email not configured' }, { status: 500 });
  }

  return NextResponse.json({ email });
});