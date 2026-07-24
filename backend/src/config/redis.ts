// import Redis from "ioredis";
// import { config } from ".";
// import { logger } from "../utils/logger";

// // ioredis client for caching and metadata storage
// export const redisClient = new Redis(config.REDIS_URL, {
//   maxRetriesPerRequest: null, // Required by BullMQ
//   enableReadyCheck: true,
// });

// redisClient.on("connect", () => {
//   logger.info(" Redis connecting...");
// });

// redisClient.on("ready", () => {
//   logger.info(" Redis client ready and connected");
// });

// redisClient.on("error", (err) => {
//   logger.error(" Redis client connection error:", err);
// });

// // Redis connection options for BullMQ workers and queues
// // export const redisConnection = {
// //   host: config.REDIS_HOST,
// //   port: config.REDIS_PORT,
// //   maxRetriesPerRequest: null, // Required for BullMQ
// // };

// export const redisConnection = {
//   host: new URL(config.REDIS_URL).hostname,
//   port: Number(new URL(config.REDIS_URL).port),
//   username: new URL(config.REDIS_URL).username || "default",
//   password: new URL(config.REDIS_URL).password,
//   tls: {},
//   maxRetriesPerRequest: null,
// };

// export async function connectRedis() {
//   try {
//     if (redisClient.status === "ready") return;
//     await new Promise<void>((resolve, reject) => {
//       redisClient.once("ready", () => resolve());
//       redisClient.once("error", (err) => reject(err));
//     });
//   } catch (error) {
//     logger.error(" Redis connection test failed:", error);
//     process.exit(1);
//   }
// }

import Redis from "ioredis";
import { config } from ".";
import { logger } from "../utils/logger";

export const redisClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisClient.on("connect", () => {
  logger.info("Redis connecting...");
});

redisClient.on("ready", () => {
  logger.info("Redis connected");
});

redisClient.on("error", (err) => {
  logger.error("Redis error:", err);
});

const redisUrl = new URL(config.REDIS_URL);

export const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port),
  username: redisUrl.username || "default",
  password: redisUrl.password,
  tls: {},
  maxRetriesPerRequest: null,
};

export async function connectRedis() {
  try {
    if (redisClient.status === "ready") return;

    await new Promise<void>((resolve, reject) => {
      redisClient.once("ready", resolve);
      redisClient.once("error", reject);
    });
  } catch (err) {
    logger.error("Redis connection failed:", err);
    process.exit(1);
  }
}
