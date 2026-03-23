# sacred-temples-india

A curated collection of sacred temples across India with historical and geographical information.

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd sacred-temples-india
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description | Where to get it |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase dashboard → Project Settings → API Keys |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Supabase dashboard → Project Settings → API Keys |
| `VITE_GEMINI_API_KEY` | Google Gemini API key (for Sarathi chatbot) | [Google AI Studio](https://aistudio.google.com/app/apikey) — free tier, 1500 req/day |

### 3. Run locally

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

## Deployment

This project deploys to Cloudflare via Wrangler:

```bash
npx wrangler publish
```

> **Note:** Set environment variables in Cloudflare dashboard under Workers & Pages → your project → Settings → Environment Variables.
