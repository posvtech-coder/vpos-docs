---
name: VPOS Shared Contract Guardrails
description: Use when changing cross-repo data contracts, sync payloads, Firestore schemas, entity IDs, or cloud function request and response shapes that affect vpos-admin, vpos-billing, and vpos-billing-offline.
applyTo:
  - vpos-admin/functions/**
  - vpos-admin/lib/**/services/**
  - vpos-admin/lib/**/providers/**
  - vpos-billing/lib/**/services/**
  - vpos-billing/lib/**/providers/**
  - vpos-billing-offline/lib/services/sync/**
  - vpos-billing-offline/lib/services/cloud/**
  - vpos-billing-offline/lib/data/database/**
---
# VPOS Shared Contract Guardrails

Use these rules whenever a change can affect cross-repo behavior.

## Core Identifiers
- Keep identifier semantics stable across repos:
  - shopkeeperId: tenant/business owner scope
  - branchId: branch scope
  - deviceId: physical POS device scope
  - staffId or employeeId: cashier or manager user scope
  - transactionNumber or invoiceNumber: billing identity and dedup key
- If any identifier format changes, document migration and backward compatibility.

## Contract Change Rules
- Do not rename fields in one repo without updating all producers and consumers.
- Prefer additive changes over breaking changes.
- Keep server and client validation aligned.
- For optional fields, define default behavior explicitly.
- For enum-like values, keep canonical strings consistent across repos.

## Sync and Dedup Safety
- Preserve idempotency for retries and reconnect scenarios.
- Keep dedup keys explicit and stable.
- Validate timestamp assumptions and time zone handling.
- Never assume message ordering in sync channels.

## Firestore and Local Schema Alignment
- When cloud schema changes, check all read and write paths in each repo.
- When offline schema changes, define migration strategy and fallback behavior.
- Avoid silent type coercion between numeric and string IDs.

## Required Change Checklist
- Identify all producers and consumers of changed fields.
- Update docs for changed payloads and entity contracts.
- Add or update tests covering old and new payload shapes.
- Verify admin to billing propagation flow.
- Verify offline peer sync and offline to cloud sync flow.
- Note rollback impact if partial deployment occurs.
