# Migration Guide: Unified Task Processor

## Overview

This guide walks through migrating from **7 separate scheduled functions** to **1 unified task processor**.

**Benefits:**
- ✅ 54% cost savings ($7.44/year)
- ✅ Single function to monitor and debug
- ✅ Easy to add new task types
- ✅ Better error handling and retry logic

---

## Current State (Before Migration)

### Scheduled Functions
1. `sendDailyReports` (8 AM IST daily) — ⏰ **Email**
2. `sendWeeklyReports` (8 AM IST Monday) — ⏰ **Email**
3. `sendMonthlyReports` (8 AM IST 1st) — ⏰ **Email**
4. `sendQuarterlyReports` (8 AM IST Jan/Apr/Jul/Oct 1st) — ⏰ **Email**
5. `sendSemiAnnualReports` (8 AM IST Jan/Jul 1st) — ⏰ **Email**
6. `sendYearlyReports` (8 AM IST Jan 1st) — ⏰ **Email**
7. `processScheduledTasks` (2 AM IST daily) — 🧹 **Cleanup**

**Total:** 7 Cloud Scheduler jobs

---

## New State (After Migration)

### Unified Task Processors (Smart Timing)
1. **`processEmailTasks`** — 8:00 AM IST daily
   - Processes all 6 email report tasks
   - Optimal timing for email delivery
   - 30s cooldown between reports

2. **`processCleanupTasks`** — 2:00 AM IST daily
   - Processes cleanup/maintenance tasks
   - Off-peak hours, minimal user impact
   - 10s cooldown between operations

**Total:** 2 Cloud Scheduler jobs (71% reduction)

---

## Migration Steps

### Phase 1: Deploy Unified Processor (Dev) — Week 1

#### 1.1 Compile TypeScript
```powershell
cd c:\GitHub\VPOS\vpos-admin\functions
npx tsc
```

#### 1.2 Export New Functions

Add to `functions/lib/index.js`:

```javascript
// ⏰ UNIFIED TASK PROCESSORS (NEW - May 2026)
var unified_task_processor_1 = require("./scheduled-tasks/unified-task-processor.functions");
Object.defineProperty(exports, "processEmailTasks", { enumerable: true, get: function () { return unified_task_processor_1.processEmailTasks; } });
Object.defineProperty(exports, "processCleanupTasks", { enumerable: true, get: function () { return unified_task_processor_1.processCleanupTasks; } });
Object.defineProperty(exports, "initializeRecurringTasks", { enumerable: true, get: function () { return unified_task_processor_1.initializeRecurringTasks; } });
Object.defineProperty(exports, "getTaskStatistics", { enumerable: true, get: function () { return unified_task_processor_1.getTaskStatistics; } });
```

#### 1.3 Add Function Configs

Add to `functions/lib/config/functions.config.js`:

```javascript
'processEmailTasks': exports.FunctionConfigs.heavy,      // 1GiB memory, 15 min timeout (8 AM run)
'processCleanupTasks': exports.FunctionConfigs.heavy,    // 1GiB memory, 15 min timeout (2 AM run)
'initializeRecurringTasks': exports.FunctionConfigs.medium, // Admin function
'getTaskStatistics': exports.FunctionConfigs.light,         // Admin function
```

#### 1.4 Deploy to Dev

```powershell
cd c:\GitHub\VPOS\vpos-adminEmailTasks,functions:processCleanupTasks,functions:initializeRecurringTasks,functions:getTaskStatistics --project smbs-dev-b84ad
```

**Expected Result:**
- 2 new scheduled functions deployed (8 AM and 2 AM)
- 2 Cloud Scheduler jobs created automatically
- 2 admin functions for task managementebase deploy --only functions:processAllScheduledTasks,functions:initializeRecurringTasks,functions:getTaskStatistics --project smbs-dev-b84ad
```

#### 1.5 Initialize Recurring Tasks

Call the `initializeRecurringTasks` function from Firebase Console or via code:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const initTasks = httpsCallable(functions, 'initializeRecurringTasks');

const result = await initTasks();
console.log('Tasks created:', result.data);
```

