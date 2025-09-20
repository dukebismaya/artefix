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

### Deploying to Vercel
1) Import the repo in Vercel
2) Framework Preset: Vite
3) Root directory: project root (contains `vite.config.js`)
4) Set Environment Variables:
	 - `HF_TOKEN` = your Hugging Face token
	 - optionally `HF_CLIP_MODEL`
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
