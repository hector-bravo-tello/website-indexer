// lib/googleAnalytics.ts
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getValidAccessToken } from './tokenManager';
import { getWebsiteById } from '@/models';
import { AuthorizationError } from '@/utils/errors';

function cleanDomain(inputDomain: string): string {
  let cleanedDomain = inputDomain.replace(/^sc-domain:/, '');
  try {
    const url = new URL(cleanedDomain);
    cleanedDomain = url.hostname;
  } catch {
    // If it's not a valid URL, assume it's already just a domain
  }
  cleanedDomain = cleanedDomain.replace(/^www\./, '');
  return cleanedDomain;
}

export async function fetchGA4Data(analytics: any, domain: string) {
  try {
    // List all GA4 properties
    const propertiesResponse = await analytics.accountSummaries.list({
      pageSize: 100  // Adjust this value based on the number of properties you expect
    });
    const properties = propertiesResponse.data.accountSummaries
      .flatMap((account: any) => account.propertySummaries || [])
      .filter((prop: any) => prop.property);

    // Find the property that matches the domain
    const property = properties.find((prop: any) => {
      const propDisplayName = cleanDomain(prop.displayName);
      const cleanedDomain = cleanDomain(domain);
      return propDisplayName === cleanedDomain;
    });

    if (!property) {
      console.log(`No matching GA4 property found for domain: ${domain}`);
      return { propertyId: null, dataStreamId: null };
    }

    const propertyId = property.property.split('/').pop();

    // List data streams for the found property
    const dataStreamsResponse = await analytics.properties.dataStreams.list({
      parent: `properties/${propertyId}`
    });
    const dataStreams = dataStreamsResponse.data.dataStreams || [];

    // Find the first web data stream (or any if no web stream is found)
    const dataStream = dataStreams.find((stream: any) => stream.type === 'WEB_DATA_STREAM') || dataStreams[0];

    const dataStreamId = dataStream ? dataStream.name.split('/').pop() : null;

    console.log(`Found GA4 data for ${domain}: Property ID: ${propertyId}, Data Stream ID: ${dataStreamId}`);

    return {
      propertyId: propertyId,
      dataStreamId: dataStreamId
    };
  } catch (error) {
    console.error(`Error fetching GA4 data for ${domain}:`, error);
    return { propertyId: null, dataStreamId: null };
  }
}

export async function getGA4AnalyticsData(websiteId: number, urls: string[]) {
  try {
    const { website } = await getWebsiteById(websiteId);
    if (!website || !website.ga4_property_id) {
      throw new Error('Website or GA4 property ID not found');
    }

    const accessToken = await getValidAccessToken(website.user_id);

    console.log(`Fetching GA4 data for property ID: ${website.ga4_property_id}`);
    console.log(`Using access token: ${accessToken.substring(0, 10)}...`);
    console.log(`Querying for URLs:`, urls);

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${website.ga4_property_id}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'engagementRate' },
          ],
          dimensionFilter: {
            orGroup: {
              expressions: urls.map(url => ({
                filter: {
                  fieldName: 'pagePath',
                  stringFilter: {
                    matchType: 'CONTAINS',
                    value: url,
                  },
                },
              })),
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Analytics API error (${response.status}):`, errorText);
      throw new Error(`Google Analytics API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Raw API Response:', JSON.stringify(data, null, 2));

    const result: { [key: string]: { impressions: number, clicks: number } } = {};

    if (data.rows && data.rows.length > 0) {
      data.rows.forEach((row: any) => {
        const url = row.dimensionValues[0].value;
        const impressions = parseInt(row.metricValues[0].value || '0', 10);
        const engagementRate = parseFloat(row.metricValues[1].value || '0');
        const clicks = Math.round(impressions * engagementRate);

        result[url] = { impressions, clicks };
      });
    } else {
      console.log('No data returned from Google Analytics API');
    }

    console.log('Processed result:', result);
    return result;
  } catch (error) {
    console.error('Error fetching GA4 analytics data:', error);
    if (error instanceof AuthorizationError) {
      throw error;
    }
    throw new Error(`Failed to fetch analytics data: ${error.message}`);
  }
}