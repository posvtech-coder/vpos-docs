# Branch Contract Changes — May 2026

**Date:** May 13, 2026  
**Scope:** Cross-repo contract changes affecting vpos-admin, vpos-billing, and vpos-billing-offline  
**Type:** Schema modification + field removal  
**Status:** ⚠️ React complete, Flutter implementation pending

---

## Overview

This document tracks critical changes to the Branch entity contract that affect all three VPOS applications. These changes modify the Cloud Functions request/response schema and Firestore document structure.

---

## Changes Made

### 1. ✅ **Removed `businessName` field** (COMPLETE)

**Reason:** Redundant field — business name is stored at the shopkeeper level, not at branch level. Each shopkeeper has one business name that applies to all branches.

**Affected Endpoints:**
- `createBranchSubcollection` (asia-south1)
- `updateBranchSubcollection` (asia-south1)

**Firestore Schema:**
```typescript
// BEFORE (deprecated)
interface Branch {
  branchId: string;
  branchName: string;
  businessName?: string;  // ❌ REMOVED
  email?: string;
  // ... other fields
}

// AFTER (current)
interface Branch {
  branchId: string;
  branchName: string;
  email?: string;
  // ... other fields
}
```

**React Implementation Status:**
- ✅ Removed from CreateBranchScreen.tsx (form input)
- ✅ Removed from EditBranchScreen.tsx (form input)
- ✅ Removed from BranchDetailScreen.tsx (display)
- ✅ Removed from BranchesListScreen.tsx (list display)
- ✅ Removed from BranchInfoScreen.tsx (detail display)
- ✅ Removed from TypeScript interfaces (CreateBranchRequest, UpdateBranchRequest)
- ✅ Cloud Functions no longer accept or store businessName

---

### 2. ✅ **Added `email` field** (COMPLETE)

**Reason:** Enable branch-specific email communication for reports, notifications, and customer communications.

**Validation:**
- Optional field (can be null)
- If provided, must match email regex: `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`
- Stored in lowercase for consistency
- Frontend includes MSG91 verification (user must verify before submitting)

**Affected Endpoints:**
- `createBranchSubcollection` (asia-south1)
- `updateBranchSubcollection` (asia-south1)

**Firestore Schema:**
```typescript
interface Branch {
  branchId: string;
  branchName: string;
  email?: string | null;  // ✅ NEW — validated email in lowercase
  gstNumber?: string | null;
  phoneNumber?: string | null;
  // ... other fields
}
```

**Cloud Function Implementation:**

**createBranchSubcollection** (lines ~50, ~85, ~175):
```javascript
// Parameter extraction
const { branchName, email, gstNumber, phoneNumber, upiId, ... } = request.data;

// Validation
if (email && email.trim().length > 0) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim().toLowerCase())) {
    throw new HttpsError("invalid-argument", "Invalid email address format");
  }
}

// Storage
const branchData = {
  branchId,
  branchName: branchName.trim(),
  email: email?.trim().toLowerCase() || null,
  gstNumber: gstNumber?.trim() || null,
  // ...
};
```

**updateBranchSubcollection** (lines ~345, ~390):
```javascript
// Parameter extraction
const { branchId, branchName, email, gstNumber, ... } = request.data;

// Update handling
if (email !== undefined) {
  if (email && email.trim().length > 0) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      throw new HttpsError("invalid-argument", "Invalid email address format");
    }
    updates.email = email.trim().toLowerCase();
  } else {
    updates.email = null;
  }
}
```

**React Implementation Status:**
- ✅ Added to CreateBranchScreen.tsx with MSG91 verification
- ✅ Added to EditBranchScreen.tsx with MSG91 verification + isDirty tracking
- ✅ Added to BranchDetailScreen.tsx (display)
- ✅ Added to BranchesListScreen.tsx (list display)
- ✅ Already present in BranchInfoScreen.tsx
- ✅ Added to TypeScript interfaces (CreateBranchRequest, UpdateBranchRequest)
- ✅ Cloud Functions validate and store email

---

