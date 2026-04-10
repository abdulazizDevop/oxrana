const rateLimitMap = new Map();

export function rateLimit(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  const windowStart = now - windowMs;

  let requestCount = rateLimitMap.get(ip) || 0;
  let lastRequest = rateLimitMap.get(ip + '_last') || now;

  if (lastRequest < windowStart) {
    requestCount = 0;
  }

  requestCount++;
  rateLimitMap.set(ip, requestCount);
  rateLimitMap.set(ip + '_last', now);

  // Clean up old entries
  if (rateLimitMap.size > 10000) {
    rateLimitMap.clear(); // Simple cleanup
  }

  return requestCount <= limit;
}
