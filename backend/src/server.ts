import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { requireRapidApiSecret, requireJwtAuth } from './middleware/auth';
import { enforceTierLimits } from './middleware/tierEnforcer';
import { prisma } from './services/db';
import { 
  scrapeToMarkdown, 
  takeScreenshot, 
  convertToPdf, 
  scrapeGoogleSearch,
  scrapeGoogleImages,
  scrapeEmailsAndSocials,
  scrapeLinks,
  scrapeTables,
  takeElementScreenshot,
  scrapeRawHtml,
  scrapeMetadataOnly,
  scrapeGoogleNews,
  scrapeAutocomplete,
  auditDomainStatus,
  ScrapeOptions,
  ScreenshotOptions,
  PdfOptions
} from './services/scraper';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(enforceTierLimits);

// Helper to parse common query/body options
function parseScrapeOptions(req: Request): ScrapeOptions {
  const options: ScrapeOptions = {};
  
  // Parse wait timeout (in ms)
  const waitVal = req.query.wait || req.body?.wait;
  if (waitVal) {
    const parsed = parseInt(waitVal as string, 10);
    if (!isNaN(parsed) && parsed > 0) {
      options.wait = parsed;
    }
  }

  // Parse wait selector
  const waitSelectorVal = req.query.waitSelector || req.body?.waitSelector;
  if (waitSelectorVal) {
    options.waitSelector = waitSelectorVal as string;
  }

  // Parse block media (images, styles, media, fonts)
  const blockMediaVal = req.query.blockMedia || req.body?.blockMedia;
  if (blockMediaVal !== undefined) {
    options.blockMedia = blockMediaVal === 'true' || blockMediaVal === true;
  }

  // Parse selector (new option)
  const selectorVal = req.query.selector || req.body?.selector;
  if (selectorVal) {
    options.selector = selectorVal as string;
  }

  return options;
}

// ==========================================================
// PUBLIC B2B ENDPOINTS (Routed via RapidAPI)
// ==========================================================

// 1. Scrape Website to Markdown
app.get('/v1/scrape', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const data = await scrapeToMarkdown(url, options);
    res.json(data);
  } catch (error: any) {
    console.error('Error scraping:', error);
    res.status(500).json({ error: 'Scraping Failed', message: error.message });
  }
});

app.post('/v1/scrape', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL in body.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const data = await scrapeToMarkdown(url, options);
    res.json(data);
  } catch (error: any) {
    console.error('Error scraping:', error);
    res.status(500).json({ error: 'Scraping Failed', message: error.message });
  }
});

// 2. Capture Screenshot (PNG image format)
app.get('/v1/screenshot', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const baseOptions = parseScrapeOptions(req);
    const screenshotOptions: ScreenshotOptions = { ...baseOptions };

    const fullPageVal = req.query.fullPage;
    if (fullPageVal !== undefined) {
      screenshotOptions.fullPage = fullPageVal === 'true';
    }

    const imageBuffer = await takeScreenshot(url, screenshotOptions);
    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error: any) {
    console.error('Screenshot error:', error);
    res.status(500).json({ error: 'Screenshot Failed', message: error.message });
  }
});

// 3. Print PDF Document
app.get('/v1/pdf', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const pdfBuffer = await convertToPdf(url, false, options);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'attachment; filename="scrape.pdf"');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF error:', error);
    res.status(500).json({ error: 'PDF Generation Failed', message: error.message });
  }
});

app.post('/v1/pdf', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const { html, url } = req.body;
  if (!html && !url) {
    res.status(400).json({ error: 'Bad Request', message: 'Provide either html or url in body.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const pdfBuffer = html
      ? await convertToPdf(html, true, options)
      : await convertToPdf(url, false, options);

    res.set('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF error:', error);
    res.status(500).json({ error: 'PDF Generation Failed', message: error.message });
  }
});

// 4. Google SERP (Search Engine Results Page) Scraper
app.get('/v1/search', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.q || req.query.query) as string;
  if (!query) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing q or query parameter.' });
    return;
  }

  const numVal = req.query.num;
  const numResults = numVal ? Math.min(20, Math.max(1, parseInt(numVal as string, 10))) : 10;

  try {
    const results = await scrapeGoogleSearch(query, numResults);
    res.json({ query, resultsCount: results.length, results });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search Failed', message: error.message });
  }
});

