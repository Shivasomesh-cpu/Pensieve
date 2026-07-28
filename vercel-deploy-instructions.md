# Deploying Pensieve to Vercel

We have optimized Pensieve to run seamlessly in Vercel's serverless environment!

## What was configured:
1. **Vercel Serverless Function Config (`vercel.json`)**: Configured automatic URL rewrites so that `/api/*` requests route to our serverless Express handler in `api/index.ts`, while client/SPA routes fallback gracefully to Vite's static index.html.
2. **Writable DB for Serverless**: Updated `server/db.ts` to use `os.tmpdir()` (`/tmp/pensieve.sqlite`) in serverless/production modes so the application avoids read-only filesystem errors (`EROFS`).
3. **Cross-Platform Git Extraction**: Updated `server/ingest.ts` to utilize cross-platform temporary directories (`os.tmpdir()`) for cloning operations, and added robust fallback support via the GitHub REST API if the server environment lacks the `git` binary.

---

## How to Deploy to Vercel (1-Click or CLI):

### Option A: Deploy via GitHub (Recommended)
1. Commit the changes and push them to your repository on GitHub:
   ```bash
   git add .
   git commit -m "Configure project for Vercel deployment"
   git push origin main
   ```
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** > **Project**.
3. Select your GitHub repository `Shivasomesh-cpu/Pensieve`.
4. Vercel will automatically detect **Vite** as the framework. Keep the default settings.
5. (Optional) Add your environment variables:
   - `GEMINI_API_KEY`: Your Google Gemini API Key (if you wish to enable the fallback model).
6. Click **Deploy**!

### Option B: Deploy via Vercel CLI
If you have `vercel` CLI installed:
1. Run the deploy command from the project root:
   ```bash
   vercel
   ```
2. Follow the prompts to log in and set up your project.
3. Once the preview is created, promote it to production:
   ```bash
   vercel --prod
   ```
