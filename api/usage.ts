import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getClientIp } from "../server/clientIp";
import { getUsageForIp } from "../server/handlers/usage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const result = await getUsageForIp(getClientIp(req));
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching usage:", error);
    return res.status(500).json({ message: "Failed to fetch usage data" });
  }
}
