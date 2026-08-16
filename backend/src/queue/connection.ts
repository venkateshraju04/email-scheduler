import "dotenv/config";
import type { ConnectionOptions } from "bullmq";

function parseRedisUrl(url: string): ConnectionOptions {
    const parsed = new URL(url);
    return {
        host: parsed.hostname,
        port: Number(parsed.port) || 6379,
        password: parsed.password || undefined,
    };
}

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const connection: ConnectionOptions = parseRedisUrl(redisUrl);