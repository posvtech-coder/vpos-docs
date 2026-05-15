# Unified Task Processor - Quick Reference

**Status:** ✅ Active  
**Last Updated:** May 13, 2026

---

## ⚡ Quick Commands

### Monitor Logs
```powershell
# Email processor (8 AM)
firebase functions:log --only processEmailTasks --project smbs-dev-b84ad

# Cleanup processor (2 AM)
firebase functions:log --only processCleanupTasks --project smbs-dev-b84ad
```

### Check Scheduler Jobs
```powershell
gcloud scheduler jobs list --project=smbs-dev-b84ad --location=asia-south1
```

### Create Test Tasks
```powershell
cd c:\GitHub\VPOS\vpos-admin\functions
node create-test-tasks.js dev
```

### Delete Old Functions (After Testing)
```powershell
firebase functions:delete sendDailyReports sendWeeklyReports sendMonthlyReports sendQuarterlyReports sendSemiAnnualReports sendYearlyReports --project smbs-dev-b84ad --force
```

---

## 📋 Current State

### Active Scheduler Jobs (Both Envs)
- ✅ **processEmailTasks** — 8 AM daily (NEW)
- ✅ **processCleanupTasks** — 2 AM daily (NEW)
- ✅ **processScheduledTasks** — 2 AM daily (KEEP)
- ⚠️ sendDailyReports — 8 AM (DELETE AFTER TESTING)
- ⚠️ sendWeeklyReports — 8 AM Mon (DELETE AFTER TESTING)
- ⚠️ sendMonthlyReports — 8 AM 1st (DELETE AFTER TESTING)
- ⚠️ sendQuarterlyReports — 8 AM 1st Q (DELETE AFTER TESTING)
- ⚠️ sendSemiAnnualReports — 8 AM 1st Jan/Jul (DELETE AFTER TESTING)
- ⚠️ sendYearlyReports — 8 AM 1st Jan (DELETE AFTER TESTING)

### Test Tasks Created
- 1 x EMAIL_REPORT_DAILY (May 14, 8 AM)
- 1 x DELETE_INVENTORY_IMAGES (May 14, 2 AM)

---

## ⏰ Tomorrow's Schedule (May 14)

| Time | Event | What to Check |
|------|-------|---------------|
| **2:00 AM** | Cleanup processors run | Function logs, Firestore task status |
| **2:10 AM** | ✅ Verify cleanup complete | Check logs for success message |
| **8:00 AM** | Email processors run | Function logs, duplicate emails OK |
| **8:10 AM** | ✅ Verify emails sent | Check logs + Firestore status |

---

## 🔗 Console Links

### Dev (smbs-dev-b84ad)
- [Functions](https://console.firebase.google.com/project/smbs-dev-b84ad/functions)
- [Firestore Tasks](https://console.firebase.google.com/project/smbs-dev-b84ad/firestore/databases/-default-/data/~2Fscheduled_tasks)
- [Scheduler](https://console.cloud.google.com/cloudscheduler?project=smbs-dev-b84ad)

### Prod (smbs-7b59e)
- [Functions](https://console.firebase.google.com/project/smbs-7b59e/functions)
- [Firestore Tasks](https://console.firebase.google.com/project/smbs-7b59e/firestore/databases/-default-/data/~2Fscheduled_tasks)
- [Scheduler](https://console.cloud.google.com/cloudscheduler?project=smbs-7b59e)

---

## 📊 Success Indicators

### ✅ System is Working When:
- Tasks change from `pending` → `completed`
- `processedAt` timestamp is set
- No `lastError` field present
- Function logs show "Complete" message

### ⚠️ Issues Detected When:
- Tasks stuck in `processing` state
- `lastError` field contains error message
- `retryCount` keeps increasing
- Function logs show error messages

---

## 🎯 Cleanup Timeline

| Date | Action |
|------|--------|
| **May 13** | Deploy + create test tasks ✅ |
| **May 14** | Monitor first runs |
| **May 15-19** | Testing period (1 week) |
| **May 20** | Delete old functions |
| **May 21** | Final verification |

---

## 💡 Key Notes

- **Duplicate emails are OK** during testing period
- **Don't delete `processScheduledTasks`** — still needed for inventory deletion
- **Email tasks only run 8-10 AM IST** — skipped outside window
- **Cleanup tasks only run 2-5 AM IST** — skipped outside window
