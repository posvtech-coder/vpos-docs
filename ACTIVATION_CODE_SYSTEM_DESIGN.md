# Activation Code System Design

**Date:** May 24, 2026  
**Status:** 🚧 IN PROGRESS  
**Purpose:** Two-layer security for vpos-billing-offline app

---

## 🎯 Goals

1. **Device Activation:** One-time 6-digit code required on first app open
2. **Cloud Upgrade Protection:** Activation code + shopkeeper claim verification before data upload
3. **Prevent Abuse:** Trial accounts cannot upload data, only approved shopkeepers

---

## 🗄️ Firestore Schema

### **Collection: `securityCodes`**

```typescript
securityCodes/{codeId}/
  code: "123456"                     // 6-digit random string
  createdAt: Timestamp               // When code was generated
  createdBy: "admin_or_agent_uid"    // Who generated it
  createdByRole: "admin" | "serviceAgent"
  createdByName: "John Doe"          // Display name for tracking
  isActive: true                     // Can be deactivated
  usageCount: 0                      // How many times used (optional)
  lastUsedAt: Timestamp | null       // Last usage timestamp
  expiresAt: Timestamp | null        // Optional expiry (30 days?)
```

**Security Rules:**

```javascript
match /securityCodes/{codeId} {
  // Read: Admin and Service Agents only
  allow read: if hasRole('admin') || hasRole('serviceAgent');
  
  // Create: Admin and Service Agents only
  allow create: if (hasRole('admin') || hasRole('serviceAgent'))
                && request.resource.data.createdBy == request.auth.uid
                && request.resource.data.code is string
                && request.resource.data.code.size() == 6;
  
  // Update: Admin only (to deactivate codes)
  allow update: if hasRole('admin');
  
  // Delete: Admin only
  allow delete: if hasRole('admin');
}
```

---

## 🔧 Implementation Components

### **1. Code Generation (vpos-admin Flutter)**

**File:** `vpos-admin/lib/features/security/screens/security_codes_screen.dart`

**Features:**

- ✅ Button: "Generate Activation Code"
- ✅ Display active codes in a list (show code, created date, usage count)
- ✅ Copy code to clipboard
- ✅ Deactivate code option (admin only)
- ✅ Auto-cleanup: Keep only last 20 codes active

**Logic:**

```dart
Future<String> generateActivationCode() async {
  // Generate 6-digit random code
  final code = Random().nextInt(900000) + 100000; // 100000-999999
  
  // Check if code already exists
  final existing = await FirebaseFirestore.instance
      .collection('securityCodes')
      .where('code', isEqualTo: code.toString())
      .where('isActive', isEqualTo: true)
      .get();
  
  if (existing.docs.isNotEmpty) {
    return generateActivationCode(); // Retry if duplicate
  }
  
  // Create code document
  await FirebaseFirestore.instance.collection('securityCodes').add({
    'code': code.toString(),
    'createdAt': FieldValue.serverTimestamp(),
    'createdBy': FirebaseAuth.instance.currentUser!.uid,
    'createdByRole': currentUserRole, // 'admin' or 'serviceAgent'
    'createdByName': currentUserDisplayName,
    'isActive': true,
    'usageCount': 0,
    'lastUsedAt': null,
    'expiresAt': null, // Or Timestamp.fromDate(DateTime.now().add(Duration(days: 30)))
  });
  
  return code.toString();
}
```

---

### **2. Code Generation (vpos-admin-react)**

**File:** `vpos-admin-react/src/screens/admin/SecurityCodesScreen.tsx`

**Features:**

- ✅ Button: "Generate New Code"
- ✅ Table showing active codes (code, created by, created date, usage count)
- ✅ Copy to clipboard button
- ✅ Deactivate button (admin only)
- ✅ Toast notification on generate: "Code generated: 123456"

**Logic:**

