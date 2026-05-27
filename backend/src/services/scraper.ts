import { Page } from 'puppeteer';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import https from 'https';
import http from 'http';
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

export interface ImageSearchResult {
  title: string;
  url: string;
  sourceUrl: string;
}

export interface ScrapeOptions {
  wait?: number;
  waitSelector?: string;
  blockMedia?: boolean;
  selector?: string; // CSS selector to extract specific element
}

export interface ScreenshotOptions extends ScrapeOptions {
  fullPage?: boolean;
}

export interface PdfOptions extends ScrapeOptions {}

export interface ContactDetails {
  emails: string[];
  phones: string[];
  socials: {
    linkedin: string[];
    twitter: string[];
    facebook: string[];
    instagram: string[];
    github: string[];
  };
}

export interface LinksResult {
  url: string;
  internal: string[];
  external: string[];
  total: number;
}

export interface TableResult {
  id: number;
  headers: string[];
  rows: Record<string, string>[];
}

export interface MetadataOnlyResult {
  title: string;
  description: string;
  keywords: string;
  author: string;
  language: string;
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
  ogType: string;
  ogUrl: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  schemaType: string;
}

export interface NewsResult {
  title: string;
  url: string;
  source: string;
  time: string;
}

export interface DomainStatusResult {
  host: string;
  status: string;
  statusCode: number;
  responseTimeMs: number;
  sslValid: boolean;
  sslIssuer: string;
  sslValidTo: string;
  sslDaysRemaining: number;
}

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
function cleanDom(document: Document | Element): void {
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
  console.log(`[Scraper] Initiating scrape request for: ${url} (blockMedia: ${blockMedia}, selector: ${options.selector || 'none'})`);
  
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

          // If a specific CSS element was requested
          let targetElement: Element | null = document.body;
          if (options.selector) {
            targetElement = document.querySelector(options.selector);
          }

          if (targetElement) {
            const initialText = targetElement.textContent || '';
            const wordCount = initialText.trim().split(/\s+/).filter(Boolean).length;

            if (wordCount > 5 || !options.selector) {
              console.log(`[Scraper] Fast HTTP Engine succeeded (${wordCount} words). Skipping Chromium.`);
              
              const meta = extractMetadata(document);
              cleanDom(targetElement);

              const bodyHtml = targetElement.innerHTML;
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

    // Handle waiting options
    const activeWaitSelector = options.waitSelector || options.selector;
    await handleWaitOptions(page, options.wait, activeWaitSelector);

    const rawHtml = await page.content();
    const dom = new JSDOM(rawHtml);
    const document = dom.window.document;

    const meta = extractMetadata(document);
    
    // Extract target element if specified
    let targetElement: Element | null = document.body;
    if (options.selector) {
      targetElement = document.querySelector(options.selector);
    }

    if (!targetElement) {
      throw new Error(`Requested selector '${options.selector}' was not found on the page.`);
    }

    const bodyText = targetElement.textContent || '';
    const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;

    cleanDom(targetElement);

    const bodyHtml = targetElement.innerHTML;
    let markdown = turndownService.turndown(bodyHtml);

    if (!markdown.trim()) {
      markdown = "_No readable content found in the requested section._";
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
    
    await handleWaitOptions(page, options.wait, options.waitSelector || options.selector);

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
      await handleWaitOptions(page, options.wait, options.waitSelector || options.selector);
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
  console.log(`[Scraper] Querying Search Engine for: "${query}"`);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    
    // Try Google first with host language set to English
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&num=${numResults}`;
    let results: SearchResult[] = [];
    
    try {
      await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      results = await page.evaluate(() => {
        const items: any[] = [];
        // Extract links where an h3 title exists inside or next to an anchor tag
        const anchors = document.querySelectorAll('a');
        anchors.forEach((a) => {
          const h3 = a.querySelector('h3');
          const href = a.getAttribute('href');
          if (h3 && href && href.startsWith('http') && !href.includes('google.com/')) {
            // Traverse up slightly to search for a snippet
            let parent = a.parentElement;
            let snippet = '';
            for (let i = 0; i < 5; i++) {
              if (!parent) break;
              const snippetEl = parent.querySelector('div.VwiC3b, div.yDqRNd, span.aCOpRe');
              if (snippetEl) {
                snippet = snippetEl.textContent || '';
                break;
              }
              parent = parent.parentElement;
            }
            items.push({
              title: h3.textContent || '',
              url: href,
              snippet
            });
          }
        });
        return items;
      });
    } catch (googleErr) {
      console.log('[Scraper] Google request failed or timed out. Falling back to DuckDuckGo...');
    }

    // If Google blocked us, returned 0 results, or showed redirect consent page:
    if (results.length === 0) {
      console.log('[Scraper] Google returned 0 results (possibly blocked/captcha). Falling back to DuckDuckGo...');
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      await page.goto(ddgUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      
      results = await page.evaluate(() => {
        const items: any[] = [];
        const elements = document.querySelectorAll('div.result');
        elements.forEach((el) => {
          const titleEl = el.querySelector('h2.result__title a');
          const snippetEl = el.querySelector('a.result__snippet, div.result__snippet');
          if (titleEl) {
            const title = titleEl.textContent?.trim() || '';
            const url = titleEl.getAttribute('href') || '';
            const snippet = snippetEl ? snippetEl.textContent?.trim() || '' : '';
            if (url && (url.startsWith('http') || url.startsWith('//'))) {
              items.push({ title, url, snippet });
            }
          }
        });
        return items;
      });

      // Clean up protocol-relative URLs and decode DuckDuckGo redirect parameters
      results = results.map(item => {
        let cleanUrl = item.url;
        if (cleanUrl.startsWith('//')) {
          cleanUrl = 'https:' + cleanUrl;
        }
        if (cleanUrl.includes('duckduckgo.com/l/?uddg=')) {
          const parts = cleanUrl.split('uddg=');
          if (parts.length > 1) {
            const rawUrl = parts[1].split('&')[0];
            cleanUrl = decodeURIComponent(rawUrl);
          }
        }
        return { ...item, url: cleanUrl };
      });
    }

    console.log(`[Scraper] Search complete. Retained ${results.length} organic links.`);
    return results.slice(0, numResults);
  } finally {
    await page.close();
  }
}

/**
 * Scrapes Google Images and extracts high-resolution direct links.
 */
/**
 * Scrapes Google Images and extracts high-resolution direct links. Falls back to Bing Images if Google blocks or returns no results.
 */
export async function scrapeGoogleImages(query: string, numResults: number = 10): Promise<ImageSearchResult[]> {
  console.log(`[Scraper] Querying Image Search for: "${query}"`);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    
    let results: ImageSearchResult[] = [];
    
    try {
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&hl=en`;
      await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

      results = await page.evaluate(() => {
        const items: any[] = [];
        const anchors = document.querySelectorAll('a');
        
        anchors.forEach((a) => {
          const href = a.getAttribute('href') || '';
          if (href.includes('/imgres?')) {
            // Parse direct image URLs from the Google redirect href parameters
            const urlParts = href.split('?')[1] || '';
            const params = urlParts.split('&');
            let imgurl = '';
            let imgrefurl = '';
            
            params.forEach((param) => {
              const [key, val] = param.split('=');
              if (key === 'imgurl') {
                imgurl = decodeURIComponent(val || '');
              } else if (key === 'imgrefurl') {
                imgrefurl = decodeURIComponent(val || '');
              }
            });

            const imgEl = a.querySelector('img');
            const title = imgEl ? imgEl.getAttribute('alt') || '' : '';

            if (imgurl && imgurl.startsWith('http')) {
              items.push({
                title: title || 'Image Result',
                url: imgurl,
                sourceUrl: imgrefurl || ''
              });
            }
          }
        });

        // Fallback: If no /imgres links exist, look for any image tags with valid URLs
        if (items.length === 0) {
          document.querySelectorAll('img').forEach((img) => {
            const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
            const alt = img.getAttribute('alt') || '';
            if (src && src.startsWith('http') && src.length > 50) {
              items.push({
                title: alt || 'Image Result',
                url: src,
                sourceUrl: window.location.href
              });
            }
          });
        }

        return items;
      });
    } catch (googleErr) {
      console.log('[Scraper] Google Image request failed or timed out. Falling back to Bing Images...');
    }

    // If Google returned 0 results or failed, fall back to Bing Images
    if (results.length === 0) {
      console.log('[Scraper] Google returned 0 image results. Falling back to Bing Images...');
      try {
        const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1`;
        await page.goto(bingUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        
        results = await page.evaluate(() => {
          const items: any[] = [];
          const elements = document.querySelectorAll('a.iusc');
          elements.forEach((el) => {
            const mJson = el.getAttribute('m');
            if (mJson) {
              try {
                const m = JSON.parse(mJson);
                if (m.murl && m.murl.startsWith('http')) {
                  items.push({
                    title: m.t || 'Image Result',
                    url: m.murl,
                    sourceUrl: m.purl || ''
                  });
                }
              } catch (e) {}
            }
          });
          return items;
        });
      } catch (bingErr: any) {
        console.error('[Scraper] Bing Images fallback failed:', bingErr.message);
      }
    }

    console.log(`[Scraper] Image search complete. Retained ${results.length} organic images.`);
    return results.slice(0, numResults);
  } finally {
    await page.close();
  }
}

/**
 * Scrapes email addresses, phone numbers, and social media handles from a webpage.
 */
export async function scrapeEmailsAndSocials(url: string, options: ScrapeOptions = {}): Promise<ContactDetails> {
  console.log(`[Scraper] Initiating Contact Scrape for: ${url}`);
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await configureRequestInterception(page, options.blockMedia ?? true);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    
    await handleWaitOptions(page, options.wait, options.waitSelector || options.selector);
    
    const html = await page.content();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const textContent = document.body.textContent || '';
    
    // Regex for emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = Array.from(new Set(textContent.match(emailRegex) || [])).map(e => e.toLowerCase());
    
    // Regex for phone numbers (standard forms)
    const phoneRegex = /\+?\b\d{1,3}[-.\s]??\(?\d{2,4}\)?[-.\s]??\d{2,4}[-.\s]??\d{2,9}\b/g;
    const rawPhones = textContent.match(phoneRegex) || [];
    const phones = Array.from(new Set(rawPhones))
      .map(p => p.trim())
      .filter(p => p.length >= 7 && p.length <= 20 && /^\+?[\d\s().-]*$/.test(p));
    
    const socials = {
      linkedin: [] as string[],
      twitter: [] as string[],
      facebook: [] as string[],
      instagram: [] as string[],
      github: [] as string[],
    };
    
    const anchors = document.querySelectorAll('a');
    anchors.forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (!href) return;
      
      const cleanHref = href.trim();
      if (cleanHref.includes('linkedin.com/')) {
        socials.linkedin.push(cleanHref);
      } else if (cleanHref.includes('twitter.com/') || cleanHref.includes('x.com/')) {
        socials.twitter.push(cleanHref);
      } else if (cleanHref.includes('facebook.com/')) {
        socials.facebook.push(cleanHref);
      } else if (cleanHref.includes('instagram.com/')) {
        socials.instagram.push(cleanHref);
      } else if (cleanHref.includes('github.com/')) {
        socials.github.push(cleanHref);
      }
    });
    
    socials.linkedin = Array.from(new Set(socials.linkedin));
    socials.twitter = Array.from(new Set(socials.twitter));
    socials.facebook = Array.from(new Set(socials.facebook));
    socials.instagram = Array.from(new Set(socials.instagram));
    socials.github = Array.from(new Set(socials.github));
    
    return { emails, phones, socials };
  } finally {
    await page.close();
  }
}

/**
 * Scrapes and groups all internal and external link URLs from a webpage.
 */
export async function scrapeLinks(url: string, options: ScrapeOptions = {}): Promise<LinksResult> {
  console.log(`[Scraper] Initiating Link Scrape for: ${url}`);
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await configureRequestInterception(page, options.blockMedia ?? true);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    
    await handleWaitOptions(page, options.wait, options.waitSelector || options.selector);
    
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => a.getAttribute('href') || '')
        .filter(Boolean);
    });
    
    const internalSet = new Set<string>();
    const externalSet = new Set<string>();
    
    links.forEach((link) => {
      const trimmed = link.trim();
      if (trimmed.startsWith('#') || trimmed.startsWith('javascript:') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
        return;
      }
      
      try {
        const resolved = new URL(trimmed, url).href;
        const resolvedHost = new URL(resolved).hostname;
        
        if (resolvedHost === domain || resolvedHost.endsWith('.' + domain)) {
          internalSet.add(resolved);
        } else {
          externalSet.add(resolved);
        }
      } catch (e) {
        // Ignore invalid URLs
      }
    });
    
    const internal = Array.from(internalSet);
    const external = Array.from(externalSet);
    
    return {
      url,
      internal,
      external,
      total: internal.length + external.length,
    };
  } finally {
    await page.close();
  }
}

/**
 * Scrapes HTML table contents and returns parsed JSON arrays.
 */
export async function scrapeTables(url: string, options: ScrapeOptions = {}): Promise<TableResult[]> {
  console.log(`[Scraper] Initiating Table Scrape for: ${url}`);
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await configureRequestInterception(page, options.blockMedia ?? true);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    
    await handleWaitOptions(page, options.wait, options.waitSelector || options.selector);
    
    const tablesData = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const results: any[] = [];
      
      tables.forEach((table, index) => {
        const headers: string[] = [];
        const rows: any[] = [];
        
        // Extract headers
        const thElements = table.querySelectorAll('th');
        if (thElements.length > 0) {
          thElements.forEach((th) => {
            headers.push(th.textContent?.trim() || '');
          });
        }
        
        // Extract row elements
        const trElements = table.querySelectorAll('tr');
        trElements.forEach((tr) => {
          const cells = tr.querySelectorAll('td');
          if (cells.length === 0) return; // skip header row if it didn't use th but tr
          
          const rowData: Record<string, string> = {};
          
          cells.forEach((td, cellIdx) => {
            const headerName = headers[cellIdx] || `column_${cellIdx + 1}`;
            rowData[headerName] = td.textContent?.trim() || '';
          });
          
          if (headers.length < cells.length) {
            for (let i = headers.length; i < cells.length; i++) {
              headers.push(`column_${i + 1}`);
            }
          }
          
          rows.push(rowData);
        });
        
        results.push({
          id: index + 1,
          headers,
          rows
        });
      });
      
      return results;
    });
    
    return tablesData;
  } finally {
    await page.close();
  }
}

/**
 * Captures a screenshot of only the target DOM element.
 */
export async function takeElementScreenshot(url: string, selector: string, options: ScrapeOptions = {}): Promise<Buffer> {
  console.log(`[Scraper] Capturing element screenshot for: ${url} (selector: ${selector})`);
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await configureRequestInterception(page, options.blockMedia ?? false);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    await handleWaitOptions(page, options.wait, options.waitSelector || selector);
    
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Requested selector '${selector}' was not found on the page.`);
    }
    
    const screenshotBuffer = await element.screenshot({
      type: 'png'
    });
    
    return screenshotBuffer as Buffer;
  } finally {
    await page.close();
  }
}

/**
 * Scrapes and returns the raw HTML source of a webpage.
 */
export async function scrapeRawHtml(url: string, options: ScrapeOptions = {}): Promise<string> {
  console.log(`[Scraper] Initiating Raw HTML Scrape for: ${url}`);
  
  if (!options.wait && !options.waitSelector) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (response.ok) {
        return await response.text();
      }
    } catch (e) {
      // Fallback to Chromium
    }
  }
  
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await configureRequestInterception(page, options.blockMedia ?? true);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await handleWaitOptions(page, options.wait, options.waitSelector || options.selector);
    return await page.content();
  } finally {
    await page.close();
  }
}

