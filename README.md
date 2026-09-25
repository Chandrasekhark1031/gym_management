# GYM Management - Monorepo

Production-ready monorepo for the GYM Management web application, containing both frontend (React + Vite + Tailwind CSS) and backend (Node.js + Express + PostgreSQL).

---

## Project Structure

```text
GYM Management/
├── apps/
│   ├── frontend/               # React + Vite client
│   │   ├── src/                # Components, pages, stores, hooks
│   │   ├── index.html          # HTML entry point
│   │   ├── package.json        # Frontend dependencies & scripts
│   │   ├── vite.config.js      # Vite configuration (port 3000)
│   │   ├── tsconfig.json       # TypeScript configuration
│   │   └── .env.example        # Frontend environment template
│   │
│   └── backend/                # Node.js + Express API
│       ├── src/                # Controllers, routes, middleware, db migrations
│       ├── uploads/            # Uploaded gym logos, QR codes, profile pictures
│       ├── package.json        # Backend dependencies & scripts
│       ├── .env                # Local backend environment variables (gitignored)
│       └── .env.example        # Backend environment template
│
├── package.json                # Root monorepo orchestrator (npm workspaces)
├── .gitignore                  # Unified monorepo ignore rules
├── .env.example                # Root environment variable template
└── README.md                   # Project documentation
```

---

## Prerequisites

- **Node.js**: `v18+` (v20+ or v24 recommended)
- **npm**: `v8+` (supports workspaces)
- **PostgreSQL**: `v14+` running locally or accessible remotely

---

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example apps/backend/.env
   ```
2. Open `apps/backend/.env` and configure your database credentials:
   ```ini
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=gym_management
   DB_USER=postgres
   DB_PASSWORD=your_actual_password
   JWT_SECRET=your_long_random_jwt_secret_key
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ```
3. (Optional) For the frontend, create `apps/frontend/.env` if your backend runs on a non-default URL:
   ```ini
   VITE_API_URL=http://localhost:5000/api
   ```

---

## Quick Start

### 1. Install all dependencies

Run from the root directory:

```bash
npm install
```

This installs dependencies across all workspaces (`apps/frontend` and `apps/backend`) and configures root dev orchestrators.

### 2. Run both Frontend & Backend (One Command)

```bash
npm run dev
```

This starts both services concurrently with clear, color-coded prefixes:
- **`[BACKEND]`** Express server running on `http://localhost:5000`
- **`[FRONTEND]`** Vite dev server running on `http://localhost:3000`

Pressing `Ctrl + C` cleanly stops both processes.

---

## All Available Scripts

From the root directory:

| Command | Description |
| :--- | :--- |
| `npm install` | Installs dependencies for the root and all workspaces |
| `npm run dev` | Runs **both** frontend and backend simultaneously |
| `npm run dev:frontend` | Starts only the frontend Vite development server |
| `npm run dev:backend` | Starts only the backend Express development server with nodemon |
| `npm run build` | Builds the frontend for production (`tsc && vite build`) |
| `npm run build:frontend` | Builds the frontend application |
| `npm run start` | Starts the backend production server (`node src/server.js`) |

---

## Application URLs

- **Frontend**: [http://localhost:3000](http://localhost:3000)
  - **Owner Login**: [http://localhost:3000/login](http://localhost:3000/login)
  - **Owner Registration**: [http://localhost:3000/admin](http://localhost:3000/admin)
  - **Customer Login**: [http://localhost:3000/customer/login](http://localhost:3000/customer/login)
  - **Customer Registration**: [http://localhost:3000/customer/register](http://localhost:3000/customer/register)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
  - Health Check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Deployment Notes

- **Frontend Production Build**: Run `npm run build` from root. Built static assets are output to `apps/frontend/dist/`.
- **Backend Production Run**: Run `npm run start` from root or `npm start --workspace=backend`.
- **Static Assets & Uploads**: Uploaded customer photos, gym logos, and QR codes are stored in `apps/backend/uploads/` and served statically at `/uploads/*`.
