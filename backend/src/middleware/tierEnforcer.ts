import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to enforce tier-specific feature limits based on the RapidAPI subscription header.
 */
export function enforceTierLimits(req: Request, res: Response, next: NextFunction): void {
  // RapidAPI passes plan level in X-RapidAPI-Subscription (e.g. "BASIC", "PRO", "ULTRA", "MEGA")
  // Default to "BASIC" if the header is missing (e.g. for basic local dev without header)
  const subscription = (req.header('X-RapidAPI-Subscription') || 'BASIC').toUpperCase();
  const path = req.path;

  console.log(`[TierEnforcer] Request path: ${path}, Subscription Tier: ${subscription}`);

  // ==========================================================
  // TIER 1: BASIC (Free) Restrictions
  // ==========================================================
  if (subscription === 'BASIC' || subscription === 'FREE') {
    // 1. Block PDF Rendering
    if (path.startsWith('/v1/pdf')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'PDF generation is a premium feature. Please upgrade to the PRO or ULTRA plan to unlock A4 PDF vector rendering.'
      });
      return;
    }

    // 2. Block Custom Element Screenshots
    if (path.startsWith('/v1/screenshot/element')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'Segment/Element screenshots are locked. Please upgrade to the PRO plan to crop screenshots to specific CSS elements.'
      });
      return;
    }

    // 3. Block Email/Social Extraction (Lead Gen)
    if (path.startsWith('/v1/scrape/emails')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'B2B Contact extraction (emails, phones, socials) is a premium feature. Please upgrade to the ULTRA plan to unlock lead generation scraper.'
      });
      return;
    }

    // 4. Block CSS Selector Extraction in /v1/scrape
    const selector = req.query.selector || req.body?.selector;
    if (selector) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'CSS Selector isolating is a premium feature. Please upgrade to the PRO plan to scrape specific elements.'
      });
      return;
    }

    // 5. Restrict wait options
    if (req.query.wait) {
      const waitTime = parseInt(req.query.wait as string, 10);
      if (waitTime > 1000) {
        req.query.wait = '1000';
      }
    }
    if (req.body && req.body.wait) {
      const waitTime = parseInt(req.body.wait, 10);
      if (waitTime > 1000) {
        req.body.wait = 1000;
      }
    }

    // 6. Restrict Search results count
    if (req.query.num) {
      const numVal = parseInt(req.query.num as string, 10);
      if (numVal > 3) {
        req.query.num = '3';
      }
    }
    if (req.body && req.body.num) {
      const numVal = parseInt(req.body.num, 10);
      if (numVal > 3) {
        req.body.num = 3;
      }
    }
  }

  // ==========================================================
  // TIER 2: PRO Restrictions
  // ==========================================================
  if (subscription === 'PRO') {
    // 1. Block Lead Gen endpoint
    if (path.startsWith('/v1/scrape/emails')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'B2B Lead Generation Contact scraping is locked on the PRO plan. Please upgrade to the ULTRA plan to unlock email/social data extraction.'
      });
      return;
    }

    // 2. Restrict wait options (max 5000ms)
    if (req.query.wait) {
      const waitTime = parseInt(req.query.wait as string, 10);
      if (waitTime > 5000) {
        req.query.wait = '5000';
      }
    }
    if (req.body && req.body.wait) {
      const waitTime = parseInt(req.body.wait, 10);
      if (waitTime > 5000) {
        req.body.wait = 5000;
      }
    }

    // 3. Restrict Search results count (max 10)
    if (req.query.num) {
      const numVal = parseInt(req.query.num as string, 10);
      if (numVal > 10) {
        req.query.num = '10';
      }
    }
    if (req.body && req.body.num) {
      const numVal = parseInt(req.body.num, 10);
      if (numVal > 10) {
        req.body.num = 10;
      }
    }
  }

  // ==========================================================
  // TIER 3: ULTRA / MEGA Restrictions (Full Access)
  // ==========================================================
  if (subscription === 'ULTRA' || subscription === 'MEGA') {
    // Restrict wait options to max 15000ms (to prevent hanging processes)
    if (req.query.wait) {
      const waitTime = parseInt(req.query.wait as string, 10);
      if (waitTime > 15000) {
        req.query.wait = '15000';
      }
    }
    if (req.body && req.body.wait) {
      const waitTime = parseInt(req.body.wait, 10);
      if (waitTime > 15000) {
        req.body.wait = 15000;
      }
    }

    // Restrict Search results count to max 50
    if (req.query.num) {
      const numVal = parseInt(req.query.num as string, 10);
      if (numVal > 50) {
        req.query.num = '50';
      }
    }
    if (req.body && req.body.num) {
      const numVal = parseInt(req.body.num, 10);
      if (numVal > 50) {
        req.body.num = 50;
      }
    }
  }

  next();
}
