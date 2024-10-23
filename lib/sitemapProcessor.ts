import axios, { AxiosResponse } from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { Website, Page, IndexingStatus } from '@/types';
import { 
  addOrUpdatePagesFromSitemap, 
  updateWebsiteTimestamps, 
  getPagesByWebsiteId,
  removePages
} from '@/models';
import { fetchBulkIndexingStatus } from './googleSearchConsole';
import { ValidationError } from '@/utils/errors';


const parseXml = promisify(parseString);

export function cleanDomain(inputDomain: string): string {
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
      const pageCount = await processSitemap(website.id, sitemapUrl);
      totalPages += pageCount;
    }

    console.log(`Processed ${totalPages} pages for ${cleanedDomain}`);
    // Update only last_sync timestamp for manual sync
    await updateWebsiteTimestamps(website.id, true, false);
  } catch (error) {
    console.error(`Error processing website ${cleanDomain(website.domain)}:`, error);
  }
}

// Function to filter sitemaps based on their names
export function filterSitemaps(sitemapUrls: string[]): string[] {
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

async function processSitemap(websiteId: number, sitemapUrl: string): Promise<number> {
  try {
    const sitemapContent = await fetchUrl(sitemapUrl);
    const pages = await parseSitemap(sitemapContent);
    
    const urls = new Set(pages.map(page => page.url));

    // Fetch existing pages from the database
    const existingPages = await getPagesByWebsiteId(websiteId, true);

    // Identify pages to remove (in database but not in sitemap)
    const pagesToRemove = existingPages.pages.filter(page => !urls.has(page.url));

    // Fetch the actual indexing status and last indexed date from Google Search Console
    const indexedPages = await fetchBulkIndexingStatus(websiteId, Array.from(urls));

    // Combine sitemap data with indexing data
    const formattedPages = pages.map(page => {
      const indexedPage = indexedPages.find(ip => ip.url === page.url);
      return {
        url: page.url,
        lastCrawledDate: indexedPage?.lastCrawledDate || null,
        indexingStatus: indexedPage?.indexingStatus || 'unknown' as IndexingStatus
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
export async function parseSitemap(sitemapContent: string): Promise<Pick<Page, 'url'>[]> {
  try {
    const result: any = await parseXml(sitemapContent);
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
    const response: AxiosResponse = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebsiteIndexerBot/1.0; +https://websiteindexer.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      maxRedirects: 5,
      timeout: 10000, // 10 seconds timeout
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Don't reject if status is between 200 and 499
      }
    });

    // Handle different response status codes
    if (response.status === 403) {
      throw new ValidationError(`Access forbidden to ${url}. The server may be blocking automated requests.`);
    }

    if (response.status === 404) {
      throw new ValidationError(`URL not found: ${url}`);
    }

    if (response.status !== 200) {
      throw new ValidationError(`Failed to fetch URL: ${url} (Status: ${response.status})`);
    }

    return response.data;
  } catch (error: any) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Error response from ${url}:`, {
        status: error.response.status,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error(`No response received from ${url}:`, error.request);
    }
    
    // If it's already a ValidationError, rethrow it
    if (error instanceof ValidationError) {
      throw error;
    }

    // Otherwise, wrap it in a ValidationError with a friendly message
    throw new ValidationError(`Failed to fetch URL: ${url}. Please ensure the URL is accessible and try again.`);
  }
}

// Function to extract sitemap URLs from robots.txt
export function extractSitemapUrls(robotsTxtContent: string): string[] {
  const lines = robotsTxtContent.split('\n');
  return lines
    .filter(line => line.toLowerCase().startsWith('sitemap:'))
    .map(line => line.split(': ')[1].trim());
}
