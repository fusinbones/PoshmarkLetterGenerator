import OpenAI from "openai";
import { generateRequestSchema } from "../../shared/schema";
import { DAILY_LIMIT, ensureUsageForIp } from "./usage";
import { storage } from "../storage";

const openaiApiKey =
  process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;

const openai = new OpenAI({
  apiKey: openaiApiKey ?? "",
});

export async function generateForIp(ipAddress: string, body: unknown) {
  if (!openaiApiKey) {
    throw new Error("OpenAI API key is not configured");
  }

  const parsed = generateRequestSchema.parse(body);
  const today = new Date().toDateString();
  const usage = await ensureUsageForIp(ipAddress);

  if (usage && usage.usageCount >= DAILY_LIMIT) {
    return {
      status: 429 as const,
      body: {
        message: "Daily usage limit reached. Please try again tomorrow.",
        usageCount: usage.usageCount,
        dailyLimit: DAILY_LIMIT,
      },
    };
  }

  let prompt =
    parsed.reason === "suspension"
      ? "Write a professional email response to a Poshmark account suspension notification. This should be a direct email reply that can be copy-pasted as a response to Poshmark's suspension email. The user has followed all new listing deletion rules, spaces out deletions, does not relist items under 61 days old, and only delists when items sell elsewhere. Make it respectful, concise, and focused on compliance with Poshmark policies."
      : "Write a professional email response to a Poshmark policy warning notification. This should be a direct email reply that can be copy-pasted as a response to Poshmark's warning email. The user complies with new listing deletion rules, doesn't relist anything under 61 days old, and avoids batch actions. Make it courteous, acknowledging their concern while explaining compliance efforts.";

  if (parsed.fullName?.trim()) {
    prompt += ` The user's full name is "${parsed.fullName}".`;
  }

  if (parsed.closetName?.trim()) {
    prompt += ` The user's Poshmark closet name is "${parsed.closetName}".`;
  }

  prompt +=
    " Format this as an email response - no formal letter headers, addresses, or signatures needed. Just the email body content that can be directly copied and pasted into an email reply to Poshmark support. Keep it concise and professional.";

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

  const newUsageCount = (usage?.usageCount || 0) + 1;
  await storage.updateUsage(ipAddress, newUsageCount, today);

  return {
    status: 200 as const,
    body: {
      message: generatedMessage,
      usageCount: newUsageCount,
      dailyLimit: DAILY_LIMIT,
    },
  };
}
