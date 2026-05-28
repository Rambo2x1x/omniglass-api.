import dns from 'dns';
import net from 'net';
import { getBrowser } from './browserManager';
import { JSDOM } from 'jsdom';

export interface EmailVerificationResult {
  email: string;
  isValid: boolean;
  formatValid: boolean;
  mxRecords: string[];
  isDisposable: boolean;
  isRoleAccount: boolean;
  deliverable: 'deliverable' | 'undeliverable' | 'unknown';
  domain: string;
  user: string;
  smtpCheck: 'deliverable' | 'undeliverable' | 'unknown' | 'disabled';
  isCatchAll: boolean;
}

export interface DomainProfileResult {
  domain: string;
  name: string;
  logo: string;
  description: string;
  title: string;
  socials: {
    linkedin: string;
    twitter: string;
    facebook: string;
    instagram: string;
    github: string;
  };
  techStack: string[];
  status: 'UP' | 'DOWN';
  responseTimeMs: number;
  dnsSecurity: {
    spfRecord: string | null;
    spfValid: boolean;
    dmarcRecord: string | null;
    dmarcValid: boolean;
    nameServers: string[];
  };
}

export interface EmailEnrichmentResult {
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  verification: {
    isValid: boolean;
    deliverable: string;
    smtpCheck: string;
    isCatchAll: boolean;
  };
  company: {
    domain: string;
    name: string;
    logo: string;
    description: string;
    socials: Record<string, string>;
    techStack: string[];
    dnsSecurity: {
      spfRecord: string | null;
      spfValid: boolean;
      dmarcRecord: string | null;
      dmarcValid: boolean;
      nameServers: string[];
    };
  } | null;
}

export interface PhoneValidationResult {
  phone: string;
  isValid: boolean;
  countryCode: string;
  countryName: string;
  formatted: string;
  carrier: string;
}

// Common disposable email domains list
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'tempmail.com', 'yopmail.com', 'dispostable.com',
  'getairmail.com', 'guerrillamail.com', 'maildrop.cc', 'throwawaymail.com', 'tempmailaddress.com',
  'sharklasers.com', 'guerrillamailblock.com', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamail.biz', 'spam4.me', 'grr.la', 'pokemail.net', 'trashmail.com'
]);

// Common corporate role account prefixes
const ROLE_PREFIXES = new Set([
  'support', 'info', 'admin', 'sales', 'jobs', 'billing', 'contact', 'team',
  'marketing', 'press', 'careers', 'help', 'office', 'finance', 'legal',
  'hr', 'media', 'noreply', 'no-reply', 'hello', 'service', 'feedback'
]);

/**
 * Attempts a TCP SMTP handshake on port 25 to check if mailbox exists.
 */
export function checkSmtpMailbox(mxHost: string, email: string): Promise<boolean | 'unknown'> {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, mxHost);
    socket.setTimeout(4000); // 4-second timeout limit for fast responses

    let stage = 0;
    let resolved = false;

    const cleanupAndResolve = (result: boolean | 'unknown') => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(result);
    };

    socket.on('connect', () => {
      // Waiting for greetings from server
    });

    socket.on('data', (data) => {
      const response = data.toString();
      const statusCode = parseInt(response.substring(0, 3));

      if (stage === 0) {
        if (statusCode >= 200 && statusCode < 300) {
          socket.write('HELO leadglass.io\r\n');
          stage = 1;
        } else {
          cleanupAndResolve('unknown');
        }
      } else if (stage === 1) {
        if (statusCode >= 200 && statusCode < 300) {
          socket.write('MAIL FROM:<verifier@leadglass.io>\r\n');
          stage = 2;
        } else {
          cleanupAndResolve('unknown');
        }
      } else if (stage === 2) {
        if (statusCode >= 200 && statusCode < 300) {
          socket.write(`RCPT TO:<${email}>\r\n`);
          stage = 3;
        } else {
          cleanupAndResolve('unknown');
        }
      } else if (stage === 3) {
        if (statusCode === 250) {
          cleanupAndResolve(true); // Mailbox exists!
        } else if (statusCode >= 500 && statusCode < 600) {
          cleanupAndResolve(false); // Rejected / mailbox not found
        } else {
          cleanupAndResolve('unknown');
        }
      }
    });

    socket.on('error', () => {
      cleanupAndResolve('unknown');
    });

    socket.on('timeout', () => {
      cleanupAndResolve('unknown');
    });

    socket.on('close', () => {
      cleanupAndResolve('unknown');
    });
  });
}

