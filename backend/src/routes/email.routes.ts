import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../db/client.js";

const router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, limit = "200", offset = "0" } = req.query;

    if (!status || (status !== "scheduled" && status !== "sent")) {
      res.status(400).json({ error: "Invalid or missing 'status' query parameter. Must be 'scheduled' or 'sent'." });
      return;
    }

    const take = parseInt(limit as string, 10);
    const skip = parseInt(offset as string, 10);

    if (isNaN(take) || isNaN(skip) || take < 0 || skip < 0) {
      res.status(400).json({ error: "Invalid 'limit' or 'offset' query parameter." });
      return;
    }

    const statusFilter = status === "scheduled"
      ? { in: ["queued", "delayed_retry"] }
      : { in: ["sent", "failed"] };

    const emailJobs = await prisma.emailJob.findMany({
      where: { 
        status: statusFilter,
        campaign: { userId: req.user!.userId }
      },
      include: {
        campaign: { select: { subject: true, body: true } },
        sender: { select: { email: true } },
      },
      take,
      skip,
      orderBy: status === "scheduled" ? { scheduledAt: "asc" } : { sentAt: "desc" },
    });

    const total = await prisma.emailJob.count({
      where: { 
        status: statusFilter,
        campaign: { userId: req.user!.userId }
      },
    });

    const formattedEmails = emailJobs.map((job) => ({
      id: job.id,
      email: job.recipient,
      subject: job.campaign?.subject || "",
      body: job.campaign?.body || "",
      senderEmail: job.sender?.email || "",
      status: job.status,
      scheduledAt: job.scheduledAt,
      sentAt: job.sentAt,
    }));

    res.json({
      emails: formattedEmails,
      total,
      limit: take,
      offset: skip,
    });
  } catch (err) {
    next(err);
  }
});

export const emailRouter = router;
