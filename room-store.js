'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { getPool } = require('./database.js');
const columns = ['red_hash','blue_hash','red_user_id','blue_user_id','state_json','revision','deadline_ms','status','last_event','created_ms','updated_ms'];
const normalize = row => {
  if (!row) return null;
  for (const k of ['deadline_ms','created_ms','updated_ms','revision'])
    if (row[k] !== null) row[k] = Number(row[k]);
  return row;
};
class RoomStore {
  constructor() { this.pool = getPool(); this.persistent = !!this.pool; this.queues = new Map(); }
  async init() {
    if (this.pool) {
      await this.pool.query(fs.readFileSync(path.join(__dirname,'migrations/001_online_rooms.sql'),'utf8'));
      return;
    }
    const { DatabaseSync } = require('node:sqlite');
    const file = process.env.DATABASE_PATH || path.join(__dirname,'data/khar_tall.sqlite3');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY,red_hash TEXT NOT NULL,blue_hash TEXT,
      red_user_id TEXT,blue_user_id TEXT,state_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,
      deadline_ms INTEGER,status TEXT NOT NULL,last_event TEXT,created_ms INTEGER NOT NULL,updated_ms INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_rooms_deadline ON rooms(deadline_ms);`);
    const existing = this.db.prepare('PRAGMA table_info(rooms)').all().map(c => c.name);
    for (const c of ['red_user_id','blue_user_id'])
      if (!existing.includes(c)) this.db.exec(`ALTER TABLE rooms ADD COLUMN ${c} TEXT`);
  }
  async get(code, client = this.pool) {
    return normalize(this.pool ? (await client.query('SELECT * FROM kt_rooms WHERE code=$1',[code])).rows[0]
      : this.db.prepare('SELECT * FROM rooms WHERE code=?').get(code));
  }
  async create(code, hash, userId, state) {
    const now = Date.now();
    if (this.pool) {
      await this.pool.query("INSERT INTO kt_rooms(code,red_hash,red_user_id,state_json,status,created_ms,updated_ms) VALUES($1,$2,$3,$4,'waiting',$5,$5)",[code,hash,userId,JSON.stringify(state),now]);
    } else {
      this.db.prepare("INSERT INTO rooms(code,red_hash,red_user_id,state_json,status,created_ms,updated_ms) VALUES(?,?,?,?,'waiting',?,?)").run(code,hash,userId,JSON.stringify(state),now,now);
    }
    return this.get(code);
  }
  async mutate(code, fn) {
    // Also serialize SQLite requests while PostgreSQL locks cover multiple processes.
    const prior = this.queues.get(code) || Promise.resolve();
    let release; const gate = new Promise(r => { release = r; });
    const tail = prior.catch(() => {}).then(() => gate); this.queues.set(code,tail);
    await prior.catch(() => {});
    let client;
    try {
      let row;
      if (this.pool) {
        client = await this.pool.connect(); await client.query('BEGIN');
        row = normalize((await client.query('SELECT * FROM kt_rooms WHERE code=$1 FOR UPDATE',[code])).rows[0]);
      } else row = await this.get(code);
      if (!row) { const e = new Error('Sala não encontrada.'); e.status = 404; throw e; }
      const changed = await fn(row);
      if (changed) {
        row.revision++; row.updated_ms = Date.now();
        const values = columns.map(c => row[c] ?? null);
        if (this.pool) await client.query(`UPDATE kt_rooms SET ${columns.map((c,i) => c+'=$'+(i+1)).join(',')} WHERE code=$${values.length+1}`,[...values,code]);
        else this.db.prepare(`UPDATE rooms SET ${columns.map(c => c+'=?').join(',')} WHERE code=?`).run(...values,code);
      }
      if (client) await client.query('COMMIT');
      return { room: row, changed: !!changed };
    } catch (e) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client?.release(); release(); if (this.queues.get(code) === tail) this.queues.delete(code);
    }
  }
  async expired(now) {
    if (this.pool) return (await this.pool.query("SELECT code FROM kt_rooms WHERE status='active' AND deadline_ms<=$1 LIMIT 100",[now])).rows;
    return this.db.prepare("SELECT code FROM rooms WHERE status='active' AND deadline_ms<=? LIMIT 100").all(now);
  }
  async recent(userId) {
    const q = this.pool ? (await this.pool.query('SELECT * FROM kt_rooms WHERE red_user_id=$1 OR blue_user_id=$1 ORDER BY updated_ms DESC LIMIT 8',[userId])).rows
      : this.db.prepare('SELECT * FROM rooms WHERE red_user_id=? OR blue_user_id=? ORDER BY updated_ms DESC LIMIT 8').all(userId,userId);
    return q.map(normalize);
  }
  async prune() {
    const cutoff = Date.now()-30*86400000;
    if (this.pool) await this.pool.query('DELETE FROM kt_rooms WHERE created_ms<$1',[cutoff]);
    else this.db.prepare('DELETE FROM rooms WHERE created_ms<?').run(cutoff);
  }
  async close() { this.db?.close(); }
}
module.exports = { RoomStore };
