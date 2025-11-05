// db.js
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'github_data',
  max: 10,
});

export async function ensureSchema() {
  const schema = fs.readFileSync('./schema.sql', 'utf8');
  await pool.query(schema);
}

export async function upsertRepos(repos) {
  if (!repos || repos.length === 0) return;
  // repos: [{repo_node_id, repo_db_id, name, owner, stars, url}]
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // We'll build a single INSERT ... ON CONFLICT statement with VALUES
    const values = [];
    const placeholders = repos.map((r, i) => {
      const idx = i * 6;
      values.push(r.repo_node_id, r.repo_db_id || null, r.name, r.owner, r.stars ?? 0, r.url);
      return `($${idx+1}, $${idx+2}, $${idx+3}, $${idx+4}, $${idx+5}, $${idx+6})`;
    }).join(', ');

    const sql = `
      INSERT INTO repositories (repo_node_id, repo_db_id, name, owner, stars, url)
      VALUES ${placeholders}
      ON CONFLICT (repo_node_id)
      DO UPDATE SET
        repo_db_id = EXCLUDED.repo_db_id,
        name = EXCLUDED.name,
        owner = EXCLUDED.owner,
        stars = EXCLUDED.stars,
        url = EXCLUDED.url,
        updated_at = now()
    `;
    await client.query(sql, values);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}

export default pool;
