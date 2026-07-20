import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/app";

let appPromise: Promise<Awaited<ReturnType<typeof createApp>>> | undefined;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    appPromise ??= createApp();
    const app = await appPromise;
    app(req, res);
  } catch (error) {
    console.error("API handler failed:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
