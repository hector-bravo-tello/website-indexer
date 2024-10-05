// File: lib/googleSearchConsole.ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getWebsitesByUserId, createWebsite, updateWebsite } from '@/models';
import CONFIG from '@/config';
import { Website } from '@/types';

const oauth2Client = new OAuth2Client(
  CONFIG.google.clientId,
  CONFIG.google.clientSecret
);

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
    const analytics = google.analytics({ version: 'v3', auth: oauth2Client });

    const sites = await searchconsole.sites.list();
    const { websites: existingWebsites } = await getWebsitesByUserId(userId);

    const updatedWebsites = new Set<string>();

    if (sites.data.siteEntry) {
      for (const site of sites.data.siteEntry) {
        const domain = cleanDomain(site.siteUrl);
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
    // First, get the GA4 property ID
    const propertiesResponse = await analytics.management.accountSummaries.list();
    const property = propertiesResponse.data.items
      .flatMap((account: any) => account.webProperties)
      .find((prop: any) => cleanDomain(prop.websiteUrl).includes(domain));

    if (!property) {
      return { propertyId: null, dataStreamId: null };
    }

    const propertyId = property.id;

    // Then, get the data stream ID
    const dataStreamsResponse = await analytics.management.webDataStreams.list({
      parent: `properties/${propertyId}`,
    });

    const dataStream = dataStreamsResponse.data.webDataStreams
      .find((stream: any) => cleanDomain(stream.displayName).includes(domain));

    return {
      propertyId: propertyId,
      dataStreamId: dataStream ? dataStream.name.split('/').pop() : null,
    };
  } catch (error) {
    console.error(`Error fetching GA4 data for ${domain}:`, error);
    return { propertyId: null, dataStreamId: null };
  }
}