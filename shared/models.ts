import { z } from "zod";

export type UsageTracking = {
  id: number;
  ipAddress: string;
  usageCount: number;
  lastResetDate: string;
};

export type InsertUsageTracking = {
  ipAddress: string;
  usageCount?: number;
  lastResetDate: string;
};

export type User = {
  id: number;
  username: string;
  password: string;
};

export type InsertUser = {
  username: string;
  password: string;
};

export const generateRequestSchema = z.object({
  reason: z.enum(["suspension", "suspension_sold_elsewhere", "warning"]),
  fullName: z.string().optional(),
  closetName: z.string().optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
