# System Description

This project is a multi-tenant web application built with Next.js and Prisma.

It is designed to support multiple organizations (tenants) in one shared system while keeping each tenant's data isolated and secure.

## What It Does

- Provides authentication (login, register, logout, profile, password management).
- Supports role-based access for tenant users and super admins.
- Lets tenants manage core church/community operations such as:
  - members
  - leads
  - communications
  - services
  - offerings
  - prayer requests
  - reports and settings
- Includes API routes for CRUD operations and tenant-aware data handling.
- Offers super-admin areas to manage tenants, users, access, stats, and platform-level settings.

In short, this system is a centralized platform for running and administering many tenant organizations from one codebase.
