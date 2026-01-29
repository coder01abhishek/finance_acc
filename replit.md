# FinOps - Internal Business Finance & Operations Management

## Overview

This is an internal business finance and operations management software built for small-to-mid size IT services companies. The application focuses on internal control, visibility, cash flow management, and decision-making rather than statutory accounting or tax filing.

**Key Features:**
- Transaction management with approval workflows (draft → submitted → approved/rejected)
- Multi-account support (Current, Overdraft/CC, Cash, UPI)
- Client invoicing with line items
- Financial goals tracking (revenue/expense targets)
- Dashboard analytics with charts and reports
- Role-based access control (Admin, HR, Manager, Data Entry)

**Design Principles:**
- Extremely simple UI for non-accountants
- No hidden calculations - every number must be explainable
- Audit trail for all changes
- Human-error tolerant with review/approval flows

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight alternative to React Router)
- **State Management:** TanStack Query (React Query) for server state
- **UI Components:** Shadcn/ui with Radix UI primitives
- **Styling:** Tailwind CSS with custom design tokens
- **Charts:** Recharts for dashboard visualizations
- **Forms:** React Hook Form with Zod validation

The frontend follows a page-based structure under `client/src/pages/` with shared components in `client/src/components/`. Custom hooks in `client/src/hooks/` handle authentication and finance data fetching.

### Backend Architecture
- **Runtime:** Node.js with Express
- **Language:** TypeScript with ESM modules
- **Build:** Vite for client, esbuild for server bundling
- **API Pattern:** RESTful endpoints under `/api/*`

Routes are defined in `server/routes.ts` with a storage abstraction layer in `server/storage.ts` that handles all database operations. The server uses middleware for JSON parsing, logging, and authentication.

### Authentication
- **Provider:** Replit Auth (OpenID Connect)
- **Session Storage:** PostgreSQL-backed sessions via `connect-pg-simple`
- **User Model:** Separate `users` table (Replit Auth) and `appUsers` table (app-specific roles)

The first user to sign up automatically becomes admin. Authentication is handled through the `server/replit_integrations/auth/` module.

### Data Storage
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM with Zod schema integration
- **Schema Location:** `shared/schema.ts` contains all table definitions
- **Migrations:** Drizzle Kit with `db:push` command

**Core Tables:**
- `users` / `sessions` - Authentication (Replit Auth managed)
- `appUsers` - Application roles linked to auth users
- `accounts` - Bank accounts (current, OD/CC, cash, UPI)
- `transactions` - Financial transactions with approval status
- `categories` - Transaction categorization
- `clients` - Customer records for invoicing
- `invoices` / `invoiceItems` - Invoice management
- `goals` - Revenue/expense targets

### Shared Code
The `shared/` directory contains code used by both client and server:
- `schema.ts` - Database schema and TypeScript types
- `routes.ts` - API route definitions with Zod validation schemas
- `models/auth.ts` - Authentication-related table definitions

## External Dependencies

### Database
- **PostgreSQL** - Primary data store, configured via `DATABASE_URL` environment variable

### Authentication
- **Replit Auth** - OIDC-based authentication via `ISSUER_URL` (defaults to Replit's OIDC provider)
- Requires `SESSION_SECRET` environment variable for session encryption

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `express` / `express-session` - HTTP server and session management
- `@tanstack/react-query` - Client-side data fetching
- `recharts` - Dashboard charts
- `date-fns` - Date manipulation
- `zod` - Runtime validation for API inputs
- `passport` / `openid-client` - Authentication flow

### Development Tools
- Vite with HMR for frontend development
- TypeScript for type safety across the stack
- Replit-specific plugins for development experience