import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError, z } from "zod";

const AWEBER_API_BASE = "https://api.aweber.com/1.0";

const subscribeRequestSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

const listIdCache = new Map<string, string>();

function parseBody(req: VercelRequest): unknown {
  if (req.body == null || req.body === "") {
    return {};
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  return req.body;
}

function getAweberConfig() {
  return {
    accessToken: process.env.AWEBER_ACCESS_TOKEN?.trim(),
    accountId: process.env.AWEBER_ACCOUNT_ID?.trim(),
    listId: process.env.AWEBER_LIST_ID?.trim() || "awlist6966993",
    devBypass: process.env.AWEBER_DEV_BYPASS === "true",
  };
}

async function resolveNumericListId(
  accessToken: string,
  accountId: string,
  listIdOrUnique: string,
): Promise<string> {
  if (/^\d+$/.test(listIdOrUnique)) {
    return listIdOrUnique;
  }

  const cacheKey = `${accountId}:${listIdOrUnique}`;
  const cached = listIdCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(`${AWEBER_API_BASE}/accounts/${accountId}/lists`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch AWeber lists (${response.status})`);
  }

  const data = (await response.json()) as {
    entries?: Array<{ id: number; unique_list_id?: string }>;
  };

  const list = data.entries?.find((entry) => entry.unique_list_id === listIdOrUnique);
  if (!list) {
    throw new Error(`AWeber list not found: ${listIdOrUnique}`);
  }

  const numericId = String(list.id);
  listIdCache.set(cacheKey, numericId);
  return numericId;
}

async function addSubscriberToAweber(email: string): Promise<void> {
  const { accessToken, accountId, listId, devBypass } = getAweberConfig();

  if (!accessToken || !accountId) {
    if (devBypass) {
      console.warn("[AWeber] DEV BYPASS enabled — skipping subscribe for:", email);
      return;
    }
    throw new Error("AWeber credentials are not configured");
  }

  const numericListId = await resolveNumericListId(accessToken, accountId, listId);

  const response = await fetch(
    `${AWEBER_API_BASE}/accounts/${accountId}/lists/${numericListId}/subscribers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        update_existing: "true",
      }),
    },
  );

  if (response.ok || response.status === 201) {
    return;
  }

  const errorBody = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  const message = errorBody?.error?.message ?? response.statusText;

  if (/already|duplicate|exists|subscribed/i.test(message)) {
    return;
  }

  throw new Error(`AWeber API error: ${message}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email } = subscribeRequestSchema.parse(parseBody(req));
    await addSubscriberToAweber(email);
    return res.status(200).json({ success: true, email });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: error.errors[0]?.message ?? "Invalid email address",
      });
    }

    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(503).json({
        message: "Email subscription is temporarily unavailable. Please try again later.",
      });
    }

    console.error("Error subscribing email:", error);
    return res.status(500).json({ message: "Failed to subscribe. Please try again." });
  }
}
