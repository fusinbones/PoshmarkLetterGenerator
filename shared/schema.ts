import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export {
  generateRequestSchema,
  type GenerateRequest,
  type InsertUsageTracking,
  type InsertUser,
  type UsageTracking,
  type User,
} from "./models";

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
