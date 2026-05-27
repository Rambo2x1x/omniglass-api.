# OmniScrape Pro - Premium Developer Documentation

Welcome to the **OmniScrape Pro API**! This premium, high-performance, stateless API is designed to bypass modern anti-bot systems (Cloudflare, Akamai, Datadome) using advanced stealth browser fingerprinting and direct-fetch fallback engines. 

Below you will find detailed endpoint specifications, configuration parameters, and ready-to-use code snippets in **cURL**, **Node.js**, and **Python**.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Subscription Tier & Limits](#subscription-tier--limits)
3. [Endpoints](#endpoints)
   - [Group 1: Core Scraping & Extraction](#group-1-core-scraping--extraction)
     - [Scrape Webpage to Markdown (`GET/POST /v1/scrape`)](#scrape-webpage-to-markdown-getpost-v1scrape)
   - [Group 2: Media & Generation](#group-2-media--generation)
     - [Capture Webpage Screenshot (`GET /v1/screenshot`)](#capture-webpage-screenshot-get-v1screenshot)
     - [Capture Element Screenshot (`GET /v1/screenshot/element`)](#capture-element-screenshot-get-v1screenshotelement)
     - [Print PDF Document (`GET/POST /v1/pdf`)](#print-pdf-document-getpost-v1pdf)
   - [Group 3: Advanced Scrapes & Lead Gen](#group-3-advanced-scrapes--lead-gen)
     - [Extract Emails & Social Handles (`GET/POST /v1/scrape/emails`)](#extract-emails--social-handles-getpost-v1scrapeemails)
     - [Extract Page Links (`GET/POST /v1/scrape/links`)](#extract-page-links-getpost-v1scrapelinks)
     - [Parse Tables to JSON (`GET/POST /v1/scrape/table`)](#parse-tables-to-json-getpost-v1scrapetable)
   - [Group 4: Search & Discovery](#group-4-search--discovery)
     - [Organic Web Search (`GET/POST /v1/search`)](#organic-web-search-getpost-v1search)
     - [Organic Image Search (`GET/POST /v1/search/images`)](#organic-image-search-getpost-v1searchimages)

---

## Authentication

All API requests must pass through the RapidAPI proxy. You must supply your unique RapidAPI credentials in the headers:

| Header Name | Description |
|---|---|
| `X-RapidAPI-Key` | Your RapidAPI application subscription key. |
| `X-RapidAPI-Host` | `omniscrape-api.p.rapidapi.com` |

---

## Subscription Tier & Limits

Our backend automatically enforces plan-specific tier limitations to incentivize users to upgrade to premium plans:

| Feature / Limit | BASIC (Free) | PRO | ULTRA / MEGA |
|---|---|---|---|
| **Markdown Scrape (`/v1/scrape`)** | Unlocked (No selector) | Unlocked (Selector enabled) | Unlocked (Selector enabled) |
| **PDF Renderer (`/v1/pdf`)** | ❌ Locked | Unlocked | Unlocked |
| **Element Screenshot (`/element`)** | ❌ Locked | Unlocked | Unlocked |
| **Lead Gen (`/v1/scrape/emails`)** | ❌ Locked | ❌ Locked | Unlocked |
| **Max Web Search Results (`num`)** | Max 3 | Max 10 | Max 50 |
| **Max Render Wait Time (`wait`)** | Max 1,000ms | Max 5,000ms | Max 15,000ms |

---

## Endpoints

### Group 1: Core Scraping & Extraction

#### Scrape Webpage to Markdown (`GET/POST /v1/scrape`)
Extracts clean, readable content (Markdown format) and structured SEO metadata from any page.

* **Method:** `GET` or `POST`
* **Query / JSON Body Parameters:**
  - `url` (String, Required): The target website URL.
  - `selector` (String, Optional): A CSS selector (e.g., `#main-content`, `article.post`) to extract *only* a specific DOM node. *(Locked on BASIC)*
  - `wait` (Number, Optional): Custom wait time in milliseconds.
  - `waitSelector` (String, Optional): Wait for a specific CSS element to render before scraping.
  - `blockMedia` (Boolean, Optional): Automatically blocks images, fonts, and stylesheets to save bandwidth. Defaults to `true`.

##### Request Example (cURL):
```bash
curl --request POST \
	--url 'https://omniscrape-api.p.rapidapi.com/v1/scrape' \
	--header 'Content-Type: application/json' \
	--header 'X-RapidAPI-Host: omniscrape-api.p.rapidapi.com' \
	--header 'X-RapidAPI-Key: YOUR_RAPIDAPI_KEY' \
	--data '{
		"url": "https://example.com",
		"blockMedia": true
	}'
```

##### Example JSON Response:
```json
{
  "title": "Example Domain",
  "description": "This domain is for use in illustrative examples in documents.",
  "keywords": "",
  "author": "",
  "language": "en",
  "ogImage": "",
  "wordCount": 125,
  "readingTimeMinutes": 1,
  "markdown": "# Example Domain\n\nThis domain is for use in illustrative examples...",
  "url": "https://example.com"
}
```

---

### Group 2: Media & Generation

#### Capture Webpage Screenshot (`GET /v1/screenshot`)
Generates premium, pixel-perfect PNG screenshots of any desktop web layout.

* **Method:** `GET`
* **Query Parameters:**
  - `url` (String, Required): Target website URL.
  - `fullPage` (Boolean, Optional): Captures the entire height of the site. Defaults to `true`.
  - `wait` (Number, Optional): Custom wait time in milliseconds.
  - `waitSelector` (String, Optional): Wait for a specific CSS element.
  - `blockMedia` (Boolean, Optional): Defaults to `false`.

---

#### Capture Element Screenshot (`GET /v1/screenshot/element`)
Renders webpage and screenshots *only* the bounding box of a specific CSS selector (e.g. a chart, table, or login box). *(Locked on BASIC)*

* **Method:** `GET`
* **Query Parameters:**
  - `url` (String, Required): Target website URL.
  - `selector` (String, Required): The CSS selector of the element to capture (e.g., `#chart-div`).
  - `wait` (Number, Optional) / `waitSelector` (String, Optional).

##### Request Example (cURL):
```bash
curl --request GET \
	--url 'https://omniscrape-api.p.rapidapi.com/v1/screenshot/element?url=https%3A%2F%2Fexample.com&selector=h1' \
	--header 'X-RapidAPI-Host: omniscrape-api.p.rapidapi.com' \
	--header 'X-RapidAPI-Key: YOUR_RAPIDAPI_KEY' \
	--output element.png
```

---

#### Print PDF Document (`GET/POST /v1/pdf`)
Renders dynamic webpages or raw HTML snippets into print-optimized PDF documents. *(Locked on BASIC)*

* **Method:** `GET` or `POST`
* **GET Query Parameters:**
  - `url` (String, Required): Target webpage URL to download as PDF.
* **POST JSON Body Parameters:**
  - `url` (String, Optional): Target webpage URL.
  - `html` (String, Optional): Direct raw HTML string to compile into a PDF.

---

### Group 3: Advanced Scrapes & Lead Gen

#### Extract Emails & Social Handles (`GET/POST /v1/scrape/emails`)
Scans any page and extracts contact details including emails, phone numbers, and social media links (LinkedIn, Twitter, Facebook, Instagram, GitHub). *(Locked on BASIC and PRO)*

* **Method:** `GET` or `POST`
* **Parameters:**
  - `url` (String, Required): Target webpage URL.

##### Example JSON Response:
```json
{
  "emails": ["info@company.com", "sales@company.com"],
  "phones": ["+1-555-0199"],
  "socials": {
    "linkedin": ["https://linkedin.com/company/example"],
    "twitter": ["https://twitter.com/example"],
    "facebook": ["https://facebook.com/example"],
    "instagram": [],
    "github": []
  }
}
```

---

#### Extract Page Links (`GET/POST /v1/scrape/links`)
Extracts and categorizes all hyperlinks from any page. Great for SEO audits and crawlers.

* **Method:** `GET` or `POST`
* **Parameters:**
  - `url` (String, Required): Target webpage URL.

##### Example JSON Response:
```json
{
  "url": "https://example.com",
  "internal": ["https://example.com/about", "https://example.com/contact"],
  "external": ["https://iana.org/domains/reserved"],
  "total": 3
}
```

---

#### Parse Tables to JSON (`GET/POST /v1/scrape/table`)
Automatically detects all tables on any page, parsing their headers and rows into clean JSON arrays.

* **Method:** `GET` or `POST`
* **Parameters:**
  - `url` (String, Required): Target webpage URL.

##### Example JSON Response:
```json
[
  {
    "id": 1,
    "headers": ["Product Name", "Price", "Stock"],
    "rows": [
      {
        "Product Name": "Premium Scraper Node",
        "Price": "$19.00",
        "Stock": "In Stock"
      }
    ]
  }
]
```

---

### Group 4: Search & Discovery

#### Organic Web Search (`GET/POST /v1/search`)
Fetches search results with DuckDuckGo fallback to guarantee 100% SERP scraping uptime.

* **Method:** `GET` or `POST`
* **Parameters:**
  - `q` or `query` (String, Required): Search query term.
  - `num` (Number, Optional): Number of results to return. *(Limited by plan tier)*

---

#### Organic Image Search (`GET/POST /v1/search/images`)
Searches image results with Bing Images fallback to guarantee 100% image scraping uptime.

* **Method:** `GET` or `POST`
* **Parameters:**
  - `q` or `query` (String, Required): Search query term.
  - `num` (Number, Optional): Number of results to return. *(Limited by plan tier)*