app.post('/v1/search', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const query = (req.body.q || req.body.query) as string;
  if (!query) {
    res.status(400).json({ error: 'Bad Request', message: 'Provide q or query in the request body.' });
    return;
  }

  const numVal = req.body.num;
  const numResults = numVal ? Math.min(20, Math.max(1, parseInt(numVal as string, 10))) : 10;

  try {
    const results = await scrapeGoogleSearch(query, numResults);
    res.json({ query, resultsCount: results.length, results });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search Failed', message: error.message });
  }
});

// 5. Google Images Scraper
app.get('/v1/search/images', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.q || req.query.query) as string;
  if (!query) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing q or query parameter.' });
    return;
  }

  const numVal = req.query.num;
  const numResults = numVal ? Math.min(50, Math.max(1, parseInt(numVal as string, 10))) : 10;

  try {
    const results = await scrapeGoogleImages(query, numResults);
    res.json({ query, resultsCount: results.length, results });
  } catch (error: any) {
    console.error('Image search error:', error);
    res.status(500).json({ error: 'Image Search Failed', message: error.message });
  }
});

app.post('/v1/search/images', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const query = (req.body.q || req.body.query) as string;
  if (!query) {
    res.status(400).json({ error: 'Bad Request', message: 'Provide q or query in the request body.' });
    return;
  }

  const numVal = req.body.num;
  const numResults = numVal ? Math.min(50, Math.max(1, parseInt(numVal as string, 10))) : 10;

  try {
    const results = await scrapeGoogleImages(query, numResults);
    res.json({ query, resultsCount: results.length, results });
  } catch (error: any) {
    console.error('Image search error:', error);
    res.status(500).json({ error: 'Image Search Failed', message: error.message });
  }
});

// 6. Advanced Link Extractor
app.get('/v1/scrape/links', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const data = await scrapeLinks(url, options);
    res.json(data);
  } catch (error: any) {
    console.error('Error scraping links:', error);
    res.status(500).json({ error: 'Link Extraction Failed', message: error.message });
  }
});

app.post('/v1/scrape/links', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL in body.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const data = await scrapeLinks(url, options);
    res.json(data);
  } catch (error: any) {
    console.error('Error scraping links:', error);
    res.status(500).json({ error: 'Link Extraction Failed', message: error.message });
  }
});

// 7. Lead Generation / Contact Extractor
app.get('/v1/scrape/emails', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const data = await scrapeEmailsAndSocials(url, options);
    res.json(data);
  } catch (error: any) {
    console.error('Error scraping contact info:', error);
    res.status(500).json({ error: 'Contact Extraction Failed', message: error.message });
  }
});

app.post('/v1/scrape/emails', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL in body.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const data = await scrapeEmailsAndSocials(url, options);
    res.json(data);
  } catch (error: any) {
    console.error('Error scraping contact info:', error);
    res.status(500).json({ error: 'Contact Extraction Failed', message: error.message });
  }
});

// 8. HTML Table Parser
app.get('/v1/scrape/table', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const data = await scrapeTables(url, options);
    res.json(data);
  } catch (error: any) {
    console.error('Error scraping tables:', error);
    res.status(500).json({ error: 'Table Extraction Failed', message: error.message });
  }
});

app.post('/v1/scrape/table', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL in body.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const data = await scrapeTables(url, options);
    res.json(data);
  } catch (error: any) {
    console.error('Error scraping tables:', error);
    res.status(500).json({ error: 'Table Extraction Failed', message: error.message });
  }
});

// 9. Specific Element Screenshot
app.get('/v1/screenshot/element', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  const selector = req.query.selector as string;
  if (!url || !selector) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL or selector parameter.' });
    return;
  }

  try {
    const baseOptions = parseScrapeOptions(req);
    const imageBuffer = await takeElementScreenshot(url, selector, baseOptions);
    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error: any) {
    console.error('Element screenshot error:', error);
    res.status(500).json({ error: 'Element Screenshot Failed', message: error.message });
  }
});

