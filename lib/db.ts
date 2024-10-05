import { Pool } from 'pg';
import CONFIG from '@/config';

const pool = new Pool({
  host: CONFIG.database.host,
  port: CONFIG.database.port,
  database: CONFIG.database.name,
  user: CONFIG.database.user,
  password: CONFIG.database.password,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default pool;