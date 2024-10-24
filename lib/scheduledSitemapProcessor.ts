import { Website, Page } from '@/types';
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
import { fetchUrl, extractSitemapUrls, parseSitemap, filterSitemaps, cleanDomain, findAccessibleSitemap } from './sitemapProcessor';
import { sendEmailNotification } from '@/lib/emailService';
import { ValidationError } from '@/utils/errors';
import { promisify } from 'util';

const delay = promisify(setTimeout);
const indexed: string = 'Submitted and indexed';

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
