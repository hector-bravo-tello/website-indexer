// File: lib/tokenManager.ts

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getUserTokens, updateUserTokens } from '@/models';
import { UserTokens } from '@/types/index';
import { TokenError, DatabaseError, AuthorizationError } from '@/utils/errors';
import CONFIG from '@/config';

const oauth2Client = new OAuth2Client(
  CONFIG.google.clientId,
  CONFIG.google.clientSecret
);

const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function getValidAccessToken(userId: number): Promise<string> {
  try {
    const tokens = await getUserTokens(userId);
    if (!tokens) {
      throw new TokenError('User tokens not found');
    }

    const { accessToken, refreshToken, expiresAt } = tokens;

    if (!expiresAt) {
      throw new TokenError('Token expiration time not set');
    }

    if (new Date(expiresAt).getTime() - Date.now() < TOKEN_EXPIRY_BUFFER) {
      // Token is expired or close to expiring, refresh it
      const newTokens = await refreshAccessToken(refreshToken);
      await updateUserTokens(userId, newTokens.access_token, newTokens.refresh_token, newTokens.expires_at);
      return newTokens.access_token;
    }

    return accessToken;
  } catch (error) {
    if (error instanceof TokenError) {
      throw error;
    } else if (error instanceof DatabaseError) {
      console.error('Database error in getValidAccessToken:', error);
      throw new TokenError('Failed to retrieve user tokens');
    } else {
      console.error('Unexpected error in getValidAccessToken:', error);
      throw new TokenError('An unexpected error occurred while getting access token');
    }
  }
}

async function refreshAccessToken(refreshToken: string): Promise<UserTokens> {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { tokens } = await oauth2Client.refreshAccessToken();
    
    if (!tokens || !tokens.access_token) {
      throw new TokenError('Failed to refresh access token: No tokens received');
    }

    const accessToken = tokens.access_token;
    const newRefreshToken = tokens.refresh_token || refreshToken; // Use the new refresh token if provided, otherwise keep the old one
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(); // Default to 1 hour from now if expiry_date is not provided

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_at: expiresAt,
    };
  } catch (error: any) {
    console.error('Error refreshing access token:', error);
    if (error.response && error.response.status === 400) {
      throw new AuthorizationError('Invalid refresh token. User may need to re-authenticate.');
    } else if (error.response && error.response.status === 401) {
      throw new AuthorizationError('Refresh token has been revoked or expired. User needs to re-authenticate.');
    } else {
      throw new TokenError('Failed to refresh access token');
    }
  }
}

export async function updateTokenExpiration(userId: number, expiresIn: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    await updateUserTokens(userId, null, null, expiresAt);
  } catch (error) {
    console.error('Error updating token expiration:', error);
    if (error instanceof DatabaseError) {
      throw new TokenError('Failed to update token expiration in database');
    } else {
      throw new TokenError('An unexpected error occurred while updating token expiration');
    }
  }
}

export async function revokeToken(userId: number): Promise<void> {
  try {
    const tokens = await getUserTokens(userId);
    if (!tokens || !tokens.accessToken) {
      throw new TokenError('No valid token found for user');
    }

    await oauth2Client.revokeToken(tokens.accessToken);
    await updateUserTokens(userId, null, null, null); // Clear tokens in database
  } catch (error) {
    console.error('Error revoking token:', error);
    if (error instanceof TokenError) {
      throw error;
    } else if (error instanceof DatabaseError) {
      throw new TokenError('Failed to update token information after revocation');
    } else {
      throw new TokenError('An unexpected error occurred while revoking token');
    }
  }
}