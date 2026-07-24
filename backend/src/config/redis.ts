import Redis from "ioredis";
import { config } from ".";
import { logger } from "../utils/logger";

// ioredis client for caching and metadata storage
export const redisClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: true,
});

redisClient.on("connect", () => {
  logger.info(" Redis connecting...");
});

redisClient.on("ready", () => {
  logger.info(" Redis client ready and connected");
});

redisClient.on("error", (err) => {
  logger.error(" Redis client connection error:", err);
});

// Redis connection options for BullMQ workers and queues
// export const redisConnection = {
//   host: config.REDIS_HOST,
//   port: config.REDIS_PORT,
//   maxRetriesPerRequest: null, // Required for BullMQ
// };

export const redisConnection = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

export async function connectRedis() {
  try {
    if (redisClient.status === "ready") return;
    await new Promise<void>((resolve, reject) => {
      redisClient.once("ready", () => resolve());
      redisClient.once("error", (err) => reject(err));
    });
  } catch (error) {
    logger.error("❌ Redis connection test failed:", error);
    process.exit(1);
  }
}
