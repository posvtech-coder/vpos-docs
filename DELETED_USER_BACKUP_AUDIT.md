# Deleted User Backup & Audit System Analysis

**Date:** May 14, 2026  
**Scope:** VPOS Admin - User deletion archival and lookup system  
**Status:** ⚠️ **PARTIALLY IMPLEMENTED** - Critical gaps found

---

## Executive Summary

✅ **GOOD NEWS:** A backup/audit system for deleted users **already exists** but has critical gaps:

- ✅ Service Agents → Backed up to `deleted_users` + `deleted_identities`
- ✅ Shopkeepers → Backed up to `deleted_shopkeepers` + `deleted_identities` (includes managers & branches)
- ❌ **Managers (standalone deletion)** → **NOT backed up** when deleted via `deleteManagerSubcollection`
- ❌ **No React UI components** to resolve deleted user IDs
- ❌ **Firestore security rules missing** for deleted_* collections

---

## Current Backup Architecture

### 1. Collections Structure

```
Firestore
├── deleted_users                    ✅ Service agents backup
│   └── {userId}
│       ├── originalRole: "serviceAgent"
│       ├── originalUserId: string
│       ├── displayName: string
│       ├── email: string
│       ├── phoneNumber: string
│       ├── alternativePhoneNumber: string
│       ├── address1, address2, landmark, town, district, state, pincode
│       ├── createdAt: Timestamp
│       ├── createdBy: string (UUID)
│       ├── deletedAt: Timestamp
│       ├── deletedBy: string (UUID)
│       └── sourceCollection: "users"
│
├── deleted_shopkeepers              ✅ Shopkeepers backup
│   └── {shopkeeperId}
│       ├── originalShopkeeperId: string
│       ├── displayName, email, phoneNumber, alternativePhoneNumber
│       ├── address fields (address1, address2, landmark, town, district, state, pincode)
│       ├── role: "shopkeeper"
│       ├── createdAt: Timestamp
│       ├── createdBy: string (UUID)
│       ├── disabledAt: Timestamp
│       ├── deletedAt: Timestamp
│       ├── deletedBy: string (UUID)
│       ├── managerCount: number
│       ├── branchCount: number
│       │
│       ├── managers/{managerId}     ✅ Managers archived under deleted shopkeeper
│       │   ├── managerId: string
│       │   ├── displayName, email, phoneNumber
│       │   ├── branchIds: string[]
│       │   ├── isActive: boolean
│       │   ├── createdAt: Timestamp
│       │   └── deletedAt: Timestamp
│       │
│       └── branches/{branchId}      ✅ Branches archived
│           ├── branchId: string
│           ├── branchName, address, contact info
│           └── deletedAt: Timestamp
│
└── deleted_identities               ✅ Fast lookup tombstone index
    └── {userId}
        ├── userId: string (same as doc ID)
        ├── role: "admin" | "serviceAgent" | "shopkeeper" | "manager"
        ├── displayName: string
        ├── email: string | null
        ├── parentShopkeeperId: string | null  (for managers only)
        └── deletedAt: Timestamp
```

### 2. Deletion Functions with Backup

| Function | Location | Backup Status | Collections Updated |
|----------|----------|---------------|---------------------|
| `deleteServiceAgent` | `service-agents.functions.js:360` | ✅ **Full backup** | `deleted_users`, `deleted_identities`, annotates `activity_log` |
| `deleteShopkeeperAfterRetention` | `admin.js:410` | ✅ **Full backup** | `deleted_shopkeepers`, `deleted_identities` (for shopkeeper + managers), annotates `activity_log` |
| `deleteManagerSubcollection` | `managers.subcollection.functions.js:736` | ❌ **NO BACKUP** | Only logs to `activity_log` |

---

## Critical Gaps

### ❌ Gap 1: Manager Standalone Deletion (NOT backed up)

**File:** `c:\GitHub\VPOS\vpos-admin\functions\lib\shopkeepers\managers.subcollection.functions.js`  
**Function:** `deleteManagerSubcollection` (line 736)  
**Current behavior:**