```typescript
const generateActivationCode = async () => {
  const code = Math.floor(Math.random() * 900000) + 100000; // 100000-999999
  
  // Check if exists
  const existingQuery = await getDocs(query(
    collection(db, 'securityCodes'),
    where('code', '==', code.toString()),
    where('isActive', '==', true)
  ));
  
  if (!existingQuery.empty) {
    return generateActivationCode(); // Retry
  }
  
  // Create document
  await addDoc(collection(db, 'securityCodes'), {
    code: code.toString(),
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser!.uid,
    createdByRole: userRole, // from auth context
    createdByName: auth.currentUser!.displayName || 'Unknown',
    isActive: true,
    usageCount: 0,
    lastUsedAt: null,
    expiresAt: null,
  });
  
  toast.success(`Code generated: ${code}`);
  return code.toString();
};
```

---

### **3. Device Activation Screen (vpos-billing-offline)**

**File:** `vpos-billing-offline/lib/features/activation/screens/device_activation_screen.dart`

**Flow:**

1. Check `SharedPreferences` for `isDeviceActivated` flag
2. If `false`, show activation screen (full-screen, cannot skip)
3. User enters 6-digit code
4. Validate against Firestore `securityCodes` collection
5. If valid and active:
   - Set `isDeviceActivated = true` in SharedPreferences
   - Update `usageCount` and `lastUsedAt` in Firestore
   - Navigate to normal app (main screen)

**UI Design:**

```dart
Scaffold(
  body: SafeArea(
    child: Padding(
      padding: EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Logo/Icon
          Icon(Icons.security, size: 80, color: AppColors.brandNavy),
          SizedBox(height: 24),
          
          // Title
          Text(
            'Device Activation Required',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 12),
          
          // Message
          Text(
            'Please contact our support team to get your activation code.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, color: Colors.grey[600]),
          ),
          SizedBox(height: 32),
          
          // Code Input (6-digit OTP style)
          PinCodeTextField(
            length: 6,
            onCompleted: _verifyActivationCode,
            // ... styling
          ),
          
          SizedBox(height: 24),
          
          // Verify Button
          ElevatedButton(
            onPressed: _verifyActivationCode,
            child: Text('Activate Device'),
          ),
        ],
      ),
    ),
  ),
)
```

**Logic:**

```dart
Future<void> _verifyActivationCode(String code) async {
  setState(() => _isVerifying = true);
  
  try {
    // Query Firestore for active code
    final querySnapshot = await FirebaseFirestore.instance
        .collection('securityCodes')
        .where('code', isEqualTo: code)
        .where('isActive', isEqualTo: true)
        .limit(1)
        .get();
    
    if (querySnapshot.docs.isEmpty) {
      _showError('Invalid or expired activation code');
      return;
    }
    
    final codeDoc = querySnapshot.docs.first;
    
    // Update usage tracking
    await codeDoc.reference.update({
      'usageCount': FieldValue.increment(1),
      'lastUsedAt': FieldValue.serverTimestamp(),
    });
    
    // Mark device as activated
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isDeviceActivated', true);
    await prefs.setString('activatedAt', DateTime.now().toIso8601String());
    await prefs.setString('activationCode', code);
    
    // Navigate to main app
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => MainScreen()),
    );
  } catch (e) {
    _showError('Verification failed: ${e.toString()}');
  } finally {
    setState(() => _isVerifying = false);
  }
}
```

---

### **4. Cloud Upgrade Protection (vpos-billing-offline)**

**File:** `vpos-billing-offline/lib/features/sync/screens/cloud_upgrade_activation_screen.dart`

**Flow Before Authentication:**

1. User clicks "Upgrade to Cloud" from settings
2. Show activation code screen FIRST (different from device activation)
3. Verify code against Firestore
4. If valid, navigate to phone authentication screen
5. After successful phone login, verify shopkeeper claim
6. Check `accountStatus != 'trial'` in Firestore
7. If approved shopkeeper, allow upload
8. If trial account, show error: "Trial accounts cannot upload data"

**Shopkeeper Claim Verification:**

```dart
Future<bool> verifyShopkeeperClaim(User user) async {
  // Get ID token with claims
  final idTokenResult = await user.getIdTokenResult();
  final role = idTokenResult.claims?['role'];
  
  if (role != 'shopkeeper') {
    throw Exception('Only shopkeeper accounts can upload data');
  }
  
  // Check if trial account
  final shopkeeperDoc = await FirebaseFirestore.instance
      .collection('shopkeepers')
      .doc(user.uid)
      .get();
  
  if (!shopkeeperDoc.exists) {
    throw Exception('Shopkeeper account not found');
  }
  
  final accountStatus = shopkeeperDoc.data()?['accountStatus'];
  
  if (accountStatus == 'trial') {
    throw Exception(
      'Trial accounts cannot upload data. '
      'Please contact administrator for account approval.'
    );
  }
  
  if (accountStatus != 'approved' && accountStatus != 'active') {
    throw Exception('Your account is not approved yet');
  }
  
  return true; // ✅ Valid approved shopkeeper
}
```

