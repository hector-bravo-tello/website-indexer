// File: models/index.ts

import pool from '@/lib/db';
import { User, Website, Page, IndexingJob, IndexingJobDetail, IndexingStatus, IndexingStatsData } from '@/types';
import { DatabaseError } from '@/utils/errors';

// Helper function to handle database errors
function handleDatabaseError(error: any): never {
  console.error('Database error:', error);
  if (error.code === '23505') { // unique_violation
    throw new DatabaseError('Duplicate entry', 409);
  } else if (error.code === '23503') { // foreign_key_violation
    throw new DatabaseError('Related resource not found', 404);
  } else {
    throw new DatabaseError('Database error occurred', 500);
  }
}

export async function getUserByEmail(email: string): Promise<{ user: User | null, statusCode: number }> {
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return { user: result.rows[0] || null, statusCode: result.rows[0] ? 200 : 404 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function createUser(user: Partial<User>): Promise<{ user: User, statusCode: number }> {
  try {
    const { name, email, google_id, access_token, refresh_token, expires_at } = user;
    const query = 'INSERT INTO users (name, email, google_id, access_token, refresh_token, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const result = await pool.query(query, [name, email, google_id, access_token, refresh_token, expires_at]);
    return { user: result.rows[0], statusCode: 201 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function updateUser(id: number, user: Partial<User>): Promise<{ user: User, statusCode: number }> {
  try {
    const { name, google_id, access_token, refresh_token, expires_at } = user;
    const query = 'UPDATE users SET name = COALESCE($1, name), google_id = COALESCE($2, google_id), access_token = COALESCE($3, access_token), refresh_token = COALESCE($4, refresh_token), expires_at = COALESCE($5, expires_at), updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *';
    const result = await pool.query(query, [name, google_id, access_token, refresh_token, expires_at, id]);
    if (result.rowCount === 0) {
      throw new DatabaseError('User not found', 404);
    }
    return { user: result.rows[0], statusCode: 200 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function updateUserTokens(userId: number, accessToken: string | null, refreshToken: string | null, expiresAt: string | null): Promise<void> {
  try {
    const query = `
      UPDATE users
      SET access_token = COALESCE($1, access_token),
          refresh_token = COALESCE($2, refresh_token),
          expires_at = COALESCE($3, expires_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `;
    await pool.query(query, [accessToken, refreshToken, expiresAt, userId]);
  } catch (error) {
    console.error('Error updating user tokens:', error);
    throw error;
  }
}

export async function getUserTokens(userId: number): Promise<{ accessToken: string, refreshToken: string, expiresAt: string } | null> {
  try {
    const query = 'SELECT access_token, refresh_token, expires_at FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    if (result.rows.length > 0) {
      return {
        accessToken: result.rows[0].access_token,
        refreshToken: result.rows[0].refresh_token,
        expiresAt: result.rows[0].expires_at
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user tokens:', error);
    throw error;
  }
}

export async function getWebsitesByUserId(userId: number): Promise<{ websites: Website[], statusCode: number }> {
  try {
    const query = 'SELECT * FROM websites WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return { websites: result.rows, statusCode: 200 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function getWebsiteById(id: number): Promise<{ website: Website | null, statusCode: number }> {
  try {
    const query = 'SELECT * FROM websites WHERE id = $1';
    const result = await pool.query(query, [id]);
    return { website: result.rows[0] || null, statusCode: result.rows[0] ? 200 : 404 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function getIndexingStatsByWebsiteId(id: number): Promise<{ indexingStats: IndexingStatsData | null, statusCode: number}> {
  try {
    const query = 'SELECT * FROM get_indexing_stats($1)';
    const result = await pool.query(query, [id]);
    return { indexingStats: result.rows[0] || null, statusCode: result.rows[0] ? 200 : 404 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function getWebsitesForIndexing(): Promise<{ websites: Website[], statusCode: number }> {
  try {
    const query = `
      SELECT * FROM websites 
      WHERE indexing_enabled = true 
      AND (last_robots_scan IS NULL OR last_robots_scan < NOW() - INTERVAL '1 day')
    `;
    const result = await pool.query(query);
    return { websites: result.rows, statusCode: 200 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function createWebsite(website: Partial<Website>): Promise<{ website: Website, statusCode: number }> {
  try {
    const { user_id, domain, indexing_enabled, ga4_property_id, ga4_data_stream_id } = website;
    const query = 'INSERT INTO websites (user_id, domain, indexing_enabled, ga4_property_id, ga4_data_stream_id) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const result = await pool.query(query, [user_id, domain, indexing_enabled, ga4_property_id, ga4_data_stream_id]);
    return { website: result.rows[0], statusCode: 201 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function updateWebsite(id: number, website: Partial<Website>): Promise<{ website: Website, statusCode: number }> {
  try {
    const { domain, indexing_enabled, ga4_property_id, ga4_data_stream_id } = website;
    const query = `
      UPDATE websites 
      SET domain = COALESCE($1, domain), 
          indexing_enabled = COALESCE($2, indexing_enabled),
          ga4_property_id = COALESCE($3, ga4_property_id),
          ga4_data_stream_id = COALESCE($4, ga4_data_stream_id),
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $5 
      RETURNING *
    `;
    const result = await pool.query(query, [domain, indexing_enabled, ga4_property_id, ga4_data_stream_id, id]);
    if (result.rowCount === 0) {
      throw new DatabaseError('Website not found', 404);
    }
    return { website: result.rows[0], statusCode: 200 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function updateWebsiteRobotsScan(id: number): Promise<{ statusCode: number }> {
  try {
    const query = 'SELECT update_website_robots_scan($1)';
    await pool.query(query, [id]);
    return { statusCode: 200 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function getPagesByWebsiteId(
  websiteId: number, 
  all: boolean = false,
  page: number = 0, 
  pageSize: number = 25, 
  orderBy: string = 'url', 
  order: 'asc' | 'desc' = 'asc'
): Promise<{ pages: Page[], totalCount: number, statusCode: number }> {
  try {
    let query: string;
    let countQuery: string;
    let queryParams: any[];

    if (all) {
      query = 'SELECT * FROM pages WHERE website_id = $1';
      countQuery = 'SELECT COUNT(*) FROM pages WHERE website_id = $1';
      queryParams = [websiteId];
    } else {
      const offset = page * pageSize;
      query = `
        SELECT * FROM pages 
        WHERE website_id = $1 
        ORDER BY ${orderBy} ${order}
        LIMIT $2 OFFSET $3
      `;
      countQuery = 'SELECT COUNT(*) FROM pages WHERE website_id = $1';
      queryParams = [websiteId, pageSize, offset];
    }
    
    const [result, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, [websiteId])
    ]);

    return { 
      pages: result.rows, 
      totalCount: parseInt(countResult.rows[0].count), 
      statusCode: 200 
    };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function getPageById(id: number): Promise<{ page: Page | null, statusCode: number }> {
  try {
    const query = 'SELECT * FROM pages WHERE id = $1';
    const result = await pool.query(query, [id]);
    return { page: result.rows[0] || null, statusCode: result.rows[0] ? 200 : 404 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function createPage(page: Partial<Page>): Promise<{ page: Page, statusCode: number }> {
  try {
    const { website_id, url } = page;
    const query = 'INSERT INTO pages (website_id, url) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(query, [website_id, url]);
    return { page: result.rows[0], statusCode: 201 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function updatePageData(websiteId: number, url: string, indexingStatus: string, lastIndexed: Date | null): Promise<void> {
  try {
    const query = `
      UPDATE pages
      SET indexing_status = $1,
          last_indexed_date = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE website_id = $3 AND url = $4
    `;
    await pool.query(query, [indexingStatus, lastIndexed, websiteId, url]);
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function addOrUpdatePagesFromSitemap(websiteId: number, pages: { url: string, lastIndexedDate?: string | null, indexingStatus?: IndexingStatus }[]
): Promise<{ statusCode: number }> {
  try {
    const query = 'SELECT bulk_upsert_pages($1, $2)';
    await pool.query(query, [websiteId, JSON.stringify(pages)]);
    return { statusCode: 200 };

  } catch (error) {
    console.error('Error in addOrUpdatePagesFromSitemap:', error);
    throw error;
  }
}

export async function removePages(websiteId: number, pageIds: number[]): Promise<{ statusCode: number }> {
  try {
    const query = `
      DELETE FROM pages
      WHERE website_id = $1 AND id = ANY($2::int[])
    `;
    await pool.query(query, [websiteId, pageIds]);
    return { statusCode: 200 };
  } catch (error) {
    console.error('Error removing pages:', error);
    handleDatabaseError(error);
  }
}

export async function getPagesForIndexing(websiteId: number, limit: number): Promise<{ pages: Page[], statusCode: number }> {
  try {
    const query = 'SELECT * FROM get_pages_for_indexing($1, $2)';
    const result = await pool.query(query, [websiteId, limit]);
    return { pages: result.rows, statusCode: 200 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function createIndexingJob(job: Partial<IndexingJob>): Promise<{ job: IndexingJob, statusCode: number }> {
  try {
    const { website_id, status, total_pages } = job;
    const query = 'INSERT INTO indexing_jobs (website_id, status, started_at, total_pages, processed_pages) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 0) RETURNING *';
    const result = await pool.query(query, [website_id, status, total_pages]);
    return { job: result.rows[0], statusCode: 201 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function updateIndexingJob(id: number, job: Partial<IndexingJob>): Promise<{ job: IndexingJob, statusCode: number }> {
  try {
    const { status, processed_pages } = job;
    const query = 'UPDATE indexing_jobs SET status = COALESCE($1, status), processed_pages = COALESCE($2, processed_pages), completed_at = CASE WHEN $1 = \'completed\' THEN CURRENT_TIMESTAMP ELSE completed_at END, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *';
    const result = await pool.query(query, [status, processed_pages, id]);
    if (result.rowCount === 0) {
      throw new DatabaseError('Indexing job not found', 404);
    }
    return { job: result.rows[0], statusCode: 200 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function createIndexingJobDetail(detail: Partial<IndexingJobDetail>): Promise<{ detail: IndexingJobDetail, statusCode: number }> {
  try {
    const { indexing_job_id, page_id, status } = detail;
    const query = 'INSERT INTO indexing_job_details (indexing_job_id, page_id, status, submitted_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *';
    const result = await pool.query(query, [indexing_job_id, page_id, status]);
    return { detail: result.rows[0], statusCode: 201 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function updateIndexingJobDetail(id: number, detail: Partial<IndexingJobDetail>): Promise<{ detail: IndexingJobDetail, statusCode: number }> {
  try {
    const { status, response } = detail;
    const query = 'SELECT * FROM update_indexing_job_detail_status($1, $2, $3)';
    const result = await pool.query(query, [id, status, response]);
    if (result.rowCount === 0) {
      throw new DatabaseError('Indexing job detail not found', 404);
    }
    return { detail: result.rows[0], statusCode: 200 };
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function createEmailNotification(notification: Partial<EmailNotification>): Promise<{ notification: EmailNotification, statusCode: number }> {
  try {
    const { user_id, website_id, type, content } = notification;
    const query = 'SELECT * FROM create_email_notification($1, $2, $3, $4)';
    const result = await pool.query(query, [user_id, website_id, type, content]);
    return { notification: result.rows[0], statusCode: 201 };
  } catch (error) {
    handleDatabaseError(error);
  }
}