/**
 * High-speed SEO, Social Card, and OpenGraph metadata extractor.
 */
export async function scrapeMetadataOnly(url: string, options: ScrapeOptions = {}): Promise<MetadataOnlyResult> {
  console.log(`[Scraper] Initiating Metadata Scrape for: ${url}`);
  let html = '';
  
  if (!options.wait && !options.waitSelector) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (response.ok) {
        html = await response.text();
      }
    } catch (e) {
      // Fallback to Chromium
    }
  }
  
  if (!html) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1280, height: 800 });
      await configureRequestInterception(page, true); // Block heavy assets
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await handleWaitOptions(page, options.wait, options.waitSelector);
      html = await page.content();
    } finally {
      await page.close();
    }
  }
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const getMeta = (nameOrProperty: string): string => {
    const el = document.querySelector(`meta[name="${nameOrProperty}"], meta[property="${nameOrProperty}"]`);
    return el ? el.getAttribute('content') || '' : '';
  };
  
  return {
    title: document.title || '',
    description: getMeta('description'),
    keywords: getMeta('keywords'),
    author: getMeta('author'),
    language: document.documentElement.lang || 'en',
    ogImage: getMeta('og:image'),
    ogTitle: getMeta('og:title'),
    ogDescription: getMeta('og:description'),
    ogType: getMeta('og:type'),
    ogUrl: getMeta('og:url'),
    twitterCard: getMeta('twitter:card'),
    twitterTitle: getMeta('twitter:title'),
    twitterDescription: getMeta('twitter:description'),
    twitterImage: getMeta('twitter:image'),
    schemaType: document.querySelector('[type="application/ld+json"]')?.textContent || ''
  };
}