**Updated cloud_upgrade_screen.dart Flow:**

```dart
// After successful phone authentication (lines 180-220)
Future<void> _signInWithCredential(PhoneAuthCredential credential) async {
  try {
    // Sign in
    final userCredential = await _auth.signInWithCredential(credential);
    final user = userCredential.user;
    
    if (user == null) {
      _showError('Authentication failed');
      return;
    }
    
    // NEW: Verify shopkeeper claim
    await _verifyShopkeeperClaim(user);
    
    // Proceed with upload
    await _startCloudUpload(user.uid);
  } catch (e) {
    _showError(e.toString());
  }
}
```

---

## 🔒 Security Considerations

### **1. Code Reuse:**

- ✅ Codes CAN be reused by multiple devices (5-10 codes for multiple agents)
- ✅ Track `usageCount` to detect potential abuse
- ✅ Admin can deactivate codes if suspicious activity

### **2. Code Expiry:**

- ⚠️ Optional: Add `expiresAt` field (e.g., 30 days after creation)
- ⚠️ Auto-deactivate expired codes via scheduled Cloud Function

### **3. Rate Limiting:**

- ⚠️ Implement rate limiting on verification attempts (max 5 attempts per minute per device)
- ⚠️ Use Firestore rules or Cloud Functions

### **4. Audit Trail:**

- ✅ `createdBy`, `createdByName` for accountability
- ✅ `usageCount`, `lastUsedAt` for tracking
- ⚠️ Consider adding `usageHistory` subcollection for detailed logs

---

## 📱 User Experience Flow

### **New Device Setup:**

```
1. Install vpos-billing-offline APK
2. Open app → See activation screen
3. Call support team
4. Support generates code (123456)
5. Enter code in app
6. ✅ Device activated - normal app loads
```

### **Cloud Upgrade:**

```
1. Go to Settings → "Upgrade to Cloud"
2. See activation code screen (can be skipped if recently verified?)
3. Enter code OR use cached code from device activation
4. See phone authentication screen
5. Enter phone + OTP
6. System verifies:
   - ✅ Custom claim: role == 'shopkeeper'
   - ✅ Firestore: accountStatus == 'approved' (NOT 'trial')
7. ✅ Start data upload to cloud
```

---

## 🧪 Testing Checklist

### **Admin/Service Agent:**

- [ ] Generate activation code
- [ ] View list of active codes
- [ ] Copy code to clipboard
- [ ] Deactivate a code
- [ ] See usage count update

### **vpos-billing-offline Device:**

- [ ] First launch → activation screen shows
- [ ] Enter invalid code → error message
- [ ] Enter valid code → device activated, main screen loads
- [ ] Restart app → NO activation screen (already activated)
- [ ] Clear app data → activation screen shows again

### **Cloud Upgrade:**

- [ ] Click "Upgrade to Cloud" → activation screen shows
- [ ] Enter invalid code → error
- [ ] Enter valid code → phone auth screen
- [ ] Login with trial account → error: "Trial accounts cannot upload"
- [ ] Login with approved shopkeeper → upload starts ✅

---

## 🚀 Deployment Steps

1. Create `SecurityCodesScreen` in vpos-admin Flutter
2. Create `SecurityCodesScreen` in vpos-admin-react
3. Create `DeviceActivationScreen` in vpos-billing-offline
4. Create `CloudUpgradeActivationScreen` in vpos-billing-offline
5. Update `cloud_upgrade_screen.dart` with claim verification
6. Update Firestore security rules for `securityCodes` collection
7. Test all flows end-to-end
8. Deploy to production

---

**Status:** 📋 Design complete, ready for implementation  
**Next:** Start with Firestore rules → Admin screens → Offline activation
