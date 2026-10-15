'use strict';
const { isIP } = require('node:net');
function clientIP(req) {
  if (process.env.TRUST_PROXY === 'true') {
    // Render terminates TLS behind Cloudflare; only trust its edge header here.
    const edge = req.headers['cf-connecting-ip'];
    if (typeof edge === 'string' && isIP(edge)) return edge;
    const chain = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim());
    const last = chain[chain.length - 1];
    if (isIP(last)) return last;
  }
  return req.socket.remoteAddress || 'unknown';
}
function isTLS(req) {
  return !!req.socket.encrypted || (process.env.TRUST_PROXY === 'true' && req.headers['x-forwarded-proto'] === 'https');
}
module.exports = { clientIP, isTLS };
