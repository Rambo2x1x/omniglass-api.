import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireRapidApiSecret } from './middleware/auth';
import { scrapeToMarkdown, takeScreenshot, convertToPdf } from './services/scraper';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==========================================
// PUBLIC B2B ENDPOINTS (Routed via RapidAPI)
// ==========================================

// 1. Scrape to Markdown
app.get('/v1/scrape', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const data = await scrapeToMarkdown(url);
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
    const data = await scrapeToMarkdown(url);
    res.json(data);
  } catch (error: any) {
    console.error('Error scraping:', error);
    res.status(500).json({ error: 'Scraping Failed', message: error.message });
  }
});

// 2. Capture Screenshot
app.get('/v1/screenshot', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const imageBuffer = await takeScreenshot(url);
    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error: any) {
    console.error('Screenshot error:', error);
    res.status(500).json({ error: 'Screenshot Failed', message: error.message });
  }
});

// 3. Print PDF
app.get('/v1/pdf', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const pdfBuffer = await convertToPdf(url, false);
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
    const pdfBuffer = html
      ? await convertToPdf(html, true)
      : await convertToPdf(url, false);

    res.set('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF error:', error);
    res.status(500).json({ error: 'PDF Generation Failed', message: error.message });
  }
});

// Health check endpoint (can be open for cloud uptime monitors like Render)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`RapidAPI backend server is running on http://localhost:${PORT}`);
});