## Flutter Implementation Required

### 🔴 **Critical:** Both vpos-billing and vpos-billing-offline must be updated

### Files to Modify:

#### **1. vpos-billing (Flutter online app)**

**Models:**
```dart
// lib/models/branch.dart
class Branch {
  final String branchId;
  final String branchName;
  final String? email;  // ✅ ADD THIS
  // REMOVE: final String? businessName;  // ❌ DELETE THIS
  final String? gstNumber;
  final String? phoneNumber;
  // ... other fields
  
  Branch({
    required this.branchId,
    required this.branchName,
    this.email,  // ✅ ADD THIS
    // this.businessName,  // ❌ DELETE THIS
    this.gstNumber,
    this.phoneNumber,
    // ...
  });
  
  factory Branch.fromFirestore(Map<String, dynamic> data) {
    return Branch(
      branchId: data['branchId'] as String? ?? '',
      branchName: data['branchName'] as String? ?? '',
      email: data['email'] as String?,  // ✅ ADD THIS
      // businessName: data['businessName'] as String?,  // ❌ DELETE THIS
      gstNumber: data['gstNumber'] as String?,
      // ...
    );
  }
  
  Map<String, dynamic> toFirestore() {
    return {
      'branchId': branchId,
      'branchName': branchName,
      'email': email,  // ✅ ADD THIS
      // 'businessName': businessName,  // ❌ DELETE THIS
      'gstNumber': gstNumber,
      // ...
    };
  }
}
```

**UI Screens:**
```dart
// lib/screens/branch/create_branch_screen.dart
// lib/screens/branch/edit_branch_screen.dart

// ❌ REMOVE business name TextField
TextField(
  decoration: InputDecoration(labelText: 'Business Name'),
  controller: _businessNameController,  // DELETE THIS
),

// ✅ ADD email TextField with validation
TextField(
  decoration: InputDecoration(
    labelText: 'Email (Optional)',
    hintText: 'branch@example.com',
  ),
  controller: _emailController,  // ADD THIS
  keyboardType: TextInputType.emailAddress,
  validator: (value) {
    if (value != null && value.isNotEmpty) {
      final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
      if (!emailRegex.hasMatch(value.trim())) {
        return 'Invalid email format';
      }
    }
    return null;
  },
),
```

**Cloud Function Calls:**
```dart
// lib/services/branch_service.dart

Future<void> createBranch({
  required String branchName,
  String? email,  // ✅ ADD THIS
  // String? businessName,  // ❌ DELETE THIS
  String? gstNumber,
  String? phoneNumber,
  // ...
}) async {
  final callable = FirebaseFunctions.instanceFor(region: 'asia-south1')
      .httpsCallable('createBranchSubcollection');
  
  final result = await callable.call({
    'branchName': branchName.trim(),
    'email': email?.trim().toLowerCase(),  // ✅ ADD THIS
    // 'businessName': businessName?.trim(),  // ❌ DELETE THIS
    'gstNumber': gstNumber?.trim(),
    'phoneNumber': phoneNumber?.trim(),
    // ...
  });
  
  return result.data;
}

Future<void> updateBranch({
  required String branchId,
  required String branchName,
  String? email,  // ✅ ADD THIS
  // String? businessName,  // ❌ DELETE THIS
  String? gstNumber,
  // ...
}) async {
  final callable = FirebaseFunctions.instanceFor(region: 'asia-south1')
      .httpsCallable('updateBranchSubcollection');
  
  final result = await callable.call({
    'branchId': branchId,
    'branchName': branchName.trim(),
    'email': email?.trim().toLowerCase(),  // ✅ ADD THIS
    // 'businessName': businessName?.trim(),  // ❌ DELETE THIS
    'gstNumber': gstNumber?.trim(),
    // ...
  });
  
  return result.data;
}
```

---

#### **2. vpos-billing-offline (Flutter offline-first app)**

**Same changes as vpos-billing, plus:**

