# Unified Task Processor - Troubleshooting Guide

**Last Updated:** May 13, 2026

---

## 🔍 Common Issues & Solutions

### Issue 1: Function Not Executing at Scheduled Time

**Symptoms:**
- Cloud Scheduler shows "success" but no logs from function
- Tasks remain in `pending` status

**Possible Causes:**
1. Task is outside execution window
2. Cloud Scheduler job misconfigured
3. Function IAM permissions missing

**Solution:**
```powershell
# Check scheduler job configuration
gcloud scheduler jobs describe firebase-schedule-processEmailTasks-asia-south1 --location=asia-south1 --project=smbs-dev-b84ad

# Check function logs for any errors
firebase functions:log --only processEmailTasks --project smbs-dev-b84ad

# Manually trigger the scheduler job to test
gcloud scheduler jobs run firebase-schedule-processEmailTasks-asia-south1 --location=asia-south1 --project=smbs-dev-b84ad
```

---

### Issue 2: Tasks Stuck in "processing" State

**Symptoms:**
- Task status = `processing` for > 15 minutes
- No completion log in function logs

**Possible Causes:**
1. Function timed out (15 min limit exceeded)
2. Unhandled exception in task handler
3. Network issues with external APIs (MSG91)

**Solution:**
```powershell
# Check function logs for timeout or error
firebase functions:log --only processEmailTasks --project smbs-dev-b84ad

# Manually reset task to pending
# In Firestore Console, update the task:
# - status: "pending"
# - retryCount: 0
# - Remove processedAt field
```

---

### Issue 3: Duplicate Emails Being Sent

**Symptoms:**
- Users receiving 2x daily reports
- Both old and new systems running

**Expected During Testing:**
This is NORMAL during the 1-week testing period (May 13-20).

**After Testing Period:**
If duplicates persist after May 20, verify old functions were deleted:
```powershell
# List all scheduled functions
firebase functions:list --project smbs-dev-b84ad | Select-String "send"

# Delete old functions if still present
firebase functions:delete sendDailyReports --project smbs-dev-b84ad --force
```

---

### Issue 4: Task Execution Window Skipping

**Symptoms:**
- Log shows: "⏭️ Skipping: EMAIL_REPORT_DAILY (outside execution window)"
- Task remains `pending`

**Cause:**
Task tried to execute outside its allowed window:
- Email tasks: 8-10 AM IST only
- Cleanup tasks: 2-5 AM IST only

**Solution:**
This is by design. The task will be picked up on the next scheduled run within the execution window.

**If task needs immediate execution:**
```powershell
# Temporarily remove the time window check (for emergency)
# Edit unified-task-processor.functions.ts
# Comment out: if (!shouldExecuteNow(task, currentHour)) { ... }
# Redeploy function
firebase deploy --only functions:processEmailTasks --project smbs-dev-b84ad
```

---

### Issue 5: No Tasks Found to Process

**Symptoms:**
- Log shows: "✅ No EMAIL_REPORT tasks due today — nothing to process"
- No tasks in Firestore `scheduled_tasks` collection

**Cause:**
Recurring tasks were never initialized.

**Solution:**
Create tasks manually:
```powershell
cd c:\GitHub\VPOS\vpos-admin\functions
node create-test-tasks.js dev
```

Or call initializeRecurringTasks via Firebase Console:
1. Go to Functions console
2. Find `initializeRecurringTasks`
3. Test with data: `{}`

---

### Issue 6: MSG91 Email Sending Failures

**Symptoms:**
- Log shows: "❌ Failed: EMAIL_REPORT_DAILY — MSG91 API error"
- Task marked as `failed` with retry

**Possible Causes:**
1. MSG91 API key invalid/expired
2. Rate limit exceeded
3. Network connectivity issues
4. Invalid email template ID

**Solution:**
```powershell
# Check MSG91 secrets in Firebase
firebase functions:secrets:access MSG91_API_KEY --project smbs-dev-b84ad

# Verify template exists in MSG91 dashboard
# Template ID should be: periodic_sales_report_2

# Check cooldown settings (30s between emails to avoid rate limits)
# View current cooldown in logs: "⏸️ Cooldown: 30s before next task"
```

---

### Issue 7: Image Deletion Not Working

**Symptoms:**
- DELETE_INVENTORY_IMAGES task completes but images still in Storage
- Log shows: "✅ No product images to delete"

**Possible Causes:**
1. Test task has dummy shopkeeper/branch IDs
2. Products don't have `productImageUrl` field
3. Storage permissions issue

