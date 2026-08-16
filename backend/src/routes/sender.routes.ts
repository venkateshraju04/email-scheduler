import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../db/client.js";

const router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const senders = await prisma.sender.findMany({
            select: { id: true, email: true, createdAt: true },
            orderBy: { createdAt: "asc" },
        });

        res.json({ senders });
    } catch (err) {
        next(err);
    }
});

export const senderRouter = router;
