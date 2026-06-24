# Supermarket POS — Full System (Backend + Frontend + Database)

> 🇲🇲 **Computer အကြောင်း နားမလည်ရင် `START_HERE_MYANMAR.md` ကို ဖတ်ပါ — အလွယ်ဆုံး run နည်း step-by-step ပါ။**

A complete, ready-to-run Point-of-Sale system for a supermarket: checkout,
inventory, suppliers/purchase orders, promotions, sales analytics, and
role-based access (Cashier / Manager / Admin) — with a working web UI.

## 🚀 Quickest way to run this (no coding knowledge needed)

You only need **one program installed: Docker Desktop**.

1. Install Docker Desktop: <https://www.docker.com/products/docker-desktop/>
   (download, install, open it once so it's running).
2. Unzip this project anywhere on your computer.
3. Open a terminal **inside this folder** (on Windows: open the folder,
   type `cmd` in the address bar and press Enter; on Mac: right-click the
   folder → "New Terminal at Folder").
4. Run:
   ```bash
   docker compose up
   ```
   The first run takes a few minutes (downloading and building). Leave
   this window open — it's running your server.
5. Open your browser to:
   - **POS App:** <http://localhost:4000>
   - **API health check:** <http://localhost:4000/health>

6. Log in with one of the built-in demo accounts:

   | Username  | Password    | Role     |
   |-----------|-------------|----------|
   | admin     | admin123    | admin    |
   | manager   | manager123  | manager  |
   | cashier   | cashier123  | cashier  |

   **Change these passwords (or create new users) before using this for real sales.**

7. To stop everything: press `Ctrl+C` in that terminal, or run
   `docker compose down` from the same folder.

That's it — sample products, categories and a coupon code (`WELCOME10`)
are already loaded so you can try a checkout immediately.

## Tech Stack
- **Frontend:** Plain HTML/CSS/JavaScript (no build tools — just files served by Nginx)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt password hashing
- **Reports export:** ExcelJS (.xlsx), PDFKit (.pdf)

## Architecture

```
┌────────────────────────────────────────────┐   pg   ┌──────────────┐
│   Browser  ──▶  Express app (one service)   │ ─────▶ │  PostgreSQL   │
│   localhost:4000                              │ ◀───── │  (Docker vol)  │
│   • serves the frontend (static files)          │        └──────────────┘
│   • serves the API under /api/*                  │
└────────────────────────────────────────────┘
```

One service does both jobs (see `backend/src/app.js`), which is also why
this deploys as a *single* web service on a cloud host like Render —
see the **Cloud deployment** section below.

Folder layout:
```
pos-system/
├── START_HERE_MYANMAR.md      # ⭐ Burmese quick-start guide (Docker)
├── CLOUD_DEPLOY_MYANMAR.md    # ⭐ Burmese guide: deploy online for free (no Docker)
├── docker-compose.yml          # Spins up db + app together
├── .dockerignore
├── API_DOCUMENTATION.md        # Full endpoint reference
├── frontend/                    # Static web app — served by the backend
│   ├── index.html
│   ├── style.css
│   └── app.js                   # All frontend logic, calls /api/* (relative)
└── backend/
    ├── Dockerfile                 # Builds backend + frontend into one image
    ├── schema.sql                 # Database schema (auto-loaded by Docker)
    ├── seed.sql                   # Demo accounts + sample products (auto-loaded)
    ├── server.js                   # Backend entry point
    └── src/
        ├── app.js                  # Express app, route wiring + static frontend serving
        ├── config/db.js             # PostgreSQL connection (supports DATABASE_URL too)
        ├── middleware/auth.js        # JWT verification + RBAC
        ├── utils/helpers.js           # Sale/PO number generators
        ├── controllers/                # Business logic (one file per module)
        │   └── saleController.js       ⭐ checkout core logic — atomic transaction
        └── routes/                      # URL → controller mapping per module
```

## Manual setup (without Docker) — for developers

1. **Create the database and load schema + seed data:**
   ```bash
   cd backend
   createdb supermarket_pos
   psql -d supermarket_pos -f schema.sql
   psql -d supermarket_pos -f seed.sql
   ```
2. **Configure environment:** `cp .env.example .env` and edit it (still inside `backend/`).
3. **Install & run:**
   ```bash
   npm install
   npm run dev
   ```
4. Open **http://localhost:4000** — the backend serves the frontend
   automatically (from the sibling `../frontend` folder), so there's
   nothing extra to start.

See **API_DOCUMENTATION.md** for the full endpoint list and request/response shapes.

## ☁️ Cloud deployment (no Docker, nothing installed on your computer)

See **CLOUD_DEPLOY_MYANMAR.md** for full step-by-step instructions (in
Burmese) to deploy this for free using **Neon** (PostgreSQL) + **Render**
(hosts the app). In short:
- `backend/src/config/db.js` already supports a single `DATABASE_URL`
  environment variable (the format Neon/Render/Supabase/Railway all give you),
  so no code changes are needed.
- Because the frontend is served by the same Express app, you only need to
  deploy **one** web service — not separate frontend/backend services.

## Why the checkout logic is built the way it is

The checkout endpoint (`POST /api/sales/checkout`, in `src/controllers/saleController.js`)
is the most safety-critical part of any POS system. It:

1. Opens one database transaction (`BEGIN`).
2. `SELECT ... FOR UPDATE`s every product row being sold — this **locks**
   those rows so a second, simultaneous checkout on the same product can't
   read a stale stock count.
3. Validates stock, calculates totals, applies any coupon.
4. Inserts the sale, sale items, deducts stock, and records payment(s) —
   all on the same transaction.
5. `COMMIT`s only if every step above succeeded.
6. If **anything** fails along the way — insufficient stock, a bad coupon,
   a mismatched payment amount, or even the database connection dropping —
   the `catch` block runs `ROLLBACK`, which undoes every change made since
   `BEGIN`. The customer's stock and the sales ledger can never end up out
   of sync.

## Payment integrations (KPay / WavePay / Card)

The schema, checkout flow, and UI already support split/multiple payment
methods. The actual gateway calls (verifying a KPay/WavePay transaction
reference, or talking to a card terminal) are **not implemented** since
they require real merchant credentials specific to your store — there's
a clearly marked spot in `src/controllers/saleController.js` (`STEP 6`)
where that verification call would go in production, before the
transaction commits.

## Suggested next steps
- Change all demo passwords; remove/replace demo accounts before going live.
- Add a barcode-scanner-friendly fullscreen kiosk mode to the frontend.
- Add automated tests (Jest + a test database) for the checkout transaction,
  especially the concurrent-sale race condition.
- Add receipt printing/SMS as a separate step triggered after a
  successful checkout response (not inside the DB transaction itself).

