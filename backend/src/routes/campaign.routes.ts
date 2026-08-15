import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../db/client.js";
import { emailQueue } from "../queue/emailQueue.js";
import { createCampaignSchema } from "../schemas/campaign.schema.js";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createCampaignSchema.parse(req.body);

    let senderId = data.senderId;
    if (!senderId) {
      const defaultSender = await prisma.sender.findFirst();
      if (!defaultSender) {
        res.status(400).json({ error: "No sender found in the database." });
        return;
      }
      senderId = defaultSender.id;
    } else {
      const sender = await prisma.sender.findUnique({ where: { id: senderId } });
      if (!sender) {
        res.status(400).json({ error: "Sender not found" });
        return;
      }
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
        subject: data.subject,
        body: data.body,
        delayBetweenMs: data.delayBetweenMs,
        hourlyLimit: data.hourlyLimit,
        startTime: data.startTime,
        totalRecipients: data.recipients.length,
      },
    });

    const emailJobsData = data.recipients.map((recipient, i) => ({
      campaignId: campaign.id,
      senderId: senderId!,
      recipient,
      scheduledAt: new Date(data.startTime.getTime() + i * data.delayBetweenMs),
      status: "queued",
    }));

    await prisma.emailJob.createMany({ data: emailJobsData });

    const emailJobs = await prisma.emailJob.findMany({
      where: { campaignId: campaign.id },
      orderBy: { scheduledAt: "asc" },
    });

    const now = Date.now();
    const bullJobs = await emailQueue.addBulk(
      emailJobs.map((ej) => {
        const delay = Math.max(0, ej.scheduledAt.getTime() - now);
        return {
          name: "send-email",
          data: { emailJobId: ej.id },
          opts: { delay },
        };
      })
    );

    await Promise.all(
      bullJobs.map((bullJob, index) => {
        if (!bullJob) return Promise.resolve();
        return prisma.emailJob.update({
          where: { id: emailJobs[index].id },
          data: { bullJobId: bullJob.id },
        });
      })
    );

    res.status(201).json({
      campaign,
      scheduledCount: emailJobs.length,
    });
  } catch (err) {
    next(err);
  }
});

export const campaignRouter = router;
