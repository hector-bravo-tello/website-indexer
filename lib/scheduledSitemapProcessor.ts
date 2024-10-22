import { Website, Page } from '@/types';
import { 
  addOrUpdatePagesFromSitemap, 
  getPagesByWebsiteId,
  removePages,
  createIndexingJob,
  updateIndexingJob,
  createIndexingJobDetail,
  updateWebsiteTimestamps,
  createEmailNotification,
  getUserById
} from '@/models';
import { fetchBulkIndexingStatus, submitUrlForIndexing } from './googleSearchConsole';
import { fetchUrl, extractSitemapUrls, parseSitemap, filterSitemaps, cleanDomain } from './sitemapProcessor';
import { sendEmail, generateIndexingEmail } from '@/lib/emailService';
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
    const current_time = new Date().toISOString();
    for (const page of indexedPages) {
      if (page.indexingStatus !== indexed) {
        try {
          const response = await submitUrlForIndexing(website.domain, page.url);
          await createIndexingJobDetail({
            indexing_job_id: job.job.id,
            page_id: existingPages.find(p => p.url === page.url)?.id || 0,
            status: 'Submitted',
            response: JSON.stringify(response.data)
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
      lastSubmittedDate: page.indexingStatus !== indexed ? current_time : existingPages.find(p => p.url === page.url)?.last_submitted_date?.toISOString()
    }));

    // Update database with final indexing data
    await addOrUpdatePagesFromSitemap(website.id, pagesToUpdate);

    // remove pages in database because were removed in sitemap
    if (removedUrls.length > 0) {
      await removePages(website.id, removedUrls.map(page => page.id));
    }

    // Update both last_sync and last_auto_index timestamps
    await updateWebsiteTimestamps(website.id, true, true);

    // update the the Indexing Job completion
    await updateIndexingJob(job.job.id, { 
      status: 'completed', 
      processed_pages: processedPages 
    });

    // Create email notification
    const submittedUrls = pagesToUpdate.filter(page => page.indexingStatus === 'Submitted').map(page => page.url);
    if (submittedUrls.length > 0) {
      await sendEmailNotification(website.id, website.user_id, website.domain, 'job_complete', submittedUrls);
    }

  } catch (error) {
    console.error(`Error processing website ${website.domain}:`, error);
    // Send an email notification for failed indexing
    await sendEmailNotification(website.id, website.user_id, website.domain, 'job_failed', []);
    throw error;
  }
}

async function sendEmailNotification(websiteId: number, userId: number, domain: string, type: 'job_complete' | 'job_failed', submittedUrls: string[]) {
  try {
    // generate the email body
    const content = generateIndexingEmail(domain, submittedUrls);
    
    const { user } = await getUserById(userId);
    if (user && user.email) {
      // send the email
      await sendEmail({
        to: user.email,
        subject: `Indexing ${type === 'job_complete' ? 'Completed' : 'Failed'} for ${domain}`,
        html: content,
      });
      console.log(`Email notification sent to ${user.email} for website ${domain}`);

    // add a record to the email_notifications table in database
    await createEmailNotification({
      user_id: userId,
      website_id: websiteId,
      type,
      content
    });

    } else {
      console.error(`User email not found for user ID ${userId}`);
    }

  } catch (error) {
    console.error(`Error sending email notification for website ${domain}:`, error);
  }
}