import type { Request } from 'express';

export function createLocalComplaintRateLimiter(
  limit = 10,
  windowMs = 60_000,
): (request: Request) => boolean {
  const attempts = new Map<string, number[]>();

  return (request) => {
    const address = request.ip || request.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (attempts.get(address) ?? []).filter((timestamp) => now - timestamp < windowMs);
    if (recent.length >= limit) {
      attempts.set(address, recent);
      return false;
    }
    recent.push(now);
    attempts.set(address, recent);
    if (attempts.size > 1000) {
      for (const [key, timestamps] of attempts) {
        if (!timestamps.some((timestamp) => now - timestamp < windowMs)) attempts.delete(key);
      }
    }
    return true;
  };
}
