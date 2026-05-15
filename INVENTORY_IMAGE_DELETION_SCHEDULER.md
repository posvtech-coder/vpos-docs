# Inventory Image Deletion Scheduler — Implementation Guide

## Overview

This feature enables admins and service agents to schedule automatic deletion of inventory images when disabling the "Allow Images in Inventory" feature for a branch. The system maintains a collection of scheduled tasks that are processed daily by a cron job.

---

## Architecture

### 1. **Firestore Collection: `scheduled_tasks`**

**Document Schema:**
```typescript
{
  taskId: string;                    // Unique task identifier
  taskType: 'DELETE_INVENTORY_IMAGES';
  shopkeeperId: string;
  branchId: string;
  scheduledDate: Timestamp;           // When to execute the task
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  daysToKeep?: number;                // Optional (default: 0) - backward compatible
  createdAt: Timestamp;
  updatedAt: Timestamp;
  processedAt?: Timestamp;            // When the task was processed
  error?: string;                     // Error message if failed
}
```

**Status Lifecycle:**
- `pending` → Task is scheduled and waiting for execution
- `processing` → Cron job is currently executing the task
- `completed` → Task executed successfully
- `failed` → Task execution failed (error stored in `error` field)
- `cancelled` → Task was cancelled (feature re-enabled before execution)

---

### 2. **Cloud Functions** (`vpos-admin/functions/src/scheduled-tasks/`)

#### **scheduleInventoryImageDeletion** (Callable)
Creates a scheduled task when an admin/service agent disables inventory images.

**Input:**
```typescript
{
  shopkeeperId: string;
  branchId: string;
  daysToKeep?: number;  // Optional (default: 0)
}
```

**Output:**
```typescript
{
  message: string;
  taskId: string;
  scheduledDate: string;  // ISO format
}
```

**Behavior:**
- Validates shopkeeper and branch existence
- Calculates `scheduledDate` = today + daysToKeep days
- Creates document in `scheduled_tasks` collection
- Returns scheduled deletion date

---

#### **cancelInventoryImageDeletion** (Callable)
Cancels pending deletion tasks when the feature is re-enabled.

**Input:**
```typescript
{
  shopkeeperId: string;
  branchId: string;
}
```

**Output:**
```typescript
{
  message: string;
  cancelledCount: number;
}
```

**Behavior:**
- Finds all pending tasks for the branch
- Updates status to `cancelled`
- Returns count of cancelled tasks

---

#### **processScheduledTasks** (Scheduled — Cron Job)
Runs daily at **2:00 AM IST (Asia/Kolkata)** to process pending tasks.

**Configuration:**
```typescript
{
  schedule: '0 2 * * *',  // Daily at 2 AM IST
  timeZone: 'Asia/Kolkata',
  memory: '512MiB',
  timeoutSeconds: 540,
  region: 'asia-south1'
}
```

**Behavior:**
1. Queries `scheduled_tasks` where:
   - `status == 'pending'`
   - `scheduledDate <= today`
2. For each task:
   - Updates status to `processing`
   - Calls `deleteInventoryImages` helper
   - Updates status to `completed` or `failed`
   - Records `processedAt` timestamp
3. Logs summary of processed tasks

---

#### **getScheduledTasks** (Callable)
Admin/service agent function to view scheduled tasks.

**Input:**
```typescript
{
  shopkeeperId?: string;  // Optional filter
  branchId?: string;      // Optional filter
  status?: TaskStatus;    // Optional filter
}
```

**Output:**
```typescript
{
  tasks: ScheduledTask[];
  count: number;
}
```

---

#### **deleteInventoryImages** (Internal Helper)
Deletes product images from Firebase Storage and Firestore.

**Steps:**
1. Fetches all products in `shopkeepers/{shopkeeperId}/branches/{branchId}/products`
2. For each product with `productImageUrl`:
   - Deletes image from Storage at `shopkeepers/{shopkeeperId}/branches/{branchId}/products/{filename}`
   - Removes `productImageUrl` field from Firestore document
3. Returns summary: `{ deletedImages, updatedProducts, errors }`

---

### 3. **React UI Components**

