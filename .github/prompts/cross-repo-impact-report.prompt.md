---
name: Cross-Repo Impact Report
description: Generate a detailed impact analysis for a proposed change across vpos-admin, vpos-billing, and vpos-billing-offline with file-level touchpoints, contracts, risks, and rollout order.
argument-hint: Describe the proposed feature, bug fix, or contract change
agent: VPOS System Flow Researcher
model: [GPT-5 (copilot), Claude Sonnet 4.5 (copilot)]
---
Create a detailed cross-repo impact report for the requested change.

Required report structure:
1. Change Summary
- Restate the requested change in one paragraph.
- Identify whether it is a feature, bug fix, refactor, or contract update.

2. Repo-by-Repo Impact
- vpos-admin: likely modules, services, cloud functions, and routes affected.
- vpos-billing: likely UI, provider/service, local storage, and cloud sync paths affected.
- vpos-billing-offline: likely local DB, sync protocol, and cloud-upgrade paths affected.

3. Contract and Data Model Changes
- IDs and keys involved (shopkeeperId, branchId, deviceId, staffId, transaction/invoice IDs).
- Payload/schema fields added, removed, renamed, or type-changed.
- Backward compatibility concerns.

4. End-to-End Flow Delta
- Before and after flow steps.
- Trigger points, transport mechanisms, persistence layers, and consumers.

5. Risk Assessment
- Top regression hotspots ordered by severity.
- Operational risks (sync drift, duplicate writes, role access leakage, data loss).

6. Validation Plan
- Tests and manual checks per repo.
- Rollout and rollback recommendations.

Output requirements:
- Use concrete file references from the workspace.
- Mark confidence as High, Medium, or Low for each major claim.
- Keep recommendations actionable and implementation-ready.
