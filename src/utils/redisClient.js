import { createClient } from 'redis';

let client;
let connectPromise;

/** Lazy Redis — avoids blocking Vercel cold starts on top-level connect(). */
export async function getRedisClient() {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    client.on('error', () => {});
  }

  if (!connectPromise) {
    connectPromise = client.connect().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }

  await connectPromise;
  return client;
}
