import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getWebsitesByUserId, createWebsite, updateWebsite } from '@/models';
import { IndexingStatus } from '@/types';
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

async function fetchGA4Data(analytics: any, domain: string) {
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
          //indexingStatus: result?.indexStatusResult?.indexingState === 'INDEXED' ? 'indexed' : 'not_indexed' as IndexingStatus
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