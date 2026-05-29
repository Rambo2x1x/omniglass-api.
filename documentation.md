# OmniGlass API - Premium Developer Documentation

Welcome to the **OmniGlass API**! This premium, high-performance, stateless API combines enterprise-grade B2B contact verification, deep email deliverability auditing, stealth web scraping, dynamic browser rendering (screenshots and PDFs), and organic search engine SERP extraction under one unified developer key.

---

## 🔑 Authentication

All API requests must pass through the RapidAPI proxy. You must supply your unique RapidAPI credentials in the request headers:

| Header Name | Description |
|---|---|
| `X-RapidAPI-Key` | Your RapidAPI application subscription key. |
| `X-RapidAPI-Host` | `omniglass-api.p.rapidapi.com` |

---

## 📈 Subscription Tiers & Feature Locks

Our backend automatically enforces plan-specific tier limitations:

| Feature / Limit | BASIC (Free) | PRO | ULTRA / MEGA |
|---|---|---|---|
| **Markdown Scrape (`/v1/scrape`)** | Unlocked (No selector) | Unlocked (Selector enabled) | Unlocked (Selector enabled) |
| **Raw HTML Scraper (`/v1/scrape/raw`)**| ❌ Locked | Unlocked | Unlocked |
| **PDF Renderer (`/v1/pdf`)** | ❌ Locked | Unlocked | Unlocked |
| **Element Screenshot (`/element`)** | ❌ Locked | Unlocked | Unlocked |
| **Domain Enrichment (`/v1/enrich/domain`)**| ❌ Locked | Unlocked | Unlocked |
| **Email Enrichment (`/v1/enrich/email`)** | ❌ Locked | ❌ Locked | Unlocked |
| **Lead Gen (`/v1/scrape/emails`)** | ❌ Locked | ❌ Locked | Unlocked |
| **Stealth Proxies & JS Execution** | ❌ Locked | ❌ Locked | Unlocked |
| **Max Web/News/Image Search** | Max 3 results | Max 10 results | Max 50 results |
| **Max Render Wait Time (`wait`)** | Max 1,000ms | Max 5,000ms | Max 15,000ms |

---

## 🚀 Endpoints List

### 📁 Group 1: B2B Intel & Verification

#### 1. Verify Email Deliverability (`GET/POST /v1/verify/email`)
Checks format validity, queries MX DNS records, runs SMTP handshakes to confirm mailbox existence, and identifies catch-all servers.
* **Query / JSON Body Parameters:**
  - `email` (String, Required): Target email address to check.
  - `syntaxOnly` (Boolean, Optional): Skips DNS and SMTP checks. Forced to `true` on BASIC.

#### 2. Validate Phone Formats (`GET /v1/verify/phone`)
Validates phone formats to international standard E.164, maps countries, and formats display strings.
* **Query Parameters:**
  - `phone` (String, Required): Target phone number string (e.g. `+14155552671`).

#### 3. Enrich Domain Profile (`GET/POST /v1/enrich/domain`)
Profiles a domain to extract descriptions, social links, technology stacks, and audits security DNS records. *(Locked on BASIC)*
* **Query / JSON Body Parameters:**
  - `domain` (String, Required): Target domain to check (e.g. `stripe.com`).

#### 4. Enrich Email & Company Profile (`GET/POST /v1/enrich/email`)
Combines B2B name extraction, email deliverability validation, and company profile enrichment in a single call. *(Locked on BASIC & PRO)*
* **Query / JSON Body Parameters:**
  - `email` (String, Required): Target email address to enrich.

---

### 📁 Group 2: Core Scraping & Extraction

#### 5. Scrape Webpage to Markdown (`GET /v1/scrape`)
Extracts clean, readable content (Markdown format) and structured SEO metadata from any page.
* **Query Parameters:**
  - `url` (String, Required): Target website URL.
  - `blockMedia` (Boolean, Optional): Automatically blocks images, fonts, and stylesheets to save bandwidth. Defaults to `true`.
  - `wait` (Number, Optional): Timeout in milliseconds. (Max 1,000ms on BASIC, 5,000ms on PRO, 15,000ms on ULTRA/MEGA).

#### 6. Scrape Specific Element Selector (`POST /v1/scrape`)
Extracts content matching a specific CSS selector. *(Locked on BASIC)*
* **JSON Body Parameters:**
  - `url` (String, Required): Target website URL.
  - `selector` (String, Required): A CSS selector (e.g. `article.post-content`).

#### 7. Raw HTML Source Scraper (`GET/POST /v1/scrape/raw`)
Bypasses bot blocks and returns the raw HTML source code of the webpage. *(Locked on BASIC)*
* **Query / JSON Body Parameters:**
  - `url` (String, Required): Target website URL.

#### 8. Extract SEO Metadata Only (`GET/POST /v1/scrape/metadata`)
Extracts OpenGraph, Twitter Cards, SEO tags, and ld+json schemas without downloading page body.
* **Query / JSON Body Parameters:**
  - `url` (String, Required): Target website URL.

