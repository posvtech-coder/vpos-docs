# Multi-Identifier Device Tracking - Implementation Plan

**Date**: June 1, 2026  
**Purpose**: Store and match devices using MAC Address, Build Fingerprint, AND Android ID separately to handle reinstall scenarios where primary identifier might change.

---

## 📋 Problem Statement

**Current Issue**: Device ID can change on app reinstall if MAC address retrieval fails and app falls back to different identifier (Build Fingerprint or Android ID).

**Solution**: Store all 3 hardware identifiers separately in Firestore. Match device on ANY of the 3 values during lookup/verification.

---

## 🎯 Changes Required

### **1. vpos-billing (Flutter Cloud Billing App)**

#### File: `lib/services/device_id_service.dart`

**Changes:**
- ✅ **Add new method**: `getAllHardwareIdentifiers()` - Returns map with all 3 IDs
- ✅ **Modify**: `getDeviceInfo()` - Include `hardwareIdentifiers` object in QR data
- ✅ **Keep existing**: `getDeviceId()` - Maintain backward compatibility

**Code to Add:**

```dart
/// Get all 3 hardware identifiers separately
/// Returns map with macAddress, buildFingerprint, androidId
static Future<Map<String, String?>> getAllHardwareIdentifiers() async {
  final deviceInfoPlugin = DeviceInfoPlugin();

  if (Platform.isAndroid) {
    final androidInfo = await deviceInfoPlugin.androidInfo;
    
    return {
      'macAddress': await _getMacAddress(),          // May be null
      'buildFingerprint': androidInfo.fingerprint,   // Always available
      'androidId': androidInfo.id,                   // Always available (64-bit hex)
    };
  } else if (Platform.isIOS) {
    final iosInfo = await deviceInfoPlugin.iosInfo;
    
    return {
      'macAddress': null,                            // Not available on iOS
      'buildFingerprint': iosInfo.utsname.version ?? 'unknown',
      'androidId': iosInfo.identifierForVendor ?? 'unknown',
    };
  }
  
  throw Exception('Unsupported platform');
}
```

**Update `getDeviceInfo()`:**

```dart
static Future<Map<String, dynamic>> getDeviceInfo({String? fcmToken}) async {
  // ... existing code ...
  
  // ✅ NEW: Add all 3 hardware identifiers
  final hardwareIds = await getAllHardwareIdentifiers();
  deviceInfo['hardwareIdentifiers'] = hardwareIds;
  
  return deviceInfo;
}
```

**Lines to modify**: ~203-265  
**Estimated time**: 15 minutes

---

### **2. vpos-billing-offline (Flutter Offline Billing App)**

#### File: `lib/services/device/device_id_service.dart`

**Changes:**
- ✅ Same changes as vpos-billing above
- ✅ Add `getAllHardwareIdentifiers()` method
- ✅ Update `getDeviceInfo()` to include hardwareIdentifiers

**Lines to modify**: ~118-180  
**Estimated time**: 15 minutes

---

### **3. vpos-admin (Cloud Functions - TypeScript)**

#### File: `functions/lib/devices/device-registration.functions.js` (Compiled from .ts)

**Source File**: `functions/src/devices/device-registration.functions.ts`

**Changes:**

**A. Update Firestore Schema** (in `registerDeviceFromQR`)

```typescript
const registrationData = {
  deviceId: deviceData.deviceId,
  deviceFingerprint: deviceData.deviceFingerprint || null,
  serialNumber: deviceData.serialNumber || 'N/A',
  
  // ✅ NEW: Store all 3 hardware identifiers separately
  hardwareIdentifiers: {
    macAddress: deviceData.hardwareIdentifiers?.macAddress || null,
    buildFingerprint: deviceData.hardwareIdentifiers?.buildFingerprint || null,
    androidId: deviceData.hardwareIdentifiers?.androidId || null,
  },
  
  // ... rest of existing fields ...
};
```

**B. Update Device Lookup Logic** (in `scanDeviceQR` and `checkDeviceRegistrationStatus`)

```typescript
/**
 * Find device by matching ANY of the 3 hardware identifiers
 * More reliable than single deviceId lookup
 */
async function findDeviceByHardwareIds(
  scannedData: any
): Promise<FirebaseFirestore.DocumentSnapshot | null> {
  const db = admin.firestore();
  const hardwareIds = scannedData.hardwareIdentifiers;
  
  if (!hardwareIds) {
    // Fallback to old behavior if no hardwareIdentifiers
    const deviceDoc = await db.collection('billing_devices')
      .doc(scannedData.deviceId)
      .get();
    return deviceDoc.exists ? deviceDoc : null;
  }
  
  // Try to match on each identifier (in order of reliability)
  
  // 1. Try Android ID (most stable)
  if (hardwareIds.androidId) {
    const snapshot = await db.collection('billing_devices')
      .where('hardwareIdentifiers.androidId', '==', hardwareIds.androidId)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      console.log('✅ Device found by Android ID');
      return snapshot.docs[0];
    }
  }
  
  // 2. Try MAC Address
  if (hardwareIds.macAddress) {
    const snapshot = await db.collection('billing_devices')
      .where('hardwareIdentifiers.macAddress', '==', hardwareIds.macAddress)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      console.log('✅ Device found by MAC Address');
      return snapshot.docs[0];
    }
  }
  
  // 3. Try Build Fingerprint
  if (hardwareIds.buildFingerprint) {
    const snapshot = await db.collection('billing_devices')
      .where('hardwareIdentifiers.buildFingerprint', '==', hardwareIds.buildFingerprint)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      console.log('✅ Device found by Build Fingerprint');
      return snapshot.docs[0];
    }
  }
  
  // 4. Fallback to deviceId lookup
  const deviceDoc = await db.collection('billing_devices')
    .doc(scannedData.deviceId)
    .get();
  if (deviceDoc.exists) {
    console.log('✅ Device found by deviceId (fallback)');
    return deviceDoc;
  }
  
  return null;
}
```