/**
 * Scrapes Google News with fallback to Bing News for 100% SERP news uptime.
 */
export async function scrapeGoogleNews(query: string, numResults: number = 10): Promise<NewsResult[]> {
  console.log(`[Scraper] Querying Google News for: "${query}"`);
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws&hl=en`;
    let results: NewsResult[] = [];
    
    try {
      await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      results = await page.evaluate(() => {
        const items: any[] = [];
        const anchors = document.querySelectorAll('a');
        anchors.forEach((a) => {
          const href = a.getAttribute('href') || '';
          const titleEl = a.querySelector('div.mCBkyc, div.JheTab, h3, [role="heading"]');
          const sourceEl = a.querySelector('.UP5flb, .NUnGF, div.Mg5Ae, span');
          const timeEl = a.querySelector('.OSrXXb, .Lfvv3b, span');
          
          if (titleEl && href && href.startsWith('http') && !href.includes('google.com/')) {
            items.push({
              title: titleEl.textContent?.trim() || '',
              url: href,
              source: sourceEl ? sourceEl.textContent?.trim() || 'News Source' : 'News Source',
              time: timeEl ? timeEl.textContent?.trim() || 'Recently' : 'Recently'
            });
          }
        });
        return items;
      });
    } catch (err) {
      console.log('[Scraper] Google News failed. Falling back to Bing News...');
    }
    
    if (results.length === 0) {
      console.log('[Scraper] Google News returned 0 results. Querying Bing News fallback...');
      try {
        const bingUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}`;
        await page.goto(bingUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        
        results = await page.evaluate(() => {
          const items: any[] = [];
          const cards = document.querySelectorAll('.news-card, .news-card-body');
          cards.forEach((card) => {
            const titleEl = card.querySelector('a.title');
            const sourceEl = card.querySelector('.source, a.source');
            const timeEl = card.querySelector('.time, span[title]');
            
            if (titleEl) {
              const href = titleEl.getAttribute('href') || '';
              if (href && href.startsWith('http')) {
                items.push({
                  title: titleEl.textContent?.trim() || '',
                  url: href,
                  source: sourceEl ? sourceEl.textContent?.trim() || 'Bing News' : 'Bing News',
                  time: timeEl ? timeEl.textContent?.trim() || 'Recently' : 'Recently'
                });
              }
            }
          });
          return items;
        });
      } catch (bingErr: any) {
        console.error('[Scraper] Bing News fallback failed:', bingErr.message);
      }
    }
    
    return results.slice(0, numResults);
  } finally {
    await page.close();
  }
}

