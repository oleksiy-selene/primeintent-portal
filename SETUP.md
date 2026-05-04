# InsureMatch Portal — Setup Guide

This is the standalone InsureMatch admin portal for `portal.primeintent.ai`.

## 1. Create a new Replit project

- Click **+ Create Repl** → choose **React** or blank **Node.js** template.
- Copy all files from this `export/portal/` folder into the new Repl's root.

## 2. Install dependencies

```bash
pnpm install
```

## 3. Set environment variables (Replit Secrets)

Add the following secrets in **Tools → Secrets**:

| Secret | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL, e.g. `https://xxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable / anon key (starts with `sb_publishable_`) |
| `VITE_API_BASE_URL` | Full URL to the API server: `https://platform.primeintent.ai/api` |

> **Important:** These are `VITE_` prefixed so Vite bakes them into the frontend bundle at build time. Do not rename them.

## 4. Run locally (dev mode)

```bash
pnpm run dev
```

The portal is served on the port Replit assigns.

## 5. Build for production

```bash
pnpm run build
```

Output goes to `dist/public/`. This is a static site — no Node server needed.

## 6. Deploy to Replit

1. Click **Deploy** → **Static** deployment.
2. Set **Build command**: `pnpm run build`
3. Set **Output directory**: `dist/public`
4. Add all `VITE_*` secrets to the deployment environment.

## 7. Attach custom domain

1. After deploying, go to **Deployment → Custom domains**.
2. Add `portal.primeintent.ai`.
3. Follow Replit's DNS instructions to point your domain.

## 8. Supabase Auth — Redirect URLs

In your Supabase dashboard → **Authentication → URL Configuration**:

- Set **Site URL** to `https://portal.primeintent.ai`
- Add to **Redirect URLs**: `https://portal.primeintent.ai/**`

## Architecture notes

- The portal calls the API server at `VITE_API_BASE_URL` (baked in at build time).
- Supabase credentials are also baked in at build time via Vite's `VITE_*` convention.
- The app is a pure SPA — all routes rewrite to `/index.html`.
