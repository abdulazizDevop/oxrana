import { SignJWT, jwtVerify } from 'jose';

// In production, refusing to start without JWT_SECRET is safer than silently using a
// well-known fallback (which would let an attacker forge tokens). The build step is
// excluded so `next build` works without the secret in CI.
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.JWT_SECRET &&
  typeof window === 'undefined' &&
  process.env.NEXT_PHASE !== 'phase-production-build'
) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not set in production');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_for_development_only'
);

export async function signToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (err) {
    return null;
  }
}
