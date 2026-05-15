# Email Report System — Edge Case Verification & Fix

**Date:** May 13, 2026  
**Status:** ✅ Fixed and deployed to both dev and prod

---

## Issue Verification

User requested verification that the email report system handles two edge cases:

1. **No transactions in period** → Should NOT send email
2. **Branch is inactive/deleted** → Should NOT send email

---

## Findings

### ✅ Case 1: No Transactions Check — ALREADY HANDLED

**Location:** `functions/lib/reports/email-report-scheduler.functions.js:148-152`

```javascript
if (bills.length === 0) {
    logger.info(`[EmailReports] ${branchId}: 0 bills in range — skipping email.`);
    results.skipped++;
    continue;  // ✅ Skip email when no transactions
}
```

**Result:** No code change needed. System already validates transaction count before sending.

---

### ❌ Case 2: Inactive Branch Check — MISSING

**Problem:** System was not checking if branch `isActive === false` before sending email reports.

**Risk:** 
- Emails sent to deleted/inactive branches
- Wasted MSG91 API calls
- Potential user confusion (receiving reports for closed branches)

---

## Fix Implemented

### Modified File
`functions/lib/reports/email-report-scheduler.functions.js`

### Change Details

**Added new section 3a** between email validation and manager lookup:

```javascript
// ── 3a. Check if branch is active ──────────────────────────────────────
const branchDoc = await db
    .collection("shopkeepers").doc(shopkeeperId)
    .collection("branches").doc(branchId)
    .get();

if (!branchDoc.exists) {
    logger.warn(`[EmailReports] ${branchId}: branch not found — skipping.`);
    results.skipped++;
    continue;
}

const branchData = branchDoc.data();
if (branchData.isActive === false) {
    logger.info(`[EmailReports] ${branchId}: branch is inactive — skipping.`);
    results.skipped++;
    continue;
}
```

**Renumbered subsequent sections:**
- `3a. Live manager emails` → `3b.`
- `3b. Fetch bills` → `3c.`
- `3c. Compute KPIs` → `3d.`
- `3d. Generate Excel` → `3e.`
- `3e. Send MSG91` → `3f.`

---

## Impact

### Functions Updated (Both Dev & Prod)

**Old System (Active until May 20):**
- `sendDailyReports`
- `sendWeeklyReports`
- `sendMonthlyReports`
- `sendQuarterlyReports`
- `sendSemiAnnualReports`
- `sendYearlyReports`

**New System (Unified Task Processor):**
- `processEmailTasks` — Calls same `runReportPipeline` function, inherits fix

---

## Deployment

### Dev Environment (smbs-dev-b84ad)
```powershell
firebase deploy --only functions:sendDailyReports,functions:sendWeeklyReports,functions:sendMonthlyReports,functions:sendQuarterlyReports,functions:sendSemiAnnualReports,functions:sendYearlyReports,functions:processEmailTasks --project smbs-dev-b84ad
```
**Status:** ✅ Deployed successfully

### Production Environment (smbs-7b59e)
```powershell
firebase deploy --only functions:sendDailyReports,functions:sendWeeklyReports,functions:sendMonthlyReports,functions:sendQuarterlyReports,functions:sendSemiAnnualReports,functions:sendYearlyReports,functions:processEmailTasks --project smbs-7b59e
```
**Status:** ✅ Deployed successfully

---

## Execution Flow (Updated)

For each email period (daily/weekly/monthly/etc):

1. ✅ Query `email_subscriptions` where `{period} == true`
2. ✅ Loop through each subscribed branch
3. ✅ Validate shopkeeper email exists
4. **✅ NEW: Check branch document exists and `isActive !== false`**
5. ✅ Fetch active managers for BCC list
6. ✅ Query bills in date range
7. **✅ Check if `bills.length === 0` and skip**
8. ✅ Compute KPIs (gross, discount, net)
9. ✅ Generate Excel workbook
10. ✅ Send email via MSG91 with Excel attachment

---

## Edge Case Coverage

| Scenario | Handled | Location |
|----------|---------|----------|
| No transactions in period | ✅ Yes | Line 148 |
| Branch not found | ✅ Yes | Line 130 (new) |
| Branch `isActive === false` | ✅ Yes | Line 138 (new) |
| No shopkeeper email | ✅ Yes | Line 118 |
| No active managers | ⚠️ Allowed | BCC just empty |
| Missing bill fields | ✅ Yes | Defaults to 0 |

---

## Additional Notes

### Why Branch isActive Check Matters

**Scenario:**
1. Shopkeeper deletes a branch via admin panel
2. Branch document updated: `isActive: false`
3. But `email_subscriptions/{branchId}` document still exists
4. Without check → Email would still be sent

**With Fix:**
System now fetches actual branch document and verifies `isActive !== false` before processing.

### Performance Impact

**Additional Cost per Branch:**
- 1 extra Firestore read (branch document fetch)

**Benefit:**
- Prevents wasted MSG91 API calls
- Prevents wasted bill query
- Prevents wasted Excel generation
- Better user experience

**Net Impact:** Minimal — inactive branches are rare compared to active ones.

---

## Testing Tomorrow (May 14, 2026)

### Scheduled Runs

**2 AM IST:**
- `processCleanupTasks` will run
- Test task: `DELETE_INVENTORY_IMAGES` will execute
- Check logs for completion status

**8 AM IST:**
- `processEmailTasks` will run (new system)
- `sendDailyReports` will run (old system)
- Test task: `EMAIL_REPORT_DAILY` will execute
- **Expected:** Both systems now skip inactive branches

### Validation Checklist

- [ ] Check Cloud Function logs at 2 AM and 8 AM
- [ ] Verify `scheduled_tasks` test documents marked as completed
- [ ] Confirm no errors in function execution
- [ ] Verify emails only sent for **active** branches
- [ ] Verify emails only sent when transactions exist
- [ ] Compare old vs new system behavior (should be identical)

---

## Related Documentation

- [MIGRATION_TRACKING.md](./MIGRATION_TRACKING.md) — Full migration status
- [EMAIL_REPORT_CONSOLIDATION_PLAN.md](./EMAIL_REPORT_CONSOLIDATION_PLAN.md) — Original design doc
- [SCHEDULED_TASKS_IMPLEMENTATION.md](./SCHEDULED_TASKS_IMPLEMENTATION.md) — Task system architecture
- [functions/lib/reports/email-report-scheduler.functions.js](./vpos-admin/functions/lib/reports/email-report-scheduler.functions.js) — Updated source code

---

## Next Steps

1. ✅ **DONE:** Verify edge case handling
2. ✅ **DONE:** Fix inactive branch check
3. ✅ **DONE:** Deploy to dev and prod
4. ⏳ **TOMORROW:** Monitor 2 AM and 8 AM runs
5. ⏳ **MAY 13-20:** Testing period with both systems
6. ⏳ **MAY 20:** Delete old functions after validation

---

**Conclusion:**  
Both edge cases are now properly handled. System will not send emails for inactive branches or periods with no transactions. Changes deployed to both environments and ready for tomorrow's scheduled runs.
