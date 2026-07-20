import { getStorage } from "../storage";

const DAILY_LIMIT = 20;

export async function getUsageForIp(ipAddress: string) {
  const storage = await getStorage();
  const today = new Date().toDateString();

  let usage = await storage.getUsageByIp(ipAddress);

  if (!usage || usage.lastResetDate !== today) {
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

  return {
    usageCount: usage?.usageCount || 0,
    dailyLimit: DAILY_LIMIT,
    resetDate: usage?.lastResetDate || today,
  };
}

export async function ensureUsageForIp(ipAddress: string) {
  const storage = await getStorage();
  const today = new Date().toDateString();
  let usage = await storage.getUsageByIp(ipAddress);

  if (!usage || usage.lastResetDate !== today) {
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

  return usage;
}

export { DAILY_LIMIT };
