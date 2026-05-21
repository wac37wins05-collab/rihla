# Phase 1 — RBAC + CRM Foundation

This phase extends the existing FastAPI RBAC and CRM modules. It does not rebuild authentication, CRM, tenancy, or the frontend.

## RBAC foundation

New enterprise roles:

- `travel_designer`
- `contracting_manager`
- `horizon_transport`
- `accounting_manager`
- `ceo`

`ceo`, `director`, and `super_admin` have full access. Existing legacy roles remain supported.

Permission catalog highlights:

- Travel Designer: CRM read/write, pipeline, client requests, itineraries, proposals, quotations
- Contracting Manager: suppliers, contracts, rates, hotels, restaurants, guides, activities
- Horizon Transport: transport planning, vehicle/driver assignment, dispatch, incident tracking
- Accounting Manager: invoices, payments, supplier invoices, accounting reports and exports
- CEO: full access

JWT access tokens now carry effective permissions so API dependencies can enforce permissions without rewriting modules.

## CRM foundation

The existing `crm_accounts` model now supports:

- B2C profile fields: passport, passport expiry, birthday, preferences/history/documents/tags
- B2B agency fields: commission, annual revenue, conversion rate, special pricing, negotiated rates
- Corporate fields: travel manager, finance contact, corporate agreement, negotiated rates
- Existing sales pipeline APIs remain based on CRM deals and DMC stages

CRM write endpoints now enforce `crm:write`; sales pipeline transitions enforce `crm:pipeline`; reporting/recompute endpoints enforce `crm:reporting`.

## Migration

`backend/alembic/versions/0022_phase1_rbac_crm.py` adds the new nullable CRM profile fields and seeds the new enterprise roles idempotently.
