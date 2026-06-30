import { Database } from "bun:sqlite";
import type { CacheStorage } from "./cache-storage";

type CacheRow = {
  value: string;
};

export class SqliteCacheStorage implements CacheStorage {
  private readonly db: Database;

  constructor(filename: string = "figma-cache.sqlite") {
    this.db = new Database(filename);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }

  async get(key: string): Promise<string | undefined> {
    const row = this.db
      .query("SELECT value FROM cache WHERE key = ?")
      .get(key) as CacheRow | null;

    return row?.value;
  }

  async set(key: string, value: string): Promise<void> {
    this.db
      .query("INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)")
      .run(key, value);
  }

  close(): void {
    this.db.close();
  }
}
