import { Website, Page } from '@/types';
import { 
  addOrUpdatePagesFromSitemap, 
  getPagesByWebsiteId,
  removePages,
  createIndexingJob,
  updateIndexingJob,
  createIndexingJobDetail,
  updateWebsiteRobotsScan
} from '@/models';
import { fetchBulkIndexingStatus, submitUrlForIndexing } from './googleSearchConsole';
import { fetchUrl, extractSitemapUrls, parseSitemap, filterSitemaps, cleanDomain } from './sitemapProcessor';
import { promisify } from 'util';

const delay = promisify(setTimeout);
const indexed: string = 'Submitted and indexed';

export async function processWebsiteForScheduledJob(website: Website): Promise<void> {
  try {
    const cleanedDomain = cleanDomain(website.domain);
    const robotsTxtUrl = `https://${cleanedDomain}/robots.txt`;
    const robotsTxtContent = await fetchUrl(robotsTxtUrl);
    const allSitemapUrls = extractSitemapUrls(robotsTxtContent);
    const filteredSitemapUrls = filterSitemaps(allSitemapUrls);

    // get all pages from sitemaps
    let allPages: Pick<Page, 'url'>[] = [];
    for (const sitemapUrl of filteredSitemapUrls) {
      const sitemapContent = await fetchUrl(sitemapUrl);
      const pages = await parseSitemap(sitemapContent);
      allPages = allPages.concat(pages);
    }

    // create indexing job in database when starting
    const job = await createIndexingJob({ website_id: website.id, status: 'in_progress', total_pages: allPages.length });

    // get websites pages from database
    const { pages: existingPages } = await getPagesByWebsiteId(website.id, true);
    const existingUrls = new Set(existingPages.map(page => page.url));

    // website pages from sitemaps
    const currentUrls = new Set(allPages.map(page => page.url));

    // get new, removed and unchanged urls
    const newUrls = allPages.filter(page => !existingUrls.has(page.url));
    const removedUrls = existingPages.filter(page => !currentUrls.has(page.url));
    const unchangedUrls = allPages.filter(page => existingUrls.has(page.url));

    // get indexing data before submitting non-indexed pages
    const urlsToCheck = [...newUrls, ...unchangedUrls].map(page => page.url);
    let indexedPages = await fetchBulkIndexingStatus(website.id, urlsToCheck);

    // Submit non-indexed pages
    let processedPages = 0;
    const current_time = Date.now();
    for (const page of indexedPages) {
      if (page.indexingStatus !== indexed) {
        try {
          const response = await submitUrlForIndexing(website.domain, page.url);
          await createIndexingJobDetail({
            indexing_job_id: job.job.id,
            page_id: existingPages.find(p => p.url === page.url)?.id || 0,
            status: 'Submitted',
            response: JSON.stringify(response)
          });
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

    const pagesToUpdate = indexedPages.map(page => ({
      url: page.url,
      indexingStatus: page.indexingStatus,
      lastCrawledDate: page.lastCrawledDate,
      lastSubmittedDate: current_time.toString()
    }));

    // Update database with final indexing data
    await addOrUpdatePagesFromSitemap(website.id, pagesToUpdate);

    // remove pages in database because were removed in sitemap
    if (removedUrls.length > 0) {
      await removePages(website.id, removedUrls.map(page => page.id));
    }

    // Update the last website scanned date
    await updateWebsiteRobotsScan(website.id);

    // update the the Indexing Job completion
    await updateIndexingJob(job.job.id, { 
      status: 'completed', 
      processed_pages: processedPages 
    });

  } catch (error) {
    console.error(`Error processing website ${website.domain}:`, error);
    throw error;
  }
}