// 10. Raw HTML Scraper
app.get('/v1/scrape/raw', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const html = await scrapeRawHtml(url, options);
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Raw HTML scrape error:', error);
    res.status(500).json({ error: 'Raw HTML Scraping Failed', message: error.message });
  }
});

app.post('/v1/scrape/raw', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL in body.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const html = await scrapeRawHtml(url, options);
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Raw HTML scrape error:', error);
    res.status(500).json({ error: 'Raw HTML Scraping Failed', message: error.message });
  }
});

// 11. SEO & Metadata Extractor
app.get('/v1/scrape/metadata', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const data = await scrapeMetadataOnly(url, options);
    res.json(data);
  } catch (error: any) {
    console.error('Metadata scrape error:', error);
    res.status(500).json({ error: 'Metadata Extraction Failed', message: error.message });
  }
});

app.post('/v1/scrape/metadata', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL in body.' });
    return;
  }

  try {
    const options = parseScrapeOptions(req);
    const data = await scrapeMetadataOnly(url, options);
    res.json(data);
  } catch (error: any) {
    console.error('Metadata scrape error:', error);
    res.status(500).json({ error: 'Metadata Extraction Failed', message: error.message });
  }
});

// 12. Google News Search
app.get('/v1/search/news', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.q || req.query.query) as string;
  if (!query) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing q or query parameter.' });
    return;
  }

  const numVal = req.query.num;
  const numResults = numVal ? Math.min(50, Math.max(1, parseInt(numVal as string, 10))) : 10;

  try {
    const results = await scrapeGoogleNews(query, numResults);
    res.json({ query, resultsCount: results.length, results });
  } catch (error: any) {
    console.error('News search error:', error);
    res.status(500).json({ error: 'News Search Failed', message: error.message });
  }
});

app.post('/v1/search/news', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const query = (req.body.q || req.body.query) as string;
  if (!query) {
    res.status(400).json({ error: 'Bad Request', message: 'Provide q or query in the request body.' });
    return;
  }

  const numVal = req.body.num;
  const numResults = numVal ? Math.min(50, Math.max(1, parseInt(numVal as string, 10))) : 10;

  try {
    const results = await scrapeGoogleNews(query, numResults);
    res.json({ query, resultsCount: results.length, results });
  } catch (error: any) {
    console.error('News search error:', error);
    res.status(500).json({ error: 'News Search Failed', message: error.message });
  }
});

// 13. Keyword Autocomplete suggestions
app.get('/v1/search/suggest', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.q || req.query.query) as string;
  if (!query) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing q or query parameter.' });
    return;
  }

  try {
    const suggestions = await scrapeAutocomplete(query);
    res.json({ query, suggestions });
  } catch (error: any) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Keyword Suggestion Failed', message: error.message });
  }
});

// 14. Website Status & SSL Auditor
app.get('/v1/scrape/status', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const data = await auditDomainStatus(url);
    res.json(data);
  } catch (error: any) {
    console.error('Domain status audit error:', error);
    res.status(500).json({ error: 'Status Audit Failed', message: error.message });
  }
});

// ==========================================================
// SAAS PORTAL DEVELOPER DASHBOARD ENDPOINTS
// ==========================================================

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_omniscrape_key_123!';

// 1. User Registration
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Bad Request', message: 'Email and password are required.' });
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User Exists', message: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        plan: 'FREE',
      },
    });

    const token = jwt.sign({ userId: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Register] Error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 2. User Login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Bad Request', message: 'Email and password are required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Login] Error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 3. Get User Profile
app.get('/api/user', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User account not found.' });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 4. Update User Subscription Plan
app.put('/api/user/plan', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;
  const { plan } = req.body;
  if (!plan || !['FREE', 'STARTER', 'GROWTH', 'SCALE'].includes(plan.toUpperCase())) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid or missing plan value.' });
    return;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: { plan: plan.toUpperCase() },
    });
    res.json({ plan: updatedUser.plan });
  } catch (err: any) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 5. Get API Keys list
