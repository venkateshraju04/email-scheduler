import "dotenv/config";
import type { ConnectionOptions } from "bullmq";

export const connection: ConnectionOptions = {
    host: "localhost",
    port: 6379,
};