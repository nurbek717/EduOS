# SaaS MVP Guide (Multi-Tenant)

This guide explains how to manage the multi-tenant SaaS flow: plan seeding, super admin login, tenant creation, and day-to-day operations. It assumes the backend runs from server/.

## 1) Environment Setup

Update server/.env with your MongoDB, JWT, and SaaS admin credentials.

Required:
- MONGODB_URI
- JWT_SECRET
- SAAS_SUPER_ADMIN_EMAIL
- SAAS_SUPER_ADMIN_PASSWORD

Optional:
- SAAS_SUPER_ADMIN_NAME
- PAYME_WEBHOOK_SECRET
- CLICK_WEBHOOK_SECRET

## 2) Seed SaaS Plans

Run the plan seed script once:

- npm run seed:saas-plans

This creates Standard, Pro, Enterprise with limits and feature flags.

## 3) Start Backend

- npm run dev

On startup, the SaaS super admin will be created if it does not exist.

## 4) Login as SaaS Super Admin

Endpoint:
- POST /api/saas/auth/login

Body example:
{
  "email": "saas-admin@gmail.com",
  "password": "ChangeMe123@"
}

Response returns:
- token
- user: { id, fullname, role, tenantId, email }

Use this token for all SaaS admin requests:
- Authorization: Bearer <token>

## 5) Create Tenant (School)

Endpoint:
- POST /api/tenants

Headers:
- Authorization: Bearer <super_admin_token>

Body example:
{
  "name": "Green Valley School",
  "slug": "green-valley",
  "planId": "<plan_object_id>",
  "owner": {
    "fullname": "School Owner",
    "email": "owner@school.uz",
    "password": "StrongPass123@"
  }
}

Response includes:
- tenant
- ownerUser

## 6) Login as Tenant Owner

Endpoint:
- POST /api/saas/auth/login

Body example:
{
  "email": "owner@school.uz",
  "password": "StrongPass123@"
}

The returned token has tenantId. All tenant requests must use this token.

## 7) Create Branches

Endpoint:
- POST /api/branches

Headers:
- Authorization: Bearer <tenant_owner_token>

Body example:
{
  "name": "Main Campus",
  "address": "Tashkent, Amir Temur 12"
}

## 8) Create Students

Endpoint:
- POST /api/students

Headers:
- Authorization: Bearer <tenant_owner_token>

Body example:
{
  "fullname": "Ali Karimov",
  "branchId": "<branch_id>",
  "phone": "+998901112233",
  "parentPhone": "+998909998877"
}

## 9) Create Teachers

Endpoint:
- POST /api/teachers

Headers:
- Authorization: Bearer <tenant_owner_token>

Body example:
{
  "fullname": "Madina Rakhimova",
  "branchId": "<branch_id>",
  "phone": "+998901111111",
  "subject": "Math"
}

## 10) Subscription Status

Endpoint:
- GET /api/subscriptions/current

Headers:
- Authorization: Bearer <tenant_owner_token>

If subscription is expired, write actions will return 402 and system works in read-only mode.

## 11) Payment Flow (Webhook Only)

Frontend must not trust payment success. Only webhook activates the subscription.

Endpoints:
- POST /api/subscriptions/webhook/payme
- POST /api/subscriptions/webhook/click

Headers (optional but recommended):
- x-payme-secret: <PAYME_WEBHOOK_SECRET>
- x-click-secret: <CLICK_WEBHOOK_SECRET>

Payload example:
{
  "tenantId": "<tenant_id>",
  "planId": "<plan_id>",
  "startsAt": "2026-05-21T00:00:00.000Z",
  "expiresAt": "2026-06-21T00:00:00.000Z"
}

Alternative payload with period days:
{
  "tenantId": "<tenant_id>",
  "planId": "<plan_id>",
  "periodDays": 30
}

## 12) Feature Flags

Feature flags are enforced in middleware. Example analytics check:
- GET /api/analytics/overview

If plan.features.analytics is false, request returns 403.

## 13) Tenant Isolation Rules

All tenant data is filtered by tenantId. Tokens always include tenantId and role. Users can never read other tenant data.

## 14) Common Errors

- 401: Missing or invalid token
- 403: Forbidden or feature not enabled
- 402: Subscription expired or missing

## 15) Production Checklist

- Set strong JWT_SECRET
- Configure CORS_ORIGIN
- Use HTTPS
- Set webhook secrets
- Backup MongoDB