**C. Update `checkDeviceRegistrationStatus` function:**

```typescript
export const checkDeviceRegistrationStatus = onCall(
  getFunctionConfig('checkDeviceRegistrationStatus'),
  async (request) => {
    const { encryptedDeviceId } = request.data;
    
    // Decrypt device data
    const deviceData = decryptQRData(encryptedDeviceId);
    
    // ✅ NEW: Use multi-identifier lookup
    const deviceDoc = await findDeviceByHardwareIds(deviceData);
    
    if (!deviceDoc || !deviceDoc.exists) {
      return {
        success: true,
        isRegistered: false,
        deviceId: deviceData.deviceId,
        message: 'Device not yet registered in inventory',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };
    }
    
    // Device found - return details
    const deviceInfo = deviceDoc.data();
    return {
      success: true,
      isRegistered: true,
      deviceId: deviceDoc.id,  // Use actual Firestore doc ID
      deviceInfo,
      // ... rest of response
    };
  }
);
```

**D. Update `scanDeviceQR` function:**

```typescript
export const scanDeviceQR = onCall(
  getFunctionConfig('scanDeviceQR'),
  async (request) => {
    // ... existing auth and decryption ...
    
    // ✅ NEW: Use multi-identifier lookup
    const deviceDoc = await findDeviceByHardwareIds(deviceData);
    
    const isRegistered = deviceDoc && deviceDoc.exists;
    let deviceInfo = null;
    
    if (isRegistered) {
      deviceInfo = deviceDoc.data();
    }
    
    // ... rest of existing logic ...
  }
);
```

**Files to modify**:
- `functions/src/devices/device-registration.functions.ts` (TypeScript source)
- Need to recompile: `npm run build` in functions/ directory

**Lines to modify**: ~75-250  
**Estimated time**: 30 minutes

---

### **4. Firestore Indexes** (Required for queries)

#### File: `vpos-admin/firestore.indexes.json`

**Add new indexes for hardwareIdentifiers queries:**

```json
{
  "indexes": [
    {
      "collectionGroup": "billing_devices",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "hardwareIdentifiers.androidId",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "billing_devices",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "hardwareIdentifiers.macAddress",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "billing_devices",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "hardwareIdentifiers.buildFingerprint",
          "order": "ASCENDING"
        }
      ]
    }
  ]
}
```

**Deployment**: Run `firebase deploy --only firestore:indexes`

**Estimated time**: 5 minutes (indexes build automatically in background)

---

### **5. vpos-admin (Flutter Admin Portal)**

#### File: `lib/shared/screens/device_management/device_detail_screen.dart`

**Changes:**
- ✅ **Display all 3 identifiers** in Technical Information card
- ✅ Show which identifier is primary vs fallback

**Code to add** (in `_buildTechnicalInfoCard` method, around line 509):

```dart
// Add after existing technical info
if (device['hardwareIdentifiers'] != null) ...[
  const SizedBox(height: 16),
  Text(
    'Hardware Identifiers',
    style: TextStyle(
      fontSize: isMobile ? 16 : 18,
      fontWeight: FontWeight.w600,
      color: Colors.grey[700],
    ),
  ),
  const SizedBox(height: 8),
  _buildDetailRow(
    'MAC Address',
    device['hardwareIdentifiers']['macAddress'] ?? 'Not Available',
  ),
  _buildDetailRow(
    'Build Fingerprint',
    device['hardwareIdentifiers']['buildFingerprint'] ?? 'Unknown',
  ),
  _buildDetailRow(
    'Android ID',
    device['hardwareIdentifiers']['androidId'] ?? 'Unknown',
  ),
],
```

**Lines to modify**: ~509-540  
**Estimated time**: 10 minutes

---

### **6. vpos-admin-react (React Admin Portal)**

**Status**: ❌ **No device detail screen exists yet**

**Action Required**: 
- If you plan to build device management in React, add hardware identifiers display
- Otherwise, no changes needed (Flutter admin handles it)

**Estimated time**: N/A (unless building new feature)

---

## 📊 Firestore Schema Changes

### **Before (Current):**

