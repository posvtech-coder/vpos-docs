# React Approval Flow - Complete Explanation

## What Happens When You Click "Approve"

### ✅ CORRECT BEHAVIOR (After Fix):

1. **Firestore Update** (`shopkeepers/{shopkeeperId}` document):
   ```typescript
   {
     accountStatus: 'trial' → 'approved',  // Status changes
     approvedBy: 'admin_uid',               // Admin who approved
     approvedAt: Timestamp.now(),           // Approval timestamp
     needsOnboarding: false,                // No longer needs onboarding
     isSelfRegistered: false,               // Clear trial flag
     limits: {
       categories: 999999,      // ✅ UNLIMITED
       inventoryItems: 999999,  // ✅ UNLIMITED
       branches: 999999,        // ✅ UNLIMITED
       managers: 999999,        // ✅ UNLIMITED
       bulkOperations: true,    // ✅ ENABLED
     },
     features: {
       multiLocation: true,
       advancedReports: true,
       apiAccess: false,
       customBranding: false,
     }
   }
   ```

2. **Shopkeeper REMAINS in `shopkeepers` collection**
   - ✅ NOT moved to `users` collection
   - ✅ NOT deleted
   - ✅ Still accessible at `/admin/shopkeepers/{id}`

3. **Custom Claims UNCHANGED**
   - Firebase Auth custom claims remain: `{ role: 'shopkeeper' }`
   - The claims trigger only runs `onCreate`, not `onUpdate`
   - Shopkeeper can still log in with same credentials

4. **UI Updates**:
   - ✅ Disappears from "Trial Shopkeepers" screen (correct - no longer trial)
   - ✅ Appears in main "Shopkeepers List" (`/admin/shopkeepers`)
   - ✅ Can be viewed at `/admin/shopkeepers/{id}`

---

## Where to Find Approved Shopkeepers

### After Approval:

1. **Main Shopkeepers List** (`/admin/shopkeepers`)
   - Query: `collection(db, 'shopkeepers')` (NO accountStatus filter)
   - Shows: ALL shopkeepers (trial, approved, active, suspended)
   - ✅ Approved shopkeepers WILL appear here

2. **Shopkeeper Details** (`/admin/shopkeepers/{id}`)
   - Direct link to view individual shopkeeper
   - Shows full profile with accountStatus field

3. **NOT in Trial Approvals** (`/admin/shopkeepers/trial-approvals`)
   - Query: `where('accountStatus', '==', 'trial')`
   - Shows: ONLY trial shopkeepers
   - ❌ Approved shopkeepers will NOT appear here (correct)

---

## Why User Might Think "Moved as Normal User"

### Possible Confusion:

1. **Disappears from Trial List**
   - ✅ Expected: Shopkeeper no longer has `accountStatus: 'trial'`
   - ❌ User expectation: Might expect to still see them in trial list

2. **Limited Access (BEFORE FIX)**
   - ❌ OLD BUG: React was setting limits to 50/500/5/10
   - ✅ FIXED: Now sets unlimited (999999) like Flutter

3. **Navigation Issue**
   - User might not know where to look after approval
   - ✅ FIXED: Toast message now says "View in Shopkeepers list"

---

## How to Verify Correct Behavior

### Test Steps:

1. **Before Approval:**
   ```bash
   # Firestore shopkeepers/{id}
   accountStatus: 'trial'
   limits: { categories: 3, inventoryItems: 20, ... }
   ```

2. **Click Approve Button**

3. **After Approval:**
   ```bash
   # Firestore shopkeepers/{id} (same document)
   accountStatus: 'approved'
   limits: { categories: 999999, inventoryItems: 999999, ... }
   approvedBy: 'admin_uid'
   approvedAt: Timestamp
   ```

4. **Check Shopkeeper Can Be Found:**
   - Go to `/admin/shopkeepers` → Should see shopkeeper in list
   - Click on shopkeeper → Should open details page
   - Trial counter on dashboard → Should decrease by 1

5. **Check Shopkeeper Login:**
   - Shopkeeper can log in with same phone number
   - Custom claims still show `role: 'shopkeeper'`
   - Shopkeeper sees unlimited access (no trial banner)

---

## Database Collections Structure

```
Firestore:
├── users/                    [Admin, ServiceAgent, Employee only]
│   └── {userId}
│       ├── role: 'admin' | 'serviceAgent' | 'employee'
│       ├── phoneNumber
│       └── ...
│
└── shopkeepers/             [Shopkeepers ONLY - separate collection]
    └── {shopkeeperId}
        ├── accountStatus: 'trial' | 'approved' | 'active' | 'suspended'
        ├── role: 'shopkeeper' (implicit)
        ├── limits: { ... }
        ├── branches/        [Subcollection]
        ├── managers/        [Subcollection]
        └── ...
```

**KEY POINT:** Shopkeepers are NEVER in the `users` collection. They have their own dedicated collection.

---

## Summary

### ✅ After Approval:

- Shopkeeper remains in `shopkeepers` collection
- accountStatus changes from 'trial' → 'approved'
- Limits change from restricted → unlimited (999999)
- Shopkeeper can be found in main shopkeepers list
- Custom claims remain `role: 'shopkeeper'`
- Shopkeeper can log in normally

### ❌ What Does NOT Happen:

- Shopkeeper is NOT moved to `users` collection
- Shopkeeper is NOT deleted
- Custom claims are NOT changed
- Role is NOT changed to "normal user"

---

**Generated:** May 16, 2026  
**Status:** ✅ Fixed - Unlimited limits now set correctly on approval
