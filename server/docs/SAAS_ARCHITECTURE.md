# Multi-Tenant SaaS School Management System (Express + MongoDB)

This document defines the production-grade architecture, data model, and API surface for a multi-tenant school management platform. Each school is a tenant and all data is isolated via tenantId.

## 1) Architecture Overview

### Goals
- Multi-tenant isolation by tenantId for all collections and queries.
- Role-based access control (RBAC).
- Scalable and secure production-grade setup.
- Subscription limits with read-only mode on expiration.
- Payment verification only via webhook.

### High-Level Components
- API Gateway (Express.js)
- Auth Service (JWT + RBAC)
- Tenant Service
- Subscription Service
- Branches / Students / Teachers Services
- Payment Webhook Handler (Payme / Click)
- Redis Cache (session/feature flags)
- File Storage (Cloudinary or AWS S3)

### Request Flow
1) Request enters via Express.
2) Auth middleware validates JWT and attaches user context.
3) Tenant resolver middleware loads tenantId from JWT or host header.
4) Feature flag middleware checks current plan features.
5) RBAC guard checks permissions.
6) Service executes with tenantId scoped query.

## 2) Data Model (Collections)

All collections include createdAt, updatedAt, and tenantId (except plans).

### tenants
- _id
- name
- slug (unique)
- ownerId (users._id)
- planId (plans._id)
- status: active | suspended | archived

Indexes:
- slug (unique)
- ownerId
- status

### plans
- _id
- name (Standard | Pro | Enterprise)
- maxStudents (number, -1 for unlimited)
- maxBranches (number, -1 for unlimited)
- features: {
    analytics: boolean,
    ai: boolean,
    payment: boolean,
    attendanceReports: boolean,
    finance: boolean
  }
- price (number)

Indexes:
- name (unique)

### subscriptions
- _id
- tenantId
- planId
- startsAt
- expiresAt
- status: active | expired | canceled | trial

Indexes:
- tenantId
- status
- expiresAt

### branches
- _id
- tenantId
- name
- address

Indexes:
- tenantId
- name

### students
- _id
- tenantId
- branchId
- fullname
- phone
- parentPhone

Indexes:
- tenantId
- branchId
- phone

### users
- _id
- tenantId
- fullname
- role
- email
- password (hashed)

Indexes:
- tenantId
- role
- email (unique)

### teachers (optional dedicated collection)
- _id
- tenantId
- branchId
- fullname
- phone
- subject

Indexes:
- tenantId
- branchId

## 3) Tenant Isolation Rules

- tenantId is required on all tenant-owned records.
- All queries must include tenantId filter.
- No cross-tenant queries allowed.
- JWT includes tenantId and role.

## 4) RBAC Roles

Roles:
- super_admin
- school_owner
- director
- admin
- teacher
- parent
- student

Example policy:
- super_admin: manage all tenants, plans, users
- school_owner: manage tenant settings, branches, subscriptions
- director/admin: manage students, teachers, branches
- teacher: view students, mark attendance
- parent/student: view own data only

## 5) Subscription Limits and Read-Only Mode

Limit checks:
- Student limit check on students.create
- Branch limit check on branches.create
- Subscription expiration check for all write operations

Read-only mode:
- If subscription expired, deny POST/PUT/PATCH/DELETE
- Allow GET for existing data

## 6) Feature Flags

Features from plan:
- analytics
- ai
- payment
- attendanceReports
- finance

Feature flag check example:
if (!plan.features.analytics) return 403;

## 7) Payment Flow (Payme / Click)

Flow:
1) Tenant selects plan.
2) Payment created via provider.
3) Webhook receives verification.
4) Subscription is activated or extended.

Rules:
- Frontend never trusts payment success.
- Only webhook updates subscription.

## 8) API Endpoints (Draft)

### Auth
- POST /api/auth/login
- POST /api/auth/register
- GET /api/auth/me

### Tenants
- POST /api/tenants
- GET /api/tenants/:id
- PATCH /api/tenants/:id

### Plans
- GET /api/plans
- POST /api/plans (super_admin)

### Subscriptions
- GET /api/subscriptions/current
- POST /api/subscriptions/checkout
- POST /api/subscriptions/webhook/payme
- POST /api/subscriptions/webhook/click

### Branches
- GET /api/branches
- POST /api/branches
- PATCH /api/branches/:id
- DELETE /api/branches/:id

### Students
- GET /api/students
- POST /api/students
- PATCH /api/students/:id
- DELETE /api/students/:id

### Teachers
- GET /api/teachers
- POST /api/teachers
- PATCH /api/teachers/:id
- DELETE /api/teachers/:id

## 9) Security
- JWT with userId, tenantId, role.
- Password hashing with bcrypt.
- Rate limiting on auth routes.
- Validation using Joi or Zod.
- HTTPS enforced in production.

## 10) Scalability
- Stateless API servers.
- Redis for caching and rate limits.
- Horizontal scaling behind load balancer.
- Separate read replicas for MongoDB if needed.

## 11) Folder Structure

server/src/
  modules/
    auth/
    tenants/
    subscriptions/
    students/
    branches/
    teachers/
    analytics/
  middleware/
  guards/
  config/
  database/
  utils/

