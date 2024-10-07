import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getWebsitesByUserId, getWebsiteById, createWebsite, updateWebsite } from '@/models';
import { IndexingStatus } from '@/types';
import { fetchGA4Data } from './googleAnalytics';
import CONFIG from '@/config';

const oauth2Client = new OAuth2Client(
  CONFIG.google.clientId,
  CONFIG.google.clientSecret
);

async function rateLimitedFetch<T>(items: T[], fetchFn: (item: T) => Promise<any>, rateLimit: number) {
  const results = [];
  for (let i = 0; i < items.length; i += rateLimit) {
    const batch = items.slice(i, i + rateLimit);
    const batchResults = await Promise.all(batch.map(fetchFn));
    results.push(...batchResults);
    if (i + rateLimit < items.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between batches
    }
  }
  return results;
}

export async function fetchAndStoreWebsites(userId: number, accessToken: string) {
  try {
    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    const analytics = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });

    const sites = await searchconsole.sites.list();
    const { websites: existingWebsites } = await getWebsitesByUserId(userId);

    const updatedWebsites = new Set<string>();

    if (sites.data.siteEntry) {
      for (const site of sites.data.siteEntry) {
        //const domain = cleanDomain(site.siteUrl);
        const domain = site.siteUrl;
        const ga4Data = await fetchGA4Data(analytics, domain);

        const existingWebsite = existingWebsites.find(w => w.domain === domain);

        if (existingWebsite) {
          await updateWebsite(existingWebsite.id, {
            ga4_property_id: ga4Data.propertyId,
            ga4_data_stream_id: ga4Data.dataStreamId,
            indexing_enabled: existingWebsite.indexing_enabled, // Preserve existing indexing status
          });
        } else {
          await createWebsite({
            user_id: userId,
            domain: domain,
            indexing_enabled: false, // New websites are set to false by default
            ga4_property_id: ga4Data.propertyId,
            ga4_data_stream_id: ga4Data.dataStreamId,
          });
        }

        updatedWebsites.add(domain);
      }
    }

    // For websites no longer in Google Search Console, we set indexing_enabled to false
    for (const existingWebsite of existingWebsites) {
      if (!updatedWebsites.has(existingWebsite.domain)) {
        await updateWebsite(existingWebsite.id, { indexing_enabled: false });
      }
    }
  } catch (error) {
    console.error('Error fetching and storing websites:', error);
    throw error;
  }
}

export async function fetchBulkIndexingStatus(websiteId: number, domain: string, accessToken: string, urls: string[]): Promise<Array<{ url: string, lastIndexedDate: string | null, indexingStatus: IndexingStatus }>> {
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

  try {
    const fetchUrl = async (url: string) => {
      try {
        const response = await searchconsole.urlInspection.index.inspect({
          requestBody: {
            inspectionUrl: url,
            siteUrl: domain,
          },
        });

        const result = response.data.inspectionResult;
        return {
          url: url,
          lastIndexedDate: result?.indexStatusResult?.lastCrawlTime || null,
          indexingStatus: result?.indexStatusResult?.coverageState
        };
      } catch (error) {
        console.error(`Error inspecting URL ${url}:`, error);
        return {
          url: url,
          lastIndexedDate: null,
          indexingStatus: 'error' as IndexingStatus
        };
      }
    };

    // Use rateLimitedFetch to process URLs with rate limiting
    const results = await rateLimitedFetch(urls, fetchUrl, 100); // Process 100 URLs per second

    return results;

  } catch (error) {
    console.error('Error fetching indexing status:', error);
    throw error;
  }
}

export async function submitUrlForIndexing(domain: string, url: string, accessToken: string): Promise<void> {
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  const indexing = google.indexing({ version: 'v3', auth: oauth2Client });

  try {
    await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: 'URL_UPDATED',
      },
    });
    console.log(`Submitted URL for indexing: ${url}`);
  } catch (error) {
    console.error(`Error submitting URL for indexing: ${url}`, error);
    throw new Error('Failed to submit URL for indexing');
  }
}

export async function getPageImpressionsAndClicks(websiteId: number, urls: string[], accessToken: string) {
  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

  try {
    const { website } = await getWebsiteById(websiteId);
    if (!website) {
      throw new Error('Website not found');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    const endDate = new Date();

    const response = await searchconsole.searchanalytics.query({
      siteUrl: website.domain,
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['page'],
        rowLimit: urls.length,
      },
    });
    //console.log('Response: ', response.data.rows);

    const result: { [key: string]: { impressions: number, clicks: number } } = {};

    // Initialize result with all input URLs set to zero impressions and clicks
    urls.forEach(url => {
      result[url] = { impressions: 0, clicks: 0 };
    });

    if (response.data.rows) {
      response.data.rows.forEach((row: any) => {
        const url = row.keys[0];
        if (urls.includes(url)) {
          result[url] = {
            impressions: row.impressions,
            clicks: row.clicks,
          };
        }
      });
    }
    //console.log('Result: ', result);
    return result;

  } catch (error) {
    console.error('Error fetching Search Console data:', error);
    throw new Error('Failed to fetch Search Console data');
  }
}