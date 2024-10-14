import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { IndexingStatus } from '@/types';
import { getWebsitesByUserId, getWebsiteById, createWebsite, updateWebsite, updatePageData } from '@/models';
import CONFIG from '@/config';

const auth = new JWT({
  email: CONFIG.google.clientEmail,
  key: CONFIG.google.privateKey,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/indexing'],
});

const searchconsole = google.searchconsole({ version: 'v1', auth });

async function rateLimitedFetch<T>(items: T[], fetchFn: (item: T) => Promise<any>, rateLimit: number): Promise<any[]> {
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

export async function fetchAndStoreWebsites(userId: number): Promise<void> {
    try {
      const sites = await searchconsole.sites.list();
      const { websites: existingWebsites } = await getWebsitesByUserId(userId);
  
      const updatedWebsites = new Set<string>();
  
      if (sites.data.siteEntry) {
        for (const site of sites.data.siteEntry) {
          const domain = site.siteUrl || ''; // Provide a default empty string if siteUrl is null or undefined
          const existingWebsite = existingWebsites.find(w => w.domain === domain);
  
          if (existingWebsite) {
            await updateWebsite(existingWebsite.id, {
              enabled: existingWebsite.enabled,
              auto_indexing_enabled: existingWebsite.auto_indexing_enabled,
            });
          } else if (domain) { // Only create a new website if domain is not an empty string
            await createWebsite({
              user_id: userId,
              domain: domain,
              enabled: false,
              auto_indexing_enabled: false,
            });
          }
  
          if (domain) {
            updatedWebsites.add(domain);
          }
        }
      }
  
      for (const existingWebsite of existingWebsites) {
        if (!updatedWebsites.has(existingWebsite.domain)) {
          await updateWebsite(existingWebsite.id, { enabled: false });
        }
      }
    } catch (error) {
      console.error('Error fetching and storing websites:', error);
      throw error;
    }
}

export async function fetchBulkIndexingStatus(websiteId: number, urls: string[]): Promise<Array<{ url: string, lastIndexedDate: string | null, indexingStatus: IndexingStatus }>> {
  const { website } = await getWebsiteById(websiteId);
  if (!website) {
    throw new Error('Website not found');
  }

  const results = await rateLimitedFetch(urls, async (url) => {
    try {
      const response = await searchconsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: url,
          siteUrl: website.domain,
        },
      });

      const result = response.data.inspectionResult;
      return {
        url: url,
        lastIndexedDate: result?.indexStatusResult?.lastCrawlTime || null,
        indexingStatus: result?.indexStatusResult?.coverageState as IndexingStatus
      };
    } catch (error) {
      console.error(`Error inspecting URL ${url}:`, error);
      return {
        url: url,
        lastIndexedDate: null,
        indexingStatus: 'error' as IndexingStatus
      };
    }
  }, 100);

  for (const result of results) {
    await updatePageData(websiteId, result.url, result.indexingStatus, result.lastIndexedDate);
  }

  return results;
}

export async function submitUrlForIndexing(domain: string, url: string): Promise<any> {
    const indexing = google.indexing({ version: 'v3', auth: auth });
  
    try {
      const response = await indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_UPDATED',
        },
      });
      console.log(`Submitted URL for indexing: ${url}`);
      return response;

    } catch (error) {
      console.error(`Error submitting URL for indexing: ${url}`, error);
      throw new Error('Failed to submit URL for indexing');
    }
  }
  

export async function getPageImpressionsAndClicks(websiteId: number, urls: string[]) {
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

    const result: { [key: string]: { impressions: number, clicks: number } } = {};

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
    return result;

  } catch (error) {
    console.error('Error fetching Search Console data:', error);
    throw new Error('Failed to fetch Search Console data');
  }
}

export async function verifyWebsiteOwnership(property: string): Promise<boolean> {
  try {
      const response = await searchconsole.sites.get({ siteUrl: property });
      // If the service account has access, the property exists, and the response returns successfully.
      if (response.data.siteUrl === property) {
        return true;
      }
      return false;

    } catch (error) {
      console.error(`Error verifying website ownership for ${property}:`, error);
      return false;
  }
}