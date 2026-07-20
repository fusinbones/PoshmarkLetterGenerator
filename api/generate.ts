import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError, z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const DAILY_LIMIT = 20;

const generateRequestSchema = z.object({
  reason: z.enum(["suspension", "suspension_sold_elsewhere", "warning"]),
  fullName: z.string().optional(),
  closetName: z.string().optional(),
});

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

type UsageRow = {
  usage_count: number;
  last_reset_date: string;
};

const memoryUsage = new Map<string, UsageRow>();

function getMemoryUsage(ipAddress: string, today: string): UsageRow {
  const existing = memoryUsage.get(ipAddress);
  if (!existing || existing.last_reset_date !== today) {
    const fresh = { usage_count: 0, last_reset_date: today };
    memoryUsage.set(ipAddress, fresh);
    return fresh;
  }
  return existing;
}

function incrementMemoryUsage(ipAddress: string, today: string): number {
  const usage = getMemoryUsage(ipAddress, today);
  usage.usage_count += 1;
  memoryUsage.set(ipAddress, usage);
  return usage.usage_count;
}

async function getOrCreateUsage(
  supabase: SupabaseClient,
  ipAddress: string,
  today: string,
) {
  const { data, error } = await supabase
    .from("usage_tracking")
    .select("usage_count,last_reset_date")
    .eq("ip_address", ipAddress)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.last_reset_date !== today) {
    if (data) {
      const { data: updated, error: updateError } = await supabase
        .from("usage_tracking")
        .update({ usage_count: 0, last_reset_date: today })
        .eq("ip_address", ipAddress)
        .select("usage_count,last_reset_date")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      return updated as UsageRow;
    }

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

    return created as UsageRow;
  }

  return data as UsageRow;
}

function parseBody(req: VercelRequest): unknown {
  if (req.body == null || req.body === "") {
    return {};
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  return req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const openaiApiKey = (
    process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR
  )?.trim();

  if (!openaiApiKey) {
    return res
      .status(500)
      .json({ message: "OpenAI API configuration error. Please check API key." });
  }

  try {
    const body = generateRequestSchema.parse(parseBody(req));
    const today = new Date().toDateString();
    const ipAddress = getClientIp(req);

    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    let usageCount = 0;
    let useMemoryUsage = !(supabaseUrl && supabaseKey);

    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const usage = await getOrCreateUsage(supabase, ipAddress, today);

        if (usage.usage_count >= DAILY_LIMIT) {
          return res.status(429).json({
            message: "Daily usage limit reached. Please try again tomorrow.",
            usageCount: usage.usage_count,
            dailyLimit: DAILY_LIMIT,
          });
        }

        usageCount = usage.usage_count;
      } catch (storageError) {
        console.warn(
          "Supabase usage lookup failed, using in-memory fallback:",
          storageError,
        );
        useMemoryUsage = true;
        const usage = getMemoryUsage(ipAddress, today);
        if (usage.usage_count >= DAILY_LIMIT) {
          return res.status(429).json({
            message: "Daily usage limit reached. Please try again tomorrow.",
            usageCount: usage.usage_count,
            dailyLimit: DAILY_LIMIT,
          });
        }
        usageCount = usage.usage_count;
      }
    } else {
      const usage = getMemoryUsage(ipAddress, today);
      if (usage.usage_count >= DAILY_LIMIT) {
        return res.status(429).json({
          message: "Daily usage limit reached. Please try again tomorrow.",
          usageCount: usage.usage_count,
          dailyLimit: DAILY_LIMIT,
        });
      }
      usageCount = usage.usage_count;
    }

    let prompt: string;
    if (body.reason === "suspension") {
      prompt =
        "Write a professional email response to a Poshmark account suspension notification. This should be a direct email reply that can be copy-pasted as a response to Poshmark's suspension email. The seller wants to appeal respectfully, request clarification on the suspension reason if possible, and express willingness to comply with Poshmark policies going forward. Do not claim specific actions the seller did or did not take unless provided below. Keep it respectful, concise, and focused on resolving the issue in good faith.";
    } else if (body.reason === "suspension_sold_elsewhere") {
      prompt =
        "Write a professional email response to a Poshmark account suspension notification. This should be a direct email reply that can be copy-pasted as a response to Poshmark's suspension email. The seller believes listing deletions may relate to delisting items that sold on another platform to avoid double-selling, and wants to explain that context respectfully without admitting to policy violations. Do not invent specific listing details. Keep it concise and focused on requesting review and clarifying intent.";
    } else {
      prompt =
        "Write a professional email response to a Poshmark policy warning notification. This should be a direct email reply that can be copy-pasted as a response to Poshmark's warning email. The seller wants to acknowledge Poshmark's concern, request clarification if helpful, and express commitment to following platform policies. Do not claim specific actions unless provided below. Keep it courteous and professional.";
    }

    if (body.fullName?.trim()) {
      prompt += ` The user's full name is "${body.fullName}".`;
    }

    if (body.closetName?.trim()) {
      prompt += ` The user's Poshmark closet name is "${body.closetName}".`;
    }

    prompt +=
      " Format this as an email response - no formal letter headers, addresses, or signatures needed. Just the email body content that can be directly copied and pasted into an email reply to Poshmark support. Keep it concise and professional.";

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const generatedMessage = response.choices[0].message.content;

    if (!generatedMessage) {
      throw new Error("No message generated from OpenAI");
    }

    let newUsageCount = usageCount + 1;

    if (useMemoryUsage) {
      newUsageCount = incrementMemoryUsage(ipAddress, today);
    } else if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { error: updateError } = await supabase
          .from("usage_tracking")
          .update({ usage_count: newUsageCount, last_reset_date: today })
          .eq("ip_address", ipAddress);

        if (updateError) {
          throw updateError;
        }
      } catch (storageError) {
        console.warn(
          "Supabase usage update failed, using in-memory fallback:",
          storageError,
        );
        newUsageCount = incrementMemoryUsage(ipAddress, today);
      }
    }

    return res.status(200).json({
      message: generatedMessage,
      usageCount: newUsageCount,
      dailyLimit: DAILY_LIMIT,
    });
  } catch (error) {
    console.error("Error generating message:", error);

    if (error instanceof ZodError) {
      return res.status(400).json({
        message: error.errors[0]?.message ?? "Invalid request body",
      });
    }

    if (error instanceof Error && error.message.includes("API key")) {
      return res
        .status(500)
        .json({ message: "OpenAI API configuration error. Please check API key." });
    }

    return res.status(500).json({ message: "Failed to generate message. Please try again." });
  }
}