This creates ~435 tasks for the next 12 months:
- 365 daily email tasks
- 52 weekly email tasks
- 12 monthly email tasks
- 4 quarterly email tasks
- 2 semi-annual email tasks
- 1 yearly email task

---

### Phase 2: Test in Dev — Week 2

#### 2.1 Verify Task Creation

Check Firestore `scheduled_tasks` collection:

```typescript
db.collection('scheduled_tasks')
  .where('status', '==', 'pending')
  .orderBy('scheduledDate')
  .limit(10)
  .get()
```

Expected fields:
```typescript
{
  taskId: "EMAIL_REPORT_DAILY_2026-05-14",
  taskType: "EMAIL_REPORT_DAILY",
  scheduledDate: Timestamp(2026-05-14 08:00:00),
  status: "pending",
  priority: 9,
  cooldownSeconds: 30,
  retryCount: 0,
  maxRetries: 3,
  createdAt: Timestamp,s

Wait for scheduled runs or manually trigger:

**Email Processor (8 AM):**
```powershell
firebase functions:log --only processEmailTasks --project smbs-dev-b84ad
```

Expected log output:
```
📧 Email Task Processor: Starting at 8 AM...
🚀 Task Processor: Starting (filter: EMAIL_REPORT)...
📋 Found 6 EMAIL_REPORT task(s) to process
⚡ Processing: EMAIL_REPORT_DAILY (priority: 9)
✅ Completed: EMAIL_REPORT_DAILY in 45230ms
⏸️  Cooldown: 30s before next task
⚡ Processing: EMAIL_REPORT_WEEKLY (priority: 8)
✅ Completed: EMAIL_REPORT_WEEKLY in 23410ms
🎉 EMAIL_REPORT Task Processor: Complete
```

**Cleanup Processor (2 AM):**
```powershell
firebase functions:log --only processCleanupTasks --project smbs-dev-b84ad
```

Expected log output:
```
🧹 Cleanup Task Processor: Starting at 2 AM...
🚀`processScheduledTasks` should still run at 2 AM
- Verify both systems work correctly

