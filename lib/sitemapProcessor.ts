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

const SITEMAP_VARIANTS = [
  '/sitemap_index.xml',
  '/sitemap.xml',
  '/wp-sitemap.xml',
  '/sitemap/sitemap-index.xml'
];

const USER_AGENTS = [
  'Mozilla/5.0 (compatible; WebsiteIndexerBot/1.0; +https://website-indexer.vercel.app)',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

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
    let sitemapUrls: string[] = [];

    try {
      // First try to get sitemaps from robots.txt
      const robotsTxtUrl = `https://${cleanedDomain}/robots.txt`;
      const robotsTxtContent = await fetchUrl(robotsTxtUrl);
      sitemapUrls = extractSitemapUrls(robotsTxtContent);
    } catch (error) {
      console.log('Failed to fetch robots.txt, trying to find sitemap directly... ', error);
      // If robots.txt fails, try to find an accessible sitemap
      const sitemapUrl = await findAccessibleSitemap(cleanedDomain);
      sitemapUrls = [sitemapUrl];
    }

    // Filter and process the sitemaps
    const filteredSitemapUrls = filterSitemaps(sitemapUrls);
    
    if (filteredSitemapUrls.length === 0) {
      throw new ValidationError('No valid sitemaps found');
    }

    let totalPages = 0;
    for (const sitemapUrl of filteredSitemapUrls) {
      try {
        const pageCount = await processSitemap(website.id, sitemapUrl);
        totalPages += pageCount;
      } catch (error) {
        console.error(`Error processing sitemap ${sitemapUrl}:`, error);
        // Continue with other sitemaps even if one fails
        continue;
      }
    }

    console.log(`Processed ${totalPages} pages for ${cleanedDomain}`);
    await updateWebsiteTimestamps(website.id, true, false);

  } catch (error) {
    console.error(`Error processing website ${website.domain}:`, error);
    throw error;
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
  const errors: Error[] = [];
  
  // Try different user agents
  for (const userAgent of USER_AGENTS) {
    try {
      const response: AxiosResponse = await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        maxRedirects: 5,
        timeout: 3000, // 3 seconds timeout
        validateStatus: (status) => status >= 200 && status < 500
      });

      if (response.status === 200) {
        return response.data;
      }
      
      errors.push(new Error(`Status ${response.status} with user agent ${userAgent}`));
    } catch (error: any) {
      errors.push(error);
      continue; // Try next user agent
    }
  }

  // If the URL was a sitemap variant, try other variants
  if (url.includes('sitemap')) {
    const baseUrl = url.split('/')[0] + '//' + url.split('/')[2];
    
    for (const variant of SITEMAP_VARIANTS) {
      const variantUrl = baseUrl + variant;
      if (variantUrl === url) continue; // Skip if it's the same as the original URL
      
      try {
        const response = await axios.get(variantUrl, {
          headers: {
            'User-Agent': USER_AGENTS[0],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          maxRedirects: 5,
          timeout: 3000
        });

        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }
  }

  // If we get here, all attempts failed
  console.error('All fetch attempts failed for URL:', url);
  console.error('Errors encountered:', errors);

  throw new ValidationError(
    `Unable to access the sitemap. Please ensure your robots.txt and sitemap are publicly accessible. ` +
    `You may need to temporarily disable any bot protection or firewall rules.`
  );
}

// Function to extract sitemap URLs from robots.txt
export function extractSitemapUrls(robotsTxtContent: string): string[] {
  try {
    const lines = robotsTxtContent.split('\n');
    const sitemapUrls = lines
      .filter(line => line.toLowerCase().trim().startsWith('sitemap:'))
      .map(line => line.split(': ')[1]?.trim())
      .filter(Boolean);

    // If no sitemaps found in robots.txt, return default sitemap URL
    if (sitemapUrls.length === 0) {
      const parsedUrl = new URL(robotsTxtContent);
      return [`${parsedUrl.protocol}//${parsedUrl.host}/sitemap.xml`];
    }

    return sitemapUrls;
  } catch (error) {
    console.log(error);
    // If parsing fails, assume robotsTxtContent is the base URL
    try {
      // Check if it's a valid URL
      new URL(robotsTxtContent);
      return [`${robotsTxtContent}/sitemap.xml`];
    } catch(error) {
      throw new ValidationError(`Invalid robots.txt content or URL format: ${error}`);
    }
  }
}

export async function findAccessibleSitemap(domain: string): Promise<string> {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  
  for (const variant of SITEMAP_VARIANTS) {
    try {
      const sitemapUrl = `${baseUrl}${variant}`;
      const response = await axios.head(sitemapUrl);
      
      if (response.status === 200) {
        return sitemapUrl;
      }
    } catch (error) {
      console.log(error);
      continue;
    }
  }

  throw new ValidationError('No accessible sitemap found');
}