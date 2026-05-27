import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireRapidApiSecret } from './middleware/auth';
import { 
  scrapeToMarkdown, 
  takeScreenshot, 
  convertToPdf, 
  scrapeGoogleSearch,
  ScrapeOptions,
  ScreenshotOptions,
  PdfOptions
} from './services/scraper';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

// Health check endpoint (can be open for cloud uptime monitors like Render)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`RapidAPI backend server is running on http://localhost:${PORT}`);
});
