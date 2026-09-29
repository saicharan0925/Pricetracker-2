# SmartPrice Tracker

Track product prices across e-commerce sites, get notified on price drops, and visualize price history — all in one dashboard.

## Project Overview

SmartPrice Tracker lets users submit any product URL, then periodically scrapes the current price, stores a full price history, and sends an email alert when the price falls below a user-defined target. The backend is a FastAPI service with a scheduled price-check job and SMTP email alerts; the frontend is a React + Vite dashboard for managing tracked products and viewing price trends.

## Features

- Track any product by pasting its URL with a target (alert) price
- Automatic background price checks on a schedule
- Manual "Check now" price refresh per product
- Full price-history timeline per product with chart
- Email alerts on price drops (SMTP)
- Product list, detail, add, and delete management
- Responsive dashboard UI
- REST API with interactive docs (Swagger / ReDoc)

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | Python 3.11+, FastAPI, Uvicorn      |
| Backend  | SQLAlchemy, SQLite (local) / Postgres (prod) |
| Backend  | APScheduler (price-check job), smtplib (SMTP email) |
| Backend  | BeautifulSoup / httpx (scraping)    |
| Frontend | React 18, Vite, React Router        |
| Frontend | Axios, Recharts (price chart)       |
| Deploy   | Render (backend), Vercel (frontend) |

## Folder Structure

```text
Pricetracker-2/
├── README.md
├── .gitignore
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entry (app.main:app)
│   │   ├── models.py        # SQLAlchemy models (Product, PriceHistory)
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── database.py      # DB engine/session (DATABASE_URL)
│   │   ├── scraper.py       # Price-scraping logic
│   │   ├── notifier.py      # SMTP email alerts
│   │   └── scheduler.py     # Periodic price-check job
│   ├── requirements.txt
│   ├── render.yaml          # Render deployment config
│   └── Procfile             # web: uvicorn app.main:app ...
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── api.js           # Axios client (VITE_API_URL)
│   │   └── components/      # ProductList, ProductDetail, PriceChart, AddProduct
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json          # SPA rewrite config
```

## Installation

Prerequisites: Python 3.11+, Node.js 18+, npm, Git.

```bash
git clone <your-repo-url> Pricetracker-2
cd Pricetracker-2
```

## Local Setup

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Interactive docs: `http://localhost:8000/docs`.

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. Point it at the backend via `VITE_API_URL` (see below).

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Required | Description                                      |
|----------------|----------|--------------------------------------------------|
| `DATABASE_URL` | Yes      | SQLAlchemy DB URL, e.g. `sqlite:///./prices.db` (local) or Postgres URL (prod) |
| `SMTP_HOST`    | Yes      | SMTP server host (e.g. `smtp.gmail.com`)         |
| `SMTP_PORT`    | Yes      | SMTP port (e.g. `587` for STARTTLS)              |
| `SMTP_USER`    | Yes      | SMTP username                                    |
| `SMTP_PASSWORD`| Yes      | SMTP password / app password                     |
| `FROM_EMAIL`   | Yes      | Sender address for alert emails                  |
| `FRONTEND_URL` | No       | Frontend origin for CORS, e.g. `http://localhost:5173` |

Example `backend/.env`:

```env
DATABASE_URL=sqlite:///./prices.db
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=you@example.com
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

| Variable        | Required | Description                                     |
|-----------------|----------|-------------------------------------------------|
| `VITE_API_URL`  | Yes      | Base URL of the backend API, e.g. `http://localhost:8000` |

Example `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

## Deployment on Render (Backend)

Config: [`backend/render.yaml`](backend/render.yaml) + [`backend/Procfile`](backend/Procfile).

1. Push the repo to GitHub.
2. In Render Dashboard → **New → Web Service** → connect the repo.
3. Set **Root Directory** to `backend` (or use the `render.yaml` blueprint: **New → Blueprint**, select repo).
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (Render injects `$PORT`; Procfile uses `${PORT:-8000}`).
6. Add environment variables: `DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL`, `FRONTEND_URL` (set to your Vercel URL).
7. Deploy. Note the backend URL (e.g. `https://smartprice-tracker-backend.onrender.com`) and use it as `VITE_API_URL` for the frontend.

## Deployment on Vercel (Frontend)

Config: [`frontend/vercel.json`](frontend/vercel.json) (SPA fallback rewrite to `/index.html`).

1. Push the repo to GitHub.
2. In Vercel → **Add New → Project** → import the repo.
3. Set **Root Directory** to `frontend`.
4. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.
5. Add environment variable: `VITE_API_URL=https://<your-render-backend>.onrender.com`.
6. Deploy. The `vercel.json` rewrite ensures React Router routes resolve to `index.html`.

## API Documentation

Base URL (local): `http://localhost:8000`. Full interactive docs: `/docs` (Swagger) and `/redoc`.

| Method | Path                                   | Description                              |
|--------|----------------------------------------|------------------------------------------|
| GET    | `/`                                    | Health check — returns API status        |
| POST   | `/api/products`                        | Track a new product by URL               |
| GET    | `/api/products`                        | List all tracked products                |
| GET    | `/api/products/{id}`                   | Get a single product with latest price   |
| DELETE | `/api/products/{id}`                   | Stop tracking (delete) a product         |
| GET    | `/api/products/{id}/history`           | Get full price history for a product     |
| POST   | `/api/products/{id}/check`             | Trigger an immediate price re-check      |
| POST   | `/api/alerts/test`                     | Send a test alert email (SMTP verify)    |

### Example: Track a product

```http
POST /api/products
Content-Type: application/json

{
  "url": "https://example.com/product/123",
  "target_price": 49.99,
  "email": "you@example.com"
}
```

Response `201`:

```json
{
  "id": 1,
  "url": "https://example.com/product/123",
  "title": "Example Product",
  "current_price": 59.99,
  "target_price": 49.99,
  "email": "you@example.com",
  "created_at": "2026-09-29T00:00:00Z"
}
```

### Example: Test alert email

```http
POST /api/alerts/test
Content-Type: application/json

{
  "email": "you@example.com"
}
```

## Screenshots

> Placeholders — add real screenshots after running the app locally.

- `docs/screenshots/dashboard.png` — Dashboard with tracked product list
- `docs/screenshots/product-detail.png` — Product detail with price-history chart
- `docs/screenshots/add-product.png` — Add/track product form
- `docs/screenshots/email-alert.png` — Price-drop email alert

## Future Enhancements

- Multi-site scraper adapters (Amazon, Flipkart, eBay, etc.)
- Browser extension for one-click tracking
- SMS / push notifications in addition to email
- Price prediction and deal-score analytics
- User accounts and authentication
- Postgres + Alembic migrations for production

## License

MIT — see [LICENSE](LICENSE) (or treat this project as MIT licensed if no LICENSE file is present).