/**
 * Validates email formatting, performs DNS MX lookups, and runs simulated/live mailbox validation.
 */
export async function verifyEmailDeliverability(email: string, syntaxOnly = false): Promise<EmailVerificationResult> {
  const cleanEmail = (email || '').trim().toLowerCase();
  
  // 1. Basic syntax check (RFC-compliant regex)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const formatValid = emailRegex.test(cleanEmail);

  if (!formatValid) {
    return {
      email: cleanEmail,
      isValid: false,
      formatValid: false,
      mxRecords: [],
      isDisposable: false,
      isRoleAccount: false,
      deliverable: 'undeliverable',
      domain: '',
      user: '',
      smtpCheck: 'undeliverable',
      isCatchAll: false
    };
  }

  const [user, domain] = cleanEmail.split('@');
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);
  const isRoleAccount = ROLE_PREFIXES.has(user);

  if (syntaxOnly) {
    return {
      email: cleanEmail,
      isValid: true,
      formatValid: true,
      mxRecords: [],
      isDisposable,
      isRoleAccount,
      deliverable: 'unknown',
      domain,
      user,
      smtpCheck: 'disabled',
      isCatchAll: false
    };
  }

  let mxRecords: string[] = [];
  let deliverable: 'deliverable' | 'undeliverable' | 'unknown' = 'unknown';

  // 2. DNS MX Record check
  try {
    const records = await dns.promises.resolveMx(domain);
    mxRecords = records
      .sort((a, b) => a.priority - b.priority)
      .map(r => r.exchange);
    
    if (mxRecords.length > 0) {
      deliverable = isDisposable ? 'undeliverable' : 'deliverable';
    } else {
      deliverable = 'undeliverable'; // No MX records means no email server exists
    }
  } catch (err) {
    // If MX lookup fails, try checking direct domain resolution as fallback
    try {
      const addresses = await dns.promises.resolve(domain);
      if (addresses.length > 0) {
        deliverable = isDisposable ? 'undeliverable' : 'unknown';
      } else {
        deliverable = 'undeliverable';
      }
    } catch (e) {
      deliverable = 'undeliverable';
    }
  }

  // 3. SMTP Handshake & Catch-All Verification (only if deliverable and we have MX records)
  let smtpCheck: 'deliverable' | 'undeliverable' | 'unknown' | 'disabled' = 'unknown';
  let isCatchAll = false;

  if (deliverable === 'deliverable' && mxRecords.length > 0) {
    const primaryMx = mxRecords[0];
    try {
      // Connect to port 25 of the primary MX host
      const smtpOk = await checkSmtpMailbox(primaryMx, cleanEmail);
      if (smtpOk === true) {
        smtpCheck = 'deliverable';
        
        // Run catch-all check with a randomized address to see if it accepts any address
        const randomString = `leadglass_catchall_test_${Math.floor(Math.random() * 100000)}`;
        const testCatchAllEmail = `${randomString}@${domain}`;
        const catchAllOk = await checkSmtpMailbox(primaryMx, testCatchAllEmail);
        if (catchAllOk === true) {
          isCatchAll = true;
        }
      } else if (smtpOk === false) {
        smtpCheck = 'undeliverable';
        deliverable = 'undeliverable'; // Downgrade deliverability
      } else {
        smtpCheck = 'unknown';
      }
    } catch (smtpErr) {
      smtpCheck = 'unknown';
    }
  }

  return {
    email: cleanEmail,
    isValid: deliverable === 'deliverable',
    formatValid: true,
    mxRecords,
    isDisposable,
    isRoleAccount,
    deliverable,
    domain,
    user,
    smtpCheck,
    isCatchAll
  };
}

