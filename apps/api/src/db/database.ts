import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';

export type Database = DatabaseSync;
export type SqlParam = SQLInputValue;

export function openDatabase(file: string): Database {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
  return db;
}

const statementCache = new WeakMap<Database, Map<string, StatementSync>>();

function prepare(db: Database, sql: string): StatementSync {
  let cache = statementCache.get(db);
  if (!cache) statementCache.set(db, (cache = new Map()));
  let stmt = cache.get(sql);
  if (!stmt) cache.set(sql, (stmt = db.prepare(sql)));
  return stmt;
}

export function queryAll<T>(db: Database, sql: string, params: SqlParam[] = []): T[] {
  return prepare(db, sql).all(...params) as T[];
}

export function queryOne<T>(db: Database, sql: string, params: SqlParam[] = []): T | undefined {
  return prepare(db, sql).get(...params) as T | undefined;
}

/** Executa um comando e retorna quantas linhas foram afetadas. */
export function execute(db: Database, sql: string, params: SqlParam[] = []): number {
  return Number(prepare(db, sql).run(...params).changes);
}

/** Executa `fn` numa transação (BEGIN IMMEDIATE). Chamadas aninhadas reaproveitam a transação externa. */
export function transaction<T>(db: Database, fn: () => T): T {
  if (db.isTransaction) return fn();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
