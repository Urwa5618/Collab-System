import { promises as fs } from "fs";
import path from "path";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl
});

const migrationsDir = path.join(__dirname, "migrations");

const ensureMigrationsTable = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW()
  )`);
};

const migrationAlreadyRun = async (filename: string) => {
  const result = await pool.query(
    "SELECT 1 FROM migrations WHERE filename = $1",
    [filename]
  );

    return result.rows.length > 0;
};

const recordMigration = async (filename: string) => {
  await pool.query("INSERT INTO migrations (filename) VALUES ($1)", [filename]);
};

const runMigrations = async () => {
  await ensureMigrationsTable();

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const alreadyRun = await migrationAlreadyRun(file);

    if (alreadyRun) {
      console.log(`Skipping migration: ${file} (already run)`);
      continue;
    }

    console.log(`Running migration: ${file}`);
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf-8");
    await pool.query(sql);
    await recordMigration(file);
  }

  console.log("All migrations complete");
};

const run = async () => {
  try {
    await runMigrations();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }

  if (process.exitCode === 1) {
    process.exit(1);
  }
};

void run();