/**
 * Scrapes a website page content, analyzing HTML headers, DOM elements, and stylesheets to detect technology stack.
 */
function analyzeTechStack(html: string): string[] {
  const techs: string[] = [];
  const lowerHtml = html.toLowerCase();

  // CMS & Builders
  if (lowerHtml.includes('/wp-content/') || lowerHtml.includes('/wp-includes/')) techs.push('WordPress');
  if (lowerHtml.includes('cdn.shopify.com') || lowerHtml.includes('shopify.theme')) techs.push('Shopify');
  if (lowerHtml.includes('data-wf-page') || lowerHtml.includes('webflow.css') || lowerHtml.includes('webflow.com')) techs.push('Webflow');
  if (lowerHtml.includes('squarespace.com') || lowerHtml.includes('squarespace-headers')) techs.push('Squarespace');
  if (lowerHtml.includes('wix.com') || lowerHtml.includes('wix-image')) techs.push('Wix');
  if (lowerHtml.includes('drupal.org') || lowerHtml.includes('sites/all/themes')) techs.push('Drupal');
  if (lowerHtml.includes('joomla!')) techs.push('Joomla');

  // Frameworks
  if (lowerHtml.includes('_next/static') || lowerHtml.includes('next.js')) techs.push('Next.js');
  if (lowerHtml.includes('react-dom') || lowerHtml.includes('data-reactroot') || lowerHtml.includes('react.js')) techs.push('React');
  if (lowerHtml.includes('vue.js') || lowerHtml.includes('vue-router') || lowerHtml.includes('data-v-')) techs.push('Vue.js');
  if (lowerHtml.includes('angular.js') || lowerHtml.includes('ng-version') || lowerHtml.includes('ng-app')) techs.push('Angular');
  if (lowerHtml.includes('nuxt.js') || lowerHtml.includes('nuxt-link')) techs.push('Nuxt.js');
  if (lowerHtml.includes('svelte') || lowerHtml.includes('svelte-')) techs.push('Svelte');
  if (lowerHtml.includes('jquery.js') || lowerHtml.includes('jquery.min.js')) techs.push('jQuery');

  // CSS Frameworks
  if (lowerHtml.includes('tailwind.css') || lowerHtml.includes('tailwindcss') || lowerHtml.includes('h-screen') || lowerHtml.includes('flex flex-col')) techs.push('Tailwind CSS');
  if (lowerHtml.includes('bootstrap.css') || lowerHtml.includes('bootstrap.min.css') || lowerHtml.includes('class="btn btn-')) techs.push('Bootstrap');

  // CRM, Chat, Support & Marketing Automation
  if (lowerHtml.includes('js.hs-scripts.com') || lowerHtml.includes('hs-analytics') || lowerHtml.includes('hubspot')) techs.push('HubSpot');
  if (lowerHtml.includes('widget.intercom.io') || lowerHtml.includes('intercomsettings')) techs.push('Intercom');
  if (lowerHtml.includes('js.driftt.com') || lowerHtml.includes('drift.load')) techs.push('Drift Chat');
  if (lowerHtml.includes('zendesk.com') || lowerHtml.includes('zdassets.com')) techs.push('Zendesk');
  if (lowerHtml.includes('salesforce.com') || lowerHtml.includes('webtolead')) techs.push('Salesforce');
  if (lowerHtml.includes('activecampaign')) techs.push('ActiveCampaign');
  if (lowerHtml.includes('chimpstatic.com') || lowerHtml.includes('mailchimp')) techs.push('Mailchimp');
  if (lowerHtml.includes('klaviyo')) techs.push('Klaviyo');
  if (lowerHtml.includes('marketo.com') || lowerHtml.includes('munchkin.js')) techs.push('Marketo');

  // Analytics & Tracking
  if (lowerHtml.includes('googletagmanager.com') || lowerHtml.includes('google-analytics')) techs.push('Google Analytics');
  if (lowerHtml.includes('gtag(') || lowerHtml.includes('analytics.js')) techs.push('Google Analytics 4');
  if (lowerHtml.includes('static.hotjar.com') || lowerHtml.includes('hotjar.js')) techs.push('Hotjar');
  if (lowerHtml.includes('cdn.segment.com') || lowerHtml.includes('analytics.track')) techs.push('Segment');
  if (lowerHtml.includes('mixpanel.js') || lowerHtml.includes('mixpanel.track')) techs.push('Mixpanel');
  if (lowerHtml.includes('amplitude.js')) techs.push('Amplitude');
  if (lowerHtml.includes('optimizely.com')) techs.push('Optimizely');

  // Payments & E-commerce
  if (lowerHtml.includes('js.stripe.com') || lowerHtml.includes('stripe-button')) techs.push('Stripe Payments');
  if (lowerHtml.includes('paypal.com/sdk') || lowerHtml.includes('paypalobjects.com')) techs.push('PayPal');
  if (lowerHtml.includes('braintreegateway.com') || lowerHtml.includes('braintree.js')) techs.push('Braintree');
  if (lowerHtml.includes('recurly.com')) techs.push('Recurly');
  if (lowerHtml.includes('chargify.com')) techs.push('Chargify');
  if (lowerHtml.includes('woocommerce')) techs.push('WooCommerce');
  if (lowerHtml.includes('magento') || lowerHtml.includes('magedoc')) techs.push('Magento');
  if (lowerHtml.includes('bigcommerce')) techs.push('BigCommerce');

  // DevOps & Utilities
  if (lowerHtml.includes('sentry.io') || lowerHtml.includes('sentry-cdn')) techs.push('Sentry Error Logging');
  if (lowerHtml.includes('bugsnag.com') || lowerHtml.includes('bugsnag.min.js')) techs.push('Bugsnag');
  if (lowerHtml.includes('datadoghq.com') || lowerHtml.includes('dd-rum')) techs.push('Datadog RUM');
  if (lowerHtml.includes('newrelic.com') || lowerHtml.includes('nr-data.net')) techs.push('New Relic');
  if (lowerHtml.includes('cf-beacon') || lowerHtml.includes('cloudflare')) techs.push('Cloudflare');

  // Deduplicate and fallback
  const uniqueTechs = Array.from(new Set(techs));
  return uniqueTechs.length > 0 ? uniqueTechs : ['HTML5/JavaScript'];
}

