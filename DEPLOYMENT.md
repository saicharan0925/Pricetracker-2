# 🚀 SmartPrice Tracker — Production Deployment Guide

This guide walks you through deploying **SmartPrice Tracker** as a live public website using **Render** (Free All-in-One deployment for both FastAPI Backend and React Frontend).

---

## 🏗️ Architecture Overview

| Component | Platform | Service Type | Tech Stack |
| :--- | :--- | :--- | :--- |
| **Backend** | [Render](https://render.com) | Web Service (Free) | Python 3.11, FastAPI, Uvicorn, SQLite, APScheduler |
| **Frontend** | [Render](https://render.com) | Static Site (Free) | React 18, Vite, TailwindCSS, Client-side SPA routing |

---

## 🔒 Security Pre-Check

Before pushing your code to GitHub:
* ✅ Verify `.env` is listed in your `.gitignore` (already configured).
* ✅ Your 16-character Gmail App Password or Resend API Key will **NEVER** be committed to GitHub.
* ✅ All secret credentials are added safely inside the Render Web Dashboard.

---

## Step 1: Push Your Code to GitHub

Open a terminal in your project root (`e:\MY-PROJECTS\Pricetracker-2`):

```bash
# 1. Initialize git (if not already done)
git init

# 2. Stage all files (respecting .gitignore)
git add .

# 3. Commit your changes
git commit -m "feat: complete user authentication, privacy isolation, and deployment configuration"

# 4. Create a new repository on GitHub (https://github.com/new)
# Then link your remote and push:
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

---

## Step 2: Deploy with 1-Click Render Blueprint (`render.yaml`)

We have pre-configured a [`render.yaml`](./render.yaml) blueprint in your project.

1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top-right corner and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect `render.yaml` and configure both services:
   - `smartprice-backend` (Web Service)
   - `smartprice-frontend` (Static Site)
5. Under **Environment Variables**, provide your secrets:
   * **`RESEND_API_KEY`**: Your `re_...` key from [resend.com](https://resend.com) (or leave empty if using Gmail).
   * **`SMTP_SERVER`**: `smtp.gmail.com` (if using Gmail).
   * **`SMTP_USERNAME`**: Your actual Gmail address.
   * **`SMTP_PASSWORD`**: Your 16-character Gmail App Password.
   * **`FROM_EMAIL`**: Your sending email address.
6. Click **Apply**. Render will start building both services simultaneously.

---

## Step 3: Connect Frontend to Backend

1. Wait for `smartprice-backend` to complete its build.
2. Copy your backend live URL from Render (e.g. `https://smartprice-backend.onrender.com`).
3. In the Render Dashboard, click on **`smartprice-frontend`**:
   - Go to **Environment**.
   - Add/Edit the variable:
     - **Key**: `VITE_API_URL`
     - **Value**: `https://smartprice-backend.onrender.com/api` *(replace with your actual backend URL)*.
   - Click **Save Changes**.
4. In **`smartprice-backend`**:
   - Go to **Environment**.
   - Set **`FRONTEND_URL`** to your frontend URL (e.g. `https://smartprice-frontend.onrender.com`).
   - Click **Save Changes**.

---

## 🛠️ Alternative: Manual Deployment (Step-by-Step)

If you prefer to configure the services manually on Render without using the blueprint:

### 1. Deploy the Backend (Web Service)
* Click **New +** -> **Web Service** -> Connect your GitHub repo.
* **Name**: `smartprice-backend`
* **Region**: Oregon (or closest to you)
* **Root Directory**: `backend`
* **Runtime**: `Python 3`
* **Build Command**: `pip install -r requirements.txt`
* **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
* **Instance Type**: Free
* **Environment Variables**:
  ```env
  PYTHON_VERSION=3.11.9
  DATABASE_URL=sqlite:///./smartprice.db
  JWT_SECRET=<click 'Generate' in Render>
  CHECK_INTERVAL_MINUTES=30
  FRONTEND_URL=https://smartprice-frontend.onrender.com
  SMTP_SERVER=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USERNAME=your_email@gmail.com
  SMTP_PASSWORD=your_16_char_app_password
  FROM_EMAIL=your_email@gmail.com
  ```
* Click **Create Web Service**.

### 2. Deploy the Frontend (Static Site)
* Click **New +** -> **Static Site** -> Connect your GitHub repo.
* **Name**: `smartprice-frontend`
* **Root Directory**: `frontend`
* **Build Command**: `npm install && npm run build`
* **Publish Directory**: `dist`
* **Redirects/Rewrites**:
  * Action: `Rewrite`
  * Source: `/*`
  * Destination: `/index.html`
* **Environment Variables**:
  ```env
  VITE_API_URL=https://smartprice-backend.onrender.com/api
  ```
* Click **Create Static Site**.

---

## ✅ Post-Deployment Verification Checklist

Once both services show **Live**:

1. **Visit Frontend URL**: Open `https://smartprice-frontend.onrender.com`.
2. **Verify Public Demo Mode**:
   - You should see the **Public Demo** badge and 4 curated sample items.
   - Verify that personal products (`buds`, `table`, etc.) and emails are **hidden**.
3. **Register an Account**:
   - Click **Sign Up** -> Register a new user.
   - Verify immediate switch to **Private Account** mode.
4. **Track a Product**:
   - Click **+ Add** -> Paste an Amazon or Flipkart URL.
   - Verify that your verified email is auto-filled.
   - Click **Start Tracking** and verify the welcome confirmation email arrives in your inbox!
5. **Direct Link Refresh**:
   - Navigate to `/dashboard` or `/login` and refresh the page — client-side routing should load seamlessly without 404 errors.
