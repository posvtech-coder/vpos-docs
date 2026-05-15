# Service Agent Shopkeeper Update Permissions Fix

**Date:** May 12, 2026  
**Status:** ✅ COMPLETE — Service Agents can now update shopkeeper profiles

---

## Problem

Service agents were getting permission denied error when trying to update shopkeeper phone numbers:

```json
{
    "error": {
        "message": "Only admins can update other shopkeeper profiles",
        "status": "PERMISSION_DENIED"
    }
}
```

**Root Cause:** The `updateShopkeeperProfile` Cloud Function only allowed `admin` role to update other shopkeeper profiles. Service agents were completely blocked.

---

## Solution

✅ **Service agents can now update ALL shopkeeper profile fields EXCEPT:**
- `isActive` (enable/disable account)
- `customerType` (cloud/offline - affects login)

✅ **Service agents CAN update:**
- Phone numbers (primary and alternative)
- Email address
- Display name
- Business address fields
- Personal address fields
- GST number
- Alias
- Number of branches
- Profile photo
- All other profile data

---

## Technical Changes

**File:** `vpos-admin/functions/lib/shopkeepers/shopkeepers.functions.js`

### Change 1: Allow Service Agent Role

**Before:**
```javascript
// Verify caller is an admin
const adminDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can update other shopkeeper profiles');
}
```

**After:**
```javascript
// Verify caller is an admin or serviceAgent
const callerDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
if (!callerDoc.exists) {
    throw new HttpsError('not-found', 'Caller user not found');
}
const callerRole = callerDoc.data()?.role;
if (callerRole !== 'admin' && callerRole !== 'serviceAgent') {
    throw new HttpsError('permission-denied', 'Only admins and service agents can update other shopkeeper profiles');
}

isAdminUpdate = true; // Both admin and serviceAgent get update permissions
isServiceAgentUpdate = callerRole === 'serviceAgent';

if (isServiceAgentUpdate) {
    console.log('🔐 Service Agent update - restrictions apply (cannot enable/disable)');
}
```

### Change 2: Block Service Agents from Enable/Disable

**Before:**
```javascript
// Handle status updates (only for admins)
if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
        throw new HttpsError('invalid-argument', 'Active status must be a boolean');
    }
    console.log(`🔄 Setting shopkeeper isActive to ${isActive}`);
    updateData.isActive = isActive;
}
```

**After:**
```javascript
// Handle status updates (only for admins - NOT service agents)
if (isActive !== undefined) {
    if (isServiceAgentUpdate) {
        throw new HttpsError('permission-denied', 'Service agents cannot enable/disable shopkeeper accounts. Only admins can perform this action.');
    }
    if (typeof isActive !== 'boolean') {
        throw new HttpsError('invalid-argument', 'Active status must be a boolean');
    }
    console.log(`🔄 Setting shopkeeper isActive to ${isActive}`);
    updateData.isActive = isActive;
}
```

### Change 3: Block Service Agents from Customer Type Changes

**Before:**
```javascript
// Handle customer type updates (only for admins)
if (customerType !== undefined) {
    if (customerType !== 'cloud' && customerType !== 'offline') {
        throw new HttpsError('invalid-argument', 'Customer type must be either "cloud" or "offline"');
    }
    // ...
}
```

**After:**
```javascript
// Handle customer type updates (only for admins - NOT service agents)
if (customerType !== undefined) {
    if (isServiceAgentUpdate) {
        throw new HttpsError('permission-denied', 'Service agents cannot change customer type. Only admins can perform this action.');
    }
    if (customerType !== 'cloud' && customerType !== 'offline') {
        throw new HttpsError('invalid-argument', 'Customer type must be either "cloud" or "offline"');
    }
    // ...
}
```

---

## Permission Matrix

| Field | Admin | Service Agent | Shopkeeper |
|-------|-------|---------------|------------|
| Phone Number (primary) | ✅ Yes | ✅ Yes | ❌ No |
| Alternative Phone | ✅ Yes | ✅ Yes | ❌ No |
| Email | ✅ Yes | ✅ Yes | ❌ No |
| Display Name | ✅ Yes | ✅ Yes | ❌ No |
| Business Address | ✅ Yes | ✅ Yes | ❌ No |
| Personal Address | ✅ Yes | ✅ Yes | ❌ No |
| GST Number | ✅ Yes | ✅ Yes | ❌ No |
| Alias | ✅ Yes | ✅ Yes | ❌ No |
| Number of Branches | ✅ Yes | ✅ Yes | ❌ No |
| **isActive (Enable/Disable)** | ✅ Yes | ❌ **NO** | ❌ No |
| **customerType (Cloud/Offline)** | ✅ Yes | ❌ **NO** | ❌ No |
| Profile Photo | ✅ Yes | ✅ Yes | ✅ **YES** |

