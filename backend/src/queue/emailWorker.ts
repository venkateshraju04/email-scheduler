import { Worker } from "bullmq";
import { connection } from "./connection";

export const emailWorker = new Worker(
    "email-sending",
    async (job) => {
        console.log(`Processing job ${job.id}`, job.data);
    },
    { connection, concurrency: 5 }
);

emailWorker.on("ready", () => {
    console.log("Worker is ready and listening for jobs");
});

emailWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
});

emailWorker.on("error", (err) => {
    console.error("Worker error:", err.message);
});