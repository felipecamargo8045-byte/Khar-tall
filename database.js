'use strict';
// One verified TLS connection pool for accounts and online matches.
let pool;
function connectionString() {
  return process.env.ACCOUNTS_DATABASE_URL || process.env.DATABASE_URL || '';
}
function getPool() {
  if (!connectionString()) return null;
  if (!pool) {
    const { Pool } = require('pg');
    const url = new URL(connectionString());
    url.searchParams.set('sslmode', 'verify-full');
    pool = new Pool({ connectionString: url.toString(), max: 6,
      connectionTimeoutMillis: 10000, idleTimeoutMillis: 20000,
      statement_timeout: 12000 });
    pool.on('error', e => console.error('Database connection:', e.code || 'unavailable'));
  }
  return pool;
}
async function closePool() {
  if (pool) { const old = pool; pool = null; await old.end(); }
}
module.exports = { getPool, connectionString, closePool };
