// lib/jobQueue.ts

import { processSingleWebsite } from '@/lib/sitemapProcessor';
import { getWebsiteById } from '@/models';

class JobQueue {
  private queue: number[] = [];
  private isProcessing: boolean = false;

  async addJob(websiteId: number): Promise<void> {
    if (typeof websiteId !== 'number') {
      throw new Error('Invalid websiteId: must be a number');
    }
    this.queue.push(websiteId);
    if (!this.isProcessing) {
      this.processNextJob();
    }
  }

  private async processNextJob(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const websiteId = this.queue.shift();

    if (websiteId !== undefined) {
      try {
        const { website } = await getWebsiteById(websiteId);
        if (website) {
          await processSingleWebsite(website);
        } else {
          console.error(`Website with id ${websiteId} not found`);
        }
      } catch (error) {
        console.error(`Error processing website ${websiteId}:`, error);
      }
    }

    setImmediate(() => this.processNextJob());
  }
}

const jobQueue = new JobQueue();

export default jobQueue;