```javascript
// ❌ NO ARCHIVE STEP
// Deletes login_history
// Deletes Firebase Auth
// Deletes Firestore doc at shopkeepers/{shopkeeperId}/managers/{managerId}
// Deletes manager_hierarchy index
// Logs to activity_log
// ⚠️ BUT NO BACKUP TO deleted_users or deleted_identities
```

**Impact:**

- When a shopkeeper deletes a manager, **no backup is created**
- If the manager's UID appears in `createdBy` / `updatedBy` fields, **their details are lost**
- Cannot resolve manager name/email after deletion

**Required fix:**
Add archive logic BEFORE deletion:

```javascript
// 1. Archive to deleted_users
await admin.firestore().collection("deleted_users").doc(managerId).set({
  originalRole: "manager",
  originalUserId: managerId,
  displayName: managerData.displayName || null,
  email: managerData.email || null,
  phoneNumber: managerData.phoneNumber || null,
  alternativePhoneNumber: managerData.alternativePhoneNumber || null,
  address1: managerData.address1 || null,
  address2: managerData.address2 || null,
  landmark: managerData.landmark || null,
  town: managerData.town || null,
  district: managerData.district || null,
  state: managerData.state || null,
  pincode: managerData.pincode || null,
  parentShopkeeperId: currentUserId,  // IMPORTANT for managers
  branchIds: managerData.branchIds || [],
  createdAt: managerData.createdAt || null,
  deletedAt: admin.firestore.FieldValue.serverTimestamp(),
  deletedBy: currentUserId,
  sourceCollection: `shopkeepers/${currentUserId}/managers`,
}, { merge: true });

// 2. Create tombstone in deleted_identities
await admin.firestore().collection("deleted_identities").doc(managerId).set({
  userId: managerId,
  role: "manager",
  displayName: managerName,
  email: managerData.email || null,
  parentShopkeeperId: currentUserId,
  deletedAt: admin.firestore.FieldValue.serverTimestamp(),
}, { merge: true });

// 3. Annotate activity log
await annotateActivityLogWithDeletedUser(managerId, managerName);
```

---

### ❌ Gap 2: No React UI Components for Deleted User Lookup

**Current state:**

- Cloud functions save deleted user data ✅
- **No React components** to resolve deleted UIDs to names/emails ❌

**Where this is needed:**
All places that display `createdBy`, `updatedBy`, `lastUpdatedBy`, `deletedBy` fields:

- Branch info screens (created by admin/SA)
- Device management (assigned by manager/shopkeeper)
- Inventory changes (created/updated by staff)
- Manager lists (created by shopkeeper)
- Service agent actions (performed by admin)
- Activity logs (any user action)

**Required implementation:**
Create React hook and component:

```typescript
// src/hooks/useResolveUser.ts
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface UserIdentity {
  userId: string;
  displayName: string;
  email: string | null;
  role: string;
  isDeleted: boolean;
}

export function useResolveUser(userId: string | null | undefined): UserIdentity | null {
  const [user, setUser] = useState<UserIdentity | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }

    const resolveUser = async () => {
      try {
        // 1. Try users collection
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({
            userId,
            displayName: data.displayName || 'Unknown User',
            email: data.email || null,
            role: data.role || 'unknown',
            isDeleted: false,
          });
          return;
        }

        // 2. Try shopkeepers collection
        const shopkeeperDoc = await getDoc(doc(db, 'shopkeepers', userId));
        if (shopkeeperDoc.exists()) {
          const data = shopkeeperDoc.data();
          setUser({
            userId,
            displayName: data.displayName || 'Unknown Shopkeeper',
            email: data.email || null,
            role: 'shopkeeper',
            isDeleted: false,
          });
          return;
        }

        // 3. Try deleted_identities (tombstone index)
        const deletedDoc = await getDoc(doc(db, 'deleted_identities', userId));
        if (deletedDoc.exists()) {
          const data = deletedDoc.data();
          setUser({
            userId,
            displayName: data.displayName || 'Deleted User',
            email: data.email || null,
            role: data.role || 'unknown',
            isDeleted: true,
          });
          return;
        }

        // 4. Fallback
        setUser({
          userId,
          displayName: 'Unknown User',
          email: null,
          role: 'unknown',
          isDeleted: false,
        });
      } catch (error) {
        console.error('Failed to resolve user:', userId, error);
        setUser({
          userId,
          displayName: 'Unknown User',
          email: null,
          role: 'unknown',
          isDeleted: false,
        });
      }
    };

    resolveUser();
  }, [userId]);

  return user;
}
```

