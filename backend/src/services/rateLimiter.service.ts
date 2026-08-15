import { Redis } from "ioredis";
import { connection } from "../queue/connection.js";

const redis = new Redis(connection);

function getHourBucket(date: Date): string {
    return date.toISOString().slice(0, 13);
}

export async function checkAndIncrementRateLimit(
    senderId: string,
    limit: number
): Promise<{ allowed: boolean }> {
    const bucket = getHourBucket(new Date());
    const key = `ratelimit:${senderId}:${bucket}`;

    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, 3600 * 2);
    }

    if (count > limit) {
        await redis.decr(key);
        return { allowed: false };
    }

    return { allowed: true };
}