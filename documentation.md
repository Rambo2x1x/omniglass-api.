# OmniScrape Pro - Premium Developer Documentation

Welcome to the **OmniScrape Pro API**! This premium, high-performance, stateless API is designed to bypass modern anti-bot systems (Cloudflare, Akamai, Datadome) using advanced stealth browser fingerprinting and direct-fetch fallback engines. 

Below you will find detailed endpoint specifications, configuration parameters, and ready-to-use code snippets in **cURL**, **Node.js**, and **Python**.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
   - [1. Webpage Scraper (`/v1/scrape`)](#1-webpage-scraper-v1scrape)
   - [2. Screenshot Generator (`/v1/screenshot`)](#2-screenshot-generator-v1screenshot)
   - [3. PDF Renderer (`/v1/pdf`)](#3-pdf-renderer-v1pdf)
   - [4. Organic Web Search (`/v1/search`)](#4-organic-web-search-v1search)
   - [5. Organic Image Search (`/v1/search/images`)](#5-organic-image-search-v1searchimages)
3. [Global Response Codes](#global-response-codes)

---

## Authentication

All API requests must pass through the RapidAPI proxy. You must supply your unique RapidAPI credentials in the headers:

| Header Name | Description |
|---|---|
| `X-RapidAPI-Key` | Your RapidAPI application subscription key. |
| `X-RapidAPI-Host` | `omniscrape-api.p.rapidapi.com` |

---

## Endpoints

### 1. Webpage Scraper (`/v1/scrape`)
Extracts clean, readable content (Markdown format) and structured SEO metadata from any page.

* **Method:** `GET` or `POST`
* **Query / JSON Body Parameters:**
  - `url` (String, Required): The target website URL.
  - `selector` (String, Optional): A CSS selector (e.g., `#main-content`, `article.post`) to extract *only* a specific DOM node.
  - `wait` (Number, Optional): Custom wait time in milliseconds (up to 10,000ms) to allow client-side Javascript execution.
  - `waitSelector` (String, Optional): Wait for a specific CSS element to render before scraping.
  - `blockMedia` (Boolean, Optional): Automatically blocks images, fonts, and stylesheets to save bandwidth and speed up responses. Defaults to `true`.

#### Example Code Snippet:
```bash
# cURL
curl --request POST \
	--url 'https://omniscrape-api.p.rapidapi.com/v1/scrape' \
	--header 'Content-Type: application/json' \
	--header 'X-RapidAPI-Host: omniscrape-api.p.rapidapi.com' \
	--header 'X-RapidAPI-Key: YOUR_RAPIDAPI_KEY' \
	--data '{
		"url": "https://example.com",
		"selector": "body",
		"blockMedia": true
	}'
```

```javascript
// Node.js (Fetch)
const response = await fetch('https://omniscrape-api.p.rapidapi.com/v1/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-RapidAPI-Host': 'omniscrape-api.p.rapidapi.com',
    'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY'
  },
  body: JSON.stringify({
    url: 'https://example.com',
    selector: 'body'
  })
});
const data = await response.json();
console.log(data);
```

```python
# Python
import requests

url = "https://omniscrape-api.p.rapidapi.com/v1/scrape"
headers = {
    "Content-Type": "application/json",
    "X-RapidAPI-Host": "omniscrape-api.p.rapidapi.com",
    "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY"
}
payload = {
    "url": "https://example.com",
    "selector": "body"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
```

#### Example JSON Response:
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
  "markdown": "# Example Domain\n\nThis domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.\n\n[More information...](https://www.iana.org/domains/reserved)",
  "url": "https://example.com"
}
```

---

### 2. Screenshot Generator (`/v1/screenshot`)
Generates premium, pixel-perfect PNG screenshots of any desktop web layout.

* **Method:** `GET`
* **Query Parameters:**
  - `url` (String, Required): Target website URL.
  - `fullPage` (Boolean, Optional): Captures the entire scrolling height of the site. Defaults to `true`.
  - `wait` (Number, Optional): Custom wait time in milliseconds.
  - `waitSelector` (String, Optional): Wait for a specific CSS element before capture.
  - `blockMedia` (Boolean, Optional): Defaults to `false` (to ensure images/stylesheets load for screenshot).

#### Example Code Snippet:
```bash
# cURL
curl --request GET \
	--url 'https://omniscrape-api.p.rapidapi.com/v1/screenshot?url=https%3A%2F%2Fexample.com&fullPage=true' \
	--header 'X-RapidAPI-Host: omniscrape-api.p.rapidapi.com' \
	--header 'X-RapidAPI-Key: YOUR_RAPIDAPI_KEY' \
	--output screenshot.png
```

---

### 3. PDF Renderer (`/v1/pdf`)
Renders websites or raw HTML snippets into print-optimized PDF documents.

* **Method:** `GET` or `POST`
* **GET Query Parameters:**
  - `url` (String, Required): Target webpage URL to download as PDF.
* **POST JSON Body Parameters:**
  - `url` (String, Optional): Target webpage URL.
  - `html` (String, Optional): Direct raw HTML string to compile into a PDF.

#### Example Code Snippet (HTML to PDF):
```bash
# cURL
curl --request POST \
	--url 'https://omniscrape-api.p.rapidapi.com/v1/pdf' \
	--header 'Content-Type: application/json' \
	--header 'X-RapidAPI-Host: omniscrape-api.p.rapidapi.com' \
	--header 'X-RapidAPI-Key: YOUR_RAPIDAPI_KEY' \
	--data '{
		"html": "<html><body><h1>OmniScrape Premium Invoice</h1><p>Thank you for your purchase.</p></body></html>"
	}' \
	--output invoice.pdf
```

---

### 4. Organic Web Search (`/v1/search`)
Fetches structured search engine results (SERP) bypassing consent pages and CAPTCHAs. Automatically falls back to high-uptime HTML discovery servers if primary endpoints are blocked.

* **Method:** `GET` or `POST`
* **Query / JSON Body Parameters:**
  - `q` or `query` (String, Required): Search query.
  - `num` (Number, Optional): Number of organic results to return (range: 1-20, default: 10).

#### Example JSON Response:
```json
{
  "query": "artificial intelligence news",
  "resultsCount": 2,
  "results": [
    {
      "title": "Artificial intelligence - latest news, updates and features - Nature",
      "url": "https://www.nature.com/subjects/artificial-intelligence",
      "snippet": "Latest news and research from Nature on Artificial intelligence, including articles, comments, and reviews."
    },
    {
      "title": "AI News - Artificial Intelligence News",
      "url": "https://www.artificialintelligence-news.com/",
      "snippet": "Read the latest Artificial Intelligence news, articles, and whitepapers. Explore machine learning, deep learning, cognitive computing, NLP, robotics, and more."
    }
  ]
}
```

---

### 5. Organic Image Search (`/v1/search/images`)
Searches Google Images and extracts raw high-resolution image URLs, page titles, and source site referrers.

* **Method:** `GET` or `POST`
* **Query / JSON Body Parameters:**
  - `q` or `query` (String, Required): Search query.
  - `num` (Number, Optional): Number of image results (range: 1-50, default: 10).

#### Example Code Snippet:
```bash
# cURL
curl --request GET \
	--url 'https://omniscrape-api.p.rapidapi.com/v1/search/images?q=space+nebula&num=5' \
	--header 'X-RapidAPI-Host: omniscrape-api.p.rapidapi.com' \
	--header 'X-RapidAPI-Key: YOUR_RAPIDAPI_KEY'
```

#### Example JSON Response:
```json
{
  "query": "space nebula",
  "resultsCount": 5,
  "results": [
    {
      "title": "Stunning Hubble image captures a cosmic 'butterfly' nebula",
      "url": "https://images-assets.nasa.gov/image/hubble-captures-butterfly-nebula/hubble-captures-butterfly-nebula~orig.jpg",
      "sourceUrl": "https://www.nasa.gov/image-feature/hubble-captures-cosmic-butterfly-nebula"
    },
    {
      "title": "Carina Nebula: Hubble Heritage Project",
      "url": "https://hubblesite.org/files/share/assets/images/large_web/carina_nebula.jpg",
      "sourceUrl": "https://hubblesite.org/resource/image/carina-nebula"
    }
  ]
}
```

---

## Global Response Codes

| HTTP Status | Meaning | Solution |
|---|---|---|
| `200` | OK | Success! Returns requested JSON format or binary files. |
| `400` | Bad Request | Check if required query parameters or body parameters are missing. |
| `401` | Unauthorized | Valid RapidAPI Key must be present in request headers. |
| `403` | Forbidden | RapidAPI signature verify failed or plan limits exceeded. |
| `500` | Scraping Failed | Target site blocked access, timed out, or CSS selector was invalid. |
