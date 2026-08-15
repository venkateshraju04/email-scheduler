import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { emailQueue } from "./queue/emailQueue";
import "./queue/emailWorker";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});


app.post("/test-schedule", async (req, res) => {
  const delaySeconds = req.body.delaySeconds ?? 10;
  const job = await emailQueue.add(
    "send-email",
    { message: "test job" },
    { delay: delaySeconds * 1000 }
  );
  res.json({ jobId: job.id, willFireIn: `${delaySeconds}s` });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
