import { Pool } from 'pg';
import CONFIG from '@/config';

const pool = new Pool({
  connectionString: CONFIG.database.url,
  ssl: CONFIG.node.environment === 'production' ? { rejectUnauthorized: false } : false
});

export default pool;