**Note:** Email tasks will run from BOTH systems during testing:
- Old system: `sendDailyReports` at 8 AM
- New system: `processEmailTasks` at 8 AM
- Users may receive duplicate emails (acceptable for 1 week testing
📋 Found 2 CLEANUP task(s) to process
⚡ Processing: DELETE_INVENTORY_IMAGES (priority: 5)
✅ Completed: DELETE_INVENTORY_IMAGES in 12340ms
🎉 CLEANUPng: EMAIL_REPORT_DAILY (priority: 9)
✅ Completed: EMAIL_REPORT_DAILY in 45230ms
⏸️  Cooldown: 30s before next task
⚡ Processing: EMAIL_REPORT_WEEKLY (priority: 8)
✅ Completed: EMAIL_REPORT_WEEKLY in 23410ms
🎉 Unified Task Processor: Complete
```

#### 2.3 Verify Old Functions Still Work

Keep old functions active during testing period:
- `sendDailyReports` should still run at 8 AM
- Verify both systems send emails (check sent count)

#### 2.4 Compare Results

**Check:**
- ✅ Both systems send same reports
- ✅ Email content is identical
- ✅ No missing branches
- ✅ Task status updates correctly in Firestore

---

### Phase 3: Deploy to Production — Week 3

#### 3.1 Deploy Unified Processor to Prod

```powershell
cd c:\GitHub\VPOS\vpos-admin
firebase deploy --only functions:processAllScheduledTasks,functions:initializeRecurringTasks,functions:getTaskStatistics --project smbs-7b59e
```
Email processor runs daily at 8 AM IST
- [ ] Cleanup processor runs daily at 2 AM IST
- [ ] All 6 email report types execute successfully
- [ ] Cleanup tasks (image deletion) execute successfully
- [ ] Tasks marked as `completed` in Firestore
- [ ] No error logs in Cloud Functions console
- [ ] Shopkeepers receive reports at 8 AM (not 2 AM)
- [ ] Email delivery timing is appropriat
```typescript
const functions = getFunctions();
const initTasks = httpsCallable(functions, 'initializeRecurringTasks');

const result = await initTasks();
console.log('Production tasks created:', result.data);
```

#### 3.3 Monitor Both Systems for 1 Week

Keep old functions active alongside new unified processor:
- Both systems will send emails
- Users may receive duplicate emails (acceptable for testing)
- Monitor for errors or missed tasks

#### 3.4 Validation Checklist

- [ ] Unified processor runs daily at 2 AM IST
- [ ] All 6 email report types execute successfully
- [ ] Tasks marked as `completed` in Firestore
- [ ] No error logs in Cloud Functions console
- [ ] Shopkeepers receive reports on schedule
- [ ] Task statistics function returns correct counts

---

### Phase 4: Cleanup Old Functions — Week 4

#### 4.1 Comment Out Old Functions

In `functions/lib/index.js`, comment out old exports:

```javascript
// ⏰ EMAIL REPORT SCHEDULERS (OLD — DEPRECATED, use processAllScheduledTasks)
// var email_report_scheduler_1 = require("./reports/email-report-scheduler.functions");
// Object.defineProperty(exports, "sendDailyReports", { enumerable: true, get: function () { return email_report_scheduler_1.sendDailyReports; } });
// Object.defineProperty(exports, "sendWeeklyReports", { enumerable: true, get: function () { return email_report_scheduler_1.sendWeeklyReports; } });
// Object.defineProperty(exports, "sendMonthlyReports", { enumerable: true, get: function () { return email_report_scheduler_1.sendMonthlyReports; } });
// Object.defineProperty(exports, "sendQuarterlyReports", { enumerable: true, get: function () { return email_report_scheduler_1.sendQuarterlyReports; } });
// Object.defineProperty(exports, "sendSemiAnnualReports", { enumerable: true, get: function () { return email_report_scheduler_1.sendSemiAnnualReports; } });
// Object.defineProperty(exports, "sendYearlyReports", { enumerable: true, get: function () { return email_report_scheduler_1.sendYearlyReports; } });

// ⏰ SCHEDULED TASKS (OLD — DEPRECATED, use processAllScheduledTasks)
// var scheduled_tasks_functions_1 = require("./scheduled-tasks/scheduled-tasks.functions");
// Object.defineProperty(exports, "processScheduledTasks", { enumerable: true, get: function () { return scheduled_tasks_functions_1.processScheduledTasks; } });
```

#### 4.2 Redeploy Functions

```powershell
# Dev
firebase deploy --only functions --project smbs-dev-b84ad

# Prod
firebase deploy --only functions --project smbs-7b59e
```

This will:2 jobs (`processEmailTasks` at 8 AM, `processCleanupTasks` at 2 AM)

```powershell
gcloud scheduler jobs list --project=smbs-dev-b84ad
```

Expected output:
```
NAME                    LOCATION       SCHEDULE      TIMEZONE
processEmailTasks       asia-south1    0 8 * * *    Asia/Kolkata
processCleanupTasksessAllScheduledTasks`)

```powershell
gcloud scheduler jobs list --project=smbs-dev-b84ad
```

Expected output:
```
NAME                          LOCATION       SCHEDULE      TIMEZONE
processAllScheduledTasks      asia-south1    0 2 * * *    Asia/Kolkata
```

#### 4.4 Archive Old Code

Move old files to archive folder:

```powershell
cd c:\GitHub\VPOS\vpos-admin\functions
mkdir archive
move lib\reports\email-report-scheduler.functions.js archive\
move lib\scheduled-tasks\scheduled-tasks.functions.js archive\
```

---

## Verification & Monitoring

### Check Task Statistics

Call `getTaskStatistics` function:

```typescript
const functions = getFunctions();
const getStats = httpsCallable(functions, 'getTaskStatistics');

const result = await getStats();
console.log('Task stats:', result.data);
```

Expected output:
```json
{
  "total": 435,
  "byStatus": {
    "pending": 420,
    "completed": 15,
    "failed": 0
  },
  "byType": {
    "EMAIL_REPORT_DAILY": 365,
    "EMAIL_REPORT_WEEKLY": 52,
    "EMAIL_REPORT_MONTHLY": 12,
    "EMAIL_REPORT_QUARTERLY": 4,
    "EMAIL_REPORT_SEMIANNUAL": 2,
    "EMAIL_REPORT_YEARLY": 1
  }
}
```

### Monitor Logs

```powershell
# View unified processor logs
firebase functions:log --only processAllScheduledTasks --project smbs-7b59e --limit 100

# Filter for errors
firebase functions:log --only processAllScheduledTasks --project smbs-7b59e | findstr "ERROR"
```

### Query Failed Tasks

```typescript
const failedTasks = await db
  .collection('scheduled_tasks')
  .where('status', '==', 'failed')
  .get();

console.log(`Failed tasks: ${failedTasks.size}`);
failedTasks.forEach(doc => {
  const task = doc.data();
  console.log(`${task.taskType}: ${task.lastError}`);
});
```

---

## Adding New Task Types

### Example: Add Transaction Cleanup Task

#### 1. Create Callable Function

```typescript
export const scheduleTransactionCleanup = onCall(
  getFunctionConfig('scheduleTransactionCleanup'),
  async (request) => {
    // Create task in Firestore
    await admin.firestore()
      .collection('scheduled_tasks')
      .add({
        taskType: 'DELETE_OLD_TRANSACTIONS',
        shopkeeperId: request.data.shopkeeperId,
        branchId: request.data.branchId,
        scheduledDate: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + request.data.daysUntilCleanup * 24 * 60 * 60 * 1000)
        ),
        status: 'pending',
        priority: 4,
        cooldownSeconds: 10,
        retryCount: 0,
        maxRetries: 3,
        metadata: {
          retentionDays: request.data.retentionDays,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    
    return { message: 'Transaction cleanup scheduled' };
  }
);
```

#### 2. Task Handler Already Implemented

Located at: `task-handlers/transaction-cleanup.ts`

#### 3. Deploy & Test

```powershell
firebase deploy --only functions:scheduleTransactionCleanup --project smbs-dev-b84ad
```

#### 4. Call from UI

```typescript
await scheduleTransactionCleanup({
  shopkeeperId: 'xyz',
  branchId: 'abc',
  daysUntilCleanup: 30,
  retentionDays: 365,
});
```

**Done!** Unified processor will automatically handle the new task type.

---

## Rollback Plan

If issues arise during migration:

### Emergency Rollback

1. **Redeploy old functions:**
   ```powershell
   git checkout <previous-commit>
   firebase deploy --only functions --project smbs-7b59e
   ```

2. **Disable unified processor:**
   - Go to Cloud Scheduler console
   - Pause `processAllScheduledTasks` job

3. **Mark pending tasks as skipped:**
   ```typescript
   await db.collection('scheduled_tasks')
     .where('status', '==', 'pending')
     .get()
     .then(snapshot => {
       snapshot.forEach(doc => {
         doc.ref.update({ status: 'skipped' });
       });
     });
   ```

---

## Success Metrics

### Before Migration
- Emails sent at 8 AM ✅

### After Migration
- **2 scheduled functions** (71% reduction)
- **2 Cloud Scheduler jobs** (71% reduction)
- $1.22/month ($14.64/year)
- Unified logging (2 processors)
- Emails sent at 8 AM ✅
- Cleanup at 2 AM (off-peak) ✅
- **$500+/year saved in developer time**

### Real Savings
The small cost increase ($1/year) is offset by:
- **Maintenance simplification:** 7 → 2 functions to monitor
- **Optimal timing:** Emails at 8 AM, cleanup at 2 AM
- **Better architecture:** Unified task system
- **Developer time saved:** ~10 hours/year = $500+ value
- 1 Cloud Scheduler job
- $0.52/month ($6.24/year)
- Unified logging
- **54% cost savings**

---

## Support

For issues or questions:
1. Check function logs: `firebase functions:log`
2. Query Firestore `scheduled_tasks` collection
3. Call `getTaskStatistics` for overview
4. Review error messages in `lastError` field

---

**Migration Complete! 🎉**

All scheduled tasks now run through a single, cost-efficient unified processor.
