# ReFlow Web Control Plane (`apps/web`)

The Next.js 16 web application and cloud control plane for **ReFlow**. Provides the public marketing landing page, customer dashboard, visual workflow canvas builder, and telemetry REST API.

---

## Architecture & Features

- **Next.js 16 App Router**: React 19, Turbopack, Tailwind CSS v4, and Lucide icons.
- **Visual Workflow Editor**: Interactive full-page workflow canvas (`/dashboard/workflows/[id]/edit`) built on Drawflow for building, connecting, and editing automation nodes.
- **Dual Authentication**: Session-based auth for interactive users; bearer token auth (`ps_live_<org_id>`) for headless desktop automation runners.
- **Cloud Run Queue**: REST endpoints managing pending execution queues, atomic status transitions, and artifact catalogs.
- **Human-in-the-Loop (HITL) Alerting**: Real-time 90-second 2FA intervention banner and status badges.

---

## Route Structure

```text
apps/web/src/app/
├── (auth)/                    # User authentication flows (/login, /signup)
├── api/v1/                    # Cloud Control Plane REST API
│   ├── runs/                  # Run queue queries, creation, and status transitions
│   ├── workflows/             # Workflow CRUD and definition persistence
│   ├── artifacts/             # Artifact registration and metadata queries
│   └── runners/               # Runner diagnostics and version coordination
├── dashboard/                 # Customer dashboard
│   ├── page.tsx               # Overview metrics, portal cards, active runs
│   └── workflows/[id]/edit/   # Visual Workflow Canvas Builder (Drawflow)
├── page.tsx                   # ReFlow public marketing landing page
└── layout.tsx                 # Root layout & theme providers
```

---

## Getting Started

### 1. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. Development Server

Run the development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Production Build

Verify TypeScript compilation and build production assets:

```bash
npm run build
npm run start
```
