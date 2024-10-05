import fs from 'fs';
import path from 'path';
import pool from '@/lib/db';

export async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).sort();

  for (const file of migrationFiles) {
    const migration = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      await pool.query(migration);
      console.log(`Ran migration: ${file}`);
    } catch (error) {
      console.error(`Error running migration ${file}:`, error);
      throw error;
    }
  }
}