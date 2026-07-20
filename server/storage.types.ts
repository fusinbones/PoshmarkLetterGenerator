import type {
  InsertUsageTracking,
  InsertUser,
  UsageTracking,
  User,
} from "../shared/models";

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
