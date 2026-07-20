import type { Express } from "express";
import { getClientIp } from "./clientIp";
import { storage } from "./storage";
import { generateRequestSchema } from "../shared/schema";
import OpenAI from "openai";

const openaiApiKey =
  process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;

if (!openaiApiKey) {
  console.warn("OPENAI_API_KEY is not set. Letter generation will fail until configured.");
}

const openai = new OpenAI({
  apiKey: openaiApiKey ?? "",
});

export async function registerRoutes(app: Express): Promise<void> {
  
  // Get current usage for IP
  app.get("/api/usage", async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      const today = new Date().toDateString();
      
      let usage = await storage.getUsageByIp(ipAddress);
      
      if (!usage || usage.lastResetDate !== today) {
        // Create new usage record or reset for new day
        if (usage) {
          usage = await storage.updateUsage(ipAddress, 0, today);
        } else {
          usage = await storage.createUsage({
            ipAddress,
            usageCount: 0,
            lastResetDate: today,
          });
        }
      }
      
      res.json({
        usageCount: usage?.usageCount || 0,
        dailyLimit: 20,
        resetDate: usage?.lastResetDate || today,
      });
    } catch (error) {
      console.error("Error fetching usage:", error);
      res.status(500).json({ message: "Failed to fetch usage data" });
    }
  });

  // Generate letter template
  app.post("/api/generate", async (req, res) => {
    try {
      const body = generateRequestSchema.parse(req.body);
      const ipAddress = getClientIp(req);
      const today = new Date().toDateString();
      
      // Get current usage
      let usage = await storage.getUsageByIp(ipAddress);
      
      if (!usage || usage.lastResetDate !== today) {
        // Reset usage for new day
        if (usage) {
          usage = await storage.updateUsage(ipAddress, 0, today);
        } else {
          usage = await storage.createUsage({
            ipAddress,
            usageCount: 0,
            lastResetDate: today,
          });
        }
      }
      
      // Check usage limit
      if (usage && usage.usageCount >= 20) {
        return res.status(429).json({ 
          message: "Daily usage limit reached. Please try again tomorrow.",
          usageCount: usage.usageCount,
          dailyLimit: 20,
        });
      }
      
      // Generate email response using OpenAI
      let prompt = body.reason === "suspension"
        ? "Write a professional email response to a Poshmark account suspension notification. This should be a direct email reply that can be copy-pasted as a response to Poshmark's suspension email. The user has followed all new listing deletion rules, spaces out deletions, does not relist items under 61 days old, and only delists when items sell elsewhere. Make it respectful, concise, and focused on compliance with Poshmark policies."
        : "Write a professional email response to a Poshmark policy warning notification. This should be a direct email reply that can be copy-pasted as a response to Poshmark's warning email. The user complies with new listing deletion rules, doesn't relist anything under 61 days old, and avoids batch actions. Make it courteous, acknowledging their concern while explaining compliance efforts.";

      // Add user details if provided
      if (body.fullName && body.fullName.trim()) {
        prompt += ` The user's full name is "${body.fullName}".`;
      }
      
      if (body.closetName && body.closetName.trim()) {
        prompt += ` The user's Poshmark closet name is "${body.closetName}".`;
      }

      prompt += " Format this as an email response - no formal letter headers, addresses, or signatures needed. Just the email body content that can be directly copied and pasted into an email reply to Poshmark support. Keep it concise and professional.";

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const generatedMessage = response.choices[0].message.content;
      
      if (!generatedMessage) {
        throw new Error("No message generated from OpenAI");
      }
      
      // Update usage count
      const newUsageCount = (usage?.usageCount || 0) + 1;
      await storage.updateUsage(ipAddress, newUsageCount, today);
      
      res.json({ 
        message: generatedMessage,
        usageCount: newUsageCount,
        dailyLimit: 20,
      });
      
    } catch (error) {
      console.error("Error generating message:", error);
      
      if (error instanceof Error && error.message.includes("API key")) {
        res.status(500).json({ message: "OpenAI API configuration error. Please check API key." });
      } else {
        res.status(500).json({ message: "Failed to generate message. Please try again." });
      }
    }
  });
}
