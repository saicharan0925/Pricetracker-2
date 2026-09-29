# 🚀 SmartPrice Tracker — Production Deployment Guide

Deploy **SmartPrice Tracker** as a live website:
* **Frontend**: [Vercel](https://vercel.com) (Fast global CDN, instant builds for React Vite)
* **Backend**: [Render](https://render.com) (Continuous Web Service running FastAPI & 24/7 background price scrapers)

---

## 🏗️ Architecture Overview

| Component | Platform | Service Type | Tech Stack |
| :--- | :--- | :--- | :--- |
| **Backend API & Scrapers** | [Render](https://render.com) | Web Service (Free) | Python 3.11, FastAPI, Uvicorn, SQLite, APScheduler |
| **Frontend Web App** | [Vercel](https://vercel.com) | Production Static/SPA (Free) | React 18, Vite, TailwindCSS, Client-side SPA routing |

---

## 🔒 Security Pre-Check

* ✅ `.env` is ignored by `.gitignore` — your 16-digit Gmail password / Resend key is **NEVER** committed to GitHub.
* ✅ Secret credentials are entered securely in the Render Dashboard.
* ✅ Backend CORS is pre-configured to automatically allow your Vercel domain (`*.vercel.app`).

---

## Step 1: Push Code to GitHub

In your local project terminal (`e:\MY-PROJECTS\Pricetracker-2`):

```bash
# Stage and commit your changes
git add .
git commit -m "feat: configure Vercel frontend and Render backend deployment"

# Push to your repository
git push origin master
```

---

## Step 2: Deploy Backend on Render

1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top-right corner and select **Blueprint**.
3. Select your repository (`saicharan0925/Pricetracker-2`).
4. Render will read [`render.yaml`](./render.yaml) and configure **`smartprice-backend`**.
5. In the environment setup screen, enter your email credentials:
   * **`SMTP_SERVER`**: `smtp.gmail.com`
   * **`SMTP_USERNAME`**: Your actual Gmail address
   * **`SMTP_PASSWORD`**: Your 16-character Gmail App Password
   * **`FROM_EMAIL`**: Your sending email address
   *(Or fill in `RESEND_API_KEY` if using Resend)*
6. Click **Apply**.
7. Wait 2–3 minutes for the build to finish. Once live, copy your backend URL:
   `https://smartprice-backend.onrender.com`

---

## Step 3: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New…** -> **Project**.
3. Import your GitHub repository (`saicharan0925/Pricetracker-2`).
4. In the project configuration screen:
   * **Framework Preset**: `Vite` (auto-detected)
   * **Root Directory**: Click *Edit* and select **`frontend`** (very important!)
5. Expand **Environment Variables**:
   * **Key**: `VITE_API_URL`
   * **Value**: `https://smartprice-backend.onrender.com/api` *(replace with your real Render backend URL)*
6. Click **Deploy**.
7. In ~30 seconds, Vercel will give you a live production URL (e.g. `https://pricetracker-2.vercel.app`)!

---

## Step 4: Final Linkage (Render CORS)

1. Copy your live Vercel URL (e.g. `https://pricetracker-2.vercel.app`).
2. Go back to your [Render Dashboard](https://dashboard.render.com) -> click **`smartprice-backend`** -> **Environment**.
3. Set **`FRONTEND_URL`** to your Vercel URL:
   ```
   FRONTEND_URL = https://pricetracker-2.vercel.app
   ```
4. Click **Save Changes** (Render will automatically re-deploy with your custom origin).

---

## ✅ Post-Deployment Verification

1. **Open Vercel URL**: Visit `https://pricetracker-2.vercel.app`.
2. **Public Demo Preview**: Confirm you see the **Public Demo** badge and 4 curated demo items.
3. **Register an Account**: Click **Sign Up** -> Register a new account.
4. **Private Dashboard**: Confirm you are switched to **Private Account** mode.
5. **Track a Product**: Click **+ Add** -> Paste an Amazon or Flipkart URL. Verify the confirmation email arrives in your inbox!
6. **Refresh Any Page**: Navigate to `/dashboard` or `/login` and refresh — verify no 404 errors appear.
