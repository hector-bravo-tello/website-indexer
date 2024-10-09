import { Website, Page, IndexingStatus } from '@/types';
import { 
  getWebsitesForIndexing, 
  addOrUpdatePagesFromSitemap, 
  getPagesByWebsiteId,
  removePages,
  createIndexingJob,
  updateIndexingJob,
  createIndexingJobDetail,
  updateIndexingJobDetail
} from '@/models';
import { fetchBulkIndexingStatus, submitUrlForIndexing } from './googleSearchConsole';
import { getValidAccessToken } from '@/lib/tokenManager';
import { fetchUrl, extractSitemapUrls, parseSitemap } from './sitemapProcessor';

const indexed: string = 'Submitted and indexed';

export async function processWebsiteForScheduledJob(website: Website): Promise<void> {
  try {
    const job = await createIndexingJob({ website_id: website.id, status: 'in_progress', total_pages: 0 });
    const accessToken = await getValidAccessToken(website.user_id);

    const robotsTxtUrl = `https://${website.domain}/robots.txt`;
    const robotsTxtContent = await fetchUrl(robotsTxtUrl);
    const sitemapUrls = extractSitemapUrls(robotsTxtContent);

    let allPages: Page[] = [];
    for (const sitemapUrl of sitemapUrls) {
      const sitemapContent = await fetchUrl(sitemapUrl);
      const pages = await parseSitemap(sitemapContent);
      allPages = allPages.concat(pages);
    }

    const { pages: existingPages } = await getPagesByWebsiteId(website.id, true);
    const existingUrls = new Set(existingPages.map(page => page.url));
    const currentUrls = new Set(allPages.map(page => page.url));

    const newUrls = allPages.filter(page => !existingUrls.has(page.url));
    const removedUrls = existingPages.filter(page => !currentUrls.has(page.url));
    const unchangedUrls = allPages.filter(page => existingUrls.has(page.url));

    const urlsToCheck = [...newUrls, ...unchangedUrls].map(page => page.url);
    const indexingStatuses = await fetchBulkIndexingStatus(website.id, website.domain, accessToken, urlsToCheck);

    const pagesToUpdate = indexingStatuses.map(status => ({
      url: status.url,
      indexingStatus: status.indexingStatus,
      lastIndexedDate: status.lastIndexedDate
    }));

    await addOrUpdatePagesFromSitemap(website.id, pagesToUpdate);

    for (const page of pagesToUpdate) {
      if (page.indexingStatus !== indexed) {
        await submitUrlForIndexing(website.domain, page.url, accessToken);
        await createIndexingJobDetail({
          indexing_job_id: job.job.id,
          page_id: existingPages.find(p => p.url === page.url)?.id || 0,
          status: 'pending'
        });
      }
    }

    if (removedUrls.length > 0) {
      await removePages(website.id, removedUrls.map(page => page.id));
    }

    await updateIndexingJob(job.job.id, { 
      status: 'completed', 
      processed_pages: pagesToUpdate.length 
    });

  } catch (error) {
    console.error(`Error processing website ${website.domain}:`, error);
    throw error;
  }
}