import axios, { AxiosResponse } from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { Website, Page, IndexingStatus } from '@/types';
import { 
  addOrUpdatePagesFromSitemap, 
  getPagesByWebsiteId,
  removePages,
  createIndexingJob,
  updateIndexingJob,
  createIndexingJobDetail,
  updateWebsiteTimestamps
} from '@/models';
import { fetchBulkIndexingStatus, submitUrlForIndexing } from './googleSearchConsole';
import { sendEmailNotification } from '@/lib/emailService';
import { ValidationError } from '@/utils/errors';

const delay = promisify(setTimeout);
const indexed: string = 'Submitted and indexed';
const parseXml = promisify(parseString);

// Expanded list of user agents to try
const USER_AGENTS = [
  // Google/Googlebot agents
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Googlebot/2.1 (+http://www.google.com/bot.html)',
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  
  // Modern browser agents
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  
  // Custom agent identifying our service
  'Mozilla/5.0 (compatible; WebsiteIndexerBot/1.0; +https://website-indexer.vercel.app)',
];

// Common sitemap file patterns to try
const SITEMAP_VARIANTS = [
  '/sitemap_index.xml',
  '/sitemap.xml',
  '/wp-sitemap.xml',
  '/sitemap/sitemap-index.xml',
  '/post-sitemap.xml',
  '/page-sitemap.xml',
  '/product-sitemap.xml',
  '/category-sitemap.xml',
  '/index-sitemap.xml'
];

// Enhanced browser-like headers that will be combined with different user agents
const COMMON_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};


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
      //console.log('robotsTxtContent: ', robotsTxtContent);

      sitemapUrls = extractSitemapUrls(robotsTxtContent);
      //console.log('sitemapUrls: ', sitemapUrls);

    } catch (error) {
      console.log('Failed to fetch robots.txt, trying to find sitemap directly... ', error);

      // If robots.txt fails, try to find an accessible sitemap
      const sitemapUrl = await findAccessibleSitemap(cleanedDomain);
      sitemapUrls = [sitemapUrl];
      //console.log('Error. sitemapUrls: ', sitemapUrls);
    }

    // Filter and process the sitemaps
    const filteredSitemapUrls = filterSitemaps(sitemapUrls);
    //console.log('filteredSitemapUrls: ', filteredSitemapUrls);
    
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

    //console.log('formattedPages: ', formattedPages);

    // Update or add pages
    const result = await addOrUpdatePagesFromSitemap(websiteId, formattedPages);
    console.log(`Processed ${result.processedCount} pages for website ${websiteId}`);

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
export async function parseSitemap(sitemapContent: string): Promise<Pick<Page, 'url' | 'last_modified'>[]> {
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
      return result.urlset.url.map((url: any) => ({
        url: url.loc[0],
        last_modified: url.lastmod ? new Date(url.lastmod[0]) : null
      }));

    } else {
      throw new ValidationError('Invalid sitemap format');
    }
  } catch (error) {
    console.error('Error parsing sitemap:', error);
    throw new ValidationError('Failed to parse sitemap');
  }
}

// Helper function to fetch and parse a sitemap from a given URL
export async function fetchAndParseSitemap(sitemapUrl: string): Promise<{ url: string; last_modified: Date | null; }[]> {
  const sitemapContent = await fetchUrl(sitemapUrl);
  return parseSitemap(sitemapContent);
}

