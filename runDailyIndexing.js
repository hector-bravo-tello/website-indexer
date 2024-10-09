require('dotenv').config();
const { Pool } = require('pg');
const { getWebsitesForIndexing } = require('@/models');
const { processWebsiteForScheduledJob } = require('@/lib/scheduledSitemapProcessor');
const CONFIG = require('@/config');

const pool = new Pool({
  host: CONFIG.database.host,
  port: CONFIG.database.port,
  database: CONFIG.database.name,
  user: CONFIG.database.user,
  password: CONFIG.database.password,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runDailyIndexing() {
  console.log('Starting daily indexing job');
  try {
    // Get all websites that need indexing
    const { websites } = await getWebsitesForIndexing();

    console.log(`Found ${websites.length} websites to process`);

    // Process each website
    for (const website of websites) {
      try {
        console.log(`Processing website: ${website.domain}`);
        await processWebsiteForScheduledJob(website);
        console.log(`Finished processing website: ${website.domain}`);
      } catch (error) {
        console.error(`Error processing website ${website.domain}:`, error);
        // Continue with the next website
      }
    }

    console.log('Daily indexing job completed');
  } catch (error) {
    console.error('Error in daily indexing job:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the job
runDailyIndexing().catch(console.error);