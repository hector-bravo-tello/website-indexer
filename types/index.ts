// File: types/index.ts

export interface UserTokens {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  google_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
  
export interface Website {
  id: number;
  user_id: number;
  domain: string;
  last_robots_scan: Date | null;
  indexing_enabled: boolean;
  ga4_property_id: string | null;
  ga4_data_stream_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Page {
  id: number;
  website_id: number;
  url: string;
  last_sitemap_check: Date | null;
  last_indexed_date: Date | null;
  indexing_status: IndexingStatus;
  created_at: Date;
  updated_at: Date;
}
  
export type IndexingStatus = 'not_indexed' | 'pending' | 'indexed' | 'failed';

export interface IndexingJob {
  id: number;
  website_id: number;
  status: JobStatus;
  started_at: Date | null;
  completed_at: Date | null;
  total_pages: number;
  processed_pages: number;
  created_at: Date;
  updated_at: Date;
}

export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface IndexingJobDetail {
  id: number;
  indexing_job_id: number;
  page_id: number;
  status: IndexingStatus;
  submitted_at: Date | null;
  response: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EmailNotification {
  id: number;
  user_id: number;
  website_id: number;
  type: NotificationType;
  content: string;
  sent_at: Date | null;
  created_at: Date;
}

export type NotificationType = 'indexing_complete' | 'indexing_failed' | 'new_page_found';

export interface IndexingStatsData {
  total_pages: number;
  indexed_pages: number;
  not_indexed_pages: number;
}