**Solution:**
```powershell
# Check Firestore for products with images
# Navigate to: /shopkeepers/{shopkeeperId}/branches/{branchId}/products
# Filter: productImageUrl != null

# Check Storage bucket permissions
# Navigate to: Firebase Console > Storage > Rules

# Manually test with real branch
# Update task metadata in Firestore:
# metadata: { shopkeeperId: "real-id", branchId: "real-branch-id" }
```

---

### Issue 8: High Retry Count

**Symptoms:**
- Task `retryCount` = 3
- Task marked as `failed` permanently
- Emails not being sent

**Possible Causes:**
1. Persistent error in task handler
2. External service (MSG91) down
3. Data corruption in task metadata

**Solution:**
```powershell
# Check last error message in Firestore
# Field: lastError

# Reset task for manual retry
# Update in Firestore:
# - status: "pending"
# - retryCount: 0
# - Remove lastError field
# - scheduledDate: (new timestamp for immediate execution)

# If error persists, check function code
# View error in logs:
firebase functions:log --only processEmailTasks --project smbs-dev-b84ad
```

---

## 🚨 Emergency Procedures

### Disable All Scheduled Tasks
If something goes critically wrong:
```powershell
# Pause Cloud Scheduler jobs
gcloud scheduler jobs pause firebase-schedule-processEmailTasks-asia-south1 --location=asia-south1 --project=smbs-dev-b84ad
gcloud scheduler jobs pause firebase-schedule-processCleanupTasks-asia-south1 --location=asia-south1 --project=smbs-dev-b84ad

# Resume when fixed
gcloud scheduler jobs resume firebase-schedule-processEmailTasks-asia-south1 --location=asia-south1 --project=smbs-dev-b84ad
gcloud scheduler jobs resume firebase-schedule-processCleanupTasks-asia-south1 --location=asia-south1 --project=smbs-dev-b84ad
```

### Roll Back to Old System
If new system fails completely:
```powershell
# Old functions are still active during testing period
# Simply delete new functions:
firebase functions:delete processEmailTasks processCleanupTasks --project smbs-dev-b84ad --force

# Old scheduler jobs will continue working
# Monitor old functions instead
```

### Manual Task Execution
Force a task to run immediately:
```powershell
# Trigger scheduler job manually
gcloud scheduler jobs run firebase-schedule-processEmailTasks-asia-south1 --location=asia-south1 --project=smbs-dev-b84ad

# Or update task scheduledDate to now in Firestore
# scheduledDate: (current timestamp)
# status: "pending"
```

---

## 📊 Monitoring Checklist

### Daily Monitoring (During Testing Period)
- [ ] Check function logs at 8:10 AM IST
- [ ] Check function logs at 2:10 AM IST
- [ ] Verify tasks marked as `completed` in Firestore
- [ ] Check for any `failed` tasks
- [ ] Monitor user reports of duplicate/missing emails

### Weekly Monitoring (After Migration)
- [ ] Review task completion rates
- [ ] Check for failed tasks requiring intervention
- [ ] Verify no excessive retry counts
- [ ] Monitor function execution time trends
- [ ] Check MSG91 usage/credits

---

## 🔧 Useful Queries

### Firestore Queries (Console)
```
# Pending tasks
status == "pending"

# Failed tasks
status == "failed"

# Tasks with high retry count
retryCount >= 2

# Recent completions (last 24 hours)
status == "completed" AND processedAt > (timestamp 24 hours ago)
```

### Log Explorer Queries (Google Cloud Console)
```
# Email processor errors
resource.type="cloud_function"
resource.labels.function_name="processEmailTasks"
severity>=ERROR

# Cleanup processor successes
resource.type="cloud_function"
resource.labels.function_name="processCleanupTasks"
textPayload=~"Complete"

# All task processing
resource.type="cloud_function"
(resource.labels.function_name="processEmailTasks" OR resource.labels.function_name="processCleanupTasks")
```

---

## 📞 Escalation Path

### Level 1: Self-Service
- Review this troubleshooting guide
- Check function logs
- Inspect Firestore task status
- Verify Cloud Scheduler configuration

### Level 2: Developer Investigation
- Deep dive into function code
- Review error stack traces
- Test with mock data locally
- Check external service (MSG91) status

### Level 3: Rollback
- Disable new functions
- Revert to old system
- Schedule proper fix for next deployment

---

## 📚 Related Documentation

- [SYSTEM_STATUS.md](./SYSTEM_STATUS.md) — Current system state
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) — Common commands
- [UNIFIED_TASK_PROCESSOR_MIGRATION.md](./UNIFIED_TASK_PROCESSOR_MIGRATION.md) — Migration guide
- [CLOUD_FUNCTIONS_COST_OPTIMIZATION.md](./CLOUD_FUNCTIONS_COST_OPTIMIZATION.md) — Cost analysis