/**
 * Fetches Google Autocomplete keyword suggestions.
 */
export async function scrapeAutocomplete(query: string): Promise<string[]> {
  console.log(`[Scraper] Querying Autocomplete for: "${query}"`);
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && Array.isArray(data[1])) {
        return data[1];
      }
    }
  } catch (err) {
    console.error('Autocomplete scrape failed:', err);
  }
  return [];
}

/**
 * Audits domain load performance, HTTP response status, and SSL certificate expiration.
 */
export function auditDomainStatus(url: string): Promise<DomainStatusResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname;
    const isHttps = parsedUrl.protocol === 'https:';
    
    const requestModule = isHttps ? https : http;
    
    const options = {
      method: 'GET',
      hostname: host,
      path: parsedUrl.pathname + parsedUrl.search,
      timeout: 10000,
      rejectUnauthorized: false
    };
    
    const req = requestModule.request(options, (res) => {
      const responseTimeMs = Date.now() - startTime;
      let sslValid = false;
      let sslIssuer = '';
      let sslValidTo = '';
      let sslDaysRemaining = 0;
      
      if (isHttps) {
        const socket: any = req.socket;
        const cert = socket.getPeerCertificate(true);
        if (cert && Object.keys(cert).length > 0) {
          sslValid = !socket.authorized ? false : true;
          sslIssuer = cert.issuer ? cert.issuer.O || cert.issuer.CN || '' : '';
          sslValidTo = cert.valid_to || '';
          
          if (sslValidTo) {
            const expiryDate = new Date(sslValidTo);
            const diffTime = expiryDate.getTime() - Date.now();
            sslDaysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }
        }
      }
      
      resolve({
        host,
        status: 'UP',
        statusCode: res.statusCode || 200,
        responseTimeMs,
        sslValid,
        sslIssuer,
        sslValidTo,
        sslDaysRemaining
      });
    });
    
    req.on('error', () => {
      resolve({
        host,
        status: 'DOWN',
        statusCode: 0,
        responseTimeMs: Date.now() - startTime,
        sslValid: false,
        sslIssuer: '',
        sslValidTo: '',
        sslDaysRemaining: 0
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        host,
        status: 'TIMEOUT',
        statusCode: 0,
        responseTimeMs: Date.now() - startTime,
        sslValid: false,
        sslIssuer: '',
        sslValidTo: '',
        sslDaysRemaining: 0
      });
    });
    
    req.end();
  });
}
