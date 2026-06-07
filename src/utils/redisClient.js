import 'dotenv/config';
import {createClient} from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

await redisClient.connect();

export {redisClient}
