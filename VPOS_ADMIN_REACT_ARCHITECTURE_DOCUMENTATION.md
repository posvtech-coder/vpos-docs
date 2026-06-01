# VPOS Admin React - Comprehensive Architecture Documentation

**Generated:** May 27, 2026  
**Purpose:** Complete developer reference for vpos-admin-react application structure, routing, guards, state management, and user flows.

---

## Table of Contents

1. [Route Structure](#1-route-structure)
2. [Navigation Patterns](#2-navigation-patterns)
3. [Auth Guards](#3-auth-guards)
4. [State Management](#4-state-management)
5. [Data Fetching Patterns](#5-data-fetching-patterns)
6. [Form Validation Patterns](#6-form-validation-patterns)
7. [Key Screen Flows](#7-key-screen-flows)
8. [Conditional Rendering](#8-conditional-rendering)
9. [API & Firebase Integration](#9-api--firebase-integration)
10. [Code Organization](#10-code-organization)

---

## 1. Route Structure

### 1.1 Route Architecture Overview

All routes defined in `src/App.tsx` using React Router v6+ with lazy-loaded components for code splitting. Root-level guards wrap role-specific route groups.

```
/                       → RootRedirect (smart redirect to role home or /login)
/login                  → LoginScreen (GuestRoute guard)

/admin/*                → RoleGuard(['admin']) → AdminLayout
/service-agent/*        → RoleGuard(['serviceAgent']) → ServiceAgentLayout
/shopkeeper/*           → RoleGuard(['shopkeeper']) → ShopkeeperLayout
/shopkeeper/onboarding  → OnboardingGuard (outside layout, special flow)
/manager/*              → RoleGuard(['manager']) → ManagerLayout
```

### 1.2 Full Route Tree by Role

#### **Admin Routes** (`/admin/*`)

```
/admin/
  ├─ dashboard                               AdminDashboard
  ├─ employees
  │   ├─ (list)                              EmployeesScreen
  │   ├─ create                              CreateEmployeeScreen
  │   ├─ :employeeId                         EmployeeDetailScreen
  │   └─ :employeeId/edit                    EditEmployeeScreen
  ├─ shopkeepers
  │   ├─ (list)                              ShopkeepersScreen
  │   ├─ create                              CreateShopkeeperScreen
  │   ├─ trial-approvals                     ApproveTrialShopkeepersScreen
  │   ├─ :shopkeeperId                       AdminShopkeeperOverviewScreen
  │   ├─ :shopkeeperId/edit                  EditShopkeeperScreen
  │   ├─ :shopkeeperId/details               AdminShopkeeperDetailsScreen
  │   ├─ :shopkeeperId/branches              AdminShopkeeperBranchesScreen
  │   ├─ :shopkeeperId/branches/:branchId    AdminBranchInfoScreen
  │   └─ :shopkeeperId/branches/:branchId/devices  AdminBranchDevicesParamScreen
  ├─ admins                                  AdminsScreen
  ├─ devices
  │   ├─ (list)                              DevicesScreen
  │   ├─ scan                                ScanDeviceQRScreen
  │   ├─ register                            RegisterDeviceScreen
  │   ├─ :deviceId                           SharedDeviceDetailAdminScreen
  │   └─ :deviceId/assign                    AssignDeviceScreen
  ├─ reports                                 AdminReportsScreen
  ├─ profile                                 ProfileScreen
  └─ security-codes                          SecurityCodesScreen
```

#### **Service Agent Routes** (`/service-agent/*`)

```
/service-agent/
  ├─ dashboard                               ServiceAgentDashboard
  ├─ shopkeepers
  │   ├─ (list)                              ServiceAgentShopkeepersScreen
  │   ├─ create                              CreateShopkeeperScreen (shared)
  │   ├─ trial-approvals                     ApproveTrialShopkeepersScreen (shared)
  │   ├─ :shopkeeperId                       SAShopkeeperOverviewScreen
  │   ├─ :shopkeeperId/edit                  EditShopkeeperScreen (shared)
  │   ├─ :shopkeeperId/details               SAShopkeeperDetailsScreen
  │   ├─ :shopkeeperId/branches              SAShopkeeperBranchesScreen
  │   ├─ :shopkeeperId/branches/:branchId    SABranchInfoScreen
  │   └─ :shopkeeperId/branches/:branchId/devices  SABranchDevicesParamScreen
  ├─ devices
  │   ├─ (list)                              DevicesScreen (shared)
  │   ├─ scan                                ScanDeviceQRScreen (shared)
  │   ├─ register                            RegisterDeviceScreen (shared)
  │   ├─ :deviceId                           SharedDeviceDetailSAScreen
  │   └─ :deviceId/assign                    AssignDeviceScreen (shared)
  ├─ profile                                 ProfileScreen (shared)
  └─ security-codes                          SecurityCodesScreen (shared)
```

#### **Shopkeeper Routes** (`/shopkeeper/*`)

```
/shopkeeper/
  ├─ onboarding                              ShopkeeperOnboarding (OnboardingGuard, outside layout)
  ├─ dashboard                               ShopkeeperDashboard
  ├─ branches
  │   ├─ (list)                              BranchesListScreen
  │   ├─ create                              CreateBranchScreen
  │   ├─ :branchId                           BranchDetailScreen
  │   ├─ :branchId/edit                      EditBranchScreen
  │   ├─ :branchId/staff                     StaffManagementScreen
  │   ├─ :branchId/inventory
  │   │   ├─ (list)                          ShopkeeperBranchInventoryScreen
  │   │   ├─ add                             AddProductScreen
  │   │   ├─ edit/:productId                 EditProductScreen
  │   │   ├─ bulk-stock                      ShopkeeperBulkStockUpdateRoute (TrialGuard)
  │   │   ├─ bulk-price                      ShopkeeperBulkPriceUpdateRoute (TrialGuard)
  │   │   └─ bulk-import                     ShopkeeperBulkImportRoute (TrialGuard)
  │   ├─ :branchId/transactions              ShopkeeperBranchTransactionsScreen (TrialGuard)
  │   ├─ :branchId/transactions/:transactionId  TransactionDetailScreen (TrialGuard)
  │   ├─ :branchId/reports                   ShopkeeperBranchReportsScreen (TrialGuard)
  │   ├─ :branchId/customers                 ShopkeeperBranchCustomersScreen (TrialGuard)
  │   ├─ :branchId/customers/:phone          CustomerTransactionsScreen (TrialGuard)
  │   ├─ :branchId/customers/:phone/transactions/:transactionId  TransactionDetailScreen (TrialGuard)
  │   └─ :branchId/devices                   ShopkeeperBranchDevicesScreen (TrialGuard)
  ├─ managers
  │   ├─ (list)                              ManagersListScreen (TrialGuard)
  │   ├─ create                              CreateManagerScreen (TrialGuard)
  │   ├─ :managerId                          ManagerDetailScreen (TrialGuard)
  │   └─ :managerId/edit                     EditManagerScreen (TrialGuard)
  ├─ inventory
  │   ├─ (list, all branches)                InventoryScreen (NOT restricted)
  │   ├─ add                                 AddProductScreen (NOT restricted)
  │   └─ edit/:productId                     EditProductScreen (NOT restricted)
  ├─ transactions                            TransactionsScreen (TrialGuard)
  ├─ transactions/:transactionId             TransactionDetailScreen (TrialGuard)
  ├─ devices                                 DeviceApprovalsScreen (TrialGuard)
  ├─ devices/all                             DeviceManagementScreen (TrialGuard)
  ├─ reports                                 ShopkeeperReportsScreen (TrialGuard)
  └─ profile                                 ShopkeeperProfileScreen
```

**Key Pattern:** Trial shopkeepers can create branches and manage inventory (categories + items), but **cannot** access transactions, reports, customers, devices, managers, or bulk operations until approved.

#### **Manager Routes** (`/manager/*`)

```
/manager/
  ├─ branch-selection                        BranchSelectionScreen
  └─ :branchId/
      ├─ dashboard                           ManagerDashboard
      ├─ inventory
      │   ├─ (list)                          ManagerInventoryScreen
      │   ├─ add                             ManagerAddProductScreen
      │   ├─ edit/:productId                 ManagerEditProductScreen
      │   ├─ bulk-stock                      ManagerBulkStockUpdateRoute
      │   ├─ bulk-price                      ManagerBulkPriceUpdateRoute
      │   └─ bulk-import                     ManagerBulkImportRoute
      ├─ team                                ManagerTeamScreen
      ├─ reports                             ManagerReportsScreen
      ├─ transactions                        ManagerTransactionsScreen
      ├─ transactions/:transactionId         TransactionDetailScreen
      ├─ customers                           ManagerCustomersScreen
      ├─ customers/:phone                    ManagerCustomerTransactionsScreen
      ├─ customers/:phone/transactions/:transactionId  TransactionDetailScreen
      ├─ devices                             ManagerDevicesScreen
      └─ profile                             ManagerProfileScreen
```

**Key Pattern:** Managers must select a branch first. All routes (except profile) are scoped to `/:branchId/*`. Legacy routes without branchId redirect to branch selection.

---

## 2. Navigation Patterns

### 2.1 Role-Based Home Pages

**Canonical home for each role** (defined in `RoleGuard.tsx`):

```typescript
export const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  serviceAgent: '/service-agent/dashboard',
  shopkeeper: '/shopkeeper/dashboard',
  manager: '/manager/branch-selection',
};
```

### 2.2 Smart Redirects

#### Root Redirect (`/` or `/*`)

```typescript
function RootRedirect() {
  const { user, loading } = useAuthStore();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  const home = ROLE_HOME[user.role] ?? '/login';
  return <Navigate to={home} replace />;
}
```

**Logic:**
- Loading → spinner
- Not authenticated → `/login`
- Authenticated → user's role home
- Unknown role → `/login` (failsafe)

### 2.3 Guard-Based Redirects

#### Wrong Role Access

If a user tries to access another role's route (e.g., shopkeeper navigating to `/admin/dashboard`):

1. `RoleGuard` checks `allowedRoles`
2. Shows toast: "Access denied. Redirecting to your dashboard."
3. Redirects to `ROLE_HOME[user.role]`

#### Trial Account Restrictions

If a trial shopkeeper tries to access a restricted route (e.g., `/shopkeeper/transactions`):

1. `TrialGuard` checks `isInTrial` (from `useShopkeeperStatus` hook)
2. Shows toast: "This feature is not available during trial. Please wait for admin approval."
3. Redirects to:
   - `/shopkeeper/branches/:branchId` if `branchId` in URL
   - `/shopkeeper/dashboard` otherwise

#### Onboarding Flow

If a shopkeeper with `needsOnboarding: true` tries to access any route except `/shopkeeper/onboarding`:

1. `OnboardingGuard` fetches real-time Firestore data for security validation
2. If `needsOnboarding === true` → allow access to `/shopkeeper/onboarding`
3. If `needsOnboarding === false` → redirect to `/shopkeeper/dashboard`

### 2.4 Navigation Components

#### Admin & Service Agent

Use `AdminLayout` and `ServiceAgentLayout` with sidebar navigation (similar patterns).

#### Shopkeeper

Uses `ShopkeeperLayout` (`src/layouts/ShopkeeperLayout.tsx`):

```typescript
const navItems = [
  { to: '/shopkeeper/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/shopkeeper/branches', icon: Store, label: 'Branches' },
  { to: '/shopkeeper/managers', icon: Users, label: 'Managers' }, // TrialGuard blocks
];
```

**Mobile:** Sidebar is a slide-out drawer. Desktop: Always visible.

#### Manager

Uses `ManagerLayout` with branch-scoped navigation. After selecting a branch, all nav items prepend `/:branchId/` (e.g., `/manager/b1234/dashboard`).

---

## 3. Auth Guards

### 3.1 Guard Hierarchy

```
App
 └─ BrowserRouter
     └─ Routes
         ├─ GuestRoute (wraps /login)
         │   └─ Route path="/login"
         │
         └─ PrivateRoute (wraps all protected routes)
             ├─ RoleGuard(['admin'])
             │   └─ AdminLayout + admin routes
             │
             ├─ RoleGuard(['serviceAgent'])
             │   └─ ServiceAgentLayout + service agent routes
             │
             ├─ RoleGuard(['shopkeeper'])
             │   ├─ OnboardingGuard (special route)
             │   │   └─ Route path="/shopkeeper/onboarding"
             │   │
             │   └─ ShopkeeperLayout
             │       ├─ Non-restricted routes (inventory, branches, dashboard)
             │       └─ TrialGuard (wraps restricted routes)
             │           └─ Transactions, Reports, Customers, Devices, Managers, Bulk Ops
             │
             └─ RoleGuard(['manager'])
                 └─ ManagerLayout + manager routes
```

### 3.2 Guard Implementations

#### **PrivateRoute** (`src/guards/PrivateRoute.tsx`)

**Purpose:** Ensures user is authenticated before accessing any protected route.

**Logic:**

```typescript
export function PrivateRoute() {
  const { user, loading } = useAuthStore();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  
  return <Outlet />; // Render child routes
}
```

**States:**
- **Loading:** Show spinner while Firebase auth resolves
- **Not authenticated:** Redirect to `/login`
- **Authenticated:** Render child routes

---

#### **RoleGuard** (`src/guards/RoleGuard.tsx`)

**Purpose:** Protects routes based on user role. Wrong role → redirect to own home.

**Props:**
```typescript
interface RoleGuardProps {
  allowedRoles: Array<'admin' | 'serviceAgent' | 'shopkeeper' | 'manager'>;
}
```

**Logic:**

```typescript
export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  const hasAccess = allowedRoles.includes(user.role as any);

  useEffect(() => {
    if (!hasAccess) {
      const home = ROLE_HOME[user.role];
      if (home) {
        toast.error('Access denied. Redirecting to your dashboard.');
      }
    }
  }, [location.pathname, hasAccess]);

  if (!hasAccess) {
    const home = ROLE_HOME[user.role];
    if (!home) return <UnknownRoleHandler />; // Sign out + redirect to /login
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
```

**Features:**
- **Toast notification:** Shows "Access denied" message once per route change
- **Unknown role handling:** Users with no valid role are signed out
- **No render flash:** Redirects synchronously before children render

---

#### **GuestRoute** (`src/guards/GuestRoute.tsx`)

**Purpose:** Prevents authenticated users from accessing guest-only pages (e.g., `/login`).

**Logic:**

```typescript
export function GuestRoute() {
  const { user, loading, isSettingUpClaims } = useAuthStore();

  useEffect(() => {
    if (user && !ROLE_HOME[user.role] && !isSettingUpClaims) {
      // Invalid role → sign out
      signOut(auth);
      useAuthStore.setState({ user: null, firebaseUser: null, loading: false });
    }
  }, [user, isSettingUpClaims]);

  if (loading) return <LoadingSpinner />;

  if (user) {
    const home = ROLE_HOME[user.role];
    if (!home) return <Outlet />; // Will be signed out by useEffect
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
```

**States:**
- **Loading:** Show spinner
- **Authenticated + valid role:** Redirect to role home
- **Authenticated + invalid role:** Allow login screen (user will be signed out)
- **Not authenticated:** Show login screen

---

#### **TrialGuard** (`src/guards/TrialGuard.tsx`)

**Purpose:** Blocks trial shopkeepers from accessing premium features.

**Blocked Features:**
- Transactions
- Reports
- Customers
- Devices
- Managers
- Bulk operations

**Logic:**

```typescript
export function TrialGuard() {
  const { isInTrial, loading } = useShopkeeperStatus();
  const { branchId } = useParams();
  const [hasShownToast, setHasShownToast] = useState(false);

  useEffect(() => {
    if (isInTrial && !hasShownToast) {
      toast.error('This feature is not available during trial. Please wait for admin approval.');
      setHasShownToast(true);
    }
  }, [isInTrial, hasShownToast]);

  if (loading) return <LoadingSpinner />;

  if (isInTrial) {
    if (branchId) {
      return <Navigate to={`/shopkeeper/branches/${branchId}`} replace />;
    }
    return <Navigate to="/shopkeeper/dashboard" replace />;
  }

  return <Outlet />;
}
```

**Data Source:** `useShopkeeperStatus` hook queries Firestore `shopkeepers/{uid}` document for `accountStatus` field.

**Trial Detection:**
```typescript
const isInTrial = status?.isSelfRegistered && status?.accountStatus === 'trial';
```

---

#### **OnboardingGuard** (`src/guards/OnboardingGuard.tsx`)

**Purpose:** Protects `/shopkeeper/onboarding` route. Only accessible if `needsOnboarding: true`.

**Security:**
- Fetches **real-time Firestore data** to validate `needsOnboarding` flag
- Prevents URL manipulation
- Redirects completed users to dashboard

**Logic:**

```typescript
export function OnboardingGuard() {
  const { user } = useAuthStore();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.uid) return;

      try {
        const shopkeeperDoc = await getDoc(doc(db, 'shopkeepers', user.uid));
        if (!shopkeeperDoc.exists()) {
          setNeedsOnboarding(true); // Allow access if document doesn't exist
          return;
        }

        const data = shopkeeperDoc.data();
        setNeedsOnboarding(data?.needsOnboarding ?? false);
      } catch (error) {
        console.error('OnboardingGuard: Failed to check onboarding status:', error);
        setNeedsOnboarding(true); // Allow access on error (prevent blocking)
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user?.uid]);

  if (loading) return <LoadingSpinner />;

  if (needsOnboarding === false) {
    return <Navigate to="/shopkeeper/dashboard" replace />;
  }

  return <Outlet />;
}
```

**States:**
- **Loading:** Show spinner
- **needsOnboarding === false:** Redirect to dashboard
- **needsOnboarding === true:** Allow access to onboarding

---

## 4. State Management

### 4.1 Zustand Store Architecture

**Single global store:** `useAuthStore` (`src/store/useAuthStore.ts`)

#### **Store Schema**

```typescript
interface AppUser {
  uid: string;
  email: string | null;
  role: string; // 'admin' | 'serviceAgent' | 'shopkeeper' | 'manager'
  parentShopkeeperId?: string; // For managers: their shopkeeper's UID
  branchIds?: string[]; // For managers: assigned branch IDs
  claims: Record<string, unknown>; // Full custom claims object
}

interface AuthStore {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  error: string | null;
  isSettingUpClaims: boolean; // Prevent logout during new user setup
  
  // Actions
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}
```

### 4.2 Auth State Management

#### **Initialization** (`App.tsx`)

```typescript
useEffect(() => {
  const unsubscribe = initAuth();
  return () => unsubscribe();
}, []);
```

#### **Auth Listener** (`initAuth` function)

```typescript
export function initAuth(): () => void {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      // User logged in
      const tokenResult = await fbUser.getIdTokenResult(true);
      const role = String(tokenResult.claims['role'] ?? '');
      const parentShopkeeperId = tokenResult.claims['parentShopkeeperId'] as string | undefined;
      
      // Load branchIds for managers
      let branchIds: string[] | undefined;
      if (role === 'manager' && parentShopkeeperId) {
        const managerDoc = await getDoc(
          doc(db, 'shopkeepers', parentShopkeeperId, 'managers', fbUser.uid)
        );
        
        if (managerDoc.exists()) {
          const data = managerDoc.data();
          if (data.branchIds && Array.isArray(data.branchIds)) {
            branchIds = data.branchIds as string[];
          } else if (data.branches && Array.isArray(data.branches)) {
            branchIds = data.branches.map((b: any) => b.id || b.branchId).filter(Boolean);
          }
        }
      }
      
      useAuthStore.setState({
        firebaseUser: fbUser,
        user: { uid: fbUser.uid, email: fbUser.email, role, parentShopkeeperId, branchIds, claims: tokenResult.claims },
        loading: false,
      });
      
      startTokenRefresh(); // Every 5 minutes
    } else {
      // User logged out
      stopTokenRefresh();
      useAuthStore.setState({ user: null, firebaseUser: null, loading: false });
    }
  });
}
```

**Key Features:**
- **Real-time listener:** Firebase `onAuthStateChanged` updates state on login/logout
- **Custom claims extraction:** Role and parentShopkeeperId from ID token
- **Manager branchIds loading:** Fetches from Firestore subcollection
- **Token refresh:** Periodic refresh every 5 minutes (mirrors Flutter `Timer.periodic`)

### 4.3 Login Flow

```typescript
login: async (email: string, password: string, remember: boolean) => {
  set({ loading: true, error: null });
  
  // Set persistence (session vs local storage)
  await setPersistence(
    auth,
    remember ? browserLocalPersistence : browserSessionPersistence
  );
  
  // Sign in
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const tokenResult = await cred.user.getIdTokenResult(true);
  
  const role = String(tokenResult.claims['role'] ?? '');
  const parentShopkeeperId = tokenResult.claims['parentShopkeeperId'] as string | undefined;
  
  // Load branchIds for managers
  let branchIds: string[] | undefined;
  if (role === 'manager' && parentShopkeeperId) {
    const managerDoc = await getDoc(
      doc(db, 'shopkeepers', parentShopkeeperId, 'managers', cred.user.uid)
    );
    
    if (managerDoc.exists()) {
      const data = managerDoc.data();
      if (data.branchIds) branchIds = data.branchIds;
      else if (data.branches) branchIds = data.branches.map((b: any) => b.id || b.branchId).filter(Boolean);
    }
  }
  
  set({
    firebaseUser: cred.user,
    user: { uid: cred.user.uid, email: cred.user.email, role, parentShopkeeperId, branchIds, claims: tokenResult.claims },
    loading: false,
  });
  
  startTokenRefresh();
}
```

**Session Persistence:**
- **Remember me = true:** `browserLocalPersistence` (survives browser restart)
- **Remember me = false:** `browserSessionPersistence` (cleared on tab close)

### 4.4 Token Refresh

```typescript
refreshToken: async () => {
  const fbUser = get().firebaseUser;
  if (!fbUser) return;
  
  const tokenResult = await fbUser.getIdTokenResult(true); // Force refresh
  const role = String(tokenResult.claims['role'] ?? '');
  const parentShopkeeperId = tokenResult.claims['parentShopkeeperId'] as string | undefined;
  
  set((state) =>
    state.user
      ? {
          user: {
            ...state.user,
            role,
            parentShopkeeperId,
            claims: tokenResult.claims,
          },
        }
      : {}
  );
}

// Interval: 5 minutes (mirrors Flutter Timer.periodic)
let refreshInterval: ReturnType<typeof setInterval> | null = null;

function startTokenRefresh() {
  stopTokenRefresh();
  refreshInterval = setInterval(() => {
    useAuthStore.getState().refreshToken();
  }, 5 * 60 * 1000);
}
```

**Purpose:** Keeps custom claims fresh (e.g., role changes, parentShopkeeperId updates).

### 4.5 Logout Flow

```typescript
logout: async () => {
  set({ loading: true, error: null });
  stopTokenRefresh();
  await firebaseSignOut(auth);
  set({ user: null, firebaseUser: null, loading: false });
}
```

**Side Effects:**
- Stops token refresh interval
- Clears Firebase session
- Clears Zustand state
- Guards redirect to `/login`

---

## 5. Data Fetching Patterns

### 5.1 Overview

**Primary Pattern:** Direct Firestore queries with `onSnapshot` for real-time updates.

**React Query Usage:** Limited to Cloud Functions calls (mutations for write operations).

### 5.2 Firestore Real-Time Queries

#### **Pattern 1: List Screens (Admin/Service Agent)**

Example: `ShopkeepersListScreen` (`src/screens/shared/shopkeepers/ShopkeepersListScreen.tsx`)

```typescript
useEffect(() => {
  setLoading(true);
  
  const q = firestoreQuery(collection(db, 'shopkeepers'));
  const unsubscribe = onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const list: ShopkeeperListItem[] = [];
      snapshot.forEach((docSnap) => {
        const parsed = ShopkeeperListSchema.safeParse({ ...docSnap.data(), id: docSnap.id });
        if (parsed.success) list.push(parsed.data);
      });
      setShopkeepers(list);
      setLoading(false);
    },
    (error) => {
      setError('Failed to load shopkeepers. Please try again.');
      setLoading(false);
    }
  );

  return () => unsubscribe();
}, []);
```

**Features:**
- **Real-time updates:** Changes reflect immediately
- **Zod validation:** Ensures type safety with runtime checks
- **Error handling:** Sets error state on failure
- **Cleanup:** Unsubscribes on unmount

#### **Pattern 2: Nested Real-Time Queries**

Example: Branch counts per shopkeeper

```typescript
useEffect(() => {
  if (shopkeepers.length === 0) return;

  const unsubscribers: (() => void)[] = [];

  shopkeepers.forEach((sk) => {
    const branchesQuery = firestoreQuery(
      collection(db, `shopkeepers/${sk.id}/branches`)
    );
    
    const unsub = onSnapshot(branchesQuery, (snapshot) => {
      setBranchCounts((prev) => ({ ...prev, [sk.id]: snapshot.size }));
    });

    unsubscribers.push(unsub);
  });

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}, [shopkeepers]);
```

**Purpose:** Dynamically load related data (e.g., branch counts) for each list item.

#### **Pattern 3: One-Time Fetch**

Example: `InventoryScreen` (`src/screens/shopkeeper/InventoryScreen.tsx`)

```typescript
const loadInventory = async () => {
  if (!user?.uid) return;

  try {
    setLoading(true);

    // Load branches
    const branchesRef = collection(db, `shopkeepers/${user.uid}/branches`);
    const branchesSnapshot = await getDocs(branchesRef);
    const branchesData = branchesSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().branchName,
    }));
    setBranches(branchesData);

    // Load inventory from all branches
    const allProducts: Product[] = [];
    for (const branch of branchesData) {
      const inventoryRef = collection(
        db,
        `shopkeepers/${user.uid}/branches/${branch.id}/inventory`
      );
      const inventorySnapshot = await getDocs(inventoryRef);

      inventorySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        allProducts.push({
          id: doc.id,
          branchId: branch.id,
          branchName: branch.name,
          name: data.name || 'Unnamed Product',
          // ... other fields
        });
      });
    }

    setProducts(allProducts);
  } catch (error) {
    toast.error('Failed to load inventory');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadInventory();
}, [user?.uid]);
```

**Use Case:** Aggregate views where real-time updates are not critical.

### 5.3 React Query (Cloud Functions)

**Pattern:** Used exclusively for Cloud Functions calls (mutations for write operations).

#### **Example: Toggle User Auth (Admin)**

```typescript
import { useMutation } from '@tanstack/react-query';
import { toggleUserAuth } from '@/services/functions';

const toggleAuthMutation = useMutation({
  mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
    return toggleUserAuth({ userId: id, action: enabled ? 'activate' : 'deactivate' });
  },
  onSuccess: (_, variables) => {
    toast.success(`User ${variables.enabled ? 'activated' : 'deactivated'} successfully`);
  },
  onError: (err: Error) => {
    toast.error(`Failed to update status: ${err.message}`);
  },
});

// Usage
const handleToggle = (userId: string, currentStatus: boolean) => {
  toggleAuthMutation.mutate({ id: userId, enabled: !currentStatus });
};
```

**Benefits:**
- **Optimistic updates:** Can update UI before server response
- **Error handling:** Centralized error management
- **Loading states:** Built-in `isLoading` flag
- **Retry logic:** Automatic retries on failure

### 5.4 Custom Hooks

#### **useShopkeeperStatus** (`src/hooks/useShopkeeperStatus.ts`)

**Purpose:** Checks if shopkeeper is in trial mode and provides limits/features.

```typescript
export function useShopkeeperStatus() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<ShopkeeperStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || user.role !== 'shopkeeper') {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'shopkeepers', user.uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          setStatus(null);
          setLoading(false);
          return;
        }

        const data = snapshot.data();
        
        const shopkeeperStatus: ShopkeeperStatus = {
          isSelfRegistered: data.isSelfRegistered ?? false,
          accountStatus: data.accountStatus ?? 'active',
          needsOnboarding: data.needsOnboarding ?? false,
          approvedBy: data.approvedBy ?? null,
          approvedAt: data.approvedAt ? new Date(data.approvedAt.seconds * 1000) : null,
          limits: data.limits ?? (data.isSelfRegistered ? DEFAULT_TRIAL_LIMITS : DEFAULT_APPROVED_LIMITS),
          features: data.features ?? (data.isSelfRegistered ? DEFAULT_TRIAL_FEATURES : DEFAULT_APPROVED_FEATURES),
        };

        setStatus(shopkeeperStatus);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.role]);

  const isInTrial = status?.isSelfRegistered && status?.accountStatus === 'trial';
  
  return {
    status,
    loading,
    isInTrial,
    isPendingApproval: isInTrial,
    isApproved: status?.accountStatus === 'approved' || status?.accountStatus === 'active',
    limits: status?.limits ?? DEFAULT_TRIAL_LIMITS,
    features: status?.features ?? DEFAULT_TRIAL_FEATURES,
  };
}
```

**Trial Limits:**
```typescript
const DEFAULT_TRIAL_LIMITS = {
  categories: 2,
  inventoryItems: 4,
  branches: 1,
  managers: 0,
  bulkOperations: false,
};
```

**Usage:**
```typescript
const { isInTrial, limits } = useShopkeeperStatus();

if (isInTrial) {
  // Disable premium features
}
```

#### **useFCM** (`src/hooks/useFCM.ts`)

**Purpose:** Firebase Cloud Messaging token management.

```typescript
export function useFCM(uid: string | null | undefined) {
  useEffect(() => {
    if (!uid) return;

    async function setupFCM() {
      const supported = await isSupported();
      if (!supported) return;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });

      // Store token in Firestore
      await setDoc(
        doc(db, `users/${uid}/fcm_tokens`, 'web'),
        {
          token,
          platform: 'web',
          updatedAt: serverTimestamp(),
          userAgent: navigator.userAgent,
        },
        { merge: true }
      );

      // Listen for foreground messages
      const unsubscribe = onMessage(messaging, (payload) => {
        toast(payload.notification?.title ?? 'VPOS Notification', {
          description: payload.notification?.body ?? '',
        });
      });

      return unsubscribe;
    }

    let cleanup: (() => void) | undefined;
    setupFCM().then((unsub) => {
      cleanup = unsub;
    });

    return () => cleanup?.();
  }, [uid]);
}
```

**Integrated in:** `App.tsx` after auth is established.

---

## 6. Form Validation Patterns

### 6.1 Zod + react-hook-form Integration

**Standard Pattern:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { emailSchema, indianMobileSchema, pincodeSchema } from '@/utils/validationUtils';

const profileSchema = z.object({
  email: emailSchema('Invalid email address'),
  alternativePhone: indianMobileSchema('Invalid phone number').optional().or(z.literal('')),
  address1: z.string().min(5, 'Address required'),
  pincode: pincodeSchema('Pincode must be 6 digits'),
});

type ProfileForm = z.infer<typeof profileSchema>;

function MyForm() {
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur', // Validate on blur (better UX)
  });

  const handleSubmit = async (data: ProfileForm) => {
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
}
```

### 6.2 Validation Utilities

**Location:** `src/utils/validationUtils.ts`

#### **Email Schema**

```typescript
export const emailSchema = (message = 'Invalid email address') =>
  z
    .string()
    .min(1, 'Email is required')
    .transform(stripAllSpaces) // Removes ALL whitespace
    .transform((s) => s.toLowerCase())
    .pipe(z.string().email(message));
```

**Transformations:**
1. Strip all spaces (no spaces allowed in emails)
2. Convert to lowercase
3. Validate email format

#### **Indian Mobile Schema**

```typescript
export const indianMobileSchema = (message = 'Enter a valid 10-digit Indian mobile number') =>
  z
    .string()
    .trim()
    .transform(stripAllSpaces)
    .transform((s) => s.replace(/\D/g, '')) // Remove all non-digits
    .refine((s) => s.length === 10, { message: 'Phone must be 10 digits' })
    .refine((s) => /^[6-9]/.test(s), { message });
```

**Rules:**
- 10 digits
- Starts with 6-9 (valid Indian mobile)
- Strips all non-digit characters

#### **Indian Phone Schema (Mobile + Landline)**

```typescript
export const indianPhoneSchema = (message = 'Enter a valid Indian phone number') =>
  z
    .string()
    .trim()
    .transform(stripAllSpaces)
    .transform((s) => s.replace(/\D/g, ''))
    .refine(
      (s) => s.length === 10 || s.length === 11, // 10: mobile, 11: landline with STD code
      { message }
    );
```

**Use Case:** Branch/store phone numbers where landlines are common.

#### **Aadhaar Schema**

```typescript
export const aadhaarSchema = (message = 'Aadhaar ID must be 12 digits') =>
  z
    .string()
    .trim()
    .transform(stripAllSpaces)
    .transform((s) => s.replace(/\D/g, ''))
    .refine((s) => s === '' || s.length === 12, { message })
    .optional()
    .or(z.literal(''));
```

#### **Pincode Schema**

```typescript
export const pincodeSchema = (message = 'Pincode must be 6 digits') =>
  z
    .string()
    .trim()
    .transform(stripAllSpaces)
    .transform((s) => s.replace(/\D/g, ''))
    .refine((s) => s.length === 6, { message });
```

#### **GST Schema**

```typescript
export const gstSchema = (message = 'Invalid GST number format') =>
  z
    .string()
    .trim()
    .transform(stripAllSpaces)
    .transform((s) => s.toUpperCase())
    .pipe(
      z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/, message)
    )
    .optional()
    .or(z.literal(''));
```

**Format:** `22AAAAA1234A1Z5`

### 6.3 Form Modes

```typescript
export const FORM_MODES = {
  BLUR: 'onBlur', // Validate on blur (recommended)
  CHANGE: 'onChange', // Validate on every keystroke
  SUBMIT: 'onSubmit', // Validate only on submit
  TOUCH: 'onTouched', // Validate on touch
} as const;
```

**Recommended:** `onBlur` for better UX (validates when user leaves field).

### 6.4 Input Restrictions

```typescript
// Phone input restrictions (10 digits only)
export const phoneInputProps = {
  type: 'tel' as const,
  placeholder: '9876543210',
  maxLength: 10,
  inputMode: 'numeric' as const,
};

// Pincode input restrictions (6 digits only)
export const pincodeInputProps = {
  type: 'text' as const,
  placeholder: '600001',
  maxLength: 6,
  inputMode: 'numeric' as const,
};
```

**Usage:**

```typescript
<input
  {...phoneInputProps}
  {...form.register('phoneNumber')}
  className="..."
/>
```

---

## 7. Key Screen Flows

### 7.1 Shopkeeper Onboarding Flow

**Route:** `/shopkeeper/onboarding` (protected by `OnboardingGuard`)

**Trigger:** `needsOnboarding: true` in Firestore `shopkeepers/{uid}` document.

#### **Step 1: Profile Setup**

`ShopkeeperOnboarding.tsx` renders a single-page form:

1. **Business Information**
   - GST Number (optional)

2. **Contact Details**
   - Email (required)
   - Alternative Phone (optional)

3. **Business Address**
   - Address Line 1, Address Line 2 (optional)
   - Landmark (optional)
   - Town, District, State
   - Pincode

#### **Step 2: Submission**

```typescript
const handleSubmit = async (data: ProfileForm) => {
  await updateDoc(doc(db, 'shopkeepers', user.uid), {
    gstNumber: data.gstNumber || null,
    email: data.email,
    alternativePhone: data.alternativePhone || null,
    address: {
      address1: data.address1,
      address2: data.address2 || null,
      landmark: data.landmark || null,
      town: data.town,
      district: data.district,
      state: data.state,
      pincode: data.pincode,
    },
    needsOnboarding: false, // Clear flag
    profileCompletedAt: new Date().toISOString(),
  });

  toast.success('Profile setup complete! Welcome to VPOS 🎉');
  navigate('/shopkeeper/dashboard', { 
    state: { fromOnboarding: true, isNewUser: true },
    replace: true 
  });
};
```

**Result:** User is redirected to `/shopkeeper/dashboard` with `needsOnboarding: false`. `OnboardingGuard` will now block access to `/shopkeeper/onboarding`.

### 7.2 Device Registration Flow (Admin/Service Agent)

**Route:** `/admin/devices/register` or `/service-agent/devices/register`

#### **Step 1: Scan QR Code**

Route: `/admin/devices/scan` or `/service-agent/devices/scan`

- Uses device camera or file upload to scan QR code
- QR code contains device ID (e.g., `DEV-12345`)
- Redirects to `/admin/devices/register?deviceId=DEV-12345`

#### **Step 2: Register Device**

`RegisterDeviceScreen.tsx`:

1. **Device Details**
   - Device ID (pre-filled from QR scan)
   - Device Name
   - Device Type (POS, Scanner, Printer, etc.)

2. **Submission**
   - Calls Cloud Function `registerDevice({ deviceId, deviceName, deviceType })`
   - Creates Firestore document in `devices/{deviceId}`
   - Redirects to `/admin/devices/{deviceId}`

#### **Step 3: Assign Device**

Route: `/admin/devices/{deviceId}/assign`

`AssignDeviceScreen.tsx`:

1. **Select Shopkeeper**
   - Dropdown list of all shopkeepers
   - Search by name, email, phone

2. **Select Branch** (if multi-branch shopkeeper)
   - Dropdown list of shopkeeper's branches

3. **Submission**
   - Calls Cloud Function `assignDevice({ deviceId, shopkeeperId, branchId })`
   - Updates device document with assignment
   - Updates branch document with device reference
   - Sends notification to shopkeeper
   - Redirects to `/admin/devices/{deviceId}`

### 7.3 Inventory Management Flow (Shopkeeper)

#### **Aggregate Inventory View**

Route: `/shopkeeper/inventory`

`InventoryScreen.tsx`:

- Loads all products from all branches
- Displays aggregated view with branch grouping
- Filters: search by name/SKU, branch dropdown
- Stats: total products, low stock alerts, total inventory value

**Key:** Trial shopkeepers can access this view (inventory management is not restricted).

#### **Branch-Scoped Inventory**

Route: `/shopkeeper/branches/:branchId/inventory`

`ShopkeeperBranchInventoryScreen.tsx`:

- Shows only products for selected branch
- Categories + items view
- Quick actions: add product, bulk operations (trial-restricted)

#### **Add Product**

Route: `/shopkeeper/inventory/add` or `/shopkeeper/branches/:branchId/inventory/add`

`AddProductScreen.tsx`:

1. **Product Details**
   - Name, SKU
   - Category (dropdown, or create new)
   - Price, Stock, Min Stock
   - Unit (pcs, kg, litre, etc.)

2. **Branch Selection** (if from aggregate view)
   - Dropdown list of branches

3. **Image Upload** (optional)
   - Firebase Storage upload
   - Thumbnail generation

4. **Submission**
   - Creates Firestore document in `shopkeepers/{uid}/branches/{branchId}/inventory/{productId}`
   - Updates category document
   - Redirects back to inventory list

#### **Edit Product**

Route: `/shopkeeper/inventory/edit/:productId` or `/shopkeeper/branches/:branchId/inventory/edit/:productId`

`EditProductScreen.tsx`:

- Same form as Add Product
- Pre-filled with existing data
- Updates Firestore document on save

#### **Bulk Operations** (Trial-Restricted)

Routes:
- `/shopkeeper/branches/:branchId/inventory/bulk-stock`
- `/shopkeeper/branches/:branchId/inventory/bulk-price`
- `/shopkeeper/branches/:branchId/inventory/bulk-import`

**Guard:** `TrialGuard` blocks access for trial accounts.

### 7.4 Transaction Viewing Flow (Shopkeeper, Manager)

**Restricted:** Trial shopkeepers cannot access transactions.

#### **Aggregate Transactions**

Route: `/shopkeeper/transactions`

`TransactionsScreen.tsx`:

- Loads all transactions across all branches
- Filters: date range, branch, payment method
- Export to Excel

#### **Branch-Scoped Transactions**

Route: `/shopkeeper/branches/:branchId/transactions`

`ShopkeeperBranchTransactionsScreen.tsx`:

- Shows only transactions for selected branch
- Real-time updates via `onSnapshot`

#### **Transaction Detail**

Route: `/shopkeeper/transactions/:transactionId` or `/shopkeeper/branches/:branchId/transactions/:transactionId`

`TransactionDetailScreen.tsx`:

- Full bill details
- Items purchased
- Payment method
- Customer details
- Timestamps
- Download PDF receipt

### 7.5 Approval Workflow (Admin/Service Agent)

#### **Trial Shopkeeper Approval**

Route: `/admin/shopkeepers/trial-approvals` or `/service-agent/shopkeepers/trial-approvals`

`ApproveTrialShopkeepersScreen.tsx`:

1. **List View**
   - Shows all shopkeepers with `accountStatus: 'trial'`
   - Displays: name, email, phone, registration date, branches count

2. **Approve Action**
   - Calls Cloud Function `approveTrialShopkeeper({ shopkeeperId })`
   - Updates Firestore:
     ```typescript
     {
       accountStatus: 'approved',
       approvedBy: currentUser.uid,
       approvedAt: serverTimestamp(),
       limits: DEFAULT_APPROVED_LIMITS,
       features: DEFAULT_APPROVED_FEATURES,
     }
     ```
   - Sends email notification to shopkeeper
   - Removes trial restrictions (TrialGuard now allows access)

3. **Reject Action**
   - Calls Cloud Function `rejectTrialShopkeeper({ shopkeeperId, reason })`
   - Disables account
   - Sends rejection email with reason

---

## 8. Conditional Rendering

### 8.1 Role-Based UI Elements

#### **Pattern 1: useAuthStore Hook**

```typescript
const { user } = useAuthStore();

{user?.role === 'admin' && (
  <button onClick={handleDelete}>Delete User</button>
)}
```

#### **Pattern 2: Component Props**

`ShopkeepersListScreen` accepts `canToggle` prop:

```typescript
<ShopkeepersListScreen
  routeBase="/admin/shopkeepers"
  canToggle={true} // Only admin can toggle
/>
```

Internal defense-in-depth:

```typescript
const canActuallyToggle = canToggle && user?.role === 'admin';
```

### 8.2 Trial Account Restrictions

#### **Pattern 1: useShopkeeperStatus Hook**

```typescript
const { isInTrial, limits } = useShopkeeperStatus();

{!isInTrial && (
  <NavLink to="/shopkeeper/transactions">Transactions</NavLink>
)}

{isInTrial && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <p>Transactions are not available during trial. Please wait for admin approval.</p>
  </div>
)}
```

#### **Pattern 2: Feature Limits**

```typescript
const { limits } = useShopkeeperStatus();

const canAddCategory = categories.length < limits.categories;

<button disabled={!canAddCategory}>
  Add Category
</button>

{!canAddCategory && (
  <p className="text-sm text-red-600">
    Trial accounts are limited to {limits.categories} categories.
  </p>
)}
```

### 8.3 Manager Branch Selection

Managers must select a branch before accessing any feature:

```typescript
const { user } = useAuthStore();
const { branchId } = useParams();

if (user?.role === 'manager' && !branchId) {
  return <Navigate to="/manager/branch-selection" replace />;
}
```

All manager routes (except profile) are nested under `/:branchId/*`:

```typescript
<Route path="/manager" element={<ManagerLayout />}>
  <Route path=":branchId">
    <Route path="dashboard" element={<ManagerDashboard />} />
    <Route path="inventory" element={<ManagerInventoryScreen />} />
    {/* ... other routes */}
  </Route>
</Route>
```

### 8.4 Feature Flags (Future)

**Pattern for feature flags:**

```typescript
const features = {
  bulkOperations: user?.role !== 'shopkeeper' || !isInTrial,
  advancedReports: user?.role === 'admin' || user?.role === 'shopkeeper',
  apiAccess: user?.role === 'admin',
};

{features.bulkOperations && (
  <NavLink to="/shopkeeper/inventory/bulk-import">Bulk Import</NavLink>
)}
```

---

## 9. API & Firebase Integration

### 9.1 Firebase Services Initialization

**Location:** `src/services/firebase.ts`

```typescript
// Core services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app); // Realtime Database (device presence)

// Cloud Functions (asia-south1 region)
export const functions = getFunctions(app, 'asia-south1');

// Analytics (error tracking, events)
export const analytics = getAnalytics(app);

// Performance Monitoring (network latency, custom traces)
export const perf = getPerformance(app);

// App Check (reCAPTCHA v3 provider)
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(recaptchaKey),
  isTokenAutoRefreshEnabled: true,
});
```

**Environment Variables:**

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FUNCTIONS_REGION=asia-south1
VITE_FIREBASE_VAPID_KEY=... (FCM)
```

### 9.2 Cloud Functions Service

**Location:** `src/services/functions.ts`

**Pattern:**

```typescript
export function createCallable<TRequest = unknown, TResponse = unknown>(
  functionName: string
): (data: TRequest) => Promise<TResponse> {
  const callable = httpsCallable<TRequest, TResponse>(functions, functionName);
  
  return async (data: TRequest): Promise<TResponse> => {
    try {
      const result = await callable(data);
      return result.data;
    } catch (error: any) {
      throw {
        code: error.code || 'unknown',
        message: error.message || 'An unknown error occurred',
        details: error.details,
      } as CloudFunctionError;
    }
  };
}
```

**Example Functions:**

```typescript
// Authentication
export const loginWithEmailPassword = createCallable<LoginRequest, LoginResponse>('loginWithEmailPassword');
export const checkPhoneInAuth = createCallable<CheckPhoneRequest, CheckPhoneResponse>('checkPhoneInAuth');

// User Management
export const createServiceAgent = createCallable<CreateServiceAgentRequest, CreateServiceAgentResponse>('createServiceAgent');
export const updateServiceAgentStatus = createCallable<UpdateServiceAgentStatusRequest, UpdateServiceAgentStatusResponse>('updateServiceAgentStatus');
export const deleteServiceAgent = createCallable<{ uid: string }, { success: boolean; message: string }>('deleteServiceAgent');

// Shopkeeper Management
export const createShopkeeperAccount = createCallable<CreateShopkeeperRequest, CreateShopkeeperResponse>('createShopkeeperAccount');
export const updateShopkeeperProfile = createCallable<UpdateShopkeeperRequest, { success: boolean }>('updateShopkeeperProfile');

// Email Validation (MSG91)
export const validateEmail = createCallable<ValidateEmailRequest, ValidateEmailResponse>('validateEmail');

// Shopkeeper Deletion (Admin Only)
export const scheduleShopkeeperDeletion = createCallable<ScheduleShopkeeperDeletionRequest, ScheduleShopkeeperDeletionResponse>('scheduleShopkeeperDeletion');
export const cancelScheduledShopkeeperDeletion = createCallable<CancelScheduledShopkeeperDeletionRequest, CancelScheduledShopkeeperDeletionResponse>('cancelScheduledShopkeeperDeletion');

// Toggle User Auth (Activate/Deactivate)
export const toggleUserAuth = createCallable<ToggleUserAuthRequest, ToggleUserAuthResponse>('toggleUserAuth');
```

**Usage Pattern:**

```typescript
import { createShopkeeperAccount } from '@/services/functions';

const handleCreate = async (data: CreateShopkeeperRequest) => {
  try {
    const result = await createShopkeeperAccount(data);
    toast.success('Shopkeeper created successfully');
    navigate(`/admin/shopkeepers/${result.shopkeeper.id}`);
  } catch (error: any) {
    toast.error(error.message || 'Failed to create shopkeeper');
  }
};
```

### 9.3 Firestore Query Patterns

#### **Direct Collection Query**

```typescript
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';

const q = query(
  collection(db, 'shopkeepers'),
  where('isActive', '==', true),
  orderBy('displayName', 'asc')
);

const snapshot = await getDocs(q);
const shopkeepers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

#### **Real-Time Listener**

```typescript
import { onSnapshot } from 'firebase/firestore';

const unsubscribe = onSnapshot(
  doc(db, 'shopkeepers', shopkeeperId),
  (snapshot) => {
    if (snapshot.exists()) {
      setShopkeeper({ id: snapshot.id, ...snapshot.data() });
    }
  }
);

return () => unsubscribe();
```

#### **Subcollection Query**

```typescript
const branchesRef = collection(db, `shopkeepers/${shopkeeperId}/branches`);
const branchesSnapshot = await getDocs(branchesRef);
const branches = branchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

#### **Batch Write**

```typescript
import { writeBatch, doc } from 'firebase/firestore';

const batch = writeBatch(db);

batch.set(doc(db, 'shopkeepers', shopkeeperId), shopkeeperData);
batch.set(doc(db, `shopkeepers/${shopkeeperId}/branches`, branchId), branchData);

await batch.commit();
```

### 9.4 RTDB (Realtime Database) Usage

**Use Case:** Device presence tracking (online/offline status).

```typescript
import { ref, onValue, set, serverTimestamp } from 'firebase/database';
import { rtdb } from '@/services/firebase';

// Set device online
const deviceRef = ref(rtdb, `devices/${deviceId}/presence`);
await set(deviceRef, {
  online: true,
  lastSeen: serverTimestamp(),
});

// Listen for presence changes
const unsubscribe = onValue(deviceRef, (snapshot) => {
  const presence = snapshot.val();
  setDeviceOnline(presence?.online ?? false);
});
```

### 9.5 Storage Uploads

**Pattern:** Product image uploads

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';

const uploadImage = async (file: File, productId: string): Promise<string> => {
  const storageRef = ref(storage, `products/${productId}/${file.name}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};
```

### 9.6 FCM (Firebase Cloud Messaging)

**Location:** `src/hooks/useFCM.ts`

**Flow:**

1. Request notification permission
2. Get FCM token
3. Store token in Firestore `users/{uid}/fcm_tokens/web`
4. Listen for foreground messages
5. Show toast notifications

**Service Worker:** `public/firebase-messaging-sw.js` handles background notifications.

---

## 10. Code Organization

### 10.1 Directory Structure

```
src/
├── App.tsx                        # Main app component, routing
├── main.tsx                       # Entry point
├── index.css                      # Global styles (Tailwind)
├── vite-env.d.ts                  # Vite type declarations
│
├── assets/                        # Static assets (images, fonts)
│
├── components/                    # Reusable UI components
│   ├── shared/                    # Shared components (ConfirmDialog, ErrorBoundary, etc.)
│   └── ...                        # Other components
│
├── guards/                        # Route guards
│   ├── PrivateRoute.tsx
│   ├── RoleGuard.tsx
│   ├── GuestRoute.tsx
│   ├── TrialGuard.tsx
│   ├── OnboardingGuard.tsx
│   └── index.ts                   # Central export
│
├── hooks/                         # Custom React hooks
│   ├── useFCM.ts
│   ├── useShopkeeperStatus.ts
│   ├── useDevicePresence.ts
│   ├── useEmailValidation.ts
│   ├── useResolveUser.ts
│   ├── useSyncDevices.tsx
│   ├── useUnsavedChangesWarning.ts
│   ├── useUserDisplayName.ts
│   └── useWebFeatures.ts
│
├── layouts/                       # Layout components
│   ├── ShopkeeperLayout.tsx
│   └── ManagerLayout.tsx
│
├── models/                        # Data models with Zod validation
│   ├── user.model.ts
│   ├── permissions.model.ts
│   ├── shopkeeper.model.ts
│   ├── branch.model.ts
│   ├── gst-slab.model.ts
│   ├── bill.model.ts
│   ├── device.model.ts
│   └── index.ts                   # Central export
│
├── screens/                       # Screen components (pages)
│   ├── auth/                      # Authentication screens
│   │   └── LoginScreen.tsx
│   │
│   ├── admin/                     # Admin-specific screens
│   │   ├── AdminLayout.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── EmployeesScreen.tsx
│   │   ├── ShopkeepersScreen.tsx
│   │   ├── AdminsScreen.tsx
│   │   ├── DevicesScreen.tsx
│   │   ├── ReportsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── SecurityCodesScreen.tsx
│   │   └── ...
│   │
│   ├── service-agent/             # Service agent-specific screens
│   │   ├── ServiceAgentLayout.tsx
│   │   ├── ServiceAgentDashboard.tsx
│   │   ├── ServiceAgentShopkeepersScreen.tsx
│   │   └── ...
│   │
│   ├── shopkeeper/                # Shopkeeper-specific screens
│   │   ├── ShopkeeperOnboarding.tsx
│   │   ├── ShopkeeperDashboard.tsx
│   │   ├── InventoryScreen.tsx
│   │   ├── AddProductScreen.tsx
│   │   ├── EditProductScreen.tsx
│   │   ├── TransactionsScreen.tsx
│   │   ├── DeviceApprovalsScreen.tsx
│   │   ├── ReportsScreen.tsx
│   │   ├── ShopkeeperProfileScreen.tsx
│   │   ├── ManagerDetailScreen.tsx
│   │   ├── ShopkeeperBulkOperationRoutes.tsx
│   │   ├── branches/              # Branch management screens
│   │   │   ├── BranchesListScreen.tsx
│   │   │   ├── CreateBranchScreen.tsx
│   │   │   ├── EditBranchScreen.tsx
│   │   │   ├── BranchDetailScreen.tsx
│   │   │   ├── StaffManagementScreen.tsx
│   │   │   ├── ShopkeeperBranchInventoryScreen.tsx
│   │   │   ├── ShopkeeperBranchTransactionsScreen.tsx
│   │   │   ├── ShopkeeperBranchReportsScreen.tsx
│   │   │   ├── ShopkeeperBranchCustomersScreen.tsx
│   │   │   └── ShopkeeperBranchDevicesScreen.tsx
│   │   └── managers/              # Manager management screens
│   │       ├── ManagersListScreen.tsx
│   │       ├── CreateManagerScreen.tsx
│   │       └── EditManagerScreen.tsx
│   │
│   ├── manager/                   # Manager-specific screens
│   │   ├── ManagerLayout.tsx
│   │   ├── ManagerDashboard.tsx
│   │   ├── BranchSelectionScreen.tsx
│   │   ├── ManagerInventoryScreen.tsx
│   │   ├── ManagerReportsScreen.tsx
│   │   ├── ManagerTeamScreen.tsx
│   │   ├── ManagerTransactionsScreen.tsx
│   │   ├── ManagerDevicesScreen.tsx
│   │   ├── ManagerCustomersScreen.tsx
│   │   ├── ManagerCustomerTransactionsScreen.tsx
│   │   ├── ManagerProfileScreen.tsx
│   │   └── ManagerBulkOperationRoutes.tsx
│   │
│   └── shared/                    # Shared screens used by multiple roles
│       ├── shopkeepers/           # Shopkeeper management (admin/SA)
│       │   └── ShopkeepersListScreen.tsx
│       ├── shopkeeper-detail/     # Shopkeeper drill-down (admin/SA)
│       │   ├── ShopkeeperOverviewScreen.tsx
│       │   ├── ShopkeeperDetailsFullScreen.tsx
│       │   ├── ShopkeeperBranchesFullScreen.tsx
│       │   └── BranchInfoScreen.tsx
│       ├── devices/               # Device management (admin/SA/shopkeeper)
│       │   ├── DeviceDetailScreen.tsx
│       │   ├── RegisterDeviceScreen.tsx
│       │   ├── ScanDeviceQRScreen.tsx
│       │   ├── AssignDeviceScreen.tsx
│       │   └── BranchDevicesParamScreen.tsx
│       ├── transactions/          # Transaction detail (all roles)
│       │   └── TransactionDetailScreen.tsx
│       ├── customers/             # Customer views
│       │   └── CustomerTransactionsScreen.tsx
│       ├── inventory/             # Inventory components (shared logic)
│       └── reports/               # Report components
│
├── services/                      # External service integrations
│   ├── firebase.ts                # Firebase initialization
│   ├── functions.ts               # Cloud Functions client (95+ functions)
│   ├── functions-index.ts         # Additional functions (part 2)
│   ├── functions-part2.ts         # Additional functions (part 3)
│   ├── functions-part3.ts         # Additional functions (part 4)
│   ├── userLookup.ts              # User lookup utilities
│   └── excel.ts                   # Excel export utilities
│
├── store/                         # Zustand state management
│   └── useAuthStore.ts            # Global auth state
│
├── theme/                         # Theme configuration (colors, fonts)
│
└── utils/                         # Utility functions
    ├── validationUtils.ts         # Zod validation schemas
    └── ...                        # Other utilities
```

### 10.2 Naming Conventions

#### **Components**

- **PascalCase:** `ShopkeepersListScreen`, `PrivateRoute`
- **Suffix:** `Screen` for page components, `Layout` for layouts, `Guard` for guards

#### **Hooks**

- **camelCase:** `useAuthStore`, `useShopkeeperStatus`
- **Prefix:** `use` for all custom hooks

#### **Services**

- **camelCase:** `firebase.ts`, `functions.ts`
- **Descriptive names:** `createCallable`, `initAuth`

#### **Models**

- **camelCase:** `user.model.ts`, `shopkeeper.model.ts`
- **Suffix:** `.model.ts`

#### **Routes**

- **kebab-case:** `/shopkeeper/branches/:branchId/inventory`
- **Plural for lists:** `/admin/employees`, `/shopkeeper/branches`
- **Singular for detail:** `/admin/employees/:employeeId`, `/shopkeeper/branches/:branchId`

### 10.3 Code Splitting

**Lazy Loading:** All screens are lazy-loaded for optimal bundle size.

```typescript
const LoginScreen = lazy(() => import('./screens/auth/LoginScreen').then(m => ({ default: m.LoginScreen })));
const AdminDashboard = lazy(() => import('./screens/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ShopkeeperOnboarding = lazy(() => import('./screens/shopkeeper/ShopkeeperOnboarding').then(m => ({ default: m.ShopkeeperOnboarding })));
```

**Suspense Boundary:**

```typescript
<Suspense fallback={<PageLoader />}>
  <Routes>
    {/* ... routes */}
  </Routes>
</Suspense>
```

**Benefit:** Only load code for the current route, reducing initial bundle size.

### 10.4 Error Handling

#### **Error Boundary**

`src/components/ErrorBoundary.tsx`:

```typescript
export class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    // Log to Firebase Analytics
    if (analytics) {
      logEvent(analytics, 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Usage in App.tsx:**

```typescript
<ErrorBoundary>
  <Suspense fallback={<PageLoader />}>
    <Routes>{/* ... */}</Routes>
  </Suspense>
</ErrorBoundary>
```

#### **Global Error Logging**

`src/main.tsx`:

```typescript
// Log unhandled errors to Firebase Analytics
window.onerror = (message, source, lineno, colno, error) => {
  if (analytics) {
    logEvent(analytics, 'exception', {
      description: `${message} at ${source}:${lineno}:${colno}`,
      fatal: true,
    });
  }
};
```

---

## Summary

### **Key Architectural Patterns**

1. **Role-Based Routing:** Four distinct role sections with shared screens for common functionality.
2. **Layered Guards:** PrivateRoute → RoleGuard → TrialGuard/OnboardingGuard for fine-grained access control.
3. **Real-Time Sync:** Firestore `onSnapshot` for instant UI updates across users.
4. **Single Source of Truth:** Zustand `useAuthStore` for global auth state.
5. **Type Safety:** Zod validation for forms + Firestore data.
6. **Code Splitting:** Lazy-loaded routes for optimal performance.
7. **Progressive Enhancement:** Trial accounts have limited access, unlocked after admin approval.

### **Security Highlights**

- **Custom Claims:** Role-based access enforced at Firebase Auth + Firestore Rules level.
- **Onboarding Guard:** Real-time Firestore check prevents URL manipulation.
- **Trial Guard:** Feature restrictions enforced at route + UI level.
- **App Check:** reCAPTCHA v3 protects Cloud Functions from abuse.
- **Token Refresh:** Periodic refresh ensures claims stay fresh.

### **Developer Workflow**

1. **Add New Screen:** Create in `src/screens/{role}/`, lazy-load in `App.tsx`, add route.
2. **Add New Guard:** Create in `src/guards/`, export in `index.ts`, wrap route in `App.tsx`.
3. **Add New Hook:** Create in `src/hooks/`, use in screens.
4. **Add New Cloud Function:** Add types in `src/services/functions.ts`, use `createCallable`.
5. **Add New Validation:** Add schema in `src/utils/validationUtils.ts`, use in forms.

---

**END OF DOCUMENTATION**

Generated on **May 27, 2026** for the **vpos-admin-react** project.
