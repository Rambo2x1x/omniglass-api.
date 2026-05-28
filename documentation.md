# LeadGlass - Premium Contact Verification & B2B Enrichment API

Welcome to the **LeadGlass API**! This high-performance, developer-first platform provides high-speed B2B contact verification, phone formatting validations, domain tech-stack fingerprinting, and combined email profile enrichment.

Below you will find detailed endpoint specifications, configuration parameters, and integration snippets in **cURL**, **Node.js**, and **Python**.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Subscription Tier & Limits](#subscription-tier--limits)
3. [Endpoints](#endpoints)
   - [Email Verification (`/v1/verify/email`)](#email-verification-v1verifyemail)
   - [Domain Profile Enrichment (`/v1/enrich/domain`)](#domain-profile-enrichment-v1enrichdomain)
   - [Email & Company Enrichment (`/v1/enrich/email`)](#email-company-enrichment-v1enrichemail)
   - [Phone Format Validation (`/v1/verify/phone`)](#phone-format-validation-v1verifyphone)
4. [Code Integration Snippets](#code-integration-snippets)

---

## Authentication

All API requests require authentication. You can authenticate either via a direct SaaS key in headers or via the RapidAPI marketplace proxy:

### 1. Direct SaaS Key
Provide your API key (`os_...`) generated from your developer dashboard using the following header:

| Header Name | Description |
|---|---|
| `X-API-Key` | Your active LeadGlass developer API key |

### 2. RapidAPI Marketplace Proxy
If routing via RapidAPI, supply your marketplace keys:

| Header Name | Description |
|---|---|
| `X-RapidAPI-Key` | Your RapidAPI application subscription key |
| `X-RapidAPI-Host` | `leadglass-api.p.rapidapi.com` |

---

## Subscription Tier & Limits

Endpoints and deep lookups are restricted by subscription plan limits:

| Endpoint | BASIC (Free) | PRO | ULTRA / MEGA |
|---|---|---|---|
| **Verify Email (`/v1/verify/email`)** | Unlocked (Syntax check only) | Unlocked (Deep MX checking) | Unlocked (Deep MX checking) |
| **Enrich Domain (`/v1/enrich/domain`)** | ❌ Locked | Unlocked | Unlocked |
| **Enrich Email (`/v1/enrich/email`)** | ❌ Locked | ❌ Locked | Unlocked |
| **Verify Phone (`/v1/verify/phone`)** | Unlocked | Unlocked | Unlocked |
| **Rate Limit** | 10 requests / min | 100 requests / min | Unlimited (Subject to fair use) |

---

## Endpoints

### Email Verification (`/v1/verify/email`)
Checks email validity, parses username prefixes, and flags disposable or role-based email addresses.

* **Method:** `GET` or `POST`
* **Parameters (Query or JSON Body):**
  - `email` (String, Required): Target email address to check.
  - `syntaxOnly` (Boolean, Optional): Skip DNS MX record queries. Automatically forced to `true` on BASIC tier.
* **Response Example:**
```json
{
  "email": "alex.jones@gmail.com",
  "isValid": true,
  "formatValid": true,
  "mxRecords": [
    "gmail-smtp-in.l.google.com."
  ],
  "isDisposable": false,
  "isRoleAccount": false,
  "deliverable": "deliverable",
  "domain": "gmail.com",
  "user": "alex.jones"
}
```

---

### Domain Profile Enrichment (`/v1/enrich/domain`)
Profiles a corporate domain by scraping its landing page, resolving meta titles, identifying active technology stacks, and resolving official social cards.

* **Method:** `GET` or `POST`
* **Parameters (Query or JSON Body):**
  - `domain` (String, Required): Corporate domain to lookup (e.g. `stripe.com`).
* **Response Example:**
```json
{
  "domain": "stripe.com",
  "name": "Stripe",
  "logo": "https://logo.clearbit.com/stripe.com",
  "description": "Online payment processing for internet businesses.",
  "title": "Stripe | Financial Infrastructure for the Internet",
  "socials": {
    "linkedin": "https://www.linkedin.com/company/stripe",
    "twitter": "https://twitter.com/stripe",
    "facebook": "",
    "instagram": "",
    "github": "https://github.com/stripe"
  },
  "techStack": [
    "React",
    "Stripe Payments",
    "Tailwind CSS"
  ],
  "status": "UP",
  "responseTimeMs": 140
}
```

---

### Email & Company Enrichment (`/v1/enrich/email`)
A powerful endpoint combining name-extraction, deliverability checking, and domain profile scraping into a single B2B contact profile.

* **Method:** `GET` or `POST`
* **Parameters (Query or JSON Body):**
  - `email` (String, Required): B2B email to enrich.
* **Response Example:**
```json
{
  "email": "alex.jones@stripe.com",
  "firstName": "Alex",
  "lastName": "Jones",
  "fullName": "Alex Jones",
  "verification": {
    "isValid": true,
    "deliverable": "deliverable"
  },
  "company": {
    "domain": "stripe.com",
    "name": "Stripe",
    "logo": "https://logo.clearbit.com/stripe.com",
    "description": "Online payment processing for internet businesses.",
    "socials": {
      "linkedin": "https://www.linkedin.com/company/stripe",
      "twitter": "https://twitter.com/stripe",
      "facebook": "",
      "instagram": "",
      "github": "https://github.com/stripe"
    },
    "techStack": [
      "React",
      "Stripe Payments",
      "Tailwind CSS"
  ]
  }
}
```

---

### Phone Format Validation (`/v1/verify/phone`)
Validates dial strings to standard international formats (E.164), extracts country name codes, and flags carrier channels.

* **Method:** `GET`
* **Query Parameters:**
  - `phone` (String, Required): Standard phone string (e.g. `+14155552671`).
* **Response Example:**
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

---

## Code Integration Snippets

### 1. cURL
```bash
curl -X GET "http://localhost:5000/v1/enrich/email?email=alex.jones@stripe.com" \
  -H "X-API-Key: os_your_api_key_here"
```

### 2. Node.js (Fetch)
```javascript
const apiKey = 'os_your_api_key_here';
const email = 'alex.jones@stripe.com';

fetch(`http://localhost:5000/v1/enrich/email?email=${encodeURIComponent(email)}`, {
  headers: {
    'X-API-Key': apiKey,
    'Accept': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => console.log('Enriched Contact Profile:', data))
  .catch(err => console.error('Error fetching data:', err));
```

### 3. Python (Requests)
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
