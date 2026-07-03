# FlashHook SEO Pages

This Next.js application serves as the Programmatic SEO (pSEO) engine for FlashHook. It generates static landing pages for various webhook providers (Stripe, GitHub, Slack, etc.) to capture long-tail search traffic.

## Architecture

- **Next.js 16 App Router**: Uses `generateStaticParams` to build static HTML pages at build time.
- **Tailwind CSS v4**: For styling.
- **Deployment**: Deployed on Vercel as an independent project (`flashhook-seo-pages`).
- **Integration**: The main React SPA (`FH_frontend`) uses `vercel.json` rewrites to proxy `/webhooks/*` traffic to this Next.js app, maintaining a single domain (`flashhook.site`) for users and search engines.

## Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Adding a New Provider

To add a new webhook provider, simply add a new JSON object to `data/webhook-providers.json`. The Next.js app will automatically generate a new static page for it during the next build.
