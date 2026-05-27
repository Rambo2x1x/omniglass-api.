import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser } from 'puppeteer';

// Register the stealth plugin
puppeteerExtra.use(StealthPlugin());

let browserInstance: Browser | null = null;
let isInitializing = false;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  if (isInitializing) {
    // Wait a brief moment and check again if initialization is in progress
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getBrowser();
  }

  isInitializing = true;
  console.log('[BrowserManager] Launching shared Chromium instance with Stealth Plugin...');

  try {
    browserInstance = await puppeteerExtra.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    // Handle unexpected disconnection / crash
    browserInstance.on('disconnected', () => {
      console.log('[BrowserManager] Shared browser disconnected. Will relaunch on next call.');
      browserInstance = null;
    });

    console.log('[BrowserManager] Shared browser launched successfully.');
    return browserInstance;
  } catch (error) {
    console.error('[BrowserManager] Failed to launch shared browser:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
