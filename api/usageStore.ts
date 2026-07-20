type UsageEntry = {
  usageCount: number;
  lastResetDate: string;
};

const memoryStore = new Map<string, UsageEntry>();

export function getMemoryUsage(ipAddress: string, today: string): UsageEntry {
  let entry = memoryStore.get(ipAddress);
  if (!entry || entry.lastResetDate !== today) {
    entry = { usageCount: 0, lastResetDate: today };
    memoryStore.set(ipAddress, entry);
  }
  return entry;
}

export function setMemoryUsage(
  ipAddress: string,
  usageCount: number,
  today: string,
): UsageEntry {
  const entry = { usageCount, lastResetDate: today };
  memoryStore.set(ipAddress, entry);
  return entry;
}
