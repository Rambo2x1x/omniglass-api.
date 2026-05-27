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

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ScrapeOptions {
  wait?: number;
  waitSelector?: string;
  blockMedia?: boolean;
}

export interface ScreenshotOptions extends ScrapeOptions {
  fullPage?: boolean;
}

export interface PdfOptions extends ScrapeOptions {}

/**
 * Configure request interception on a page to block heavy resources
 * like images, stylesheets, media, and fonts when we only need text.
 */
async function configureRequestInterception(page: Page, blockMedia: boolean): Promise<void> {
  if (!blockMedia) return;
  
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
 * Handle custom wait options (timeouts and CSS selectors).
 */
async function handleWaitOptions(page: Page, wait?: number, waitSelector?: string): Promise<void> {
  if (waitSelector) {
    console.log(`[Scraper] Waiting for selector: ${waitSelector}`);
    await page.waitForSelector(waitSelector, { timeout: 15000 });
  }
  if (wait && wait > 0) {
    console.log(`[Scraper] Waiting for custom timeout: ${wait}ms`);
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
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

/**
 * Main scraper engine supporting Fast HTTP fetch and Stealth Chromium fallback.
 */
export async function scrapeToMarkdown(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
  const blockMedia = options.blockMedia ?? true;
  console.log(`[Scraper] Initiating scrape request for: ${url} (blockMedia: ${blockMedia})`);
  
  // ==========================================================
  // ENGINE 1: Fast HTTP Fetch (Static Pages)
  // Skip if user requests waiting selectors/timeouts.
  // ==========================================================
  if (!options.wait && !options.waitSelector) {
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

          const initialText = document.body.textContent || '';
          const wordCount = initialText.trim().split(/\s+/).filter(Boolean).length;

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
      console.log('[Scraper] Fast HTTP Engine failed or skipped. Falling back to Headless Chromium...');
    }
  }

  // ==========================================================
  // ENGINE 2: Headless Chromium (Stealth and JS-heavy Pages)
  // ==========================================================
  console.log('[Scraper] Launching Chromium rendering pipeline...');
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await configureRequestInterception(page, blockMedia);

    // Navigate to page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

    // Handle waiting options (dynamic selectors or timeouts)
    await handleWaitOptions(page, options.wait, options.waitSelector);

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

/**
 * Capture screenshots with support for viewport, custom waits, and stealth execution.
 */
export async function takeScreenshot(url: string, options: ScreenshotOptions = {}): Promise<Buffer> {
  const blockMedia = options.blockMedia ?? false; // Default to false for visual completeness
  const fullPage = options.fullPage ?? true;

  console.log(`[Scraper] Taking screenshot of: ${url} (fullPage: ${fullPage}, blockMedia: ${blockMedia})`);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await configureRequestInterception(page, blockMedia);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    await handleWaitOptions(page, options.wait, options.waitSelector);

    const screenshotBuffer = await page.screenshot({
      fullPage,
      type: 'png',
    });

    return screenshotBuffer as Buffer;
  } finally {
    await page.close();
  }
}

/**
 * Render webpage or custom HTML block to a print-ready PDF document.
 */
export async function convertToPdf(urlOrHtml: string, isHtml: boolean, options: PdfOptions = {}): Promise<Buffer> {
  const blockMedia = options.blockMedia ?? false; // Default to false for visual completeness
  console.log(`[Scraper] Rendering PDF for: ${isHtml ? 'HTML String' : urlOrHtml}`);
  
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await configureRequestInterception(page, blockMedia);

    if (isHtml) {
      await page.setContent(urlOrHtml, { waitUntil: 'networkidle2' });
    } else {
      await page.goto(urlOrHtml, { waitUntil: 'networkidle2', timeout: 30000 });
      await handleWaitOptions(page, options.wait, options.waitSelector);
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

/**
 * Scrapes Google Search Results Page (SERP) and returns structured JSON results.
 */
export async function scrapeGoogleSearch(query: string, numResults: number = 10): Promise<SearchResult[]> {
  console.log(`[Scraper] Querying Google SERP for: "${query}"`);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    
    // We do NOT block stylesheets/scripts for Google Search to avoid malformed DOM elements
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${numResults}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const results = await page.evaluate(() => {
      const items: any[] = [];
      const elements = document.querySelectorAll('div.g');
      
      elements.forEach((el) => {
        const titleEl = el.querySelector('h3');
        const linkEl = el.querySelector('a');
        const snippetEl = el.querySelector('div.VwiC3b, div.yDqRNd, span.aCOpRe');

        if (titleEl && linkEl) {
          const title = titleEl.textContent || '';
          const url = linkEl.getAttribute('href') || '';
          const snippet = snippetEl ? snippetEl.textContent || '' : '';
          
          if (url && url.startsWith('http') && !url.includes('google.com/')) {
            items.push({ title, url, snippet });
          }
        }
      });

      return items;
    });

    console.log(`[Scraper] Google search complete. Retained ${results.length} organic links.`);
    return results.slice(0, numResults);
  } finally {
    await page.close();
  }
}
