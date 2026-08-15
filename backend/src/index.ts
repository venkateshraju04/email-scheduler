import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { emailQueue } from "./queue/emailQueue.js";
import { prisma } from "./db/client.js";
import "./queue/emailWorker.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.post("/test-schedule", async (req, res) => {
  try {
    const delaySeconds = req.body.delaySeconds ?? 10;
    const sender = await prisma.sender.findFirst();

    if (!sender) {
      return res.status(400).json({ error: "No sender seeded — run the seed script first" });
    }

    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: "test-google-id",
          email: "test@example.com",
          name: "Test User",
        },
      });
    }

    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        subject: "Test Email from Scheduler",
        body: "<p>This is a test email sent via BullMQ + Ethereal.</p>",
        delayBetweenMs: 2000,
        hourlyLimit: 200,
        startTime: new Date(),
        totalRecipients: 1,
      },
    });

    const emailJob = await prisma.emailJob.create({
      data: {
        campaignId: campaign.id,
        senderId: sender.id,
        recipient: "recipient@example.com",
        scheduledAt: new Date(Date.now() + delaySeconds * 1000),
        status: "queued",
      },
    });

    const bullJob = await emailQueue.add(
      "send-email",
      { emailJobId: emailJob.id },
      { delay: delaySeconds * 1000 }
    );

    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { bullJobId: bullJob.id },
    });

    res.json({ emailJobId: emailJob.id, bullJobId: bullJob.id, willFireIn: `${delaySeconds}s` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to schedule test email" });
  }
});

app.post("/test-schedule-bulk", async (req, res) => {
  try {
    const count = req.body.count ?? 10;
    const hourlyLimit = req.body.hourlyLimit ?? 3;

    const sender = await prisma.sender.findFirst();
    if (!sender) {
      return res.status(400).json({ error: "No sender seeded" });
    }

    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { googleId: "test-google-id", email: "test@example.com", name: "Test User" },
      });
    }

    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        subject: "Bulk Rate-Limit Test",
        body: "<p>Testing rate limiting.</p>",
        delayBetweenMs: 1000,
        hourlyLimit,
        startTime: new Date(),
        totalRecipients: count,
      },
    });

    const emailJobsData = Array.from({ length: count }, (_, i) => ({
      campaignId: campaign.id,
      senderId: sender.id,
      recipient: `test-recipient-${i}@example.com`,
      scheduledAt: new Date(),
      status: "queued",
    }));

    await prisma.emailJob.createMany({ data: emailJobsData });

    const emailJobs = await prisma.emailJob.findMany({ where: { campaignId: campaign.id } });

    const bullJobs = await emailQueue.addBulk(
      emailJobs.map((ej) => ({
        name: "send-email",
        data: { emailJobId: ej.id },
        opts: { delay: 2000 },
      }))
    );

    res.json({
      campaignId: campaign.id,
      scheduled: bullJobs.length,
      hourlyLimit,
      message: `Watch the console — expect ${hourlyLimit} sent immediately, rest rescheduled`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to bulk schedule" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
