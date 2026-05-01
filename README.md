# Folio — Financial Advisor SaaS Platform

A white-label client intelligence tool for financial advisors.

## Stack
- **Frontend:** Vanilla HTML/CSS/JS — no framework needed
- **Backend:** Netlify Functions (serverless)
- **Database:** Airtable
- **Hosting:** Netlify

## Pages

| File | URL | Purpose |
|---|---|---|
| `index.html` | `/` | Marketing site + demo assessment |
| `signup.html` | `/signup.html` | Advisor signup |
| `login.html` | `/login.html` | Advisor login |
| `dashboard.html` | `/dashboard.html?firm=SLUG` | Advisor dashboard |
| `assess.html` | `/assess.html?firm=SLUG` | Prospect assessment form |
| `embed_code.html` | `/embed_code.html` | Embed code for advisors |
| `admin.html` | `/admin.html` | Admin panel |
| `gate.html` | `/gate.html` | PIN-protected preview gate |

## Setup

### 1. Airtable
- Base ID: `appqtbeYq7zl7x89u`
- Tables: Firms, Submissions, Advisors
- Token: stored in `netlify/functions/api.js`

### 2. Netlify
- Deploy by dragging zip to Netlify dashboard
- Functions auto-detected from `netlify/functions/` folder
- Form notifications set up in Netlify dashboard

### 3. Environment
No build step needed. Deploy the files as-is.

## PIN Gate
The site is protected by a PIN gate (`gate.html`).
Current PIN: `2847` — change in `gate.html` line: `const CORRECT_PIN = '2847';`

## Deploy
```bash
# Zip everything and drag to Netlify
zip -r folio_deploy.zip . -x "*.DS_Store" -x "*.zip"
```
