# Core Multi-Tenant Model

Multi-tenant church and organization management platform built with Next.js, Prisma, PostgreSQL, and role-based access control.

This system allows multiple tenants to operate from one shared codebase while keeping data isolated by tenant and access restricted by role and permissions.

## Table of Contents

- Overview
- Core Capabilities
- Technology Stack
- Architecture Summary
- Project Structure
- Getting Started
- Environment Variables
- Database Setup and Seeding
- Available Scripts
- Authentication and Authorization
- API Modules
- Tenant Isolation Rules
- Deployment Notes

## Overview

The platform supports two main operational contexts:

- Tenant operations for church or organization teams
- Super admin operations for global platform governance

It includes modules for members, leads, offerings, communications, prayer requests, call logs, services, permissions, and reporting.

## Core Capabilities

- Multi-tenant data model with tenant-aware records
- JWT-based authentication with access and refresh tokens
- Role-based access with configurable module permissions
- Super admin panel for tenant, user, and system oversight
- API-first structure for CRUD and domain workflows
- Prisma-powered PostgreSQL persistence
- Validation and typed API contracts for safer data handling

## Technology Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Prisma 7
- PostgreSQL (native adapter and pool support)
- TanStack Query (client state/data fetching)
- Tailwind CSS 4 and component primitives
- Zod for schema validation

## Architecture Summary

- Frontend: Next.js App Router pages and layouts under app
- Backend: Route handlers under app/api
- Database: Prisma schema in prisma/schema.prisma
- Auth: JWT utilities and cookie/session handling in lib/auth.ts
- Permissions: Role and user-level overrides in database and helper libs

The system enforces strict tenant boundaries for tenant-owned data and provides elevated access only for SUPER_ADMIN role users.

## Project Structure

High-level folders:

- app: Pages, layouts, and API routes
- components: Reusable UI and dashboard components
- lib: Auth, DB, permissions, utilities, and client helpers
- prisma: Schema, migrations, and seed script
- types: Shared TypeScript types
- validations: Zod schemas
- docs: Additional architecture documentation

## Getting Started

### 1. Prerequisites

- Node.js 20+
- PostgreSQL database
- npm, pnpm, yarn, or bun

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a .env file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-secret"
NEXT_PUBLIC_API_URL="http://localhost:4020/api"
```

If you use Prisma Postgres Accelerate, DATABASE_URL can also use a prisma+postgres:// URL.

### 4. Generate schema in the target database

```bash
npx prisma db push
```

### 5. Seed initial admin account (optional, recommended)

```bash
npx tsx prisma/seed.ts
```
### 6. Start development server

```bash
npm run dev
```

The app runs on:

- http://localhost:4020

## Environment Variables

Required variables:

- DATABASE_URL: PostgreSQL or Prisma Accelerate connection string
- JWT_SECRET: Secret for short-lived access token signing
- JWT_REFRESH_SECRET: Secret for refresh token signing

Optional variables:

- NEXT_PUBLIC_API_URL: Client-side API base URL override

## Database Setup and Seeding

- Prisma schema: prisma/schema.prisma
- SQL migration snapshot: prisma/migrations/000_init_schema.sql
- Seed script: prisma/seed.ts

The schema models tenants, users, permissions, members, leads, offerings, communications, services, and audit activity with role and user permission overrides.

Detailed DB documentation is available in docs/DATABASE_ARCHITECTURE.md.

## Available Scripts

- npm run dev: Run development server on port 4020
- npm run build: Generate Prisma client, then build Next.js app
- npm run start: Start production server
- npm run lint: Run ESLint
- npm run postinstall: Generate Prisma client after install

## Authentication and Authorization

Authentication:

- Access token and refresh token strategy
- Access token lifetime: 15 minutes
- Refresh token lifetime: 7 days
- Cookie-based auth support plus Bearer token header support

Authorization:

- Roles include SUPER_ADMIN, CHURCH_ADMIN, STAFF, CALL_CENTER, SUBSCRIBER, MEMBER
- Module-level permissions use RolePermission and UserPermission tables
- Tenant context is enforced for tenant-scoped operations

## API Modules

API routes are located under app/api and grouped by domain:

- auth: login, register, refresh, logout, me, change-password
- tenants and users: tenant and user management endpoints
- permissions: role/user permission retrieval and management
- members and leads: lifecycle and engagement records
- communications and messages: outbound and internal communication data
- offerings, services, prayer-requests: ministry operations
- calls and stats: call-center and reporting/statistics data
- settings and tenant/profile: tenant/platform configuration data

## Tenant Isolation Rules

- Tenant-owned tables include tenantId
- SUPER_ADMIN can operate across tenants
- Non-super-admin users are restricted to their tenant scope
- Unique constraints are commonly tenant-scoped to avoid cross-tenant collisions

## Deployment Notes

- Use production-grade PostgreSQL credentials and managed secrets
- Set NODE_ENV=production in runtime
- Use secure JWT secrets and rotate regularly
- Ensure HTTPS in production for secure cookies
- Run prisma generate as part of build or install (already wired in scripts)

## Additional Documentation

- Database architecture: docs/DATABASE_ARCHITECTURE.md
- Short system summary: SYSTEM_DESCRIPTION.md
