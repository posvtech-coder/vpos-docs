# VPOS Admin React - Quick Reference Guide

**Generated:** May 27, 2026  
**Purpose:** Fast lookup reference for common patterns and configurations.

---

## Quick Navigation

- [Route Lookup](#route-lookup)
- [Guard Reference](#guard-reference)
- [Store Usage](#store-usage)
- [Common Hooks](#common-hooks)
- [Cloud Functions](#cloud-functions)
- [Validation Patterns](#validation-patterns)
- [Firestore Queries](#firestore-queries)

---

## Route Lookup

### Role Home Pages

```typescript
admin        → /admin/dashboard
serviceAgent → /service-agent/dashboard
shopkeeper   → /shopkeeper/dashboard
manager      → /manager/branch-selection
```

### Admin Key Routes

```typescript
/admin/dashboard                                     # Dashboard
/admin/employees                                     # Employee list
/admin/shopkeepers                                   # Shopkeeper list
/admin/shopkeepers/trial-approvals                   # Approve trial shopkeepers
/admin/shopkeepers/:shopkeeperId                     # Shopkeeper overview
/admin/shopkeepers/:shopkeeperId/branches/:branchId  # Branch detail
/admin/devices                                       # Device list
/admin/devices/register                              # Register new device
/admin/reports                                       # Reports
/admin/security-codes                                # Security codes
```

### Shopkeeper Key Routes

```typescript
/shopkeeper/onboarding                               # First-time setup (OnboardingGuard)
/shopkeeper/dashboard                                # Dashboard
/shopkeeper/branches                                 # Branch list
/shopkeeper/branches/:branchId                       # Branch detail
/shopkeeper/branches/:branchId/inventory             # Branch inventory
/shopkeeper/branches/:branchId/transactions          # Branch transactions (TrialGuard)
/shopkeeper/inventory                                # Aggregate inventory (all branches)
/shopkeeper/transactions                             # Aggregate transactions (TrialGuard)
/shopkeeper/managers                                 # Manager list (TrialGuard)
/shopkeeper/devices                                  # Device approvals (TrialGuard)
/shopkeeper/reports                                  # Reports (TrialGuard)
```

### Manager Key Routes

```typescript
/manager/branch-selection                            # Select branch
/manager/:branchId/dashboard                         # Branch dashboard
/manager/:branchId/inventory                         # Inventory
/manager/:branchId/transactions                      # Transactions
/manager/:branchId/customers                         # Customers
/manager/:branchId/team                              # Staff
/manager/:branchId/devices                           # Devices
/manager/:branchId/reports                           # Reports
```

---

## Guard Reference

### PrivateRoute

**Purpose:** Requires authentication  
**Redirects to:** `/login` if not authenticated  
**Usage:** Wraps all protected routes

```typescript
<Route element={<PrivateRoute />}>
  {/* All protected routes */}
</Route>
```

### RoleGuard

**Purpose:** Enforces role-based access  
**Redirects to:** User's role home if wrong role  
**Usage:** Wraps role-specific route groups

```typescript
<Route element={<RoleGuard allowedRoles={['admin']} />}>
  {/* Admin routes */}
</Route>

<Route element={<RoleGuard allowedRoles={['shopkeeper']} />}>
  {/* Shopkeeper routes */}
</Route>
```

### GuestRoute

**Purpose:** Prevents authenticated users from accessing login  
**Redirects to:** User's role home if already logged in  
**Usage:** Wraps `/login` route

```typescript
<Route element={<GuestRoute />}>
  <Route path="/login" element={<LoginScreen />} />
</Route>
```

### TrialGuard

**Purpose:** Blocks trial shopkeepers from premium features  
**Redirects to:** `/shopkeeper/branches/:branchId` or `/shopkeeper/dashboard`  
**Blocked Features:** Transactions, Reports, Customers, Devices, Managers, Bulk Ops  
**Usage:** Wraps restricted shopkeeper routes

```typescript
<Route element={<TrialGuard />}>
  <Route path="transactions" element={<TransactionsScreen />} />
  <Route path="reports" element={<ReportsScreen />} />
  <Route path="managers" element={<ManagersListScreen />} />
  {/* ... other restricted routes */}
</Route>
```

### OnboardingGuard

**Purpose:** Protects onboarding route (only accessible if `needsOnboarding: true`)  
**Redirects to:** `/shopkeeper/dashboard` if onboarding complete  
**Usage:** Wraps `/shopkeeper/onboarding`

```typescript
<Route element={<OnboardingGuard />}>
  <Route path="/shopkeeper/onboarding" element={<ShopkeeperOnboarding />} />
</Route>
```

---

## Store Usage

### useAuthStore

**Location:** `src/store/useAuthStore.ts`

#### Get Current User

```typescript
import { useAuthStore } from '@/store/useAuthStore';

const { user, loading } = useAuthStore();

// user: { uid, email, role, parentShopkeeperId?, branchIds?, claims }
```

#### Login

```typescript
const { login } = useAuthStore();

await login(email, password, rememberMe);
```

#### Logout

```typescript
const { logout } = useAuthStore();

await logout();
```

#### Refresh Token

```typescript
const { refreshToken } = useAuthStore();

await refreshToken(); // Runs automatically every 5 minutes
```

---

## Common Hooks

### useShopkeeperStatus

**Location:** `src/hooks/useShopkeeperStatus.ts`  
**Purpose:** Check if shopkeeper is in trial mode + get limits

```typescript
import { useShopkeeperStatus } from '@/hooks/useShopkeeperStatus';

const { isInTrial, limits, features, status, loading } = useShopkeeperStatus();

if (isInTrial) {
  // Show trial restrictions
}

const canAddCategory = categories.length < limits.categories; // 2 for trial
const canAddProduct = products.length < limits.inventoryItems; // 4 for trial
```

**Trial Limits:**

```typescript
{
  categories: 2,
  inventoryItems: 4,
  branches: 1,
  managers: 0,
  bulkOperations: false,
}
```

### useFCM

**Location:** `src/hooks/useFCM.ts`  
**Purpose:** Handle Firebase Cloud Messaging tokens

```typescript
import { useFCM } from '@/hooks/useFCM';

// In App.tsx
useFCM(user?.uid);
```

**Effect:** Requests notification permission, stores FCM token in Firestore, listens for foreground messages.

---

## Cloud Functions

**Location:** `src/services/functions.ts`

### Common Patterns

#### Call a Cloud Function

```typescript
import { createShopkeeperAccount } from '@/services/functions';

try {
  const result = await createShopkeeperAccount({
    displayName: 'John Doe',
    email: 'john@example.com',
    phoneNumber: '9876543210',
    // ... other fields
  });
  
  toast.success('Shopkeeper created successfully');
} catch (error: any) {
  toast.error(error.message || 'Operation failed');
}
```

#### With React Query (Mutations)

```typescript
import { useMutation } from '@tanstack/react-query';
import { toggleUserAuth } from '@/services/functions';

const toggleAuthMutation = useMutation({
  mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
    return toggleUserAuth({ userId: id, action: enabled ? 'activate' : 'deactivate' });
  },
  onSuccess: () => toast.success('Status updated'),
  onError: (err: Error) => toast.error(err.message),
});

// Usage
toggleAuthMutation.mutate({ id: userId, enabled: true });
```

### Key Functions

```typescript
// Authentication
loginWithEmailPassword({ email, password })
checkPhoneInAuth({ phoneNumber })

// Email Validation
validateEmail({ email })

// User Management
createServiceAgent({ email, displayName, phoneNumber, ... })
updateServiceAgentStatus({ uid, isActive })
deleteServiceAgent({ uid })
toggleUserAuth({ userId, action: 'activate' | 'deactivate' })

// Shopkeeper Management
createShopkeeperAccount({ displayName, email, phoneNumber, address, ... })
updateShopkeeperProfile({ shopkeeperId, displayName, email, ... })
approveTrialShopkeeper({ shopkeeperId })
scheduleShopkeeperDeletion({ shopkeeperId, cooldownDays? })
```

---

## Validation Patterns

**Location:** `src/utils/validationUtils.ts`

### Zod Schemas

```typescript
import {
  emailSchema,
  indianMobileSchema,
  indianPhoneSchema,
  aadhaarSchema,
  pincodeSchema,
  gstSchema,
  nameSchema,
} from '@/utils/validationUtils';

const schema = z.object({
  email: emailSchema('Invalid email'),
  phone: indianMobileSchema('Invalid mobile number'),
  alternativePhone: optionalIndianMobileSchema('Invalid phone'),
  aadhaar: aadhaarSchema('Aadhaar must be 12 digits'),
  pincode: pincodeSchema('Pincode must be 6 digits'),
  gst: gstSchema('Invalid GST format'),
  name: nameSchema(2, 'Name must be at least 2 characters'),
});
```

### Form Setup

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: 'onBlur', // Validate on blur (recommended)
});

const handleSubmit = async (data: FormData) => {
  // Data is validated and typed
};

return (
  <form onSubmit={form.handleSubmit(handleSubmit)}>
    <input {...form.register('email')} />
    {form.formState.errors.email && (
      <p className="text-red-600">{form.formState.errors.email.message}</p>
    )}
  </form>
);
```

### Input Restrictions

```typescript
import { phoneInputProps, pincodeInputProps } from '@/utils/validationUtils';

<input
  {...phoneInputProps}
  {...form.register('phoneNumber')}
/>
// type="tel", maxLength=10, inputMode="numeric"

<input
  {...pincodeInputProps}
  {...form.register('pincode')}
/>
// type="text", maxLength=6, inputMode="numeric"
```

---

## Firestore Queries

**Location:** Direct queries in screen components

### Real-Time Listener (onSnapshot)

```typescript
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';

useEffect(() => {
  const q = query(
    collection(db, 'shopkeepers'),
    where('isActive', '==', true),
    orderBy('displayName', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setShopkeepers(data);
  });

  return () => unsubscribe();
}, []);
```

### One-Time Fetch (getDocs)

```typescript
import { getDocs } from 'firebase/firestore';

const snapshot = await getDocs(collection(db, 'shopkeepers'));
const shopkeepers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

### Single Document

```typescript
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

// One-time fetch
const docSnap = await getDoc(doc(db, 'shopkeepers', shopkeeperId));
if (docSnap.exists()) {
  const data = docSnap.data();
}

// Real-time listener
const unsubscribe = onSnapshot(doc(db, 'shopkeepers', shopkeeperId), (docSnap) => {
  if (docSnap.exists()) {
    setShopkeeper({ id: docSnap.id, ...docSnap.data() });
  }
});
```

### Subcollection

```typescript
const branchesRef = collection(db, `shopkeepers/${shopkeeperId}/branches`);
const snapshot = await getDocs(branchesRef);
const branches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

### Update Document

```typescript
import { doc, updateDoc } from 'firebase/firestore';

await updateDoc(doc(db, 'shopkeepers', shopkeeperId), {
  displayName: 'New Name',
  isActive: true,
});
```

### Batch Write

```typescript
import { writeBatch, doc } from 'firebase/firestore';

const batch = writeBatch(db);
batch.set(doc(db, 'shopkeepers', shopkeeperId), shopkeeperData);
batch.set(doc(db, `shopkeepers/${shopkeeperId}/branches`, branchId), branchData);
await batch.commit();
```

---

## Common Patterns

### Loading State

```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      // Load data
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, []);

if (loading) {
  return <LoadingSpinner />;
}
```

### Error Handling

```typescript
try {
  await someOperation();
  toast.success('Operation successful');
  navigate('/success-page');
} catch (error: any) {
  console.error('Operation failed:', error);
  toast.error(error.message || 'Operation failed');
}
```

### Conditional Rendering (Role-Based)

```typescript
const { user } = useAuthStore();

{user?.role === 'admin' && (
  <button onClick={handleDelete}>Delete</button>
)}
```

### Conditional Rendering (Trial-Based)

```typescript
const { isInTrial } = useShopkeeperStatus();

{isInTrial && (
  <div className="bg-yellow-50 p-4 rounded-lg">
    <p>This feature is not available during trial.</p>
  </div>
)}

{!isInTrial && (
  <button onClick={handleBulkImport}>Bulk Import</button>
)}
```

### Navigation

```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Simple navigation
navigate('/shopkeeper/branches');

// With state
navigate('/shopkeeper/dashboard', { 
  state: { fromOnboarding: true },
  replace: true 
});

// Go back
navigate(-1);
```

### URL Parameters

```typescript
import { useParams } from 'react-router-dom';

const { branchId, productId } = useParams<{ branchId: string; productId: string }>();
```

---

## Environment Variables

```bash
# Firebase Config
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_FIREBASE_DATABASE_URL=...

# Cloud Functions Region
VITE_FUNCTIONS_REGION=asia-south1

# FCM (Firebase Cloud Messaging)
VITE_FIREBASE_VAPID_KEY=...

# Emulator (dev only)
VITE_USE_EMULATOR=false

# Phone Auth Test Mode (dev only)
VITE_PHONE_AUTH_TEST_MODE=false
```

---

## File Paths Reference

```typescript
// Guards
'@/guards'                          // src/guards/index.ts

// Stores
'@/store/useAuthStore'              // src/store/useAuthStore.ts

// Hooks
'@/hooks/useShopkeeperStatus'       // src/hooks/useShopkeeperStatus.ts
'@/hooks/useFCM'                    // src/hooks/useFCM.ts

// Services
'@/services/firebase'               // src/services/firebase.ts
'@/services/functions'              // src/services/functions.ts

// Utils
'@/utils/validationUtils'           // src/utils/validationUtils.ts

// Models
'@/models'                          // src/models/index.ts

// Components
'@/components/shared/ConfirmDialog' // src/components/shared/ConfirmDialog.tsx
```

---

## Quick Troubleshooting

### Guard Issues

**Problem:** User can access routes they shouldn't  
**Solution:** Check `RoleGuard` `allowedRoles` prop and Firebase custom claims (`role` field)

**Problem:** Trial shopkeeper can access restricted features  
**Solution:** Wrap routes with `TrialGuard`, check `accountStatus` field in Firestore

### Auth Issues

**Problem:** User stuck on loading spinner  
**Solution:** Check Firebase auth listener in `App.tsx`, verify `initAuth()` is called

**Problem:** Custom claims not updating  
**Solution:** Call `refreshToken()` or wait 5 minutes for auto-refresh

### Firestore Issues

**Problem:** Real-time updates not working  
**Solution:** Ensure using `onSnapshot` (not `getDocs`), check unsubscribe in cleanup

**Problem:** Permission denied errors  
**Solution:** Check Firestore Security Rules, verify user has correct role claim

---

**END OF QUICK REFERENCE**

For detailed information, see [VPOS_ADMIN_REACT_ARCHITECTURE_DOCUMENTATION.md](./VPOS_ADMIN_REACT_ARCHITECTURE_DOCUMENTATION.md)
