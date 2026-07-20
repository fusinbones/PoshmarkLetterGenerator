import type {
  InsertUsageTracking,
  InsertUser,
  UsageTracking,
  User,
} from "../shared/models";
import { isSupabaseConfigured } from "./supabaseConfig";
import type { IStorage } from "./storage.types";

export type { IStorage } from "./storage.types";

class ResilientStorage implements IStorage {
  private readonly fallback = new MemStorage();
  private useFallback = false;

  constructor(private readonly primary: IStorage) {}

  private async run<T>(
    primaryOp: (storage: IStorage) => Promise<T>,
    fallbackOp: (storage: MemStorage) => Promise<T>,
  ): Promise<T> {
    if (this.useFallback) {
      return fallbackOp(this.fallback);
    }

    try {
      return await primaryOp(this.primary);
    } catch (error) {
      console.warn(
        "Primary storage failed, falling back to in-memory storage:",
        error,
      );
      this.useFallback = true;
      return fallbackOp(this.fallback);
    }
  }

  getUser(id: number): Promise<User | undefined> {
    return this.run(
      (storage) => storage.getUser(id),
      (storage) => storage.getUser(id),
    );
  }

  getUserByUsername(username: string): Promise<User | undefined> {
    return this.run(
      (storage) => storage.getUserByUsername(username),
      (storage) => storage.getUserByUsername(username),
    );
  }

  createUser(insertUser: InsertUser): Promise<User> {
    return this.run(
      (storage) => storage.createUser(insertUser),
      (storage) => storage.createUser(insertUser),
    );
  }

  getUsageByIp(ipAddress: string): Promise<UsageTracking | undefined> {
    return this.run(
      (storage) => storage.getUsageByIp(ipAddress),
      (storage) => storage.getUsageByIp(ipAddress),
    );
  }

  createUsage(insertUsage: InsertUsageTracking): Promise<UsageTracking> {
    return this.run(
      (storage) => storage.createUsage(insertUsage),
      (storage) => storage.createUsage(insertUsage),
    );
  }

  updateUsage(
    ipAddress: string,
    usageCount: number,
    lastResetDate: string,
  ): Promise<UsageTracking | undefined> {
    return this.run(
      (storage) => storage.updateUsage(ipAddress, usageCount, lastResetDate),
      (storage) => storage.updateUsage(ipAddress, usageCount, lastResetDate),
    );
  }
}

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

let storagePromise: Promise<IStorage> | undefined;

async function initStorage(): Promise<IStorage> {
  if (!isSupabaseConfigured()) {
    console.log(
      "Using in-memory storage (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for persistence)",
    );
    return new MemStorage();
  }

  try {
    console.log("Using Supabase storage with in-memory fallback");
    const { SupabaseStorage } = await import("./supabaseStorage");
    return new ResilientStorage(new SupabaseStorage());
  } catch (error) {
    console.warn(
      "Failed to initialize Supabase storage, using in-memory storage:",
      error,
    );
    return new MemStorage();
  }
}

export async function getStorage(): Promise<IStorage> {
  storagePromise ??= initStorage();
  return storagePromise;
}

// Local Express dev still expects synchronous access after startup.
let storageInstance: IStorage | undefined;

export async function ensureStorageReady(): Promise<IStorage> {
  storageInstance ??= await getStorage();
  return storageInstance;
}

export const storage: IStorage = new Proxy({} as IStorage, {
  get(_target, prop, receiver) {
    if (!storageInstance) {
      throw new Error("Storage accessed before initialization. Call ensureStorageReady() first.");
    }
    return Reflect.get(storageInstance, prop, receiver);
  },
});
