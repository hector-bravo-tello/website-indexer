-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create websites table
CREATE TABLE websites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    is_owner BOOLEAN DEFAULT NULL,
    last_sync TIMESTAMP WITH TIME ZONE,
    last_auto_index TIMESTAMP WITH TIME ZONE,
    enabled BOOLEAN DEFAULT false,
    auto_indexing_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pages table
CREATE TABLE pages (
    id SERIAL PRIMARY KEY,
    website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    url VARCHAR(2048) NOT NULL,
    last_sitemap_check TIMESTAMP WITH TIME ZONE,
    last_crawled_date TIMESTAMP WITH TIME ZONE,
    last_submitted_date TIMESTAMP WITH TIME ZONE,
    indexing_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_website_url UNIQUE (website_id, url)
);

-- Create indexing_jobs table
CREATE TABLE indexing_jobs (
    id SERIAL PRIMARY KEY,
    website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_pages INTEGER,
    processed_pages INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexing_job_details table
CREATE TABLE indexing_job_details (
    id SERIAL PRIMARY KEY,
    indexing_job_id INTEGER REFERENCES indexing_jobs(id) ON DELETE CASCADE,
    page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create email_notifications table
CREATE TABLE email_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    content TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_websites_last_sync ON websites(last_sync);
CREATE INDEX idx_websites_last_auto_index ON websites(last_auto_index);
CREATE INDEX idx_pages_website_id ON pages(website_id);
CREATE INDEX idx_pages_indexing_status ON pages(indexing_status);
CREATE INDEX idx_website_indexing_status ON pages (website_id, indexing_status);
CREATE INDEX idx_pages_last_sitemap_check ON pages(last_sitemap_check);
CREATE INDEX idx_indexing_jobs_website_id ON indexing_jobs(website_id);
CREATE INDEX idx_indexing_jobs_status ON indexing_jobs(status);
CREATE INDEX idx_indexing_job_details_indexing_job_id ON indexing_job_details(indexing_job_id);
CREATE INDEX idx_indexing_job_details_page_id ON indexing_job_details(page_id);
CREATE INDEX idx_indexing_job_details_status ON indexing_job_details(status);
CREATE INDEX idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX idx_email_notifications_website_id ON email_notifications(website_id);

-- Create function to get pages for indexing
CREATE OR REPLACE FUNCTION get_pages_for_indexing(
    p_website_id INTEGER,
    p_limit INTEGER
)
RETURNS TABLE (
    page_id INTEGER,
    url VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT id, url
    FROM pages
    WHERE website_id = p_website_id
      AND (indexing_status IS NULL OR indexing_status <> 'Submitted and indexed')
      AND (last_sitemap_check IS NULL OR last_sitemap_check < NOW() - INTERVAL '21 hours')
      AND NOT EXISTS (
          SELECT 1
          FROM indexing_job_details
          WHERE indexing_job_details.page_id = pages.id
            AND indexing_job_details.status = 'pending'
      )
    ORDER BY last_sitemap_check ASC NULLS FIRST, last_crawled_date ASC NULLS FIRST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create combined update function for both timestamps
CREATE OR REPLACE FUNCTION update_website_timestamps(
    p_website_id INTEGER,
    p_update_sync BOOLEAN DEFAULT false,
    p_update_auto_index BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
BEGIN
    UPDATE websites
    SET last_sync = CASE WHEN p_update_sync THEN CURRENT_TIMESTAMP ELSE last_sync END,
        last_auto_index = CASE WHEN p_update_auto_index THEN CURRENT_TIMESTAMP ELSE last_auto_index END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_website_id;
END;
$$ LANGUAGE plpgsql;

-- Add or update pages
CREATE OR REPLACE FUNCTION bulk_upsert_pages(
  p_website_id INT,
  p_pages JSONB
) RETURNS VOID AS $$
DECLARE
  v_page JSONB;
BEGIN
  FOR v_page IN SELECT * FROM jsonb_array_elements(p_pages)
  LOOP
    INSERT INTO pages (
      website_id, 
      url, 
      last_crawled_date, 
      indexing_status, 
      last_sitemap_check,
      last_submitted_date
    ) VALUES (
      p_website_id,
      v_page->>'url',
      (v_page->>'lastCrawledDate')::TIMESTAMP WITH TIME ZONE,
      v_page->>'indexingStatus',
      CURRENT_TIMESTAMP,
      (v_page->>'lastSubmittedDate')::TIMESTAMP WITH TIME ZONE
    )
    ON CONFLICT (website_id, url) 
    DO UPDATE SET 
      last_crawled_date = COALESCE(
        (v_page->>'lastCrawledDate')::TIMESTAMP WITH TIME ZONE,
        pages.last_crawled_date
      ),
      indexing_status = COALESCE(
        v_page->>'indexingStatus',
        pages.indexing_status
      ),
      last_sitemap_check = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP,
      last_submitted_date = COALESCE(
        (v_page->>'lastSubmittedDate')::TIMESTAMP WITH TIME ZONE,
        pages.last_submitted_date
      );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to update indexing job detail status
CREATE OR REPLACE FUNCTION update_indexing_job_detail_status(
    p_job_detail_id INTEGER,
    p_status VARCHAR,
    p_response TEXT
)
RETURNS VOID AS $$
DECLARE
    v_job_id INTEGER;
BEGIN
    -- Update the indexing job detail
    UPDATE indexing_job_details
    SET status = p_status,
        response = p_response,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_job_detail_id
    RETURNING indexing_job_id INTO v_job_id;

    -- Update the corresponding page
    IF p_status = 'completed' THEN
        UPDATE pages
        SET indexing_status = 'Submitted',
            last_indexed_date = CURRENT_TIMESTAMP
        WHERE id = (SELECT page_id FROM indexing_job_details WHERE id = p_job_detail_id);
    ELSIF p_status = 'failed' THEN
        UPDATE pages
        SET indexing_status = 'Failed'
        WHERE id = (SELECT page_id FROM indexing_job_details WHERE id = p_job_detail_id);
    END IF;

    -- Update the master indexing job
    UPDATE indexing_jobs
    SET processed_pages = processed_pages + 1,
        status = CASE 
            WHEN processed_pages + 1 = total_pages THEN 'completed'
            ELSE status
        END,
        completed_at = CASE 
            WHEN processed_pages + 1 = total_pages THEN CURRENT_TIMESTAMP
            ELSE completed_at
        END
    WHERE id = v_job_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_indexing_stats(input_website_id INT)
RETURNS TABLE (
    total_pages BIGINT,
    indexed_pages BIGINT,
    not_indexed_pages BIGINT,
    last_sync TIMESTAMP WITH TIME ZONE,
    last_auto_index TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(COUNT(p.id), 0) AS total_pages,
        COALESCE(SUM(CASE WHEN p.indexing_status = 'Submitted and indexed' THEN 1 ELSE 0 END), 0) AS indexed_pages,
        COALESCE(SUM(CASE WHEN p.indexing_status <> 'Submitted and indexed' THEN 1 ELSE 0 END), 0) AS not_indexed_pages,
        w.last_sync,
        w.last_auto_index
    FROM websites w
    LEFT JOIN pages p ON w.id = p.website_id
    WHERE w.id = input_website_id
    GROUP BY w.id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_websites_for_auto_indexing()
RETURNS TABLE (
    id INTEGER,
    user_id INTEGER,
    domain VARCHAR,
    enabled BOOLEAN,
    auto_indexing_enabled BOOLEAN,
    is_owner BOOLEAN,
    last_sync TIMESTAMP WITH TIME ZONE,
    last_auto_index TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT w.*
    FROM websites w
    WHERE w.enabled = true 
    AND w.auto_indexing_enabled = true
    AND w.is_owner = true
    AND (w.last_auto_index IS NULL OR w.last_auto_index < NOW() - INTERVAL '21 hours');
END;
$$ LANGUAGE plpgsql;