**Local Database Schema:**
```dart
// lib/data/database/tables.dart

// Update Branch table definition
const branchTable = '''
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branchId TEXT UNIQUE NOT NULL,
  shopkeeperId TEXT NOT NULL,
  branchName TEXT NOT NULL,
  email TEXT,  -- ✅ ADD THIS COLUMN
  -- businessName TEXT,  -- ❌ REMOVE THIS COLUMN
  gstNumber TEXT,
  phoneNumber TEXT,
  -- ... other columns
  FOREIGN KEY (shopkeeperId) REFERENCES shopkeepers(shopkeeperId)
);
''';
```

**Database Migration:**
```dart
// lib/data/database/database_helper.dart

Future<void> _migrateToVersion42(Database db) async {
  // Add email column if it doesn't exist
  await db.execute('''
    ALTER TABLE branches ADD COLUMN email TEXT
  ''');
  
  // Remove businessName column (SQLite doesn't support DROP COLUMN directly)
  // Create new table without businessName, copy data, drop old table, rename new table
  await db.execute('''
    CREATE TABLE branches_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branchId TEXT UNIQUE NOT NULL,
      shopkeeperId TEXT NOT NULL,
      branchName TEXT NOT NULL,
      email TEXT,
      gstNumber TEXT,
      phoneNumber TEXT,
      -- ... other columns (without businessName)
    );
  ''');
  
  await db.execute('''
    INSERT INTO branches_new (id, branchId, shopkeeperId, branchName, email, gstNumber, phoneNumber, ...)
    SELECT id, branchId, shopkeeperId, branchName, NULL as email, gstNumber, phoneNumber, ...
    FROM branches;
  ''');
  
  await db.execute('DROP TABLE branches;');
  await db.execute('ALTER TABLE branches_new RENAME TO branches;');
}
```

**Sync Service:**
```dart
// lib/services/sync/branch_sync_service.dart

// Update sync payload mapping
Map<String, dynamic> branchToCloudPayload(Branch branch) {
  return {
    'branchId': branch.branchId,
    'branchName': branch.branchName,
    'email': branch.email,  // ✅ ADD THIS
    // 'businessName': branch.businessName,  // ❌ DELETE THIS
    'gstNumber': branch.gstNumber,
    // ...
  };
}

Branch branchFromCloudPayload(Map<String, dynamic> data) {
  return Branch(
    branchId: data['branchId'] as String,
    branchName: data['branchName'] as String,
    email: data['email'] as String?,  // ✅ ADD THIS
    // businessName: data['businessName'] as String?,  // ❌ DELETE THIS
    gstNumber: data['gstNumber'] as String?,
    // ...
  );
}
```

---

## Deployment Checklist

### ✅ Phase 1: Backend + React Admin (COMPLETE)
- [x] Update Cloud Functions (createBranchSubcollection, updateBranchSubcollection)
- [x] Deploy functions to dev environment
- [x] Deploy functions to prod environment
- [x] Update React TypeScript interfaces
- [x] Remove businessName from all React screens
- [x] Add email field with validation to all React screens
- [x] Test in React admin portal

### ⏳ Phase 2: Flutter vpos-billing (PENDING)
- [ ] Update Branch model (add email, remove businessName)
- [ ] Update Create Branch screen (add email input, remove businessName input)
- [ ] Update Edit Branch screen (add email input, remove businessName input)
- [ ] Update Branch Detail screen (show email, hide businessName)
- [ ] Update branch_service.dart (add email param, remove businessName param)
- [ ] Test branch creation with email
- [ ] Test branch update with email
- [ ] Test branch listing displays email correctly

### ⏳ Phase 3: Flutter vpos-billing-offline (PENDING)
- [ ] Update Branch model (add email, remove businessName)
- [ ] Update local database schema (add email column, remove businessName column)
- [ ] Create database migration script (v41 → v42)
- [ ] Update Create Branch screen (add email input, remove businessName input)
- [ ] Update Edit Branch screen (add email input, remove businessName input)
- [ ] Update Branch Detail screen (show email, hide businessName)
- [ ] Update branch_sync_service.dart (sync email, remove businessName)
- [ ] Test offline branch creation with email
- [ ] Test sync to cloud includes email
- [ ] Test sync from cloud includes email
- [ ] Test database migration on existing installations

