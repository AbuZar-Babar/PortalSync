# PortalSync (Workflow Capture SaaS)

Enterprise B2B Automation platform for Accounts Payable and Finance teams. PortalSync automates vendor portal logins, recurring invoice extractions, and financial document syncing with ERP systems without breaking on 2FA or CAPTCHAs.

## Architecture

- **`apps/web`**: Next.js 15 App Router web control plane, marketing landing page, customer dashboard, and telemetry API (`/api/v1/*`).
- **`packages/engine`**: Core modular automation capture and replay engine, browser CDP controller, and workflow parser.

## Tech Stack

- **Frontend / Cloud**: Next.js 15, Tailwind CSS, TypeScript, Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL with Row-Level Security)
- **Local Engine**: Node.js, Puppeteer-core / Chrome DevTools Protocol (CDP)
- **Deployment**: Vercel / Supabase

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account with configured `wf_*` schema

### Running Web Application

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.
