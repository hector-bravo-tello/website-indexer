import { JWT } from 'google-auth-library';
import { TokenError } from '@/utils/errors';
import CONFIG from '@/config';

let cachedClient: JWT | null = null;

export async function getServiceAccountToken(): Promise<string> {
  try {
    if (!cachedClient) {
      cachedClient = new JWT({
        email: CONFIG.google.clientEmail,
        key: CONFIG.google.privateKey,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/indexing'],
      });
    }

    const token = await cachedClient.authorize();
    return token.access_token || '';
  } catch (error) {
    console.error('Error getting service account token:', error);
    throw new TokenError('Failed to obtain service account token');
  }
}

export async function revokeServiceAccountToken(): Promise<void> {
  if (cachedClient) {
    try {
      await cachedClient.revokeCredentials();
    } catch (error) {
      console.error('Error revoking service account token:', error);
    } finally {
      cachedClient = null;
    }
  }
}