#### 9. SSL & Domain Status Auditor (`GET /v1/scrape/status`)
Audits website status, measures DNS response time, and retrieves SSL certificate details.
* **Query Parameters:**
  - `url` (String, Required): Target webpage URL to check.

---

### 📁 Group 3: Media & Generation

#### 10. Capture Webpage Screenshot (`GET /v1/screenshot`)
Generates premium, pixel-perfect PNG screenshots of any desktop web layout.
* **Query Parameters:**
  - `url` (String, Required): Target website URL.
  - `fullPage` (Boolean, Optional): Captures the entire height of the site. Defaults to `true`.

#### 11. Capture Element Screenshot (`GET /v1/screenshot/element`)
Renders webpage and screenshots *only* the bounding box of a specific CSS selector. *(Locked on BASIC)*
* **Query Parameters:**
  - `url` (String, Required): Target website URL.
  - `selector` (String, Required): The CSS selector of the element to capture (e.g., `#chart-div`).

#### 12. Convert Webpage to PDF (`GET /v1/pdf`)
Renders dynamic webpages into print-optimized PDF documents. *(Locked on BASIC)*
* **Query Parameters:**
  - `url` (String, Required): Target webpage URL to download as PDF.

#### 13. Convert HTML to PDF (`POST /v1/pdf`)
Renders raw HTML templates into PDF documents. *(Locked on BASIC)*
* **JSON Body Parameters:**
  - `html` (String, Required): Direct raw HTML string to compile into a PDF.

---

### 📁 Group 4: Advanced Scrapes & Lead Gen

#### 14. Extract Emails & Social Handles (`GET/POST /v1/scrape/emails`)
Scans any page and extracts contact details including emails, phone numbers, and social media links. *(Locked on BASIC and PRO)*
* **Parameters:**
  - `url` (String, Required): Target webpage URL.

#### 15. Extract Page Links (`GET/POST /v1/scrape/links`)
Extracts and categorizes all hyperlinks from any page. Great for SEO audits.
* **Parameters:**
  - `url` (String, Required): Target webpage URL.

#### 16. Parse Tables to JSON (`GET/POST /v1/scrape/table`)
Automatically detects tables on any page, parsing them into structured JSON arrays.
* **Parameters:**
  - `url` (String, Required): Target webpage URL.

---

### 📁 Group 5: Search & Discovery

#### 17. Organic Web Search (`GET /v1/search`)
Fetches search results with DuckDuckGo fallback to guarantee 100% SERP scraping uptime.
* **Query Parameters:**
  - `q` (String, Required): Search query term.
  - `num` (Number, Optional): Number of results to return.

#### 18. Organic Image Search (`GET /v1/search/images`)
Searches image results with Bing Images fallback to guarantee 100% image scraping uptime.
* **Query Parameters:**
  - `q` (String, Required): Search query term.
  - `num` (Number, Optional): Number of results to return.

#### 19. Google News Search (`GET/POST /v1/search/news`)
Searches Google News with failover to Bing News for news tracking.
* **Query / JSON Body Parameters:**
  - `q` or `query` (String, Required): News query.
  - `num` (Number, Optional): Number of news articles to return.

#### 20. Keyword Autocomplete suggestions (`GET /v1/search/suggest`)
Queries Google Suggest API to return parsed autocomplete options for SEO keyword research.
* **Query Parameters:**
  - `q` or `query` (String, Required): Seed keyword term.

---

## 💻 Code Integration Snippets (RapidAPI Sandbox)

### 1. JavaScript (Fetch API - Screenshot PNG)
```javascript
const options = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Key': 'your_rapidapi_key_here',
    'X-RapidAPI-Host': 'omniglass-api.p.rapidapi.com'
  }
};

fetch('https://omniglass-api.p.rapidapi.com/v1/screenshot?url=https%3A%2F%2Fstripe.com', options)
  .then(response => response.blob())
  .then(blob => {
    // Handle image file stream locally
  })
  .catch(err => console.error(err));
```

### 2. Python (Requests - B2B Email Enrichment)
```python
import requests

url = "https://omniglass-api.p.rapidapi.com/v1/enrich/email"
querystring = {"email": "alex.jones@stripe.com"}

headers = {
    "X-RapidAPI-Key": "your_rapidapi_key_here",
    "X-RapidAPI-Host": "omniglass-api.p.rapidapi.com"
}

response = requests.get(url, headers=headers, params=querystring)
print(response.json())
```

### 3. cURL (Markdown Scrape)
```bash
curl --request GET \
  --url 'https://omniglass-api.p.rapidapi.com/v1/scrape?url=https%3A%2F%2Fexample.com' \
  --header 'X-RapidAPI-Host: omniglass-api.p.rapidapi.com' \
  --header 'X-RapidAPI-Key: your_rapidapi_key_here'
```
