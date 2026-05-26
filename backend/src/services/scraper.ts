import { Page } from 'puppeteer';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import { getBrowser } from './browserManager';

// Configure Turndown for clean Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  hr: '---',
  bulletListMarker: '-',
});

// Preserve images and links
turndownService.keep(['img', 'a']);

export interface ScrapeResult {
  title: string;
  description: string;
  keywords: string;
  author: string;
  language: string;
  ogImage: string;
  wordCount: number;
  readingTimeMinutes: number;
  markdown: string;
  url: string;
}

/**
 * Configure request interception on a page to block heavy resources
 * like images, stylesheets, media, and fonts when we only need text.
 */
async function optimizePageForTextOnly(page: Page): Promise<void> {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    const blockedTypes = ['image', 'stylesheet', 'font', 'media', 'websocket', 'other'];
    
    if (blockedTypes.includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

/**
 * Clean HTML DOM elements by removing noise tags.
 */
function cleanDom(document: Document): void {
  const elementsToRemove = [
    'script',
    'style',
    'noscript',
    'iframe',
    'header',
    'footer',
    'nav',
    'aside',
    '.ads',
    '#ads',
    '.advertisement',
    '.cookie-banner',
    '.pop-up',
  ];

  elementsToRemove.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => el.remove());
  });
}

/**
 * Extract structured metadata from the parsed DOM document.
 */
function extractMetadata(document: Document) {
  const getMeta = (nameOrProperty: string): string => {
    const el = document.querySelector(`meta[name="${nameOrProperty}"], meta[property="${nameOrProperty}"]`);
    return el ? el.getAttribute('content') || '' : '';
  };

  return {
    title: document.title || 'Untitled Page',
    description: getMeta('description') || getMeta('og:description'),
    keywords: getMeta('keywords'),
    author: getMeta('author') || getMeta('article:author') || getMeta('twitter:creator'),
    ogImage: getMeta('og:image'),
    language: document.documentElement.lang || 'en',
  };
}

export async function scrapeToMarkdown(url: string): Promise<ScrapeResult> {
  console.log(`[Scraper] Initiating scrape request for: ${url}`);
  
  // ==========================================
  // ENGINE 1: Fast HTTP Fetch (Static Pages)
  // Runs in ~100-200ms. Avoids browser overhead.
  // ==========================================
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second limit

    const fetchResponse = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);

    if (fetchResponse.ok) {
      const contentType = fetchResponse.headers.get('content-type') || '';
      
      if (contentType.includes('text/html')) {
        const rawHtml = await fetchResponse.text();
        const dom = new JSDOM(rawHtml);
        const document = dom.window.document;

        // Count words to ensure the page has actual static text
        const initialText = document.body.textContent || '';
        const wordCount = initialText.trim().split(/\s+/).filter(Boolean).length;

        // If it's a valid text page and not an empty client-side React app:
        if (wordCount > 100) {
          console.log(`[Scraper] Fast HTTP Engine succeeded (${wordCount} words). Skipping Chromium.`);
          
          const meta = extractMetadata(document);
          cleanDom(document);

          const bodyHtml = document.body.innerHTML;
          let markdown = turndownService.turndown(bodyHtml);

          if (markdown.trim()) {
            return {
              ...meta,
              wordCount,
              readingTimeMinutes: Math.max(1, Math.round(wordCount / 225)),
              markdown,
              url,
            };
          }
        }
      }
    }
  } catch (err) {
    console.log('[Scraper] Fast HTTP Engine failed or timed out. Falling back to Headless Chromium...');
  }

  // ==========================================
  // ENGINE 2: Headless Chromium (Dynamic Pages)
  // Handles React, Vue, Angular, and hydrated sites.
  // ==========================================
  console.log('[Scraper] Launching Chromium rendering pipeline...');
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });
    await optimizePageForTextOnly(page);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

    const rawHtml = await page.content();
    const dom = new JSDOM(rawHtml);
    const document = dom.window.document;

    const meta = extractMetadata(document);
    const bodyText = document.body.textContent || '';
    const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;

    cleanDom(document);

    const bodyHtml = document.body.innerHTML;
    let markdown = turndownService.turndown(bodyHtml);

    if (!markdown.trim()) {
      markdown = "_No readable content found on the page._";
    }

    console.log('[Scraper] Chromium rendering complete.');
    return {
      ...meta,
      wordCount,
      readingTimeMinutes: Math.max(1, Math.round(wordCount / 225)),
      markdown,
      url,
    };
  } finally {
    await page.close();
  }
}

export async function takeScreenshot(url: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: 'png',
    });

    return screenshotBuffer as Buffer;
  } finally {
    await page.close();
  }
}

export async function convertToPdf(urlOrHtml: string, isHtml: boolean): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    if (isHtml) {
      await page.setContent(urlOrHtml, { waitUntil: 'networkidle2' });
    } else {
      await page.goto(urlOrHtml, { waitUntil: 'networkidle2', timeout: 30000 });
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px',
      },
    });

    return pdfBuffer as Buffer;
  } finally {
    await page.close();
  }
}
