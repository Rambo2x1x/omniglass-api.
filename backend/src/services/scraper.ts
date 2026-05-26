import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

// Configure Turndown for clean Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  hr: '---',
  bulletListMarker: '-',
});

// Avoid converting script, style, and navigation elements
turndownService.keep(['img', 'a']);

export interface ScrapeResult {
  title: string;
  markdown: string;
  url: string;
}

export async function scrapeToMarkdown(url: string): Promise<ScrapeResult> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    // Set typical user agent to bypass basic scraper detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate with a timeout of 30 seconds
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const title = await page.title();
    const rawHtml = await page.content();

    // Use JSDOM to clean the HTML before markdown translation
    const dom = new JSDOM(rawHtml);
    const document = dom.window.document;

    // Remove noise elements
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

    const bodyHtml = document.body.innerHTML;
    let markdown = turndownService.turndown(bodyHtml);

    if (!markdown.trim()) {
      markdown = "_No readable content found on the page._";
    }

    return {
      title: title || 'Untitled Page',
      markdown,
      url,
    };
  } finally {
    await browser.close();
  }
}

export async function takeScreenshot(url: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Capture full-page screenshot
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: 'png',
    });

    return screenshotBuffer as Buffer;
  } finally {
    await browser.close();
  }
}

export async function convertToPdf(urlOrHtml: string, isHtml: boolean): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
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
    await browser.close();
  }
}
