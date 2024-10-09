import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import jobQueue from '@/lib/jobQueue';
import { Website, IndexingStatus } from '@/types';
import { 
  getWebsitesForIndexing, 
  addOrUpdatePagesFromSitemap, 
  updateWebsiteRobotsScan, 
  getPagesByWebsiteId,
  removePages
} from '@/models';
import { fetchBulkIndexingStatus } from './googleSearchConsole';
import { getValidAccessToken } from './tokenManager';
import { ValidationError } from '@/utils/errors';

const parseXml = promisify(parseString);

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

// Function to queue the website processing as background jobs
export async function scheduleSitemapProcessing(): Promise<void> {
  try {
    const websites = await getWebsitesForIndexing();
    for (const website of websites) {
      await jobQueue.addJob(website.id);
    }
  } catch (error) {
    console.error('Error in scheduled sitemap processing:', error);
  }
}

// Function to process a single website, called as part of the background job
export async function processSingleWebsite(website: Website): Promise<void> {
  try {
    const cleanedDomain = cleanDomain(website.domain);
    const robotsTxtUrl = `https://${cleanedDomain}/robots.txt`;
    const robotsTxtContent = await fetchUrl(robotsTxtUrl);
    const allSitemapUrls = extractSitemapUrls(robotsTxtContent);
    const filteredSitemapUrls = filterSitemaps(allSitemapUrls);

    let totalPages = 0;
    for (const sitemapUrl of filteredSitemapUrls) {
      const pageCount = await processSitemap(website.id, website.domain, sitemapUrl, website.user_id);
      totalPages += pageCount;
    }

    console.log(`Processed ${totalPages} pages for ${cleanedDomain}`);
    await updateWebsiteRobotsScan(website.id);
  } catch (error) {
    console.error(`Error processing website ${cleanDomain(website.domain)}:`, error);
  }
}

// Function to filter sitemaps based on their names
function filterSitemaps(sitemapUrls: string[]): string[] {
  const includePatterns = [
    /post-sitemap/,
    /page-sitemap/,
    /product-sitemap/,
    /^sitemap[-_]?index/,
    /^sitemap[-_]?pages/,
    /^sitemap[-_]?posts/,
    /^sitemap[-_]?products/
  ];

  const excludePatterns = [
    /category-sitemap/,
    /tag-sitemap/,
    /author-sitemap/,
    /^sitemap[-_]?category/,
    /^sitemap[-_]?tag/,
    /^sitemap[-_]?author/,
    /^sitemap[-_]?archive/
  ];

  return sitemapUrls.filter(url => {
    const sitemapName = new URL(url).pathname.split('/').pop() || '';
    
    if (excludePatterns.some(pattern => pattern.test(sitemapName))) {
      return false;
    }

    return includePatterns.some(pattern => pattern.test(sitemapName)) || sitemapName === 'sitemap.xml';
  });
}

async function processSitemap(websiteId: number, domain: string, sitemapUrl: string, userId: number): Promise<number> {
  try {
    const sitemapContent = await fetchUrl(sitemapUrl);
    const pages = await parseSitemap(sitemapContent);
    
    const urls = new Set(pages.map(page => page.url));

    // Fetch existing pages from the database
    const existingPages = await getPagesByWebsiteId(websiteId, true);

    // Identify pages to remove (in database but not in sitemap)
    const pagesToRemove = existingPages.pages.filter(page => !urls.has(page.url));

    // Fetch the actual indexing status and last indexed date from Google Search Console
    const accessToken = await getValidAccessToken(userId);
    const indexedPages = await fetchBulkIndexingStatus(websiteId, domain, accessToken, Array.from(urls));

    // Combine sitemap data with indexing data
    const formattedPages = pages.map(page => {
      const indexedPage = indexedPages.find(ip => ip.url === page.url);
      return {
        url: page.url,
        lastIndexedDate: indexedPage?.lastIndexedDate || null,
        indexingStatus: indexedPage?.indexingStatus || 'not_indexed' as IndexingStatus
      };
    });

    // Update or add pages
    await addOrUpdatePagesFromSitemap(websiteId, formattedPages);

    // Remove pages that are no longer in the sitemap
    if (pagesToRemove.length > 0) {
      await removePages(websiteId, pagesToRemove.map(page => page.id));
    }

    return pages.length;

  } catch (error) {
    console.error(`Error processing sitemap ${sitemapUrl}:`, error);
    return 0;
  }
}

// Function to parse the sitemap XML and extract URLs
export async function parseSitemap(sitemapContent: string): Promise<{ url: string }[]> {
  try {
    const result = await parseXml(sitemapContent);
    if (result.sitemapindex) {
      // Sitemap index file containing multiple sitemaps
      const sitemapUrls = result.sitemapindex.sitemap.map((sitemap: any) => sitemap.loc[0]);
      const filteredSitemapUrls = filterSitemaps(sitemapUrls);
      const allPages = await Promise.all(filteredSitemapUrls.map(fetchAndParseSitemap));
      return allPages.flat();
    } else if (result.urlset) {
      // Regular sitemap containing URLs
      return result.urlset.url.map((url: any) => ({ url: url.loc[0] }));
    } else {
      throw new ValidationError('Invalid sitemap format');
    }
  } catch (error) {
    console.error('Error parsing sitemap:', error);
    throw new ValidationError('Failed to parse sitemap');
  }
}

// Helper function to fetch and parse a sitemap from a given URL
export async function fetchAndParseSitemap(sitemapUrl: string): Promise<{ url: string }[]> {
  const sitemapContent = await fetchUrl(sitemapUrl);
  return parseSitemap(sitemapContent);
}

// Function to fetch URL content (robots.txt, sitemap.xml, etc.)
export async function fetchUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    throw new ValidationError(`Failed to fetch URL: ${url}`);
  }
}

// Function to extract sitemap URLs from robots.txt
export function extractSitemapUrls(robotsTxtContent: string): string[] {
  const lines = robotsTxtContent.split('\n');
  return lines
    .filter(line => line.toLowerCase().startsWith('sitemap:'))
    .map(line => line.split(': ')[1].trim());
}