#### **InventoryImageDeletionDialog** (`vpos-admin-react/src/components/`)

**Purpose:** Dialog to ask for number of days when disabling inventory images.

**Features:**
- Input field for days (0-365)
- Real-time validation
- Displays calculated deletion date
- Warning about permanent deletion
- Backward compatible (defaults to 0)

**Props:**
```typescript
{
  isOpen: boolean;
  branchName: string;
  onConfirm: (daysToKeep: number) => void;
  onCancel: () => void;
  loading: boolean;
}
```

---

#### **BranchInfoScreen** (Modified)

**Location:** `vpos-admin-react/src/screens/shared/shopkeeper-detail/`

**Changes:**
1. Added dialog state management
2. Modified `handleToggleFeature` to:
   - Show dialog when disabling `allowImages`
   - Cancel tasks when enabling `allowImages`
3. New function `handleScheduleImageDeletion`:
   - Calls `scheduleInventoryImageDeletion`
   - Disables the feature via `toggleBranchFeature`
   - Shows success toast with scheduled date
4. New function `handleEnableInventoryImages`:
   - Calls `cancelInventoryImageDeletion`
   - Enables the feature via `toggleBranchFeature`

---

### 4. **Firestore Indexes**

**Required Composite Indexes:**

```json
// Index 1: For querying tasks by shopkeeper, branch, type, status
{
  "collectionGroup": "scheduled_tasks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "shopkeeperId", "order": "ASCENDING" },
    { "fieldPath": "branchId", "order": "ASCENDING" },
    { "fieldPath": "taskType", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}

// Index 2: For cron job query (status + scheduledDate)
{
  "collectionGroup": "scheduled_tasks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "scheduledDate", "order": "ASCENDING" }
  ]
}
```

**File:** `vpos-admin/firestore.indexes.json`

---

## Deployment Steps

### 1. **Deploy Cloud Functions**

```powershell
cd c:\GitHub\VPOS\vpos-admin
firebase deploy --only functions:scheduleInventoryImageDeletion,functions:cancelInventoryImageDeletion,functions:processScheduledTasks,functions:getScheduledTasks --project smbs-dev-b84ad
```

### 2. **Deploy Firestore Indexes**

```powershell
firebase deploy --only firestore:indexes --project smbs-dev-b84ad
```

### 3. **Deploy React Admin**

```powershell
cd c:\GitHub\VPOS\vpos-admin-react
.\deploy-dev.ps1
```

---

## Testing Checklist

### Scenario 1: Disable Inventory Images (0 days)
1. Go to Admin → Shopkeepers → Select Shopkeeper → Select Branch
2. Toggle "Allow Images in Inventory" from ON to OFF
3. Dialog appears asking for days
4. Enter `0` (immediate deletion)
5. Click "Schedule Deletion"
6. **Expected:** Task created with `scheduledDate = today`, feature disabled, toast shows "within 24 hours"

### Scenario 2: Disable Inventory Images (30 days)
1. Repeat steps 1-3
2. Enter `30`
3. **Expected:** Dialog shows deletion date = today + 30 days
4. Click "Schedule Deletion"
5. **Expected:** Task created with `scheduledDate = today + 30 days`, feature disabled

### Scenario 3: Re-enable Before Deletion
1. After scheduling deletion (from Scenario 2)
2. Toggle "Allow Images in Inventory" from OFF to ON
3. **Expected:** Task cancelled (status = 'cancelled'), feature enabled, toast confirms

### Scenario 4: Cron Job Execution
1. Create task with `scheduledDate = yesterday`
2. Wait for 2 AM IST or manually trigger cron job
3. **Expected:** Task status changes to `processing` → `completed`, images deleted from Storage and Firestore

### Scenario 5: Backward Compatibility (Flutter App)
1. Use existing Flutter admin app
2. Toggle "Allow Images" without entering days
3. **Expected:** Feature toggles without errors, defaults to 0 days if scheduled

---

## User Flow Diagram

