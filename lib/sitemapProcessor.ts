import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import jobQueue from '@/lib/jobQueue';
import { 
  getWebsitesForIndexing, 
  addOrUpdatePagesFromSitemap, 
  updateWebsiteRobotsScan, 
  getWebsiteById 
} from '@/models';
import { Website } from '@/types';
import { ValidationError } from '@/utils/errors';

const parseXml = promisify(parseString);

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
    const robotsTxtUrl = `https://${website.domain}/robots.txt`;
    const robotsTxtContent = await fetchUrl(robotsTxtUrl);
    const allSitemapUrls = extractSitemapUrls(robotsTxtContent);
    const filteredSitemapUrls = filterSitemaps(allSitemapUrls);

    let totalPages = 0;
    for (const sitemapUrl of filteredSitemapUrls) {
      const pageCount = await processSitemap(website.id, sitemapUrl);
      totalPages += pageCount;
    }

    console.log(`Processed ${totalPages} pages for ${website.domain}`);
    await updateWebsiteRobotsScan(website.id);
  } catch (error) {
    console.error(`Error processing website ${website.domain}:`, error);
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

// Function to process a single sitemap and extract URLs
async function processSitemap(websiteId: number, sitemapUrl: string): Promise<number> {
  try {
    const sitemapContent = await fetchUrl(sitemapUrl);
    const pages = await parseSitemap(sitemapContent);
    await addOrUpdatePagesFromSitemap(websiteId, pages);
    return pages.length;
  } catch (error) {
    console.error(`Error processing sitemap ${sitemapUrl}:`, error);
    return 0;
  }
}

// Function to parse the sitemap XML and extract URLs
async function parseSitemap(sitemapContent: string): Promise<{ url: string }[]> {
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
async function fetchAndParseSitemap(sitemapUrl: string): Promise<{ url: string }[]> {
  const sitemapContent = await fetchUrl(sitemapUrl);
  return parseSitemap(sitemapContent);
}

// Function to fetch URL content (robots.txt, sitemap.xml, etc.)
async function fetchUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    throw new ValidationError(`Failed to fetch URL: ${url}`);
  }
}

// Function to extract sitemap URLs from robots.txt
function extractSitemapUrls(robotsTxtContent: string): string[] {
  const lines = robotsTxtContent.split('\n');
  return lines
    .filter(line => line.toLowerCase().startsWith('sitemap:'))
    .map(line => line.split(': ')[1].trim());
}