---

## Testing Strategy

### Backend Testing (Cloud Functions)
```javascript
// Test createBranchSubcollection with email
{
  branchName: "Test Branch",
  email: "test@example.com",  // ✅ Should accept and normalize to lowercase
  gstNumber: "29ABCDE1234F1Z5",
  phoneNumber: "9876543210",
  // ... other fields
}

// Test createBranchSubcollection without email
{
  branchName: "Test Branch 2",
  email: null,  // ✅ Should accept and store as null
  gstNumber: "29ABCDE1234F1Z5",
  // ...
}

// Test createBranchSubcollection with invalid email
{
  branchName: "Test Branch 3",
  email: "invalid-email",  // ❌ Should reject with "Invalid email address format"
  // ...
}

// Test that businessName is ignored (not stored)
{
  branchName: "Test Branch 4",
  businessName: "Some Business",  // ❌ Should be ignored, not stored in Firestore
  // ...
}
```

### React Testing
1. Create new branch with email → verify email saved
2. Create new branch without email → verify null saved
3. Edit existing branch, add email → verify email updated
4. Edit existing branch, clear email → verify email set to null
5. Verify email validation triggers on invalid format
6. Verify MSG91 verification required before submit
7. Verify businessName field not visible anywhere

### Flutter Testing
1. Create new branch with email → verify syncs to cloud
2. Create new branch without email → verify syncs to cloud with null
3. Edit existing branch, add email → verify syncs to cloud
4. Offline: Create branch with email → verify syncs when online
5. Offline: Database migration runs successfully on app upgrade
6. Verify businessName field removed from all screens
7. Verify existing branches without email display correctly

---

## Backward Compatibility

### Server-Side (Cloud Functions)
- ✅ Old clients sending `businessName` → parameter ignored, not stored
- ✅ Old clients not sending `email` → stored as null, no error
- ✅ New clients sending `email` → validated and stored
- ✅ New clients not sending `businessName` → no impact

### Client-Side (Flutter Apps)
- ⚠️ Old Flutter app versions will crash if `email` field not handled
- ⚠️ Old Flutter app versions may send `businessName` (will be ignored by server)
- ✅ New Flutter app versions will read `email` (handles null safely)
- ✅ New Flutter app versions will not send `businessName`

**Recommended rollout:**
1. ✅ Deploy Cloud Functions first (backward compatible)
2. ⏳ Deploy React admin (uses new contract)
3. ⏳ Deploy vpos-billing update (handles email, removes businessName)
4. ⏳ Deploy vpos-billing-offline update (handles email, removes businessName, migrates DB)

---

## Rollback Plan

If issues occur after deployment:

### Cloud Functions Rollback
```bash
# From vpos-admin/ directory
firebase functions:delete createBranchSubcollection --force --project smbs-7b59e
firebase functions:delete updateBranchSubcollection --force --project smbs-7b59e

# Redeploy previous version
git checkout <previous-commit>
npm run build
firebase deploy --only functions:createBranchSubcollection,functions:updateBranchSubcollection --project smbs-7b59e
```

### Flutter App Rollback
- Revert to previous app version via Firebase App Distribution or Google Play rollback
- Database migration is irreversible — requires manual data restoration

---

## Contact

For questions or issues with this migration:
- **Backend/Functions:** Check `vpos-admin/functions/lib/shopkeepers/branches.subcollection.functions.js`
- **React Admin:** Check `vpos-admin-react/src/screens/shopkeeper/branches/` and `vpos-admin-react/src/services/functions-part2.ts`
- **Flutter Billing:** Check `vpos-billing/lib/models/branch.dart` and `vpos-billing/lib/services/branch_service.dart`
- **Flutter Offline:** Check `vpos-billing-offline/lib/data/database/` and `vpos-billing-offline/lib/services/sync/`

---

**Last Updated:** May 13, 2026  
**Document Version:** 1.0
