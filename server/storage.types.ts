import type {
  InsertUsageTracking,
  InsertUser,
  UsageTracking,
  User,
} from "../shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsageByIp(ipAddress: string): Promise<UsageTracking | undefined>;
  createUsage(usage: InsertUsageTracking): Promise<UsageTracking>;
  updateUsage(
    ipAddress: string,
    usageCount: number,
    lastResetDate: string,
  ): Promise<UsageTracking | undefined>;
}
