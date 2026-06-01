# ✅ CORRECTED: Approval Process - No Limits Calculation Needed

## User's Correct Understanding

**The `limits` field in Firestore is ONLY for UI display purposes. It does NOT enforce any actual restrictions.**

### Actual Enforcement Logic

- Restrictions are enforced by checking `accountStatus === 'trial'` in the application code
- When `accountStatus === 'approved'`, no restrictions apply
- The numbers in the `limits` object are just metadata for display in trial banner

---

## What Actually Happens

### Manual Shopkeeper Creation (Admin/Service Agent)

**Cloud Function:** `createShopkeeperAccount`

Fields set:

```json
{
  "email": "...",
  "displayName": "...",
  "phoneNumber": "...",
  "numberOfBranches": 1,  // Or custom value
  "customerType": "cloud",
  "isActive": true,
  "createdAt": "timestamp",
  "createdBy": "admin_uid"
  // NO accountStatus field
  // NO limits field  
}
```

**Result:** Shopkeeper can do EVERYTHING because `accountStatus` is undefined/null (treated as approved).

---

### Self-Registration (Phone OTP)

**Cloud Function:** `completeShopkeeperProfile`

Fields set:

```json
{
  "email": "...",
  "displayName": "...",
  "phoneNumber": "...",
  "numberOfBranches": 1,
  "customerType": "cloud",
  "isActive": true,
  "createdAt": "timestamp",
  "createdBy": "self-onboarding"
  // NO accountStatus field set by function
  // NO limits field set by function
}
```

**Note:** The Flutter app model has a default `accountStatus = AccountStatus.trial` when parsing, but this is a MODEL DEFAULT, not what's stored in Firestore initially.

---

## Where Limits Come From

### Trial Accounts

Limits are ONLY set when:

1. Self-registration creates a document AND Flutter/React app sets trial defaults client-side
2. OR when explicitly set during approval/rejection workflow

### The limits object structure

```dart
{
  "categories": 3,       // Just for display
  "inventoryItems": 20,  // Just for display
  "branches": 1,         // Just for display
  "managers": 0,         // Just for display
  "bulkOperations": false // Only this might be checked
}
```

---

## Correct Approval Process

### ✅ What We Should Do

**Flutter:**

```dart
await FirebaseFirestore.instance
    .collection('shopkeepers')
    .doc(shopkeeper.uid)
    .update({
  'accountStatus': 'approved',           // Main change
  'approvedBy': currentUser.id,
  'approvedAt': FieldValue.serverTimestamp(),
  'needsOnboarding': false,
  'isSelfRegistered': false,
  'updatedAt': FieldValue.serverTimestamp(),
  // NO limits field update needed
});
```

**React:**

```typescript
await updateDoc(shopkeeperRef, {
  accountStatus: 'approved',              // Main change
  approvedBy: user.uid,
  approvedAt: serverTimestamp(),
  needsOnboarding: false,
  isSelfRegistered: false,
  'features.multiLocation': true,
  'features.advancedReports': true,
  'features.apiAccess': false,
  'features.customBranding': false,
  // NO limits field update needed
});
```

---

## How Restrictions Actually Work

### Categories Restriction

```dart
// NOT based on limits.categories value
// Based on accountStatus check
if (shopkeeper.accountStatus == AccountStatus.trial) {
  // Allow max 3 categories
} else {
  // No limit
}
```

### Inventory Restriction

```dart
// NOT based on limits.inventoryItems value
// Based on accountStatus check
if (shopkeeper.accountStatus == AccountStatus.trial) {
  // Allow max 20 items
} else {
  // No limit
}
```

### Branches Restriction

```dart
// Based on numberOfBranches field, NOT limits.branches
// This applies to BOTH trial and approved accounts
if (currentBranchCount >= shopkeeper.numberOfBranches) {
  // Cannot create more branches
}
```

### Managers Restriction

```dart
// Based on formula: numberOfBranches * 11
// This applies to BOTH trial and approved accounts
final maxManagers = shopkeeper.numberOfBranches * 11;
if (currentManagerCount >= maxManagers) {
  // Cannot create more managers
}
```

### Bulk Operations

```dart
// This might actually be checked
if (shopkeeper.accountStatus == AccountStatus.trial) {
  // Hide bulk operation buttons
} else {
  // Show bulk operation buttons
}
```

---

## Key Insights

1. **numberOfBranches** is the REAL field that controls branch limits (for everyone)
2. **accountStatus** is the REAL field that controls trial restrictions
3. **limits** object is OPTIONAL and only for UI display in trial banner
4. Manually created shopkeepers (by admin) have NO accountStatus or limits fields initially
5. They work fine because undefined/null accountStatus = treated as approved

---

## Files Fixed

### Flutter

✅ `vpos-admin/lib/features/admin/screens/approve_trial_shopkeepers_screen.dart`

- Removed limit calculations
- Only changes accountStatus

### React

✅ `vpos-admin-react/src/screens/admin/ApproveTrialShopkeepersScreen.tsx`

- Removed limit calculations
- Only changes accountStatus
- Removed numberOfBranches from interface

---

**Status:** ✅ CORRECTED - Now properly understands limits are display-only  
**Date:** May 16, 2026  
**Thanks to:** User for catching the overcomplication!
