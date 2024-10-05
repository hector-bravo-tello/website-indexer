// lib/googleAnalytics.ts
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getValidAccessToken, updateTokenExpiration } from './tokenManager';
import { AuthorizationError } from '@/utils/errors';

export async function getGA4AnalyticsSummary(propertyId: string, dataStreamId: string, userId: number) {
  try {
    const accessToken = await getValidAccessToken(userId);

    const analyticsDataClient = new BetaAnalyticsDataClient({
      auth: {
        getClient: () => ({
          getAccessToken: async () => accessToken,
        }),
      },
    });

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
    });

    return {
      totalVisits: response.rows[0].metricValues[0].value,
      averageSessionDuration: response.rows[0].metricValues[1].value,
      bounceRate: response.rows[0].metricValues[2].value,
    };
  } catch (error) {
    if (error.code === 401 || error.code === 403) {
      throw new AuthorizationError('Google Analytics access revoked. Please re-authorize.');
    }
    throw error;
  }
}