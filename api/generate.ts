import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getClientIp } from "../server/clientIp";
import { generateForIp } from "../server/handlers/generate";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const result = await generateForIp(getClientIp(req), req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Error generating message:", error);

    if (error instanceof Error && error.message.includes("API key")) {
      return res
        .status(500)
        .json({ message: "OpenAI API configuration error. Please check API key." });
    }

    return res.status(500).json({ message: "Failed to generate message. Please try again." });
  }
}
