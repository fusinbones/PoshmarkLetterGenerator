const AWEBER_API_BASE = "https://api.aweber.com/1.0";
const AWEBER_TOKEN_URL = "https://auth.aweber.com/oauth2/token";

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
  const { accessToken, refreshToken, clientId, clientSecret } = getAweberConfig();

  // Access tokens expire ~2h; prefer refresh when OAuth credentials are complete.
  if (refreshToken && clientId && clientSecret) {
    return refreshAccessToken();
  }

  if (accessToken) {
    return accessToken;
  }

  throw new Error("AWeber OAuth refresh credentials are not configured");
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

export async function addSubscriberToAweber(email: string): Promise<void> {
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
