import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { emailQueue } from "./queue/emailQueue.js";
import { prisma } from "./db/client.js";
import "./queue/emailWorker.js";

import { campaignRouter } from "./routes/campaign.routes.js";
import { emailRouter } from "./routes/email.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authMiddleware } from "./middleware/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/campaigns", authMiddleware, campaignRouter);
app.use("/emails", authMiddleware, emailRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
