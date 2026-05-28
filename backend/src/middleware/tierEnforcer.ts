import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to enforce plan-specific limits for LeadGlass B2B & Scraping API.
 */
export function enforceTierLimits(req: Request, res: Response, next: NextFunction): void {
  const subscription = (req.header('X-RapidAPI-Subscription') || 'BASIC').toUpperCase();
  const path = req.path;

  console.log(`[TierEnforcer] Request path: ${path}, Subscription Tier: ${subscription}`);

  // Skip checks for dashboard administration endpoints
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

    // 3. Block PDF Rendering
    if (path.startsWith('/v1/pdf')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'PDF generation is a premium feature. Please upgrade to the PRO or ULTRA plan to unlock A4 PDF vector rendering.'
      });
      return;
    }

    // 4. Block Custom Element Screenshots
    if (path.startsWith('/v1/screenshot/element')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'Segment/Element screenshots are locked. Please upgrade to the PRO plan to crop screenshots to specific CSS elements.'
      });
      return;
    }

    // 5. Block Email/Social Extraction (Lead Gen)
    if (path.startsWith('/v1/scrape/emails')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'B2B Contact extraction (emails, phones, socials) is a premium feature. Please upgrade to the ULTRA plan to unlock lead generation scraper.'
      });
      return;
    }

    // 6. Block Raw HTML Scraper
    if (path.startsWith('/v1/scrape/raw')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'Raw HTML source code scraping is a premium feature. Please upgrade to the PRO plan to bypass bot blocks and fetch raw source HTML.'
      });
      return;
    }

    // 7. Block CSS Selector Extraction in /v1/scrape
    const selector = req.query.selector || req.body?.selector;
    if (selector) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'CSS Selector isolating is a premium feature. Please upgrade to the PRO plan to scrape specific elements.'
      });
      return;
    }

    // 8. Enforce simple syntax checking only on verify email
    if (path.startsWith('/v1/verify/email')) {
      req.query.syntaxOnly = 'true';
      if (req.body) {
        req.body.syntaxOnly = true;
      }
    }

    // 9. Restrict wait options to max 1000ms
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

    // 10. Restrict Search results count (max 3)
    if (path.startsWith('/v1/search')) {
      const numValQuery = req.query.num ? parseInt(req.query.num as string, 10) : 10;
      if (numValQuery > 3) {
        req.query.num = '3';
      }
      if (req.body) {
        const numValBody = req.body.num ? parseInt(req.body.num, 10) : 10;
        if (numValBody > 3) {
          req.body.num = 3;
        }
      }
    }
  }

  // ==========================================================
  // TIER 2: PRO
  // ==========================================================
  if (subscription === 'PRO') {
    // 1. Block Combined Contact Email Enrichment
    if (path.startsWith('/v1/enrich/email')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'Individual B2B contact profile and email enrichment is locked on the PRO plan. Please upgrade to the ULTRA plan to match personal name logs and company profiles.'
      });
      return;
    }

    // 2. Block Lead Gen endpoint
    if (path.startsWith('/v1/scrape/emails')) {
      res.status(403).json({
        error: 'Feature Locked',
        message: 'B2B Lead Generation Contact scraping is locked on the PRO plan. Please upgrade to the ULTRA plan to unlock email/social data extraction.'
      });
      return;
    }

    // 3. Restrict wait options (max 5000ms)
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

    // 4. Restrict Search results count (max 10)
    if (path.startsWith('/v1/search')) {
      const numValQuery = req.query.num ? parseInt(req.query.num as string, 10) : 10;
      if (numValQuery > 10) {
        req.query.num = '10';
      }
      if (req.body) {
        const numValBody = req.body.num ? parseInt(req.body.num, 10) : 10;
        if (numValBody > 10) {
          req.body.num = 10;
        }
      }
    }
  }

  // ==========================================================
  // TIER 3: ULTRA / MEGA (Full Access)
  // ==========================================================
  if (subscription === 'ULTRA' || subscription === 'MEGA') {
    // Restrict wait options to max 15000ms
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
    if (path.startsWith('/v1/search')) {
      const numValQuery = req.query.num ? parseInt(req.query.num as string, 10) : 10;
      if (numValQuery > 50) {
        req.query.num = '50';
      }
      if (req.body) {
        const numValBody = req.body.num ? parseInt(req.body.num, 10) : 10;
        if (numValBody > 50) {
          req.body.num = 50;
        }
      }
    }
  }

  next();
}