```javascript
billing_devices/{deviceId} = {
  deviceId: "BILL-ANDROID-A1B2C3D4E5F6",
  serialNumber: "1234567890abcdef",
  deviceFingerprint: "a1b2c3d4",
  // ... other fields
}
```

### **After (New):**

```javascript
billing_devices/{deviceId} = {
  deviceId: "BILL-ANDROID-A1B2C3D4E5F6",
  serialNumber: "1234567890abcdef",  // Keep for backward compatibility
  deviceFingerprint: "a1b2c3d4",     // Keep for backward compatibility
  
  // ✅ NEW: All 3 identifiers stored separately
  hardwareIdentifiers: {
    macAddress: "A1:B2:C3:D4:E5:F6",       // null if unavailable
    buildFingerprint: "samsung/SM-T510/...", // Always available
    androidId: "1234567890abcdef",          // Always available
  },
  
  // ... other fields unchanged
}
```

---

## 🧪 Testing Plan

### **Test Case 1: Fresh Install**
1. Install vpos-billing on device
2. Generate QR code
3. Scan QR in admin portal → register device
4. Verify all 3 identifiers stored in Firestore
5. ✅ Expected: Device registered with MAC, Build, and Android ID

### **Test Case 2: Reinstall (MAC Available)**
1. Uninstall vpos-billing
2. Reinstall vpos-billing
3. Generate QR code
4. Try to register → should detect existing device
5. ✅ Expected: "Device already registered" (matched on MAC or Android ID)

### **Test Case 3: Reinstall (MAC Fails)**
1. Uninstall vpos-billing
2. Turn off WiFi
3. Reinstall vpos-billing
4. Generate QR code (MAC will fail → fallback to Build Fingerprint)
5. Try to register → should detect existing device
6. ✅ Expected: "Device already registered" (matched on Android ID)

### **Test Case 4: Different Network Interface**
1. Register device on WiFi (MAC from WiFi adapter)
2. Switch to mobile data
3. Generate QR code again (MAC from cellular adapter)
4. Try to register → should detect existing device
5. ✅ Expected: "Device already registered" (matched on Android ID or Build)

### **Test Case 5: Factory Reset**
1. Register device normally
2. Factory reset device
3. Reinstall vpos-billing
4. Generate QR code (all IDs will be different)
5. Try to register → should allow as new device
6. ✅ Expected: New device registration (correct behavior)

---

## 🔄 Migration Strategy

### **Existing Devices (Already Registered)**

**Option A: No Migration** (Recommended)
- Existing devices continue working with current schema
- New registrations get hardwareIdentifiers
- Lookup function handles both old and new formats
- ✅ **Zero downtime, backward compatible**

**Option B: Backfill Script** (Optional)
- Create script to scan existing devices and update Firestore
- Requires devices to be online and accessible
- ⚠️ Complex, not necessary

**Recommendation**: Go with **Option A** - new code handles both formats gracefully.

---

## ⏱️ Time Estimates

| Task | Time | Priority |
|------|------|----------|
| 1. vpos-billing changes | 15 min | 🔴 Critical |
| 2. vpos-billing-offline changes | 15 min | 🟡 Important |
| 3. Cloud Functions changes | 30 min | 🔴 Critical |
| 4. Firestore indexes | 5 min | 🔴 Critical |
| 5. Flutter admin UI | 10 min | 🟢 Nice-to-have |
| 6. Testing | 30 min | 🔴 Critical |
| 7. Deployment | 15 min | 🔴 Critical |
| **TOTAL** | **2 hours** | |

---

## 📝 Deployment Order

1. ✅ **Update Cloud Functions first** (handles both old and new formats)
   - Deploy: `cd vpos-admin/functions && npm run build && firebase deploy --only functions`
   
2. ✅ **Deploy Firestore indexes**
   - Deploy: `cd vpos-admin && firebase deploy --only firestore:indexes`
   
3. ✅ **Update vpos-billing** (Flutter app)
   - Build and test locally
   - Release new APK version
   
4. ✅ **Update vpos-billing-offline** (Flutter app)
   - Build and test locally
   - Release new APK version
   
5. ✅ **Update Flutter admin UI** (optional)
   - Deploy with next admin release

---

## ✅ Benefits

1. ✅ **Device ID never changes on reinstall** (matched on any of 3 IDs)
2. ✅ **No more "device not found" errors** after reinstall
3. ✅ **Backward compatible** with existing devices
4. ✅ **More reliable** than single identifier
5. ✅ **Better debugging** (can see which ID was used for match)
6. ✅ **Future-proof** (handles edge cases like MAC randomization)

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Firestore queries slower | Low | Indexes auto-created, queries are fast |
| More storage used | Very Low | ~100 bytes per device |
| Complex lookup logic | Low | Well-tested, handles fallbacks |
| Breaking existing devices | None | Backward compatible |

---

## 🎯 Success Criteria

- ✅ Device ID stays consistent across reinstalls
- ✅ No "device not registered" errors after reinstall
- ✅ All 3 identifiers stored for new registrations
- ✅ Existing devices continue working
- ✅ Zero production downtime

---

**Ready to implement?** Reply "yes" to proceed, or let me know if you want any changes to this plan! 🚀
