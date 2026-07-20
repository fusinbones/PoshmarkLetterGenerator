import OpenAI from "openai";
import { generateRequestSchema } from "../../shared/models";
import { DAILY_LIMIT, ensureUsageForIp } from "./usage";
import { getStorage } from "../storage";

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

  let prompt: string;
  if (parsed.reason === "suspension") {
    prompt =
      "Write a professional email response to a Poshmark account suspension notification. This should be a direct email reply that can be copy-pasted as a response to Poshmark's suspension email. The seller wants to appeal respectfully, request clarification on the suspension reason if possible, and express willingness to comply with Poshmark policies going forward. Do not claim specific actions the seller did or did not take unless provided below. Keep it respectful, concise, and focused on resolving the issue in good faith.";
  } else if (parsed.reason === "suspension_sold_elsewhere") {
    prompt =
      "Write a professional email response to a Poshmark account suspension notification. This should be a direct email reply that can be copy-pasted as a response to Poshmark's suspension email. The seller believes listing deletions may relate to delisting items that sold on another platform to avoid double-selling, and wants to explain that context respectfully without admitting to policy violations. Do not invent specific listing details. Keep it concise and focused on requesting review and clarifying intent.";
  } else {
    prompt =
      "Write a professional email response to a Poshmark policy warning notification. This should be a direct email reply that can be copy-pasted as a response to Poshmark's warning email. The seller wants to acknowledge Poshmark's concern, request clarification if helpful, and express commitment to following platform policies. Do not claim specific actions unless provided below. Keep it courteous and professional.";
  }

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
  const storage = await getStorage();
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
