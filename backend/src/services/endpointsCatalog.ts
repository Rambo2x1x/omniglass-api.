export interface EndpointParameter {
  name: string;
  in: 'query' | 'body';
  type: 'string' | 'boolean' | 'number';
  required: boolean;
  default?: any;
  description: string;
}

export interface EndpointSpec {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  path: string;
  group: 'B2B Intel & Verification' | 'Web Scraping & Media' | 'Data Extraction & Search';
  description: string;
  tierAccess: {
    BASIC: string;
    PRO: string;
    ULTRA: string;
  };
  parameters: EndpointParameter[];
  sampleResponse: Record<string, any> | string;
}

export const endpointsCatalog: EndpointSpec[] = [
  {
    id: 'verify_email',
    name: 'Verify Email Deliverability',
    method: 'GET',
    path: '/v1/verify/email',
    group: 'B2B Intel & Verification',
    description: 'Checks email validity, performs MX DNS checks, runs SMTP connection handshakes on port 25, and flags catch-all mail servers.',
    tierAccess: {
      BASIC: 'Syntax checks only. Deep MX/SMTP checks are bypassed.',
      PRO: 'Deep MX and SMTP connection check enabled.',
      ULTRA: 'Deep MX and SMTP connection check enabled.'
    },
    parameters: [
      { name: 'email', in: 'query', type: 'string', required: true, description: 'Target email address to check.' },
      { name: 'syntaxOnly', in: 'query', type: 'boolean', required: false, default: false, description: 'Skip DNS and SMTP queries.' }
    ],
    sampleResponse: {
      email: 'alex.jones@gmail.com',
      isValid: true,
      formatValid: true,
      mxRecords: ['gmail-smtp-in.l.google.com.'],
      isDisposable: false,
      isRoleAccount: false,
      deliverable: 'deliverable',
      domain: 'gmail.com',
      user: 'alex.jones',
      smtpCheck: 'deliverable',
      isCatchAll: false
    }
  },
  {
    id: 'verify_phone',
    name: 'Validate Phone Formats',
    method: 'GET',
    path: '/v1/verify/phone',
    group: 'B2B Intel & Verification',
    description: 'Checks phone numbers against international E.164 formats, locates originating country, and formats text displays.',
    tierAccess: {
      BASIC: 'Full Access.',
      PRO: 'Full Access.',
      ULTRA: 'Full Access.'
    },
    parameters: [
      { name: 'phone', in: 'query', type: 'string', required: true, description: 'Target phone number string (e.g. +14155552671).' }
    ],
    sampleResponse: {
      phone: '+14155552671',
      isValid: true,
      countryCode: 'US',
      countryName: 'United States / Canada',
      formatted: '+1 (415) 555-2671',
      carrier: 'AT&T Mobility (Simulated)'
    }
  },
  {
    id: 'enrich_domain',
    name: 'Enrich Domain Profile',
    method: 'GET',
    path: '/v1/enrich/domain',
    group: 'B2B Intel & Verification',
    description: 'Extracts domain business profiles, names, logos, social handles, tech stack components, and inspects SPF/DMARC/NS compliance.',
    tierAccess: {
      BASIC: 'Blocked.',
      PRO: 'Full Access.',
      ULTRA: 'Full Access.'
    },
    parameters: [
      { name: 'domain', in: 'query', type: 'string', required: true, description: 'Target corporate domain (e.g. stripe.com).' }
    ],
    sampleResponse: {
      domain: 'stripe.com',
      name: 'Stripe',
      logo: 'https://logo.clearbit.com/stripe.com',
      description: 'Online payment processing for internet businesses.',
      title: 'Stripe | Financial Infrastructure for the Internet',
      socials: {
        linkedin: 'https://www.linkedin.com/company/stripe',
        twitter: 'https://twitter.com/stripe'
      },
      techStack: ['React', 'Stripe Payments', 'Google Analytics'],
      status: 'UP',
      dnsSecurity: {
        spfRecord: 'v=spf1 include:spf.stripe.com ~all',
        spfValid: true,
        dmarcRecord: 'v=DMARC1; p=reject;',
        dmarcValid: true,
        nameServers: ['dns1.cloudflare.com', 'dns2.cloudflare.com']
      }
    }
  },
  {
    id: 'enrich_email',
    name: 'Enrich Email & Company Profile',
    method: 'GET',
    path: '/v1/enrich/email',
    group: 'B2B Intel & Verification',
    description: 'Performs personal name extraction, email deliverability audit, and company domain profile intelligence in a single call.',
    tierAccess: {
      BASIC: 'Blocked.',
      PRO: 'Blocked.',
      ULTRA: 'Full Access.'
    },
    parameters: [
      { name: 'email', in: 'query', type: 'string', required: true, description: 'Business email address to enrich.' }
    ],
    sampleResponse: {
      email: 'alex.jones@stripe.com',
      firstName: 'Alex',
      lastName: 'Jones',
      fullName: 'Alex Jones',
      verification: {
        isValid: true,
        deliverable: 'deliverable',
        smtpCheck: 'deliverable',
        isCatchAll: false
      },
      company: {
        domain: 'stripe.com',
        name: 'Stripe',
        logo: 'https://logo.clearbit.com/stripe.com',
        techStack: ['React', 'Stripe Payments'],
        dnsSecurity: {
          spfValid: true,
          dmarcValid: true
        }
      }
    }
  },
  {
    id: 'scrape',
    name: 'Scrape Webpage to Markdown',
    method: 'GET',
    path: '/v1/scrape',
    group: 'Web Scraping & Media',
    description: 'Retrieves webpage contents and transforms it into clean, AI-ready Markdown, extracting SEO metadata.',
    tierAccess: {
      BASIC: 'Unlocked. Custom selectors are disabled. Wait timeout capped at 1,000ms.',
      PRO: 'Unlocked. Selectors enabled. Wait timeout capped at 5,000ms.',
      ULTRA: 'Unlocked. Wait timeout capped at 15,000ms.'
    },
    parameters: [
      { name: 'url', in: 'query', type: 'string', required: true, description: 'URL of the page to scrape.' },
      { name: 'blockMedia', in: 'query', type: 'boolean', required: false, default: true, description: 'Skip loading images/CSS to speed up response.' },
      { name: 'wait', in: 'query', type: 'number', required: false, description: 'Duration in milliseconds to wait before capturing.' }
    ],
    sampleResponse: {
      url: 'https://example.com',
      title: 'Example Domain',
      markdown: '# Example Domain\nThis domain is for use in illustrative examples in documents.',
      wordCount: 35
    }
  },
  {
    id: 'selector',
    name: 'Scrape Specific CSS Selector',
    method: 'POST',
    path: '/v1/scrape',
    group: 'Web Scraping & Media',
    description: 'Sends URL and CSS selectors to extract targeted markup fragments in clean Markdown format.',
    tierAccess: {
      BASIC: 'Blocked.',
      PRO: 'Unlocked. Wait timeout capped at 5,000ms.',
      ULTRA: 'Unlocked. Wait timeout capped at 15,000ms.'
    },
    parameters: [
      { name: 'url', in: 'body', type: 'string', required: true, description: 'Target website URL.' },
      { name: 'selector', in: 'body', type: 'string', required: true, description: 'CSS selector target (e.g. article.main).' },
      { name: 'blockMedia', in: 'body', type: 'boolean', required: false, default: true, description: 'Skip media loading.' }
    ],
    sampleResponse: {
      url: 'https://example.com',
      selector: 'h1',
      markdown: '# Example Domain',
      wordCount: 2
    }
  },
  {
    id: 'raw',
    name: 'Scrape Raw HTML Source',
    method: 'GET',
    path: '/v1/scrape/raw',
    group: 'Web Scraping & Media',
    description: 'Loads webpage in a stealth headless browser, bypassing Cloudflare/anti-bot walls, and returns raw HTML source.',
    tierAccess: {
      BASIC: 'Blocked.',
      PRO: 'Unlocked. Wait timeout capped at 5,000ms.',
      ULTRA: 'Unlocked. Wait timeout capped at 15,000ms.'
    },
    parameters: [
      { name: 'url', in: 'query', type: 'string', required: true, description: 'Target website URL.' },
      { name: 'blockMedia', in: 'query', type: 'boolean', required: false, default: true, description: 'Block page resource loads.' }
    ],
    sampleResponse: '<!DOCTYPE html><html><head><title>Example Domain</title></head><body>...</body></html>'
  },
  {
    id: 'metadata',
    name: 'Extract SEO Metadata Only',
    method: 'GET',
    path: '/v1/scrape/metadata',
    group: 'Web Scraping & Media',
    description: 'Scrapes headers and script nodes to fetch OpenGraph cards, Twitter cards, meta descriptions, and microdata JSON-LD tags.',
    tierAccess: {
      BASIC: 'Unlocked.',
      PRO: 'Unlocked.',
      ULTRA: 'Unlocked.'
    },
    parameters: [
      { name: 'url', in: 'query', type: 'string', required: true, description: 'Target website URL.' }
    ],
    sampleResponse: {
      title: 'Example Domain',
      description: 'Illustrative examples for documentation.',
      openGraph: {
        title: 'Example Domain',
        type: 'website'
      },
      jsonLd: []
    }
  },
  {
    id: 'status',
    name: 'SSL & Domain Status Auditor',
    method: 'GET',
    path: '/v1/scrape/status',
    group: 'Web Scraping & Media',
    description: 'Resolves IP directories, measures response headers latency, and checks SSL certificate encryption details.',
    tierAccess: {
      BASIC: 'Unlocked.',
      PRO: 'Unlocked.',
      ULTRA: 'Unlocked.'
    },
    parameters: [
      { name: 'url', in: 'query', type: 'string', required: true, description: 'Target website URL.' }
    ],
    sampleResponse: {
      url: 'https://stripe.com',
      ip: '3.18.12.1',
      statusCode: 200,
      latencyMs: 142,
      ssl: {
        valid: true,
        issuer: 'DigiCert SHA2 Extended Validation Server CA',
        validFrom: '2025-01-01',
        validTo: '2027-01-01',
        daysRemaining: 580
      }
    }
  },
  {
    id: 'screenshot',
    name: 'Capture Webpage Screenshot',
    method: 'GET',
    path: '/v1/screenshot',
    group: 'Web Scraping & Media',
    description: 'Captures and returns the visual display of the target webpage as a binary stream of PNG image data.',
    tierAccess: {
      BASIC: 'Unlocked. Wait timeout capped at 1,000ms.',
      PRO: 'Unlocked. Wait timeout capped at 5,000ms.',
      ULTRA: 'Unlocked. Wait timeout capped at 15,000ms.'
    },
    parameters: [
      { name: 'url', in: 'query', type: 'string', required: true, description: 'Target website URL.' },
      { name: 'fullPage', in: 'query', type: 'boolean', required: false, default: true, description: 'Renders the entire document height.' }
    ],
    sampleResponse: '[Binary PNG Stream]'
  },
  {
    id: 'element_screenshot',
    name: 'Capture CSS Element Crop',
    method: 'GET',
    path: '/v1/screenshot/element',
    group: 'Web Scraping & Media',
    description: 'Takes a visual PNG snapshot cropped precisely to the bounding box of a target CSS selector.',
    tierAccess: {
      BASIC: 'Blocked.',
      PRO: 'Unlocked.',
      ULTRA: 'Unlocked.'
    },
    parameters: [
      { name: 'url', in: 'query', type: 'string', required: true, description: 'Target website URL.' },
      { name: 'selector', in: 'query', type: 'string', required: true, description: 'Target CSS selector (e.g. #dashboard-chart).' }
    ],
    sampleResponse: '[Binary PNG Stream]'
  },
  {
    id: 'pdf',
    name: 'Convert Webpage to PDF',
    method: 'GET',
    path: '/v1/pdf',
    group: 'Web Scraping & Media',
    description: 'Converts target website layouts into standardized, print-optimized vector PDF file streams.',
    tierAccess: {
      BASIC: 'Blocked.',
      PRO: 'Unlocked.',
      ULTRA: 'Unlocked.'
    },
    parameters: [
      { name: 'url', in: 'query', type: 'string', required: true, description: 'Target website URL.' }
    ],
    sampleResponse: '[Binary PDF Stream]'
  },
  {
    id: 'html_pdf',
    name: 'Convert Raw HTML to PDF',
    method: 'POST',
    path: '/v1/pdf',
    group: 'Web Scraping & Media',
    description: 'Compiles raw HTML snippets sent in request body directly into A4 vector PDF files.',
    tierAccess: {
      BASIC: 'Blocked.',
      PRO: 'Unlocked.',
      ULTRA: 'Unlocked.'
    },
    parameters: [
      { name: 'html', in: 'body', type: 'string', required: true, description: 'Raw HTML markup snippet code.' }
    ],
    sampleResponse: '[Binary PDF Stream]'
  },
  {
    id: 'emails',
    name: 'Extract Page Emails & Socials',
    method: 'GET',
    path: '/v1/scrape/emails',
    group: 'Data Extraction & Search',
    description: 'Scrapes webpage markup and script logs to harvest corporate contact details, phone numbers, and socials.',
    tierAccess: {
      BASIC: 'Blocked.',
      PRO: 'Blocked.',
      ULTRA: 'Full Access.'
    },
    parameters: [
      { name: 'url', in: 'query', type: 'string', required: true, description: 'Target website URL.' }
    ],
    sampleResponse: {
      emails: ['info@stripe.com', 'support@stripe.com'],
      phones: ['+1-877-254-2199'],
      socials: {
        linkedin: 'https://linkedin.com/company/stripe',
        twitter: 'https://twitter.com/stripe'
      }
    }
  },
  {
    id: 'links',
    name: 'Extract Page Hyperlinks',
    method: 'GET',
    path: '/v1/scrape/links',
    group: 'Data Extraction & Search',
    description: 'Crawls and compiles all links on a page, cataloging their tags, innerText, and grouping internal/external anchors.',
    tierAccess: {
      BASIC: 'Unlocked.',
      PRO: 'Unlocked.',
      ULTRA: 'Unlocked.'
    },
    parameters: [
      { name: 'url', in: 'query', type: 'string', required: true, description: 'Target website URL.' }
    ],
    sampleResponse: {
      url: 'https://example.com',
      linksCount: 1,
      links: [
        { text: 'More information...', href: 'https://www.iana.org/domains/reserved', type: 'external' }
      ]
    }
  },
  {
    id: 'table',
    name: 'Parse Tables to JSON',
    method: 'GET',
    path: '/v1/scrape/table',
    group: 'Data Extraction & Search',
    description: 'Identifies table matrices in target webpage documents and parses columns/rows into standard JSON datasets.',
    tierAccess: {
      BASIC: 'Unlocked.',
      PRO: 'Unlocked.',
      ULTRA: 'Unlocked.'
    },
    parameters: [
      { name: 'url', in: 'query', type: 'string', required: true, description: 'Target website URL.' }
    ],
    sampleResponse: [
      {
        tableIndex: 0,
        headers: ['Product', 'Price'],
        rows: [
          { 'Product': 'Basic Plan', 'Price': '$0' },
          { 'Product': 'Pro Plan', 'Price': '$49' }
        ]
      }
    ]
  },
  {
    id: 'search',
    name: 'Organic Google Web Search',
    method: 'GET',
    path: '/v1/search',
    group: 'Data Extraction & Search',
    description: 'Executes organic web search queries with DuckDuckGo fallback mechanisms to guarantee 100% uptime.',
    tierAccess: {
      BASIC: 'Max 3 results per query.',
      PRO: 'Max 10 results per query.',
      ULTRA: 'Max 50 results per query.'
    },
    parameters: [
      { name: 'q', in: 'query', type: 'string', required: true, description: 'Search term keyword query.' },
      { name: 'num', in: 'query', type: 'number', required: false, default: 10, description: 'Number of results to retrieve.' }
    ],
    sampleResponse: {
      query: 'cats',
      resultsCount: 1,
      results: [
        { title: 'Cat - Wikipedia', link: 'https://en.wikipedia.org/wiki/Cat', snippet: 'The cat is a domestic species of small carnivorous mammal...' }
      ]
    }
  },
  {
    id: 'images',
    name: 'Google Images Search',
    method: 'GET',
    path: '/v1/search/images',
    group: 'Data Extraction & Search',
    description: 'Searches and indexes image resource items matching search query inputs with Bing Image failover.',
    tierAccess: {
      BASIC: 'Max 3 image links per query.',
      PRO: 'Max 10 image links per query.',
      ULTRA: 'Max 50 image links per query.'
    },
    parameters: [
      { name: 'q', in: 'query', type: 'string', required: true, description: 'Image search term.' },
      { name: 'num', in: 'query', type: 'number', required: false, default: 10, description: 'Count of image URLs.' }
    ],
    sampleResponse: {
      query: 'kittens',
      resultsCount: 1,
      results: [
        { title: 'Cute kittens playing', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba', link: 'https://unsplash.com/s/photos/cat' }
      ]
    }
  },
  {
    id: 'news',
    name: 'Google News SERP Scraper',
    method: 'GET',
    path: '/v1/search/news',
    group: 'Data Extraction & Search',
    description: 'Retrieves global or regional Google News matching search queries, parsing articles, outlets, and publishing dates.',
    tierAccess: {
      BASIC: 'Max 3 news results per query.',
      PRO: 'Max 10 news results per query.',
      ULTRA: 'Max 50 news results per query.'
    },
    parameters: [
      { name: 'q', in: 'query', type: 'string', required: true, description: 'News query terms.' },
      { name: 'num', in: 'query', type: 'number', required: false, default: 10, description: 'Max articles count.' }
    ],
    sampleResponse: {
      query: 'tech stocks',
      resultsCount: 1,
      results: [
        { title: 'Tech Stocks Rise on AI Earnings', link: 'https://finance.yahoo.com/news/...', source: 'Yahoo Finance', date: '2 hours ago' }
      ]
    }
  },
  {
    id: 'suggest',
    name: 'Autocomplete Suggestions',
    method: 'GET',
    path: '/v1/search/suggest',
    group: 'Data Extraction & Search',
    description: 'Retrieves search engine autocomplete suggest queries for keyword expansion and SEO campaign tags planning.',
    tierAccess: {
      BASIC: 'Unlocked.',
      PRO: 'Unlocked.',
      ULTRA: 'Unlocked.'
    },
    parameters: [
      { name: 'q', in: 'query', type: 'string', required: true, description: 'Seed search keyword phrase.' }
    ],
    sampleResponse: {
      query: 'how to code',
      suggestions: [
        'how to code in python',
        'how to code a website',
        'how to code for beginners'
      ]
    }
  }
];
