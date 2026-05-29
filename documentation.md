# OmniGlass - B2B Intel & Developer Scraping API Documentation

Welcome to the unified **OmniGlass API**! This enterprise-grade platform combines B2B contact verification, domain security audits, stealth headless web scraping, browser media rendering (screenshots and PDFs), and organic search SERP extraction under one single developer access key.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Subscription Tier & Limits](#subscription-tier--limits)
3. [Group 1: B2B Intel & Verification](#group-1-b2b-intel--verification)
4. [Group 2: Core Web Scraping & HTML Extraction](#group-2-core-web-scraping--html-extraction)
5. [Group 3: Media & Document Generation](#group-3-media--document-generation)
6. [Group 4: Data Scraping & Search Engine SERPs](#group-4-data-scraping--search-engine-serps)
7. [Code Integration Snippets](#code-integration-snippets)

---

## Authentication

All API requests require authentication. You can authenticate either via a direct SaaS key in headers or via the RapidAPI marketplace proxy:

### 1. Direct SaaS Key
Provide your API key (`os_...`) generated from your developer dashboard using the following header:

| Header Name | Description |
|---|---|
| `X-API-Key` | Your active OmniGlass developer API key |

### 2. RapidAPI Marketplace Proxy
If routing via RapidAPI, supply your marketplace keys:

| Header Name | Description |
|---|---|
| `X-RapidAPI-Key` | Your RapidAPI application subscription key |
| `X-RapidAPI-Host` | `omniglass-api.p.rapidapi.com` |

---

## Subscription Tier & Limits

Our enforcer checks subscription tiers to adjust limits and unlock premium features:

| Feature / Endpoint | BASIC (Free) | PRO | ULTRA / MEGA |
|---|---|---|---|
| **Verify Email (`/v1/verify/email`)** | Unlocked (Syntax check only) | Unlocked (Deep MX checking) | Unlocked (Deep MX checking) |
| **Enrich Domain (`/v1/enrich/domain`)** | ❌ Locked | Unlocked | Unlocked |
| **Enrich Email (`/v1/enrich/email`)** | ❌ Locked | ❌ Locked | Unlocked |
| **Verify Phone (`/v1/verify/phone`)** | Unlocked | Unlocked | Unlocked |
| **Webpage Markdown Scrape (`/v1/scrape`)** | Unlocked (No selector) | Unlocked (Selector enabled) | Unlocked (Selector enabled) |
| **Raw HTML Scraper (`/raw`)** | ❌ Locked | Unlocked | Unlocked |
| **PDF Renderer (`/v1/pdf`)** | ❌ Locked | Unlocked | Unlocked |
| **Element Screenshot (`/element`)** | ❌ Locked | Unlocked | Unlocked |
| **Lead Gen (`/v1/scrape/emails`)** | ❌ Locked | ❌ Locked | Unlocked |
| **Max Web/News/Image Search** | Max 3 results | Max 10 results | Max 50 results |
| **Max Render Wait Time (`wait`)** | Max 1,000ms | Max 5,000ms | Max 15,000ms |
| **Rate Limit** | 10 requests / min | 100 requests / min | Unlimited |

---

## Group 1: B2B Intel & Verification

### 1. Verify Email Deliverability (`GET/POST /v1/verify/email`)
Checks email validity, performs MX DNS checks, runs SMTP connection handshakes on port 25, and flags catch-all mail servers.

* **Query/Body Parameters**:
  - `email` (String, Required): Target email address to check.
  - `syntaxOnly` (Boolean, Optional): Skip DNS MX and SMTP queries. Forced to `true` on BASIC tier.
* **Response Example**:
```json
{
  "email": "alex.jones@gmail.com",
  "isValid": true,
  "formatValid": true,
  "mxRecords": ["gmail-smtp-in.l.google.com."],
  "isDisposable": false,
  "isRoleAccount": false,
  "deliverable": "deliverable",
  "domain": "gmail.com",
  "user": "alex.jones",
  "smtpCheck": "deliverable",
  "isCatchAll": false
}
```

### 2. Validate Phone Formats (`GET /v1/verify/phone`)
Checks phone formats to international standard E.164, maps countries, and formats display strings.

* **Query Parameters**:
  - `phone` (String, Required): Target phone number string (e.g. `+14155552671`).
* **Response Example**:
```json
{
  "phone": "+14155552671",
  "isValid": true,
  "countryCode": "US",
  "countryName": "United States / Canada",
  "formatted": "+1 (415) 555-2671",
  "carrier": "AT&T Mobility (Simulated)"
}
```

### 3. Enrich Domain Profile (`GET/POST /v1/enrich/domain`)
Profiles a domain to extract descriptions, social links, technology stacks, and audits DNS records (SPF, DMARC, Name Servers).

* **Query/Body Parameters**:
  - `domain` (String, Required): Domain to check.
* **Response Example**:
```json
{
  "domain": "stripe.com",
  "name": "Stripe",
  "logo": "https://logo.clearbit.com/stripe.com",
  "description": "Online payment processing for internet businesses.",
  "title": "Stripe | Financial Infrastructure for the Internet",
  "socials": {
    "linkedin": "https://www.linkedin.com/company/stripe",
    "twitter": "https://twitter.com/stripe"
  },
  "techStack": ["React", "Stripe Payments"],
  "status": "UP",
  "dnsSecurity": {
    "spfRecord": "v=spf1 include:spf.stripe.com ~all",
    "spfValid": true,
    "dmarcRecord": "v=DMARC1; p=reject;...",
    "dmarcValid": true,
    "nameServers": ["dns1.cloudflare.com"]
  }
}
```

### 4. Enrich Email & Company Profile (`GET/POST /v1/enrich/email`)
Combines B2B name extraction, email deliverability, and domain B2B profile matching.

* **Query/Body Parameters**:
  - `email` (String, Required): Target email.
* **Response Example**:
```json
{
  "email": "alex.jones@stripe.com",
  "firstName": "Alex",
  "lastName": "Jones",
  "fullName": "Alex Jones",
  "verification": {
    "isValid": true,
    "deliverable": "deliverable",
    "smtpCheck": "deliverable",
    "isCatchAll": false
  },
  "company": {
    "domain": "stripe.com",
    "name": "Stripe",
    "logo": "https://logo.clearbit.com/stripe.com",
    "techStack": ["React", "Stripe Payments"],
    "dnsSecurity": {
      "spfValid": true,
      "dmarcValid": true
    }
  }
}
```

---

## Group 2: Core Web Scraping & HTML Extraction

### 5. Scrape Webpage to Markdown (`GET/POST /v1/scrape`)
Extracts clean, readable content (Markdown format) and SEO headers. Supports CSS selector crops on PRO and above plans.

* **Query/Body Parameters**:
  - `url` (String, Required): Target page URL.
  - `selector` (String, Optional): CSS selector to crop content (e.g. `article.post-content`).
  - `wait` (Number, Optional): Wait timeout in milliseconds before capturing.
  - `blockMedia` (Boolean, Optional): Block images/styles to save bandwidth. Defaults to `true`.
* **Response Example**:
```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "markdown": "# Example Domain\nThis domain is for use in illustrative examples...",
  "wordCount": 35
}
```

### 6. Scrape Raw HTML Source (`GET/POST /v1/scrape/raw`)
Bypasses anti-bot walls (Cloudflare/Akamai) and returns the raw HTML source code. *(Locked on BASIC)*

* **Query/Body Parameters**:
  - `url` (String, Required): Target page URL.

### 7. Extract SEO Metadata Only (`GET/POST /v1/scrape/metadata`)
Extracts OpenGraph (OG) cards, Twitter cards, meta descriptions, and JSON-LD schemas without downloading body content.

* **Query/Body Parameters**:
  - `url` (String, Required): Target page URL.

### 8. SSL & Domain Status Auditor (`GET /v1/scrape/status`)
Checks domain resolution response latency, DNS lookups, and SSL certificate validity.

* **Query Parameters**:
  - `url` (String, Required): Target URL.

---

## Group 3: Media & Document Generation

### 9. Capture Webpage Screenshot (`GET /v1/screenshot`)
Generates pixel-perfect PNG viewport screenshots of webpage layouts.

* **Query Parameters**:
  - `url` (String, Required): Target page URL.
  - `fullPage` (Boolean, Optional): Renders the entire height of the document. Defaults to `true`.
* **Response**: Binary stream of image content (`image/png`).

### 10. Capture CSS Element Crop (`GET /v1/screenshot/element`)
Crop screenshots matching a specific CSS selector (e.g. `#chart-container`). *(Locked on BASIC)*

* **Query Parameters**:
  - `url` (String, Required)
  - `selector` (String, Required)
* **Response**: Binary stream of image content (`image/png`).

### 11. Convert Webpage or HTML to PDF (`GET/POST /v1/pdf`)
Converts dynamic webpages or raw HTML script inputs (via `POST`) into print-optimized PDF documents. *(Locked on BASIC)*

* **Query/Body Parameters**:
  - `url` (String, for GET): Webpage URL.
  - `html` (String, for POST): Raw HTML code snippet to render.
* **Response**: Binary stream of PDF content (`application/pdf`).

---

## Group 4: Data Scraping & Search Engine SERPs

### 12. Extract Page Emails & Socials (`GET/POST /v1/scrape/emails`)
Scans a webpage's DOM for corporate contact details, social links, and phone dials. *(Locked on BASIC & PRO)*

* **Query/Body Parameters**:
  - `url` (String, Required)
* **Response Example**:
```json
{
  "emails": ["sales@company.com"],
  "phones": ["+1-415-555-0199"],
  "socials": {
    "linkedin": "https://linkedin.com/company/company",
    "twitter": "https://twitter.com/company"
  }
}
```

### 13. Extract Page Hyperlinks (`GET/POST /v1/scrape/links`)
Extracts and categorizes all hyperlinks from any page.

* **Query/Body Parameters**:
  - `url` (String, Required)

### 14. Parse Tables to JSON (`GET/POST /v1/scrape/table`)
Finds tables on webpages and parses their rows/cells into structured JSON arrays.

* **Query/Body Parameters**:
  - `url` (String, Required)

### 15. Organic Google Web Search (`GET/POST /v1/search`)
Fetches web search results with DuckDuckGo fallback to guarantee 100% uptime.

* **Query/Body Parameters**:
  - `q` (String, Required): Search query.
  - `num` (Number, Optional): Results count limit.
* **Response Example**:
```json
{
  "query": "cats",
  "resultsCount": 3,
  "results": [
    { "title": "Cat - Wikipedia", "link": "https://en.wikipedia.org/wiki/Cat" }
  ]
}
```

### 16. Google Images Search (`GET/POST /v1/search/images`)
Searches image results with Bing Images fallback.

* **Query/Body Parameters**:
  - `q` (String, Required)
  - `num` (Number, Optional)

### 17. Google News SERP Scraper (`GET/POST /v1/search/news`)
Searches Google News articles with Bing News failover.

* **Query/Body Parameters**:
  - `q` (String, Required)
  - `num` (Number, Optional)

### 18. Autocomplete Suggestions (`GET /v1/search/suggest`)
Queries search suggestions to return parsed autocomplete options for SEO keyword analysis.

* **Query Parameters**:
  - `q` (String, Required): Seed keyword term.

---

## Code Integration Snippets

### 1. cURL (Markdown Scrape)
```bash
curl -X GET "http://localhost:5000/v1/scrape?url=https://example.com" \
  -H "X-API-Key: os_your_api_key_here"
```

### 2. Node.js (Fetch API - Screenshot PNG)
```javascript
const apiKey = 'os_your_api_key_here';
const url = 'https://stripe.com';

fetch(`http://localhost:5000/v1/screenshot?url=${encodeURIComponent(url)}`, {
  headers: {
    'X-API-Key': apiKey
  }
})
  .then(res => res.blob())
  .then(imageBlob => {
    const localUrl = URL.createObjectURL(imageBlob);
    console.log('Local image URL generated:', localUrl);
  })
  .catch(err => console.error(err));
```

### 3. Python (Requests - B2B Email Enrichment)
```python
import requests

api_key = "os_your_api_key_here"
email = "alex.jones@stripe.com"

headers = {
    "X-API-Key": api_key,
    "Accept": "application/json"
}

url = f"http://localhost:5000/v1/enrich/email?email={email}"
response = requests.get(url, headers=headers)

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error {response.status_code}: {response.text}")
```
