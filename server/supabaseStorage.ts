import type {
  InsertUsageTracking,
  InsertUser,
  UsageTracking,
  User,
} from "../shared/schema";
import { getSupabaseAdmin } from "./supabase";
import type { IStorage } from "./storage.types";

type UsageTrackingRow = {
  id: number;
  ip_address: string;
  usage_count: number;
  last_reset_date: string;
};

type UserRow = {
  id: number;
  username: string;
  password: string;
};

function mapUsageRow(row: UsageTrackingRow): UsageTracking {
  return {
    id: row.id,
    ipAddress: row.ip_address,
    usageCount: row.usage_count,
    lastResetDate: row.last_reset_date,
  };
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
  };
}

export class SupabaseStorage implements IStorage {
  private get client() {
    return getSupabaseAdmin();
  }

  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapUserRow(data as UserRow) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapUserRow(data as UserRow) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await this.client
      .from("users")
      .insert(insertUser)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapUserRow(data as UserRow);
  }

  async getUsageByIp(ipAddress: string): Promise<UsageTracking | undefined> {
    const { data, error } = await this.client
      .from("usage_tracking")
      .select("*")
      .eq("ip_address", ipAddress)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapUsageRow(data as UsageTrackingRow) : undefined;
  }

  async createUsage(insertUsage: InsertUsageTracking): Promise<UsageTracking> {
    const { data, error } = await this.client
      .from("usage_tracking")
      .insert({
        ip_address: insertUsage.ipAddress,
        usage_count: insertUsage.usageCount,
        last_reset_date: insertUsage.lastResetDate,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapUsageRow(data as UsageTrackingRow);
  }

  async updateUsage(
    ipAddress: string,
    usageCount: number,
    lastResetDate: string,
  ): Promise<UsageTracking | undefined> {
    const { data, error } = await this.client
      .from("usage_tracking")
      .update({
        usage_count: usageCount,
        last_reset_date: lastResetDate,
      })
      .eq("ip_address", ipAddress)
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return mapUsageRow(data as UsageTrackingRow);
    }

    return this.createUsage({
      ipAddress,
      usageCount,
      lastResetDate,
    });
  }
}
