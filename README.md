## Artifex – AI Marketplace Assistant

This project is a Vite + React app with optional on-device AI (browser) and a cloud fallback for embeddings.

### How the AI works
- In-browser CLIP embeddings using `@xenova/transformers` over CDN. No server or API key required. Runs via WebGPU/WebAssembly when supported.
- Cloud fallback via a serverless function at `/api/clip-embed` that proxies the Hugging Face Inference API.
	- Requires the env var `HF_TOKEN` (Hugging Face access token).
	- Optional `HF_CLIP_MODEL` (defaults to `sentence-transformers/clip-ViT-B-32-multilingual-v1`).

The `AI Studio` page (`/ai`) can toggle between local and cloud embeddings at runtime.

### Quick start (local)
Requirements: Node.js 18+

```powershell
npm install
npm run dev
```

Open the printed URL. Navigate to `/ai`:
- For local embeddings: uncheck “Use cloud embeddings”. Upload an image or enter a style prompt.
- For cloud embeddings: check “Use cloud embeddings” and ensure the serverless function is available (see below). Locally, you can keep using local mode; the cloud endpoint is mainly used in deployment.

### Serverless function (cloud embeddings)
The function lives at `api/clip-embed.js` and expects:
- `HF_TOKEN`: Hugging Face API token (Project or User token with Inference access).
- `HF_CLIP_MODEL` (optional): e.g. `sentence-transformers/clip-ViT-B-32-multilingual-v1`.

Client config:
- Optional `VITE_CLOUD_EMBED_URL` – override the default `/api/clip-embed` path (useful to test locally against a remote deployment). Example: `https://your-app.vercel.app/api/clip-embed`

Requests:
- POST `/api/clip-embed` with JSON body
	- `{ type: "text", text: "...", model?: "..." }`
	- `{ type: "image", image: "<public URL or data:URI>", model?: "..." }`
Response: `{ vector: number[] }`

### Artemis Assistant (chat) – Local setup
Artemis is available everywhere in the UI (floating button). It works in two modes:

1) Fallback (no server config): Uses built‑in, rule‑based guidance. No keys, runs out of the box.
2) Connected mode (recommended): Uses a serverless `/api/artemis-chat` proxy to an OpenAI‑compatible provider for high‑quality answers.

Serverless endpoint: `api/artemis-chat.js`
- Provider priority (no code changes needed):
	1) OpenAI‑compatible (if `AI_API_BASE` and `AI_API_KEY` are set)
	2) Hugging Face Inference API (if `HF_TOKEN` is set)
	3) Local rule‑based fallback (no keys)

Configure environment variables in your deployment (or local serverless runtime):
- OpenAI‑compatible:
	- `AI_API_BASE` (e.g., `https://api.openai.com/v1`)
	- `AI_API_KEY`
	- `AI_MODEL` (default: `gpt-4o-mini`)
- Hugging Face:
	- `HF_TOKEN` (required)
	- `HF_CHAT_MODEL` (optional, default: `mistralai/Mistral-7B-Instruct-v0.3`)

Local testing options:
- Option A (simple): Run `npm run dev`. Artemis will use the fallback if no remote is set.
- Option B (proxy to deployed API): Set in `.env.local`:
	```env
	VITE_ARTEMIS_CHAT_URL=https://your-app.vercel.app/api/artemis-chat
	```
	Then run `npm run dev`; Artemis will call the remote API while you develop locally.

Run serverless locally (optional):
- Using Vercel CLI:
	```powershell
	npm i -g vercel
	vercel dev
	```
	This serves both the Vite app and `/api/*`. Set env vars with `vercel env add` (or a `.env` that your runtime loads), e.g.:
	- `AI_API_BASE=https://api.openai.com/v1`
	- `AI_API_KEY=...`
	- `AI_MODEL=gpt-4o-mini`

Environment examples: see `.env.example` for commonly used variables.

### Deploying to Vercel
1) Import the repo in Vercel
2) Framework Preset: Vite
3) Root directory: project root (contains `vite.config.js`)
4) Set Environment Variables:
	 - `HF_TOKEN` = your Hugging Face token
	 - optionally `HF_CLIP_MODEL`
 	 - Artemis chat (optional but recommended): `AI_API_BASE`, `AI_API_KEY`, `AI_MODEL`
5) Deploy

Vercel will expose the function at `/api/clip-embed`, used automatically when “Use cloud embeddings” is enabled in `/ai`.

### Deploying to Netlify (alternative)
- Create a Netlify function from `api/clip-embed.js` or wrap it in Netlify’s function format.
- Set `HF_TOKEN` env var in the site settings.
- Update any function path if you change it (default expects `/api/clip-embed`).

### Common issues
- “Model failed to load” in local mode: older browsers or blocked WebAssembly/WebGPU. Switch on “Use cloud embeddings” on `/ai`.
- CORS when embedding images: ensure product image URLs are publicly accessible. Data URLs (from uploads) also work.
- 500 from `/api/clip-embed`: confirm `HF_TOKEN` is set in the deployment and the token has Inference API access.

### Scripts
- `npm run dev` – start Vite dev server
- `npm run build` – build for production
- `npm run preview` – preview production build locally

### License
Personal/educational use. Copyright (C) 2025 The Neural Nexus All rights reserved. 