**Key Points:**
- ✅ Service agents have **full update access** except enable/disable and customer type
- ❌ Service agents **CANNOT** enable/disable shopkeeper accounts (admin only)
- ❌ Service agents **CANNOT** change customer type cloud↔offline (admin only)
- ✅ Shopkeepers can **ONLY** update their own profile photo

---

## Why These Restrictions?

### isActive (Enable/Disable)
**Reason:** This is a critical account control action that affects billing and access. Only admins should have authority to disable/enable accounts.

**Use cases for admin-only:**
- Account suspension for non-payment
- Temporary account freeze
- Account termination

### customerType (Cloud/Offline)
**Reason:** This determines whether the shopkeeper can log in to the system. Changes affect billing model and access patterns.

**Use cases for admin-only:**
- Migration from offline to cloud billing
- Switching business models
- Payment plan changes

---

## Testing Checklist

### ✅ Service Agent Update Tests

- [ ] **Update phone number** → Should succeed with 200 OK
- [ ] **Update alternative phone** → Should succeed
- [ ] **Update email** → Should succeed
- [ ] **Update display name** → Should succeed
- [ ] **Update business address** → Should succeed
- [ ] **Update GST number** → Should succeed
- [ ] **Update alias** → Should succeed
- [ ] **Update personal address** → Should succeed

### ❌ Service Agent Restriction Tests

- [ ] **Try to set isActive=false** → Should fail with:
  ```json
  {
    "error": {
      "message": "Service agents cannot enable/disable shopkeeper accounts. Only admins can perform this action.",
      "status": "PERMISSION_DENIED"
    }
  }
  ```

- [ ] **Try to change customerType** → Should fail with:
  ```json
  {
    "error": {
      "message": "Service agents cannot change customer type. Only admins can perform this action.",
      "status": "PERMISSION_DENIED"
    }
  }
  ```

### ✅ Admin Tests (Should Still Work)

- [ ] **Admin updates all fields including isActive** → Should succeed
- [ ] **Admin changes customerType** → Should succeed
- [ ] **Admin disables shopkeeper account** → Should succeed

---

## Error Messages

### For Service Agents

**When trying to disable/enable:**
```
Service agents cannot enable/disable shopkeeper accounts. Only admins can perform this action.
```

**When trying to change customer type:**
```
Service agents cannot change customer type. Only admins can perform this action.
```

### For Unauthorized Users

**When non-admin/non-serviceAgent tries to update:**
```
Only admins and service agents can update other shopkeeper profiles
```

---

## Deployment

```powershell
# Deploy only the updated function
cd vpos-admin/functions
firebase deploy --only functions:updateShopkeeperProfile

# OR use the session deploy script
.\deploy-session-fixes.ps1
```

---

## Related Changes in This Session

This fix is part of the May 12, 2026 session that also includes:
1. ✅ Device unassignment bug fixes (R22)
2. ✅ Device validity system audit and fixes (R21)
3. ✅ Device custom fields update fix (R20)
4. ✅ **Service agent shopkeeper update permissions** (this fix)

See `UI_CHANGES_TRACKER.md` for complete session summary.

---

## Code Pattern for Other Functions

When implementing similar permission logic in other functions, use this pattern:

```javascript
// Step 1: Check if either admin or serviceAgent
const callerDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
const callerRole = callerDoc.data()?.role;

if (callerRole !== 'admin' && callerRole !== 'serviceAgent') {
    throw new HttpsError('permission-denied', 'Only admins and service agents can perform this action');
}

const isServiceAgent = callerRole === 'serviceAgent';

// Step 2: Block service agents from sensitive actions
if (sensitiveAction && isServiceAgent) {
    throw new HttpsError('permission-denied', 'Service agents cannot perform this action. Only admins can.');
}

// Step 3: Allow the rest
// ... proceed with update
```

---

**Status:** ✅ PRODUCTION READY after deployment  
**Deploy Script:** `deploy-session-fixes.ps1`  
**Function:** `updateShopkeeperProfile`  
**File:** `vpos-admin/functions/lib/shopkeepers/shopkeepers.functions.js`
