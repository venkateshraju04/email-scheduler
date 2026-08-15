import { Worker, DelayedError } from "bullmq";
import { connection } from "./connection.js";
import { prisma } from "../db/client.js";
import { sendEmail } from "../services/mailer.service.js";
import { checkAndIncrementRateLimit } from "../services/rateLimiter.service.js";

export const emailWorker = new Worker(
    "email-sending",
    async (job, token) => {
        const { emailJobId } = job.data;

        const emailJob = await prisma.emailJob.findUnique({
            where: { id: emailJobId },
            include: { sender: true, campaign: true },
        });

        if (!emailJob) {
            console.error(`EmailJob ${emailJobId} not found — skipping`);
            return;
        }

        if (emailJob.status === "sent") {
            console.log(`EmailJob ${emailJobId} already sent — skipping`);
            return;
        }

        const hourlyLimit = emailJob.campaign.hourlyLimit;
        const { allowed } = await checkAndIncrementRateLimit(emailJob.senderId, hourlyLimit);

        if (!allowed) {
            const nextHour = new Date();
            nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

            await job.moveToDelayed(nextHour.getTime(), token);

            await prisma.emailJob.update({
                where: { id: emailJobId },
                data: { status: "delayed_retry" },
            });

            console.log(`Rate limit hit for sender ${emailJob.senderId} — rescheduled to ${nextHour.toISOString()}`);

            throw new DelayedError();
        }

        const result = await sendEmail({
            senderEmail: emailJob.sender.email,
            smtpUser: emailJob.sender.smtpUser,
            smtpPass: emailJob.sender.smtpPass,
            to: emailJob.recipient,
            subject: emailJob.campaign.subject,
            body: emailJob.campaign.body,
        });

        if (result.success) {
            await prisma.emailJob.update({
                where: { id: emailJobId },
                data: {
                    status: "sent",
                    sentAt: new Date(),
                    attempts: { increment: 1 },
                },
            });
            console.log(`Sent ${emailJobId} — preview: ${result.previewUrl}`);
        } else {
            await prisma.emailJob.update({
                where: { id: emailJobId },
                data: {
                    status: "failed",
                    attempts: { increment: 1 },
                },
            });
            console.error(`Failed to send ${emailJobId}:`, result.error);
        }
    },
    { connection, concurrency: 5 }
);

emailWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} threw an error:`, err.message);
});