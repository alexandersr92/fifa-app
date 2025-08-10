import { NextRequest } from 'next/server';

/**
 * Decodes a JWT without verifying its signature. Useful for extracting the
 * authenticated user ID from the Authorization header in API routes. This
 * function does not validate the token; it merely parses the payload.
 */
export function getUserIdFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}