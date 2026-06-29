# PulseFlow AI - Clinical Prediction Engine

PulseFlow AI is a production-grade clinical risk prediction and management SaaS application designed for hospitals and healthcare organizations. It helps identify high-risk patients using clinical assessments, medical history, and predictive analytics, while providing explainable risk metrics for clinical decision support.

---

## 🚀 Features

- **Multi-Tenant Architecture**: Strict logical isolation of clinical and user records by Hospital.
- **Explainable AI Predictor**: Rule-based predictive scoring for Diabetes, Cardiovascular risk, Hypertension, and Readmission, outlining specific risk contributors and recommended clinical paths.
- **Asynchronous Queue Architecture**: Decoupled prediction calculation, email dispatch, and logs export powered by BullMQ & Redis.
- **Role-Based Access Control (RBAC)**: Detailed permissions enforcing boundaries between Super Admins, Hospital Admins, Doctors, Nurses, and Data Analysts.
- **Interactive Dashboards**: High-fidelity dark professional interfaces displaying patient stats, risk groups, and temporal trends.
- **Structured Auditing & Compliance**: Complete audit trail tracking logins, updates, assessment changes, and system configurations.
- **observability & Health Checking**: Structured JSON logging via winston alongside specialized health probes.

---

## 🛠️ Tech Stack

### Backend
- **Node.js** with **TypeScript**
- **Express** (Routing, middlewares, rate-limiting, security headers)
- **Prisma ORM** (PostgreSQL connector and query builder)
- **BullMQ & Redis** (Asynchronous jobs and caching)
- **Winston** (Structured logging)

### Frontend
- **React 18** with **TypeScript**
- **Vite** (Build tooling)
- **Tailwind CSS** (Styling)
- **React Query (TanStack)** (Server state caching)
- **React Router v6** (Navigation)
- **React Hook Form & Zod** (Client-side validation)
- **Recharts** (Analytics and EAI visualizations)

### Infrastructure
- **Docker & Docker Compose**
- **PostgreSQL 15**
- **Redis 7**

---

## 📁 Repository Directory Structure

```text
Clinic-predict/
├── backend/            # Express TypeScript Web API
│   ├── prisma/         # Database schema definition and seed configuration
│   └── src/
│       ├── config/     # App config loaders, database client, Redis connections
│       ├── controllers/# API route handlers
│       ├── middlewares/# Security, logging, authentication, and error wrappers
│       ├── routes/     # Express route orchestrators
│       ├── storage/    # Document storage interfaces (Local vs AWS S3 providers)
│       └── utils/      # Shared utilities (errors, hashing, logger)
├── frontend/           # React TypeScript SPA
│   └── src/
│       ├── components/ # Atomic components (cards, charts, models)
│       ├── layouts/    # Master dashboards and auth screens
│       └── pages/      # Route level components
├── docker-compose.yml  # Development/production orchestration configuration
├── .env.example        # Environment variables template
└── README.md
```

---

## 🏁 Getting Started

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop)
- [Node.js v20+](https://nodejs.org/) (optional for local running)

### Running via Docker Compose (Recommended)

1. Clone the repository and configure your environment variables:
   ```bash
   cp .env.example .env
   ```

2. Run the environment:
   ```bash
   docker-compose up --build
   ```
   - **Backend URL**: `http://localhost:5000`
   - **Frontend URL**: `http://localhost:5173`
   - **Health check**: `http://localhost:5000/health`

### Local Execution (Manual Setup)

#### 🛠️ Windows Portable Setup (Without Docker/UAC)
If you do not have PostgreSQL or Redis installed as services and want to avoid UAC admin prompts:

1. **Redis**:
   - Download the Redis 5.0.14 binaries zip from [tporadowski/redis releases](https://github.com/tporadowski/redis/releases/download/v5.0.14/Redis-x64-5.0.14.zip).
   - Extract it to a folder (e.g., `redis`) and start it:
     ```powershell
     .\redis\redis-server.exe
     ```
2. **PostgreSQL**:
   - Download the PostgreSQL 16 binaries zip from EDB:
     ```powershell
     Invoke-WebRequest -Uri "https://get.enterprisedb.com/postgresql/postgresql-16.3-1-windows-x64-binaries.zip" -UserAgent "Mozilla/5.0" -OutFile "postgresql.zip"
     ```
   - Extract to `postgresql` folder:
     ```powershell
     Expand-Archive -Path "postgresql.zip" -DestinationPath "postgresql"
     ```
   - Initialize the cluster:
     ```powershell
     .\postgresql\pgsql\bin\initdb.exe -D .\postgresql\pgsql\data -U postgres -A trust
     ```
   - Start the PostgreSQL server:
     ```powershell
     .\postgresql\pgsql\bin\postgres.exe -D .\postgresql\pgsql\data
     ```

#### 📦 Setup Application
1. **Install dependencies**:
   Run `npm install` in both `/backend` and `/frontend` folders:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Database Validation & Schema Sync**:
   *Note: Because the backend configuration loads variables from the root `.env` file, ensure your database schema push runs with context of the root `.env` (database: `clinical_prediction_engine`):*
   ```bash
   # From root directory
   npx prisma validate --schema backend/prisma/schema.prisma
   npx prisma generate --schema backend/prisma/schema.prisma
   npx prisma db push --schema backend/prisma/schema.prisma
   ```

3. **Seed Database**:
   Populate the database with initial clinical data:
   ```bash
   cd backend
   npm run prisma:seed
   ```

4. **Start Application Services**:
   - Backend development API server (port 5000):
     ```bash
     cd backend && npm run dev
     ```
   - Frontend React SPA client (port 5173):
     ```bash
     cd frontend && npm run dev
     ```