```typescript
// src/components/shared/UserIdentityBadge.tsx
import { useResolveUser } from '../../hooks/useResolveUser';
import { User, UserX } from 'lucide-react';

interface UserIdentityBadgeProps {
  userId: string | null | undefined;
  label?: string;
  showRole?: boolean;
  showEmail?: boolean;
}

export function UserIdentityBadge({ 
  userId, 
  label, 
  showRole = false, 
  showEmail = false 
}: UserIdentityBadgeProps) {
  const user = useResolveUser(userId);

  if (!user) return null;

  return (
    <div className="flex items-start gap-2">
      {label && <span className="text-sm text-gray-600 font-medium">{label}:</span>}
      <div className="flex items-center gap-2">
        {user.isDeleted ? (
          <UserX className="w-4 h-4 text-red-500" />
        ) : (
          <User className="w-4 h-4 text-gray-500" />
        )}
        <div>
          <span className={user.isDeleted ? 'text-red-600 line-through' : 'text-gray-900'}>
            {user.displayName}
          </span>
          {user.isDeleted && (
            <span className="ml-2 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">
              Deleted
            </span>
          )}
          {showRole && (
            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {user.role}
            </span>
          )}
          {showEmail && user.email && (
            <div className="text-xs text-gray-600">{user.email}</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Usage example:**

```tsx
// In BranchInfoScreen.tsx
<UserIdentityBadge 
  userId={branch.createdBy} 
  label="Created By" 
  showRole 
/>

<UserIdentityBadge 
  userId={branch.updatedBy} 
  label="Last Updated By" 
  showRole 
/>
```

---

### ❌ Gap 3: Firestore Security Rules Missing

**Current state:**

- `deleted_users`, `deleted_identities`, `deleted_shopkeepers` collections have **NO security rules**
- Default deny-all applies, but should have explicit rules

**Required rules:**

```javascript
// Add to firestore.rules

// Deleted users archive (service agents)
match /deleted_users/{userId} {
  // Only admins can read deleted user archives
  allow read: if hasRole('admin');
  
  // Only cloud functions can write (via admin SDK)
  allow write: if false;
}

// Deleted shopkeepers archive
match /deleted_shopkeepers/{shopkeeperId} {
  // Admins can read deleted shopkeeper archives
  allow read: if hasRole('admin');
  
  // Shopkeeper can read their own deleted record (if restored)
  allow read: if request.auth != null && request.auth.uid == shopkeeperId;
  
  // Only cloud functions can write
  allow write: if false;
  
  // Archived managers subcollection
  match /managers/{managerId} {
    allow read: if hasRole('admin');
    allow write: if false;
  }
  
  // Archived branches subcollection
  match /branches/{branchId} {
    allow read: if hasRole('admin');
    allow write: if false;
  }
}

