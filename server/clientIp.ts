import type { IncomingMessage } from "http";

type RequestLike = {
  headers: IncomingMessage["headers"];
  socket?: { remoteAddress?: string | null };
  ip?: string;
};

export function getClientIp(req: RequestLike): string {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(",")[0]?.trim() || "unknown";
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) {
    return realIp;
  }

  if (req.ip) {
    return req.ip;
  }

  return req.socket?.remoteAddress || "unknown";
}