/**
 * Audits domain security records (SPF/DMARC) and Name Servers
 */
async function auditDnsSecurity(domain: string): Promise<{
  spfRecord: string | null;
  spfValid: boolean;
  dmarcRecord: string | null;
  dmarcValid: boolean;
  nameServers: string[];
}> {
  let spfRecord: string | null = null;
  let spfValid = false;
  let dmarcRecord: string | null = null;
  let dmarcValid = false;
  let nameServers: string[] = [];

  // Query Name Servers
  try {
    nameServers = await dns.promises.resolveNs(domain);
  } catch (err) {
    nameServers = [];
  }

  // Query SPF
  try {
    const txtRecords = await dns.promises.resolveTxt(domain);
    for (const record of txtRecords) {
      const flat = record.join('');
      if (flat.startsWith('v=spf1')) {
        spfRecord = flat;
        spfValid = true;
        break;
      }
    }
  } catch (err) {
    // ignore
  }

  // Query DMARC (on _dmarc.domain)
  try {
    const dmarcTxt = await dns.promises.resolveTxt(`_dmarc.${domain}`);
    for (const record of dmarcTxt) {
      const flat = record.join('');
      if (flat.startsWith('v=DMARC1')) {
        dmarcRecord = flat;
        dmarcValid = true;
        break;
      }
    }
  } catch (err) {
    // ignore
  }

  return { spfRecord, spfValid, dmarcRecord, dmarcValid, nameServers };
}

/**
 * Headless browser profiling of meta titles, logo links, social cards, and tech stack detection.
 */
