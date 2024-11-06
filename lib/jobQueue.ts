import { processSingleWebsite, processWebsiteForScheduledJob } from '@/lib/sitemapProcessor';
import { getWebsiteById } from '@/models';

interface Job {
  websiteId: number;
  type: 'ui' | 'scheduled';
}

class JobQueue {
  private queue: Job[] = [];
  private isProcessing: boolean = false;

  async addJob(websiteId: number, type: 'ui' | 'scheduled'): Promise<void> {
    if (typeof websiteId !== 'number') {
      throw new Error('Invalid websiteId: must be a number');
    }
    this.queue.push({ websiteId, type });
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
    const job = this.queue.shift();

    if (job) {
      try {
        const { website } = await getWebsiteById(job.websiteId);
        if (website) {
          if (job.type === 'ui') {
            await processSingleWebsite(website);
          } else if (job.type === 'scheduled') {
            await processWebsiteForScheduledJob(website);
          }
        } else {
          console.error(`Website with id ${job.websiteId} not found`);
        }
      } catch (error) {
        console.error(`Error processing website ${job.websiteId}:`, error);
      }
    }

    setImmediate(() => this.processNextJob());
  }
}

const jobQueue = new JobQueue();

export default jobQueue;