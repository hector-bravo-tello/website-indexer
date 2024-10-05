// lib/scheduler.ts
import cron from 'node-cron';
import jobQueue from './jobQueue';
import { getWebsitesForIndexing } from '@/models';

export function scheduleIndexingJobs() {
  // Run every day at midnight or adjust the cron schedule as per your need
  cron.schedule('0 0 * * *', async () => {
    try {
      const websites = await getWebsitesForIndexing();
      
      for (const website of websites) {
        // Enqueue website processing as a background job
        await jobQueue.addJob({
          type: 'processWebsite',
          data: { websiteId: website.id }
        });
      }
    } catch (error) {
      console.error('Error in scheduled indexing job:', error);
    }
  });
}
