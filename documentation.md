# OmniScrape Pro - Premium Developer Documentation

Welcome to the **OmniScrape Pro API**! This premium, high-performance, stateless API is designed to bypass modern anti-bot systems (Cloudflare, Akamai, Datadome) using advanced stealth browser fingerprinting and direct-fetch fallback engines. 

Below you will find detailed endpoint specifications, configuration parameters, and ready-to-use code snippets in **cURL**, **Node.js**, and **Python**.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Subscription Tier & Limits](#subscription-tier--limits)
3. [Endpoints](#endpoints)
   - [Group 1: Core Scraping & Extraction](#group-1-core-scraping--extraction)
     - [Scrape Webpage to Markdown (`GET /v1/scrape`)](#scrape-webpage-to-markdown-get-v1scrape)
     - [Scrape Specific Element Selector (`POST /v1/scrape`)](#scrape-specific-element-selector-post-v1scrape)
     - [Scrape Raw HTML Source (`GET/POST /v1/scrape/raw`)](#scrape-raw-html-source-getpost-v1scraperaw)
     - [Extract SEO Metadata Only (`GET/POST /v1/scrape/metadata`)](#extract-seo-metadata-only-getpost-v1scrapemetadata)
     - [SSL & Domain Auditor (`GET /v1/scrape/status`)](#ssl--domain-auditor-get-v1scrapestatus)
   - [Group 2: Media & Generation](#group-2-media--generation)
     - [Capture Webpage Screenshot (`GET /v1/screenshot`)](#capture-webpage-screenshot-get-v1screenshot)
     - [Capture Element Screenshot (`GET /v1/screenshot/element`)](#capture-element-screenshot-get-v1screenshotelement)
     - [Convert Webpage to PDF (`GET /v1/pdf`)](#convert-webpage-to-pdf-get-v1pdf)
     - [Convert HTML to PDF (`POST /v1/pdf`)](#convert-html-to-pdf-post-v1pdf)
   - [Group 3: Advanced Scrapes & Lead Gen](#group-3-advanced-scrapes--lead-gen)
     - [Extract Emails & Social Handles (`GET/POST /v1/scrape/emails`)](#extract-emails--social-handles-getpost-v1scrapeemails)
     - [Extract Page Links (`GET/POST /v1/scrape/links`)](#extract-page-links-getpost-v1scrapelinks)
     - [Parse Tables to JSON (`GET/POST /v1/scrape/table`)](#parse-tables-to-json-getpost-v1scrapetable)
   - [Group 4: Search & Discovery](#group-4-search--discovery)
     - [Organic Web Search (`GET /v1/search`)](#organic-web-search-get-v1search)
     - [Organic Image Search (`GET /v1/search/images`)](#organic-image-search-get-v1searchimages)
     - [Google News Search (`GET/POST /v1/search/news`)](#google-news-search-getpost-v1searchnews)
     - [Keyword Autocomplete Suggestions (`GET /v1/search/suggest`)](#keyword-autocomplete-suggestions-get-v1searchsuggest)

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
| **Raw HTML Scraper (`/raw`)** | ❌ Locked | Unlocked | Unlocked |
| **PDF Renderer (`/v1/pdf`)** | ❌ Locked | Unlocked | Unlocked |
| **Element Screenshot (`/element`)** | ❌ Locked | Unlocked | Unlocked |
| **Lead Gen (`/v1/scrape/emails`)** | ❌ Locked | ❌ Locked | Unlocked |
| **Max Web/News/Image Search** | Max 3 | Max 10 | Max 50 |
| **Max Render Wait Time (`wait`)** | Max 1,000ms | Max 5,000ms | Max 15,000ms |

---

## Endpoints

### Group 1: Core Scraping & Extraction

#### Scrape Webpage to Markdown (`GET /v1/scrape`)
Extracts clean, readable content (Markdown format) and structured SEO metadata from any page.

* **Method:** `GET`
* **Query Parameters:**
  - `url` (String, Required): Target website URL.
  - `blockMedia` (Boolean, Optional): Automatically blocks images, fonts, and stylesheets to save bandwidth. Defaults to `true`.

#### Scrape Specific Element Selector (`POST /v1/scrape`)
Extracts content matching a CSS selector. *(Locked on BASIC)*

* **Method:** `POST`
* **JSON Body Parameters:**
  - `url` (String, Required): Target website URL.
  - `selector` (String, Required): A CSS selector (e.g. `article.post-content`).

#### Scrape Raw HTML Source (`GET/POST /v1/scrape/raw`)
Bypasses bot blocks and returns the raw HTML source code of the webpage. *(Locked on BASIC)*

* **Method:** `GET` or `POST`
* **Query / JSON Body Parameters:**
  - `url` (String, Required): Target website URL.

#### Extract SEO Metadata Only (`GET/POST /v1/scrape/metadata`)
Extracts OpenGraph, Twitter Cards, SEO tags, and ld+json schemas without body download.

* **Method:** `GET` or `POST`
* **Query / JSON Body Parameters:**
  - `url` (String, Required): Target website URL.

#### SSL & Domain Auditor (`GET /v1/scrape/status`)
Audits website status, measures DNS response time, and retrieves SSL certificate details.

* **Method:** `GET`
* **Query Parameters:**
  - `url` (String, Required): Target webpage URL to check.

---

### Group 2: Media & Generation

#### Capture Webpage Screenshot (`GET /v1/screenshot`)
Generates premium, pixel-perfect PNG screenshots of any desktop web layout.

* **Method:** `GET`
* **Query Parameters:**
  - `url` (String, Required): Target website URL.
  - `fullPage` (Boolean, Optional): Captures the entire height of the site. Defaults to `true`.

#### Capture Element Screenshot (`GET /v1/screenshot/element`)
Renders webpage and screenshots *only* the bounding box of a specific CSS selector. *(Locked on BASIC)*

* **Method:** `GET`
* **Query Parameters:**
  - `url` (String, Required): Target website URL.
  - `selector` (String, Required): The CSS selector of the element to capture (e.g., `#chart-div`).

#### Convert Webpage to PDF (`GET /v1/pdf`)
Renders dynamic webpages into print-optimized PDF documents. *(Locked on BASIC)*

* **Method:** `GET`
* **Query Parameters:**
  - `url` (String, Required): Target webpage URL to download as PDF.

#### Convert HTML to PDF (`POST /v1/pdf`)
Renders raw HTML snippets into PDF documents. *(Locked on BASIC)*

* **Method:** `POST`
* **JSON Body Parameters:**
  - `html` (String, Required): Direct raw HTML string to compile into a PDF.

---

### Group 3: Advanced Scrapes & Lead Gen

#### Extract Emails & Social Handles (`GET/POST /v1/scrape/emails`)
Scans any page and extracts contact details including emails, phone numbers, and social media links. *(Locked on BASIC and PRO)*

* **Method:** `GET` or `POST`
* **Parameters:**
  - `url` (String, Required): Target webpage URL.

#### Extract Page Links (`GET/POST /v1/scrape/links`)
Extracts and categorizes all hyperlinks from any page. Great for SEO audits.

* **Method:** `GET` or `POST`
* **Parameters:**
  - `url` (String, Required): Target webpage URL.

#### Parse Tables to JSON (`GET/POST /v1/scrape/table`)
Automatically detects tables on any page, parsing them into structured JSON arrays.

* **Method:** `GET` or `POST`
* **Parameters:**
  - `url` (String, Required): Target webpage URL.

---

### Group 4: Search & Discovery

#### Organic Web Search (`GET /v1/search`)
Fetches search results with DuckDuckGo fallback to guarantee 100% SERP scraping uptime.

* **Method:** `GET`
* **Query Parameters:**
  - `q` (String, Required): Search query term.
  - `num` (Number, Optional): Number of results to return.

#### Organic Image Search (`GET /v1/search/images`)
Searches image results with Bing Images fallback to guarantee 100% image scraping uptime.

* **Method:** `GET`
* **Query Parameters:**
  - `q` (String, Required): Search query term.
  - `num` (Number, Optional): Number of results to return.

#### Google News Search (`GET/POST /v1/search/news`)
Searches Google News with failover to Bing News for news tracking.

* **Method:** `GET` or `POST`
* **Query / JSON Body Parameters:**
  - `q` or `query` (String, Required): News query.
  - `num` (Number, Optional): Number of news articles to return.

#### Keyword Autocomplete Suggestions (`GET /v1/search/suggest`)
Queries Google Suggest API to return parsed autocomplete options for SEO keyword research.

* **Method:** `GET`
* **Query Parameters:**
  - `q` or `query` (String, Required): Seed keyword term.
