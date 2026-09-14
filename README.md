# MarketMind AI

AI-powered marketing intelligence platform. Built with Next.js (App Router), TypeScript, Tailwind CSS v4, and Supabase.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects to `/dashboard`.

## Environment

Copy the values into `.env.local`:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_API_URL` | Base path for the internal API client (defaults to `/api`) |

## Structure

```
src/
  app/            App Router routes (one folder per module)
  components/      Shared UI (sidebar, navbar, cards)
  lib/            api client, supabase client, constants
  types/          Shared TypeScript types
```

## Modules

Dashboard, Chat, Handbook, Notes, Company, Opportunities, CRM, Analytics, Meta Ads, AI Studio, Settings.
Only Dashboard has sample content; the rest render a `ComingSoon` placeholder.
