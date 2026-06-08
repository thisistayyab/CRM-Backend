import mongoose from 'mongoose';
import dns from 'dns';

const dnsServers = (process.env.DNS_SERVERS || '8.8.8.8,8.8.4.4,1.1.1.1').split(',').map(s => s.trim());
dns.setServers(dnsServers);

const globalCache = globalThis;

if (!globalCache.__mongoose) {
  globalCache.__mongoose = { conn: null, promise: null };
}

function getMongoUri() {
  return process.env.MONGO_URI || process.env.MONGODB_URI;
}

/** Cached connection — safe for Vercel serverless warm/cold starts. */
const mongoDB_connection = async () => {
  const cache = globalCache.__mongoose;

  if (cache.conn) {
    return cache.conn;
  }

  const uri = getMongoUri();
  if (!uri) {
    throw new Error('MONGO_URI or MONGODB_URI is not configured');
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(`${uri}/CRM`).then((m) => m);
  }

  cache.conn = await cache.promise;
  return cache.conn;
};

export { mongoDB_connection };
