import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const usageTracking = pgTable("usage_tracking", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  lastResetDate: text("last_reset_date").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertUsageTrackingSchema = createInsertSchema(usageTracking).pick({
  ipAddress: true,
  usageCount: true,
  lastResetDate: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;

export const generateRequestSchema = z.object({
  reason: z.enum(["suspension", "warning"]),
  fullName: z.string().optional(),
  closetName: z.string().optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