// Function to fetch URL with retry logic and multiple user agents
export async function fetchUrl(url: string): Promise<string> {
  const errors: Error[] = [];
  let lastResponse: AxiosResponse | null = null;

  // Try each user agent
  for (const userAgent of USER_AGENTS) {
    const headers = {
      ...COMMON_HEADERS,
      'User-Agent': userAgent
    };

    try {
      // First attempt with this user agent
      const response = await axios.get(url, {
        headers,
        maxRedirects: 5,
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 500,
        decompress: true
      });

      if (response.status === 200) {
        return response.data;
      }

      lastResponse = response;

      // If we get a protection response, try with cookies
      if (response.status === 403 || response.status === 503) {
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

          const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
          const retryResponse = await axios.get(url, {
            headers: {
              ...headers,
              'Cookie': cookieHeader
            },
            maxRedirects: 5,
            timeout: 10000
          });

          if (retryResponse.status === 200) {
            return retryResponse.data;
          }
          lastResponse = retryResponse;
        }
      }

      // Add delay between different user agent attempts
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      errors.push(error as Error);
      continue;
    }
  }

  // If original URL failed, try alternate sitemap URLs
  if (url.includes('sitemap')) {
    const baseUrl = new URL(url).origin;
    
    for (const variant of SITEMAP_VARIANTS) {
      const variantUrl = `${baseUrl}${variant}`;
      if (variantUrl === url) continue;

      // Try each user agent for the variant URL
      for (const userAgent of USER_AGENTS) {
        try {
          const response = await axios.get(variantUrl, {
            headers: {
              ...COMMON_HEADERS,
              'User-Agent': userAgent
            },
            maxRedirects: 5,
            timeout: 10000
          });

          if (response.status === 200) {
            return response.data;
          }
        } catch (error) {
          console.log(error);
          continue;
        }
      }
    }
  }

  // Determine protection type from last response
  const protectionType = lastResponse?.headers?.server?.includes('cloudflare') ? 'Cloudflare' : 
                        lastResponse?.data?.includes('wordfence') ? 'Wordfence' : 
                        'WAF';

  throw new ValidationError(
    `Unable to access the sitemap. Site appears to be protected by ${protectionType}. ` +
    `Status: ${lastResponse?.status || 'unknown'}. ` +
    `You may need to: \n` +
    `1. Whitelist our IPs in ${protectionType}\n` +
    `2. Add exception for these User-Agents: ${USER_AGENTS[0]} or ${USER_AGENTS[USER_AGENTS.length - 1]}\n` +
    `3. Ensure sitemap URLs are publicly accessible\n` +
    `4. Temporarily lower security settings for sitemap URLs`
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

export async function processWebsiteForScheduledJob(website: Website): Promise<void> {
  const cleanedDomain = cleanDomain(website.domain);
  let allSitemapUrls: string[] = [];

  try {
    // First try to get sitemaps from robots.txt
    const robotsTxtUrl = `https://${cleanedDomain}/robots.txt`;
    const robotsTxtContent = await fetchUrl(robotsTxtUrl);
    console.log('robotsTxtContent: ', robotsTxtContent);

    allSitemapUrls = extractSitemapUrls(robotsTxtContent);
    console.log('Error. allSitemapUrls: ', allSitemapUrls);

  } catch(error) {
    console.log('Failed to fetch robots.txt, trying to find sitemap directly... ', error);

    // If robots.txt fails, try to find an accessible sitemap
    const sitemapUrl = await findAccessibleSitemap(cleanedDomain);
    allSitemapUrls = [sitemapUrl];
    console.log('Error. allSitemapUrls: ', allSitemapUrls);
  }

  try {
    // Filter and process the sitemaps
    const filteredSitemapUrls = filterSitemaps(allSitemapUrls);
    console.log('filteredSitemapUrls: ', filteredSitemapUrls);

    if (filteredSitemapUrls.length === 0) {
      throw new ValidationError('No valid sitemaps found');
    }

    // get all pages from sitemaps
    let allPages: Pick<Page, 'url'>[] = [];
    for (const sitemapUrl of filteredSitemapUrls) {
      const sitemapContent = await fetchUrl(sitemapUrl);
      const pages = await parseSitemap(sitemapContent);
      allPages = allPages.concat(pages);
    }
    console.log('allPages: ', allPages);

    // create indexing job in database when starting
    const job = await createIndexingJob({ website_id: website.id, status: 'in_progress', total_pages: allPages.length });
    console.log('job: ', job);

    // get websites pages from database
    const { pages: existingPages } = await getPagesByWebsiteId(website.id, true);
    const existingUrls = new Set(existingPages.map(page => page.url));
    console.log('existingPages: ', existingPages);

    // website pages from sitemaps
    const currentUrls = new Set(allPages.map(page => page.url));
    console.log('currentUrls: ', currentUrls);

    // get new, removed and unchanged urls
    const newUrls = allPages.filter(page => !existingUrls.has(page.url));
    const removedUrls = existingPages.filter(page => !currentUrls.has(page.url));
    const unchangedUrls = allPages.filter(page => existingUrls.has(page.url));

    // get indexing data before submitting non-indexed pages
    const urlsToCheck = [...newUrls, ...unchangedUrls].map(page => page.url);
    let indexedPages = await fetchBulkIndexingStatus(website.id, urlsToCheck);
    console.log('indexedPages: ', indexedPages);

    // Submit non-indexed pages
    let processedPages = 0;
    const current_time = new Date().toISOString();
    for (const page of indexedPages) {
      if (page.indexingStatus !== indexed) {
        try {
          const response = await submitUrlForIndexing(website.domain, page.url);
          console.log('response: ', response);

          await createIndexingJobDetail({
            indexing_job_id: job.job.id,
            page_id: existingPages.find(p => p.url === page.url)?.id || 0,
            status: 'Submitted',
            response: JSON.stringify(response)
          });
          console.log('createIndexingJobDetail');
          processedPages++;

        } catch (error) {
          console.error(`Error submitting URL for indexing: ${page.url}`, error);
        }
      }
    }

    // Wait for Google to process submissions
    await delay(20000); // Wait for 20 seconds

    // Fetch updated indexing statuses
    indexedPages = await fetchBulkIndexingStatus(website.id, urlsToCheck);
    console.log('indexedPages: ', indexedPages);

    const pagesToUpdate = indexedPages.map(page => ({
      url: page.url,
      indexingStatus: page.indexingStatus,
      lastCrawledDate: page.lastCrawledDate,
      lastSubmittedDate: page.indexingStatus !== indexed ? current_time : existingPages.find(p => p.url === page.url)?.last_submitted_date?.toISOString()
    }));
    console.log('pagesToUpdate: ', pagesToUpdate);

    // Update database with final indexing data
    const result = await addOrUpdatePagesFromSitemap(website.id, pagesToUpdate);
    console.log(`Processed ${result.processedCount} pages for website ${website.id}`);

    // remove pages in database because were removed in sitemap
    if (removedUrls.length > 0) {
      await removePages(website.id, removedUrls.map(page => page.id));
    }

    // Update both last_sync and last_auto_index timestamps
    await updateWebsiteTimestamps(website.id, true, true);
    console.log('updateWebsiteTimestamps');

    // update the the Indexing Job completion
    await updateIndexingJob(job.job.id, { 
      status: 'completed', 
      processed_pages: processedPages 
    });
    console.log('updateIndexingJob');

    // Create email notification
    const submittedUrls = pagesToUpdate.filter(page => page.indexingStatus !== indexed).map(page => page.url);
    console.log('submittedUrls: ', submittedUrls);
    if (submittedUrls.length > 0) {
      await sendEmailNotification(website.id, website.user_id, cleanedDomain, 'job_complete', submittedUrls);
    }

  } catch (error) {
    console.error(`Error processing website ${website.domain}:`, error);
    // Send an email notification for failed indexing
    await sendEmailNotification(website.id, website.user_id, website.domain, 'job_failed', []);
    throw error;
  }
}
