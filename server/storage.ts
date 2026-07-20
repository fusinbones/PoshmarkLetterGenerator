import "dotenv/config";
import type {
  InsertUsageTracking,
  InsertUser,
  UsageTracking,
  User,
} from "../shared/schema";
import { isSupabaseConfigured } from "./supabase";
import { SupabaseStorage } from "./supabaseStorage";
import type { IStorage } from "./storage.types";

export type { IStorage } from "./storage.types";

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private usageTracking: Map<string, UsageTracking>;
  currentUserId: number;
  currentUsageId: number;

  constructor() {
    this.users = new Map();
    this.usageTracking = new Map();
    this.currentUserId = 1;
    this.currentUsageId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getUsageByIp(ipAddress: string): Promise<UsageTracking | undefined> {
    return this.usageTracking.get(ipAddress);
  }

  async createUsage(insertUsage: InsertUsageTracking): Promise<UsageTracking> {
    const id = this.currentUsageId++;
    const usage: UsageTracking = {
      id,
      ipAddress: insertUsage.ipAddress,
      usageCount: insertUsage.usageCount ?? 0,
      lastResetDate: insertUsage.lastResetDate,
    };
    this.usageTracking.set(insertUsage.ipAddress, usage);
    return usage;
  }

  async updateUsage(
    ipAddress: string,
    usageCount: number,
    lastResetDate: string,
  ): Promise<UsageTracking | undefined> {
    const existing = this.usageTracking.get(ipAddress);
    if (existing) {
      const updated: UsageTracking = {
        ...existing,
        usageCount,
        lastResetDate,
      };
      this.usageTracking.set(ipAddress, updated);
      return updated;
    }
    return undefined;
  }
}

function createStorage(): IStorage {
  if (isSupabaseConfigured()) {
    console.log("Using Supabase storage");
    return new SupabaseStorage();
  }

  console.log("Using in-memory storage (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for persistence)");
  return new MemStorage();
}

export const storage = createStorage();
