import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Page, PageData, PageVersion } from "./types";

const MAX_VERSIONS_PER_PAGE = 50;

function createDb(): Database.Database {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "ourstory.db"));
  // Wait instead of throwing when parallel workers (next build) open the
  // file at the same time.
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      transition TEXT NOT NULL DEFAULT 'fade',
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS page_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id TEXT NOT NULL,
      data TEXT NOT NULL,
      saved_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_versions_page ON page_versions(page_id, id DESC);
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      mime TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

// Open lazily (not at module import) so build-time module evaluation never
// touches the file, and reuse one connection across dev hot-reloads.
const globalForDb = globalThis as unknown as { __ourstoryDb?: Database.Database };
function db(): Database.Database {
  return (globalForDb.__ourstoryDb ??= createDb());
}

interface PageRow {
  id: string;
  position: number;
  title: string;
  transition: string;
  data: string;
  updated_at: string;
}

function rowToPage(row: PageRow): Page {
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    transition: row.transition as Page["transition"],
    data: JSON.parse(row.data) as PageData,
    updatedAt: row.updated_at,
  };
}

export function listPages(): Page[] {
  const rows = db().prepare("SELECT * FROM pages ORDER BY position ASC").all() as PageRow[];
  return rows.map(rowToPage);
}

export function getPage(id: string): Page | null {
  const row = db().prepare("SELECT * FROM pages WHERE id = ?").get(id) as PageRow | undefined;
  return row ? rowToPage(row) : null;
}

export function createPage(page: { id: string; title: string; transition: string; data: PageData }): Page {
  const max = db().prepare("SELECT COALESCE(MAX(position), 0) AS m FROM pages").get() as { m: number };
  db().prepare(
    "INSERT INTO pages (id, position, title, transition, data) VALUES (?, ?, ?, ?, ?)"
  ).run(page.id, max.m + 1, page.title, page.transition, JSON.stringify(page.data));
  return getPage(page.id)!;
}

export function updatePage(
  id: string,
  fields: { title?: string; transition?: string; data?: PageData }
): Page | null {
  const existing = getPage(id);
  if (!existing) return null;

  if (fields.data !== undefined) {
    const json = JSON.stringify(fields.data);
    if (json !== JSON.stringify(existing.data)) {
      // Snapshot the *outgoing* state so history can always go back.
      recordVersion(id, existing.data);
    }
    db().prepare("UPDATE pages SET data = ?, updated_at = datetime('now') WHERE id = ?").run(json, id);
  }
  if (fields.title !== undefined) {
    db().prepare("UPDATE pages SET title = ?, updated_at = datetime('now') WHERE id = ?").run(fields.title, id);
  }
  if (fields.transition !== undefined) {
    db().prepare("UPDATE pages SET transition = ?, updated_at = datetime('now') WHERE id = ?").run(fields.transition, id);
  }
  return getPage(id);
}

export function deletePage(id: string): void {
  db().prepare("DELETE FROM pages WHERE id = ?").run(id);
  db().prepare("DELETE FROM page_versions WHERE page_id = ?").run(id);
}

export function reorderPages(ids: string[]): void {
  const stmt = db().prepare("UPDATE pages SET position = ? WHERE id = ?");
  const tx = db().transaction(() => {
    ids.forEach((id, i) => stmt.run(i + 1, id));
  });
  tx();
}

function recordVersion(pageId: string, data: PageData): void {
  db().prepare("INSERT INTO page_versions (page_id, data) VALUES (?, ?)").run(pageId, JSON.stringify(data));
  db().prepare(
    `DELETE FROM page_versions WHERE page_id = ? AND id NOT IN (
       SELECT id FROM page_versions WHERE page_id = ? ORDER BY id DESC LIMIT ?
     )`
  ).run(pageId, pageId, MAX_VERSIONS_PER_PAGE);
}

interface VersionRow {
  id: number;
  page_id: string;
  data: string;
  saved_at: string;
}

export function listVersions(pageId: string): PageVersion[] {
  const rows = db()
    .prepare("SELECT * FROM page_versions WHERE page_id = ? ORDER BY id DESC")
    .all(pageId) as VersionRow[];
  return rows.map((r) => ({
    id: r.id,
    pageId: r.page_id,
    data: JSON.parse(r.data) as PageData,
    savedAt: r.saved_at,
  }));
}

export function restoreVersion(pageId: string, versionId: number): Page | null {
  const row = db()
    .prepare("SELECT * FROM page_versions WHERE id = ? AND page_id = ?")
    .get(versionId, pageId) as VersionRow | undefined;
  if (!row) return null;
  return updatePage(pageId, { data: JSON.parse(row.data) as PageData });
}

export function saveImage(id: string, mime: string, buf: Buffer): void {
  db().prepare("INSERT INTO images (id, mime, data) VALUES (?, ?, ?)").run(id, mime, buf);
}

export function getImage(id: string): { mime: string; data: Buffer } | null {
  const row = db().prepare("SELECT mime, data FROM images WHERE id = ?").get(id) as
    | { mime: string; data: Buffer }
    | undefined;
  return row ?? null;
}