// Deleted identities tombstone index (fast lookup)
match /deleted_identities/{userId} {
  // Admins can read for user resolution
  allow read: if hasRole('admin');
  
  // Service agents can read for support lookups
  allow read: if hasRole('serviceAgent');
  
  // Shopkeepers can read for their own manager lookups
  allow read: if hasRole('shopkeeper');
  
  // Managers can read (for activity log display)
  allow read: if hasRole('manager');
  
  // Only cloud functions can write
  allow write: if false;
}
```

---

## Places Using createdBy / updatedBy / lastUpdatedBy

### High Priority (Need User Resolution UI)

| Location | Fields | Purpose |
|----------|--------|---------|
| **Shopkeepers** (`shopkeepers/{id}`) | `createdBy` (UUID) | Track which admin/SA created account |
| **Managers** (`shopkeepers/{id}/managers/{managerId}`) | `createdAt`, `createdBy` | Track who created manager |
| **Branches** (`shopkeepers/{id}/branches/{branchId}`) | `createdBy`, `updatedBy` | Track branch creator and last editor |
| **Devices** (`devices/{deviceId}`) | `createdBy`, `lastUpdatedBy` | Track device registration and assignments |
| **Service Agents** (`users/{uid}` where role=serviceAgent) | `createdBy` | Track which admin created SA |
| **Activity Log** (`activity_log/{logId}`) | `performedBy`, `targetUser`, `performedByName`, `targetUserName` | User activity tracking |
| **Inventory** | `createdBy`, `updatedBy` | Track inventory changes |
| **Staff** | `createdBy`, `createdById`, `updatedBy`, `updatedById` | Track staff management |

---

## Implementation Plan

### Phase 1: Fix Manager Deletion Backup (CRITICAL) 🔴

**File:** `c:\GitHub\VPOS\vpos-admin\functions\lib\shopkeepers\managers.subcollection.functions.js`  
**Function:** `deleteManagerSubcollection` (line 736)

**Tasks:**

1. ✅ Copy `annotateActivityLogWithDeletedUser` helper function from `service-agents.functions.js`
2. ✅ Add archive to `deleted_users` collection BEFORE deleting manager
3. ✅ Add tombstone to `deleted_identities` collection
4. ✅ Call `annotateActivityLogWithDeletedUser` to preserve names in activity log
5. ✅ Deploy function
6. ✅ Test manager deletion and verify backup created

**Estimated time:** 30 minutes  
**Priority:** CRITICAL - Data loss prevention

---

### Phase 2: Add Firestore Security Rules (HIGH) 🟠

**File:** `c:\GitHub\VPOS\vpos-admin\firestore.rules`

**Tasks:**

1. ✅ Add rules for `deleted_users` collection
2. ✅ Add rules for `deleted_shopkeepers` collection (with subcollections)
3. ✅ Add rules for `deleted_identities` collection
4. ✅ Deploy rules: `firebase deploy --only firestore:rules --project smbs-dev-b84ad`
5. ✅ Test access from React app (admin should read deleted_identities)

**Estimated time:** 20 minutes  
**Priority:** HIGH - Security hardening

---

### Phase 3: Create React User Resolution Components (HIGH) 🟠

**Files to create:**

1. `src/hooks/useResolveUser.ts` - Hook to resolve user ID to identity
2. `src/components/shared/UserIdentityBadge.tsx` - Display component
3. `src/utils/userResolution.ts` - Caching layer (optional optimization)

**Tasks:**

1. ✅ Create `useResolveUser` hook with 3-tier lookup (users → shopkeepers → deleted_identities)
2. ✅ Create `UserIdentityBadge` component with deleted user styling
3. ✅ Add Firebase rules to allow reading `deleted_identities` for all authenticated users
4. ✅ Test with real deleted user IDs

**Estimated time:** 1 hour  
**Priority:** HIGH - User experience

---

### Phase 4: Integrate User Resolution in Existing Screens (MEDIUM) 🟡

**Files to update:**

1. `BranchInfoScreen.tsx` - Show createdBy/updatedBy names
2. `DevicesListScreen.tsx` / `BranchDevicesScreen.tsx` - Show createdBy/lastUpdatedBy
3. `ManagersListScreen.tsx` - Show createdAt (creator identity)
4. `ShopkeepersListScreen.tsx` - Show createdBy (admin/SA who created)
5. `ServiceAgentsListScreen.tsx` - Show createdBy (admin who created)

**Tasks:**

1. ✅ Replace raw UUID display with `<UserIdentityBadge userId={branch.createdBy} />`
2. ✅ Add "Created By" / "Last Updated By" sections to detail views
3. ✅ Test with deleted and active users

**Estimated time:** 2 hours  
**Priority:** MEDIUM - UI polish

---

### Phase 5: Create Admin Archive Viewer (LOW) 🟢

**New screen:** `DeletedUsersArchiveScreen.tsx`

**Features:**

- List all deleted users (deleted_identities collection)
- Filter by role (admin, serviceAgent, shopkeeper, manager)
- Search by name/email
- View full archived profile from deleted_users/deleted_shopkeepers
- Show deletion date and who deleted them

**Estimated time:** 3 hours  
**Priority:** LOW - Admin tool for auditing

---

## Testing Checklist

### ✅ Phase 1 Testing (Manager Deletion Backup)

- [ ] Create a test manager via React app
- [ ] Delete the test manager
- [ ] Verify `deleted_users/{managerId}` document exists with correct fields
- [ ] Verify `deleted_identities/{managerId}` document exists
- [ ] Check `activity_log` has `performedByName` and `targetUserName` populated
- [ ] Verify Firebase Auth user deleted
- [ ] Verify manager_hierarchy index deleted

### ✅ Phase 2 Testing (Firestore Rules)

- [ ] Test admin can read deleted_identities
- [ ] Test shopkeeper can read deleted_identities
- [ ] Test manager can read deleted_identities
- [ ] Test unauthenticated user CANNOT read deleted_identities
- [ ] Test all users CANNOT write to deleted_users/deleted_identities

### ✅ Phase 3 Testing (React User Resolution)

- [ ] Test `useResolveUser` with active user ID
- [ ] Test `useResolveUser` with active shopkeeper ID
- [ ] Test `useResolveUser` with deleted user ID
- [ ] Test `useResolveUser` with invalid/nonexistent ID
- [ ] Verify `UserIdentityBadge` shows "Deleted" badge for deleted users
- [ ] Verify strikethrough styling applied to deleted user names

---

## Recommendations

### Immediate Actions (This Week)

1. **Deploy manager deletion backup fix** - Prevents further data loss
2. **Add Firestore security rules** - Close security gap
3. **Create user resolution hook** - Enable UI to show deleted user names

### Short Term (Next 2 Weeks)

4. **Update all screens** to show resolved user names instead of UUIDs
2. **Add "Created By" / "Updated By"** metadata sections to detail screens

### Long Term (Next Month)

6. **Build admin archive viewer** for auditing deleted users
2. **Add restore functionality** for accidentally deleted managers (optional)
3. **Create backup verification cron job** to ensure all deletions are properly archived

---

## Data Loss Risk Assessment

| Deletion Type | Current Risk | After Fix | Notes |
|---------------|--------------|-----------|-------|
| Service Agent deletion | ✅ **LOW** - Backed up | ✅ **LOW** | Already implemented |
| Shopkeeper deletion | ✅ **LOW** - Backed up | ✅ **LOW** | Already implemented |
| Manager deletion (with shopkeeper) | ✅ **LOW** - Backed up | ✅ **LOW** | Part of shopkeeper deletion |
| Manager deletion (standalone) | 🔴 **HIGH** - NOT backed up | ✅ **LOW** | **FIX REQUIRED** |
| Admin deletion | ⚠️ **N/A** - Not deletable | ⚠️ **N/A** | Admins cannot be deleted (design choice) |

---

## Summary

✅ **Good foundation exists** - Service agents and shopkeepers are properly backed up  
❌ **Critical gap** - Standalone manager deletion has NO backup  
❌ **UI gap** - React app cannot resolve deleted user IDs to names  
❌ **Security gap** - Firestore rules missing for deleted_* collections  

**Recommended action:** Implement Phase 1 (manager deletion backup) **immediately** to prevent data loss. Follow with Phases 2-3 within the week for complete solution.

---

**Document Owner:** GitHub Copilot  
**Last Updated:** May 14, 2026  
**Next Review:** After Phase 1 implementation
