import type { VercelRequest, VercelResponse } from "@vercel/node";

const DAILY_LIMIT = 20;

type UsageEntry = {
  usageCount: number;
  lastResetDate: string;
};

type UsageRow = {
  usage_count: number;
  last_reset_date: string;
};

const memoryStore = new Map<string, UsageEntry>();

function getMemoryUsage(ipAddress: string, today: string): UsageEntry {
  let entry = memoryStore.get(ipAddress);
  if (!entry || entry.lastResetDate !== today) {
    entry = { usageCount: 0, lastResetDate: today };
    memoryStore.set(ipAddress, entry);
  }
  return entry;
}

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(",")[0]?.trim() || "unknown";
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) {
    return realIp;
  }

  return "unknown";
}

async function fetchSupabaseUsage(
  ipAddress: string,
  today: string,
): Promise<{ usageCount: number; dailyLimit: number; resetDate: string } | null> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let usage: UsageRow | null = null;
  const { data, error } = await supabase
    .from("usage_tracking")
    .select("usage_count,last_reset_date")
    .eq("ip_address", ipAddress)
    .maybeSingle();

  if (error) {
    throw error;
  }

  usage = data;

  if (!usage || usage.last_reset_date !== today) {
    if (usage) {
      const { data: updated, error: updateError } = await supabase
        .from("usage_tracking")
        .update({ usage_count: 0, last_reset_date: today })
        .eq("ip_address", ipAddress)
        .select("usage_count,last_reset_date")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      usage = updated;
    } else {
      const { data: created, error: createError } = await supabase
        .from("usage_tracking")
        .insert({
          ip_address: ipAddress,
          usage_count: 0,
          last_reset_date: today,
        })
        .select("usage_count,last_reset_date")
        .single();

      if (createError) {
        throw createError;
      }

      usage = created;
    }
  }

  return {
    usageCount: usage?.usage_count ?? 0,
    dailyLimit: DAILY_LIMIT,
    resetDate: usage?.last_reset_date ?? today,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const today = new Date().toDateString();
  const ipAddress = getClientIp(req);

  try {
    const supabaseUsage = await fetchSupabaseUsage(ipAddress, today);
    if (supabaseUsage) {
      return res.status(200).json(supabaseUsage);
    }
  } catch (error) {
    console.warn("Supabase usage lookup failed, using in-memory fallback:", error);
  }

  const memoryUsage = getMemoryUsage(ipAddress, today);
  return res.status(200).json({
    usageCount: memoryUsage.usageCount,
    dailyLimit: DAILY_LIMIT,
    resetDate: memoryUsage.lastResetDate,
  });
}
