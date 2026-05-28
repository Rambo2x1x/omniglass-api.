import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to enforce plan-specific limits for LeadGlass B2B API.
 */
export function enforceTierLimits(req: Request, res: Response, next: NextFunction): void {
  const subscription = (req.header('X-RapidAPI-Subscription') || 'BASIC').toUpperCase();
  const path = req.path;

  console.log(`[TierEnforcer] Request path: ${path}, Subscription Tier: ${subscription}`);

  // Skip middleware checks for auth, keys, user dashboard endpoints
  if (path.startsWith('/api/') || path === '/health') {
    return next();
  }

  // ==========================================================
  // TIER 1: BASIC (Free / FREE Plan)
  // ==========================================================
  if (subscription === 'BASIC' || subscription === 'FREE') {
    // 1. Block Company Domain Enrichment
    if (path.startsWith('/v1/enrich/domain')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'Domain profile enrichment and tech stack identification are premium features. Please upgrade to the PRO plan to unlock.'
      });
      return;
    }

    // 2. Block Combined Email Enrichment
    if (path.startsWith('/v1/enrich/email')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'B2B contact and email profile enrichment is locked. Please upgrade to the ULTRA plan to enrich emails and fetch company profiles.'
      });
      return;
    }

    // 3. For email verification, intercept and enforce simple syntax checking only (no DNS resolves)
    if (path.startsWith('/v1/verify/email')) {
      // We pass a query flag to notify downstream controllers to skip MX/SMTP resolves if desired
      req.query.syntaxOnly = 'true';
      if (req.body) {
        req.body.syntaxOnly = true;
      }
    }
  }

  // ==========================================================
  // TIER 2: PRO
  // ==========================================================
  if (subscription === 'PRO') {
    // 1. Block Combined Contact Email Enrichment (requires ULTRA)
    if (path.startsWith('/v1/enrich/email')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'Individual B2B contact profile and email enrichment is locked on the PRO plan. Please upgrade to the ULTRA plan to match personal name logs and company profiles.'
      });
      return;
    }
  }

  // ==========================================================
  // TIER 3: ULTRA / MEGA (Full Access)
  // ==========================================================
  // Allow all paths: /v1/verify/email, /v1/enrich/domain, /v1/enrich/email, /v1/verify/phone
  
  next();
}