export async function profileDomain(domain: string): Promise<DomainProfileResult> {
  const cleanDomain = (domain || '').trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
  const url = `https://${cleanDomain}`;
  const startTime = Date.now();

  console.log(`[LeadGlass] Profiling domain: ${cleanDomain}`);
  
  let html = '';
  let status: 'UP' | 'DOWN' = 'UP';
  let title = '';
  let description = '';
  let logo = `https://logo.clearbit.com/${cleanDomain}`; // High-quality dynamic logo fallback
  const socials = {
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: '',
    github: ''
  };

  // 1. Fast HTTP fetch request first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      html = await response.text();
    }
  } catch (err) {
    console.log(`[LeadGlass] HTTP fetch failed for ${cleanDomain}. Using headless browser pipeline...`);
  }

  // 2. Headless Chromium fallback if fast fetch fails or returns empty HTML
  if (!html) {
    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      
      // Request interception to save bandwidth
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'media', 'font', 'websocket'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      html = await page.content();
      await page.close();
    } catch (browserErr) {
      console.error(`[LeadGlass] Browser rendering pipeline failed for ${cleanDomain}:`, browserErr);
      status = 'DOWN';
    }
  }

  const responseTimeMs = Date.now() - startTime;

  if (html) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    title = doc.title || cleanDomain;
    
    // Scrape description
    const descEl = doc.querySelector('meta[name="description"], meta[property="og:description"]');
    description = descEl ? descEl.getAttribute('content') || '' : '';

    // Scrape social handles
    const anchors = doc.querySelectorAll('a');
    anchors.forEach((a) => {
      const href = (a.getAttribute('href') || '').trim();
      if (!href) return;

      if (href.includes('linkedin.com/company/') && !socials.linkedin) {
        socials.linkedin = href;
      } else if ((href.includes('twitter.com/') || href.includes('x.com/')) && !socials.twitter) {
        socials.twitter = href;
      } else if (href.includes('facebook.com/') && !socials.facebook) {
        socials.facebook = href;
      } else if (href.includes('instagram.com/') && !socials.instagram) {
        socials.instagram = href;
      } else if (href.includes('github.com/') && !socials.github) {
        socials.github = href;
      }
    });
  }

  // Derive human-readable company name from domain (e.g. google.com -> Google)
  let name = cleanDomain.split('.')[0];
  name = name.charAt(0).toUpperCase() + name.slice(1);

  const techStack = html ? analyzeTechStack(html) : ['Unknown'];

  // Run DNS Security audits in parallel
  const dnsSecurity = await auditDnsSecurity(cleanDomain);

  return {
    domain: cleanDomain,
    name,
    logo,
    description: description || `B2B Company profile for ${name}.`,
    title,
    socials,
    techStack,
    status,
    responseTimeMs,
    dnsSecurity
  };
}

/**
 * Combines name extraction, email deliverability, and company profile matching.
 */
export async function enrichEmailAddress(email: string): Promise<EmailEnrichmentResult> {
  const cleanEmail = (email || '').trim().toLowerCase();
  
  // 1. Verify email structure and domain deliverability
  const verification = await verifyEmailDeliverability(cleanEmail);

  // 2. Extract user name prefix (e.g. alex.jones -> Alex Jones)
  let firstName = '';
  let lastName = '';
  let fullName = '';

  if (verification.formatValid && verification.user) {
    const cleanUser = verification.user.replace(/[0-9]+/g, ''); // strip out digits
    const parts = cleanUser.split(/[._-]/); // split by dots, dashes, underscores
    
    if (parts.length > 0) {
      firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      if (parts.length > 1) {
        lastName = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
        fullName = `${firstName} ${lastName}`;
      } else {
        fullName = firstName;
      }
    }
  }

  // 3. Profile domain if not a common free/disposable domain (like gmail, yahoo, etc.)
  const commonWebmails = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'zoho.com', 'protonmail.com']);
  const isCorporate = verification.domain && !commonWebmails.has(verification.domain) && !verification.isDisposable;

  let companyProfile: any = null;
  if (isCorporate) {
    try {
      const profile = await profileDomain(verification.domain);
      if (profile.status === 'UP') {
        companyProfile = {
          domain: profile.domain,
          name: profile.name,
          logo: profile.logo,
          description: profile.description,
          socials: profile.socials,
          techStack: profile.techStack,
          dnsSecurity: profile.dnsSecurity
        };
      }
    } catch (e) {
      console.error(`[LeadGlass] Failed to auto-enrich email domain ${verification.domain}:`, e);
    }
  }

  return {
    email: cleanEmail,
    firstName,
    lastName,
    fullName,
    verification: {
      isValid: verification.isValid,
      deliverable: verification.deliverable,
      smtpCheck: verification.smtpCheck,
      isCatchAll: verification.isCatchAll
    },
    company: companyProfile
  };
}