app.get('/api/keys', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: payload.userId, active: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(keys.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      createdAt: k.createdAt,
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 6. Generate new API Key
app.post('/api/keys', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Bad Request', message: 'API key name/label is required.' });
    return;
  }

  try {
    const rawKey = 'os_' + crypto.randomBytes(24).toString('hex');
    const visualPrefix = rawKey.substring(0, 7); // "os_" + first 4 characters of key
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    await prisma.apiKey.create({
      data: {
        userId: payload.userId,
        name,
        keyHash,
        keyPrefix: visualPrefix,
        active: true,
      },
    });

    res.status(201).json({ key: rawKey, keyPrefix: visualPrefix });
  } catch (err: any) {
    console.error('[CreateKey] Error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 7. Revoke/Delete API Key
app.delete('/api/keys/:id', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;
  const keyId = req.params.id;

  try {
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: payload.userId },
    });

    if (!key) {
      res.status(404).json({ error: 'Not Found', message: 'API key not found or access denied.' });
      return;
    }

    // Hard delete key
    await prisma.apiKey.delete({ where: { id: keyId } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 8. Get Developer Analytics metrics
app.get('/api/analytics', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;

  try {
    const userKeys = await prisma.apiKey.findMany({
      where: { userId: payload.userId },
      select: { id: true }
    });
    
    const keyIds = userKeys.map(k => k.id);

    if (keyIds.length === 0) {
      res.json({
        metrics: { totalRequests: 0, avgLatency: 0, successRate: 100 },
        chartData: getChartData([]),
        recentRequests: [],
      });
      return;
    }

    const usages = await prisma.apiUsage.findMany({
      where: { apiKeyId: { in: keyIds } },
      orderBy: { timestamp: 'desc' },
    });

    // Compute metrics
    const totalRequests = usages.length;
    const avgLatency = totalRequests > 0
      ? Math.round(usages.reduce((sum, u) => sum + u.responseTimeMs, 0) / totalRequests)
      : 0;
    const successfulRequests = usages.filter(u => u.statusCode < 400).length;
    const successRate = totalRequests > 0
      ? Math.round((successfulRequests / totalRequests) * 100)
      : 100;

    // Build Recharts Chart Data (last 7 days)
    const chartData = getChartData(usages);

    // Retrieve 10 most recent logs
    const recentRequests = usages.slice(0, 10).map(u => ({
      id: u.id,
      endpoint: u.endpoint,
      statusCode: u.statusCode,
      responseTimeMs: u.responseTimeMs,
      timestamp: u.timestamp,
    }));

    res.json({
      metrics: { totalRequests, avgLatency, successRate },
      chartData,
      recentRequests,
    });
  } catch (err: any) {
    console.error('[Analytics] Error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Helper function to bucket api usage logs into last 7 calendar days
function getChartData(usages: any[]) {
  const chartMap = new Map<string, { date: string; Scrape: number; Screenshot: number; PDF: number }>();
  
  // Pre-populate last 7 days with zeroed metrics
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    chartMap.set(dateStr, { date: dateStr, Scrape: 0, Screenshot: 0, PDF: 0 });
  }

  // Aggregate logs by date and endpoint type
  usages.forEach((usage) => {
    const dateStr = new Date(usage.timestamp).toISOString().split('T')[0];
    const item = chartMap.get(dateStr);
    if (item) {
      const endpoint = (usage.endpoint || '').toLowerCase();
      if (endpoint.includes('scrape') || endpoint.includes('metadata') || endpoint.includes('status')) {
        item.Scrape++;
      } else if (endpoint.includes('screenshot')) {
        item.Screenshot++;
      } else if (endpoint.includes('pdf')) {
        item.PDF++;
      }
    }
  });

  return Array.from(chartMap.values());
}

// Health check endpoint (can be open for cloud uptime monitors like Render)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`RapidAPI backend server is running on http://localhost:${PORT}`);
});
