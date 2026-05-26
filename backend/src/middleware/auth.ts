import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to authenticate requests forwarding from RapidAPI.
 * RapidAPI sends a secret header (x-rapidapi-proxy-secret) that only your
 * server and RapidAPI know. This prevents users from calling your server directly.
 */
export function requireRapidApiSecret(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const proxySecretHeader = req.headers['x-rapidapi-proxy-secret'];
  const expectedSecret = process.env.RAPIDAPI_PROXY_SECRET;

  // For testing locally, if no secret is set in the environment, we can let requests pass
  if (!expectedSecret) {
    console.warn('[Warning] RAPIDAPI_PROXY_SECRET environment variable is not set. Requests are allowed without validation.');
    return next();
  }

  if (!proxySecretHeader || proxySecretHeader !== expectedSecret) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Access denied. This API can only be accessed via the RapidAPI Marketplace proxy.',
    });
    return;
  }

  next();
}
