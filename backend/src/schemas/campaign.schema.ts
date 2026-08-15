import { z } from "zod";

export const createCampaignSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  recipients: z.array(z.string().email("Invalid email")).min(1, "At least one recipient is required"),
  startTime: z.coerce.date(),
  delayBetweenMs: z.number().int().min(0, "Delay must be positive"),
  hourlyLimit: z.number().int().min(1, "Hourly limit must be at least 1"),
  senderId: z.string().uuid("Invalid sender ID").optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
