import { Router, type Request, type Response, type NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "../db/client.js";

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ error: "Missing idToken" });
      return;
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.JWT_SECRET) {
      console.error("GOOGLE_CLIENT_ID or JWT_SECRET is missing");
      res.status(500).json({ error: "Internal server error configuration" });
      return;
    }

    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      res.status(401).json({ error: "Invalid Google ID token" });
      return;
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;

    const user = await prisma.user.upsert({
      where: { googleId },
      update: {
        name: name || "Unknown Name",
      },
      create: {
        googleId,
        email,
        name: name || "Unknown Name",
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    next(err);
  }
});

export const authRouter = router;