/**
 * Validates phone numbers to E.164 formats, extracts country prefix, and mock carrier details.
 */
export async function validatePhoneNumber(phone: string): Promise<PhoneValidationResult> {
  const cleanPhone = (phone || '').trim().replace(/[\s().-]/g, ''); // strip characters
  const isE164 = /^\+?[1-9]\d{1,14}$/.test(cleanPhone); // standard E.164 phone regex

  if (!isE164) {
    return {
      phone,
      isValid: false,
      countryCode: '',
      countryName: '',
      formatted: phone,
      carrier: ''
    };
  }

  // Standardize with + prefix
  const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  
  let countryCode = 'US';
  let countryName = 'United States';
  let carrier = 'Verizon Wireless (Simulated)';

  // Simplistic country router based on dial prefixes
  if (formattedPhone.startsWith('+1')) {
    countryCode = 'US';
    countryName = 'United States / Canada';
    carrier = 'AT&T Mobility (Simulated)';
  } else if (formattedPhone.startsWith('+44')) {
    countryCode = 'GB';
    countryName = 'United Kingdom';
    carrier = 'Vodafone UK (Simulated)';
  } else if (formattedPhone.startsWith('+33')) {
    countryCode = 'FR';
    countryName = 'France';
    carrier = 'Orange France (Simulated)';
  } else if (formattedPhone.startsWith('+49')) {
    countryCode = 'DE';
    countryName = 'Germany';
    carrier = 'Deutsche Telekom (Simulated)';
  } else if (formattedPhone.startsWith('+91')) {
    countryCode = 'IN';
    countryName = 'India';
    carrier = 'Jio Telecom (Simulated)';
  } else if (formattedPhone.startsWith('+61')) {
    countryCode = 'AU';
    countryName = 'Australia';
    carrier = 'Telstra Corporation (Simulated)';
  } else if (formattedPhone.startsWith('+81')) {
    countryCode = 'JP';
    countryName = 'Japan';
    carrier = 'SoftBank Mobile (Simulated)';
  } else if (formattedPhone.startsWith('+55')) {
    countryCode = 'BR';
    countryName = 'Brazil';
    carrier = 'Vivo Mobile (Simulated)';
  } else {
    // Fallback default
    countryCode = 'INTL';
    countryName = 'International Network';
    carrier = 'Global Carrier (Simulated)';
  }

  // Format visual output cleanly (e.g. +14155552671 -> +1 415-555-2671)
  let formatted = formattedPhone;
  if (formattedPhone.length === 12 && formattedPhone.startsWith('+1')) {
    formatted = `${formattedPhone.slice(0, 2)} (${formattedPhone.slice(2, 5)}) ${formattedPhone.slice(5, 8)}-${formattedPhone.slice(8)}`;
  } else if (formattedPhone.length === 13 && formattedPhone.startsWith('+44')) {
    formatted = `${formattedPhone.slice(0, 3)} ${formattedPhone.slice(3, 7)} ${formattedPhone.slice(7)}`;
  }

  return {
    phone: formattedPhone,
    isValid: true,
    countryCode,
    countryName,
    formatted,
    carrier
  };
}
