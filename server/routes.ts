import type { Express } from "express";
import { getClientIp } from "./clientIp";
import { generateForIp } from "./handlers/generate";
import { subscribeEmail } from "./handlers/subscribe";
import { getUsageForIp } from "./handlers/usage";

export async function registerRoutes(app: Express): Promise<void> {
  app.get("/api/usage", async (req, res) => {
    try {
      const result = await getUsageForIp(getClientIp(req));
      res.json(result);
    } catch (error) {
      console.error("Error fetching usage:", error);
      res.status(500).json({ message: "Failed to fetch usage data" });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const result = await generateForIp(getClientIp(req), req.body);
      res.status(result.status).json(result.body);
    } catch (error) {
      console.error("Error generating message:", error);

      if (error instanceof Error && error.message.includes("API key")) {
        res.status(500).json({ message: "OpenAI API configuration error. Please check API key." });
      } else {
        res.status(500).json({ message: "Failed to generate message. Please try again." });
      }
    }
  });

  app.post("/api/subscribe", async (req, res) => {
    try {
      const result = await subscribeEmail(req.body);
      res.status(result.status).json(result.body);
    } catch (error) {
      console.error("Error subscribing email:", error);
      res.status(500).json({ message: "Failed to subscribe. Please try again." });
    }
  });
}