```
Admin/Service Agent
    │
    ├─► View Branch Details
    │   └─► Toggle "Allow Images in Inventory" OFF
    │       └─► Dialog: Enter days to keep images (0-365)
    │           ├─► Enter 0 → Immediate deletion (within 24h)
    │           └─► Enter N → Deletion after N days
    │               └─► System creates scheduled_tasks doc
    │                   └─► Cron job processes at 2 AM IST daily
    │                       └─► Deletes images from Storage + Firestore
    │
    └─► Toggle "Allow Images in Inventory" ON (Before Deletion)
        └─► System cancels pending tasks
            └─► Images preserved
```

---

## Error Handling

### Function Errors:
- **Shopkeeper not found:** `Shopkeeper document does not exist`
- **Branch not found:** `Branch document does not exist`
- **Invalid days:** `daysToKeep must be between 0 and 365`
- **No pending tasks:** `No pending deletion tasks found`

### UI Errors:
- **Failed to schedule:** Shows error toast with message
- **Failed to cancel:** Shows error toast with message
- **Validation errors:** Inline error messages in dialog

### Cron Job Errors:
- Task status set to `failed`
- Error message stored in `error` field
- Logged to Cloud Functions logs

---

## Security Rules (Firestore)

```javascript
// scheduled_tasks collection
match /scheduled_tasks/{taskId} {
  // Only admins and service agents can read/write
  allow read, write: if request.auth != null && 
                       (request.auth.token.role == 'admin' || 
                        request.auth.token.role == 'service-agent');
}
```

**Note:** Add this rule to `vpos-admin/firestore.rules` if not already present.

---

## Storage Deletion Pattern

**Path:**
```
shopkeepers/{shopkeeperId}/branches/{branchId}/products/{filename}
```

**Deletion Logic:**
1. Extract filename from `productImageUrl` (format: `https://firebasestorage.googleapis.com/.../products%2F{filename}?...`)
2. Construct storage path: `shopkeepers/{shopkeeperId}/branches/{branchId}/products/{filename}`
3. Delete file using `bucket.file(path).delete()`
4. Remove `productImageUrl` field from Firestore product document

---

## Monitoring

### Cloud Scheduler Logs:
```powershell
gcloud scheduler jobs describe processScheduledTasks --location=asia-south1 --project=smbs-dev-b84ad
```

### Function Logs:
```powershell
firebase functions:log --only processScheduledTasks --project smbs-dev-b84ad
```

### Firestore Query (Pending Tasks):
```typescript
db.collection('scheduled_tasks')
  .where('status', '==', 'pending')
  .where('scheduledDate', '<=', new Date())
  .get()
```

---

## Future Enhancements

1. **Admin Dashboard Widget:** Show upcoming scheduled tasks count
2. **Email Notifications:** Notify shopkeeper before deletion
3. **Task History:** Archive completed/cancelled tasks after 90 days
4. **Bulk Operations:** Schedule deletion for multiple branches
5. **Retry Logic:** Automatically retry failed tasks
6. **Manual Trigger:** Allow admins to manually trigger task execution

---

## Files Changed

### Backend (vpos-admin):
- ✅ `functions/src/scheduled-tasks/scheduled-tasks.functions.ts` (NEW)
- ✅ `functions/lib/scheduled-tasks/scheduled-tasks.functions.js` (NEW)
- ✅ `functions/lib/config/functions.config.js` (MODIFIED)
- ✅ `functions/lib/index.js` (MODIFIED)
- ✅ `firestore.indexes.json` (MODIFIED)

### Frontend (vpos-admin-react):
- ✅ `src/services/functions-part3.ts` (MODIFIED)
- ✅ `src/components/InventoryImageDeletionDialog.tsx` (NEW)
- ✅ `src/screens/shared/shopkeeper-detail/BranchInfoScreen.tsx` (MODIFIED)

---

## Contact

For questions or issues, contact the development team or refer to:
- **Architecture Documentation:** `c:\GitHub\VPOS\ARCHITECTURE.md`
- **Firebase Console:** https://console.firebase.google.com/project/smbs-dev-b84ad
- **Cloud Functions:** https://console.cloud.google.com/functions/list?project=smbs-dev-b84ad

---

**Last Updated:** May 2026  
**Feature Status:** ✅ Ready for Deployment
