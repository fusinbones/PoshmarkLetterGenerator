const AWEBER_API_BASE = "https://api.aweber.com/1.0";

const listIdCache = new Map<string, string>();

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

export async function addSubscriberToAweber(email: string): Promise<void> {
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
