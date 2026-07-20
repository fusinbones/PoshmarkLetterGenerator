import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError, z } from "zod";

const AWEBER_API_BASE = "https://api.aweber.com/1.0";
const AWEBER_TOKEN_URL = "https://auth.aweber.com/oauth2/token";

const subscribeRequestSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

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
    refreshToken: process.env.AWEBER_REFRESH_TOKEN?.trim(),
    clientId: process.env.AWEBER_CLIENT_ID?.trim(),
    clientSecret: process.env.AWEBER_CLIENT_SECRET?.trim(),
    accountId: process.env.AWEBER_ACCOUNT_ID?.trim(),
    listId: process.env.AWEBER_LIST_ID?.trim() || "awlist6966993",
    devBypass: process.env.AWEBER_DEV_BYPASS === "true",
  };
}

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, clientId, clientSecret } = getAweberConfig();

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("AWeber OAuth refresh credentials are not configured");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(AWEBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`AWeber token refresh failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("AWeber token refresh returned no access token");
  }

  return data.access_token;
}

async function getAccessToken(): Promise<string> {
  const { accessToken } = getAweberConfig();
  if (accessToken) {
    return accessToken;
  }

  return refreshAccessToken();
}

function resolveNumericListId(listIdOrUnique: string): string {
  if (/^\d+$/.test(listIdOrUnique)) {
    return listIdOrUnique;
  }

  const awlistMatch = listIdOrUnique.match(/^awlist(\d+)$/i);
  if (awlistMatch) {
    return awlistMatch[1];
  }

  throw new Error(`Invalid AWeber list ID format: ${listIdOrUnique}`);
}

async function aweberFetch(
  url: string,
  init: RequestInit,
  accessToken: string,
  retryOnUnauthorized = true,
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const newToken = await refreshAccessToken();
    return aweberFetch(url, init, newToken, false);
  }

  return response;
}

async function addSubscriberToAweber(email: string): Promise<void> {
  const { accountId, listId, devBypass } = getAweberConfig();

  if (!accountId) {
    if (devBypass) {
      console.warn("[AWeber] DEV BYPASS enabled — skipping subscribe for:", email);
      return;
    }
    throw new Error("AWeber credentials are not configured");
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (error) {
    if (devBypass) {
      console.warn("[AWeber] DEV BYPASS enabled — skipping subscribe for:", email);
      return;
    }
    throw error;
  }

  const numericListId = resolveNumericListId(listId);

  const response = await aweberFetch(
    `${AWEBER_API_BASE}/accounts/${accountId}/lists/${numericListId}/subscribers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        update_existing: "true",
      }),
    },
    accessToken,
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
