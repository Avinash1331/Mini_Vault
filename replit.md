# VaultX — Mini Wallet System

## Overview

Production-style fintech wallet application inspired by Paytm/PhonePe/Stripe. Full-stack pnpm monorepo with React + Vite frontend, Express.js backend, PostgreSQL, in-memory Redis/Kafka simulations.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec`)
- **Frontend**: React + Vite, Tailwind CSS, Wouter, React Query, Recharts, Framer Motion, Sonner
- **Auth**: JWT (`SESSION_SECRET` env var), bcrypt password hashing
- **Build**: esbuild (ESM bundle)

## Architecture

```
artifacts/
  api-server/        — Express backend at /api
  wallet-app/        — React+Vite frontend at /
lib/
  api-client-react/  — Generated React Query hooks + custom fetch
  api-spec/          — OpenAPI spec + Orval codegen config
  api-zod/           — Generated Zod request/response schemas
  db/                — Drizzle ORM schema + migrations
  kafka.ts           — In-memory Kafka event bus simulation
  redis.ts           — In-memory Redis cache simulation
  payment.ts         — Transfer saga orchestration + fraud detection
```

## Features

- **Auth**: Register/Login with JWT, role-based access (user/admin)
- **Wallet**: Balance, add money, withdraw, daily transfer limits
- **Transfers**: Wallet-to-wallet with saga pattern, idempotency keys, fraud detection
- **Transaction History**: Filterable by status, paginated
- **Immutable Ledger**: Double-entry bookkeeping ledger entries
- **Notifications**: In-app, SMS, Email notifications (simulated)
- **Admin Dashboard**: Charts (Recharts), transaction overview, fraud alerts, user management
- **Resilience Lab**: Simulate DB failure, duplicate payments, notification outages, Kafka delays

## Sample Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@vaultx.com | Admin123! | Admin |
| alice@example.com | Password123! | User |
| bob@example.com | Password123! | User |
| carol@example.com | Password123! | User |
| dan@example.com | Password123! | User |

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run build` — build API server manually

## Key Files

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all endpoints)
- `lib/db/src/schema/` — Drizzle ORM table definitions
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/` — Payment, Kafka, Redis, Logger utilities
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware
- `artifacts/wallet-app/src/pages/` — React page components
- `artifacts/wallet-app/src/hooks/use-auth.tsx` — Auth context with JWT storage

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
