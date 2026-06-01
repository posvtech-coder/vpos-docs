# VPOS Admin React - Complete Route Tree

**Generated:** May 27, 2026  
**Purpose:** Visual hierarchical map of all application routes with guards and components.

---

## Route Tree Diagram

```
/ (BrowserRouter)
│
├─── PUBLIC ROUTES (GuestRoute)
│    └─── /login → LoginScreen
│
└─── PROTECTED ROUTES (PrivateRoute)
     │
     ├─── ADMIN ROUTES (RoleGuard: ['admin'])
     │    └─── /admin → AdminLayout
     │         ├─── / (redirect to dashboard)
     │         ├─── /dashboard → AdminDashboard
     │         │
     │         ├─── /employees → EmployeesScreen
     │         │    ├─── /create → CreateEmployeeScreen
     │         │    ├─── /:employeeId → EmployeeDetailScreen
     │         │    └─── /:employeeId/edit → EditEmployeeScreen
     │         │
     │         ├─── /shopkeepers → ShopkeepersScreen
     │         │    ├─── /create → CreateShopkeeperScreen
     │         │    ├─── /trial-approvals → ApproveTrialShopkeepersScreen
     │         │    ├─── /:shopkeeperId → AdminShopkeeperOverviewScreen
     │         │    ├─── /:shopkeeperId/edit → EditShopkeeperScreen
     │         │    ├─── /:shopkeeperId/details → AdminShopkeeperDetailsScreen
     │         │    ├─── /:shopkeeperId/branches → AdminShopkeeperBranchesScreen
     │         │    └─── /:shopkeeperId/branches/:branchId
     │         │         ├─── / → AdminBranchInfoScreen
     │         │         └─── /devices → AdminBranchDevicesParamScreen
     │         │
     │         ├─── /admins → AdminsScreen
     │         │
     │         ├─── /devices → DevicesScreen
     │         │    ├─── /scan → ScanDeviceQRScreen
     │         │    ├─── /register → RegisterDeviceScreen
     │         │    ├─── /:deviceId → SharedDeviceDetailAdminScreen
     │         │    └─── /:deviceId/assign → AssignDeviceScreen
     │         │
     │         ├─── /reports → AdminReportsScreen
     │         ├─── /profile → ProfileScreen
     │         └─── /security-codes → SecurityCodesScreen
     │
     ├─── SERVICE AGENT ROUTES (RoleGuard: ['serviceAgent'])
     │    └─── /service-agent → ServiceAgentLayout
     │         ├─── / (redirect to dashboard)
     │         ├─── /dashboard → ServiceAgentDashboard
     │         │
     │         ├─── /shopkeepers → ServiceAgentShopkeepersScreen
     │         │    ├─── /create → CreateShopkeeperScreen (shared)
     │         │    ├─── /trial-approvals → ApproveTrialShopkeepersScreen (shared)
     │         │    ├─── /:shopkeeperId → SAShopkeeperOverviewScreen
     │         │    ├─── /:shopkeeperId/edit → EditShopkeeperScreen (shared)
     │         │    ├─── /:shopkeeperId/details → SAShopkeeperDetailsScreen
     │         │    ├─── /:shopkeeperId/branches → SAShopkeeperBranchesScreen
     │         │    └─── /:shopkeeperId/branches/:branchId
     │         │         ├─── / → SABranchInfoScreen
     │         │         └─── /devices → SABranchDevicesParamScreen
     │         │
     │         ├─── /devices → DevicesScreen (shared)
     │         │    ├─── /scan → ScanDeviceQRScreen (shared)
     │         │    ├─── /register → RegisterDeviceScreen (shared)
     │         │    ├─── /:deviceId → SharedDeviceDetailSAScreen
     │         │    └─── /:deviceId/assign → AssignDeviceScreen (shared)
     │         │
     │         ├─── /profile → ProfileScreen (shared)
     │         └─── /security-codes → SecurityCodesScreen (shared)
     │
     ├─── SHOPKEEPER ROUTES (RoleGuard: ['shopkeeper'])
     │    ├─── ONBOARDING (OnboardingGuard, outside layout)
     │    │    └─── /shopkeeper/onboarding → ShopkeeperOnboarding
     │    │
     │    └─── /shopkeeper → ShopkeeperLayout
     │         ├─── / (redirect to dashboard)
     │         ├─── /dashboard → ShopkeeperDashboard
     │         │
     │         ├─── /branches → BranchesListScreen
     │         │    ├─── /create → CreateBranchScreen
     │         │    └─── /:branchId
     │         │         ├─── / → BranchDetailScreen
     │         │         ├─── /edit → EditBranchScreen
     │         │         ├─── /staff → StaffManagementScreen
     │         │         │
     │         │         ├─── /inventory → ShopkeeperBranchInventoryScreen
     │         │         │    ├─── /add → AddProductScreen
     │         │         │    ├─── /edit/:productId → EditProductScreen
     │         │         │    └─── (TrialGuard)
     │         │         │         ├─── /bulk-stock → ShopkeeperBulkStockUpdateRoute
     │         │         │         ├─── /bulk-price → ShopkeeperBulkPriceUpdateRoute
     │         │         │         └─── /bulk-import → ShopkeeperBulkImportRoute
     │         │         │
     │         │         └─── (TrialGuard)
     │         │              ├─── /transactions → ShopkeeperBranchTransactionsScreen
     │         │              │    └─── /:transactionId → TransactionDetailScreen
     │         │              ├─── /reports → ShopkeeperBranchReportsScreen
     │         │              ├─── /customers → ShopkeeperBranchCustomersScreen
     │         │              │    └─── /:phone → CustomerTransactionsScreen
     │         │              │         └─── /transactions/:transactionId → TransactionDetailScreen
     │         │              └─── /devices → ShopkeeperBranchDevicesScreen
     │         │
     │         ├─── /inventory (NOT restricted)
     │         │    ├─── / → InventoryScreen (aggregate, all branches)
     │         │    ├─── /add → AddProductScreen
     │         │    └─── /edit/:productId → EditProductScreen
     │         │
     │         └─── (TrialGuard)
     │              ├─── /managers → ManagersListScreen
     │              │    ├─── /create → CreateManagerScreen
     │              │    ├─── /:managerId → ManagerDetailScreen
     │              │    └─── /:managerId/edit → EditManagerScreen
     │              │
     │              ├─── /transactions → TransactionsScreen (aggregate, all branches)
     │              │    └─── /:transactionId → TransactionDetailScreen
     │              │
     │              ├─── /devices → DeviceApprovalsScreen
     │              ├─── /devices/all → DeviceManagementScreen
     │              │
     │              └─── /reports → ShopkeeperReportsScreen
     │
     │         └─── /profile → ShopkeeperProfileScreen (NOT restricted)
     │
     └─── MANAGER ROUTES (RoleGuard: ['manager'])
          ├─── /manager/branch-selection → BranchSelectionScreen
          │
          └─── /manager → ManagerLayout
               ├─── / (redirect to branch-selection)
               │
               └─── /:branchId (all routes require branchId)
                    ├─── /dashboard → ManagerDashboard
                    │
                    ├─── /inventory → ManagerInventoryScreen
                    │    ├─── /add → ManagerAddProductScreen
                    │    ├─── /edit/:productId → ManagerEditProductScreen
                    │    ├─── /bulk-stock → ManagerBulkStockUpdateRoute
                    │    ├─── /bulk-price → ManagerBulkPriceUpdateRoute
                    │    └─── /bulk-import → ManagerBulkImportRoute
                    │
                    ├─── /team → ManagerTeamScreen
                    │
                    ├─── /reports → ManagerReportsScreen
                    │
                    ├─── /transactions → ManagerTransactionsScreen
                    │    └─── /:transactionId → TransactionDetailScreen
                    │
                    ├─── /customers → ManagerCustomersScreen
                    │    └─── /:phone → ManagerCustomerTransactionsScreen
                    │         └─── /transactions/:transactionId → TransactionDetailScreen
                    │
                    ├─── /devices → ManagerDevicesScreen
                    │
                    └─── /profile → ManagerProfileScreen (no branchId required)
```

---

## Guard Application Summary

### PrivateRoute

- **Applied to:** All routes except `/login`
- **Purpose:** Requires authentication

### RoleGuard

- **Applied to:** Each role's route group
- **Admin:** `/admin/*`
- **Service Agent:** `/service-agent/*`
- **Shopkeeper:** `/shopkeeper/*`
- **Manager:** `/manager/*`

### GuestRoute

- **Applied to:** `/login`
- **Purpose:** Prevents authenticated users from accessing login

### TrialGuard (Shopkeeper Only)

- **Applied to:** Premium features for shopkeepers
- **Blocked Routes:**
  - `/shopkeeper/branches/:branchId/transactions`
  - `/shopkeeper/branches/:branchId/reports`
  - `/shopkeeper/branches/:branchId/customers`
  - `/shopkeeper/branches/:branchId/devices`
  - `/shopkeeper/branches/:branchId/inventory/bulk-*`
  - `/shopkeeper/transactions`
  - `/shopkeeper/reports`
  - `/shopkeeper/managers`
  - `/shopkeeper/devices`

### OnboardingGuard (Shopkeeper Only)

- **Applied to:** `/shopkeeper/onboarding`
- **Purpose:** Only accessible if `needsOnboarding: true`

---

## Shared Screens

These screens are used by multiple roles with different props:

### Admin & Service Agent Shared

```typescript
// Shopkeeper management
CreateShopkeeperScreen          # /admin/shopkeepers/create
                                # /service-agent/shopkeepers/create

EditShopkeeperScreen            # /admin/shopkeepers/:shopkeeperId/edit
                                # /service-agent/shopkeepers/:shopkeeperId/edit

ApproveTrialShopkeepersScreen   # /admin/shopkeepers/trial-approvals
                                # /service-agent/shopkeepers/trial-approvals

// Device management
DevicesScreen                   # /admin/devices
                                # /service-agent/devices

ScanDeviceQRScreen              # /admin/devices/scan
                                # /service-agent/devices/scan

RegisterDeviceScreen            # /admin/devices/register
                                # /service-agent/devices/register

AssignDeviceScreen              # /admin/devices/:deviceId/assign
                                # /service-agent/devices/:deviceId/assign

// Profile & Security
ProfileScreen                   # /admin/profile
                                # /service-agent/profile

SecurityCodesScreen             # /admin/security-codes
                                # /service-agent/security-codes
```

### All Roles Shared

```typescript
TransactionDetailScreen         # /shopkeeper/transactions/:transactionId
                                # /manager/:branchId/transactions/:transactionId
                                # (Admin/SA via shopkeeper drill-down)

CustomerTransactionsScreen      # /shopkeeper/branches/:branchId/customers/:phone
                                # /manager/:branchId/customers/:phone
```

---

## Route Parameter Patterns

### URL Parameters

```typescript
:employeeId          # Employee UID
:shopkeeperId        # Shopkeeper UID
:branchId            # Branch ID (string, e.g., "b1234")
:managerId           # Manager UID
:deviceId            # Device ID (string, e.g., "DEV-12345")
:productId           # Product ID (auto-generated Firestore ID)
:transactionId       # Transaction ID (auto-generated Firestore ID)
:phone               # Customer phone number (10 digits, e.g., "9876543210")
```

### Query Parameters

```typescript
?deviceId=DEV-12345  # Pre-fill device ID after QR scan
?from=onboarding     # Navigation context flag
```

---

## Layout Components

### AdminLayout

- **Used by:** Admin routes (`/admin/*`)
- **Features:** Sidebar navigation, top bar, logout

### ServiceAgentLayout

- **Used by:** Service Agent routes (`/service-agent/*`)
- **Features:** Sidebar navigation, top bar, logout

### ShopkeeperLayout

- **Used by:** Shopkeeper routes (`/shopkeeper/*`)
- **Features:** Sidebar navigation, mobile drawer, logout
- **Nav Items:**
  - Dashboard
  - Branches
  - Managers (TrialGuard blocks if trial)

### ManagerLayout

- **Used by:** Manager routes (`/manager/:branchId/*`)
- **Features:** Sidebar navigation, branch selector, logout
- **Nav Items:**
  - Dashboard
  - Inventory
  - Team
  - Reports
  - Transactions
  - Customers
  - Devices

---

## Route-to-Component Mapping

### Admin Routes

| Route | Component | Location |
|-------|-----------|----------|
| `/admin/dashboard` | `AdminDashboard` | `src/screens/admin/AdminDashboard.tsx` |
| `/admin/employees` | `EmployeesScreen` | `src/screens/admin/EmployeesScreen.tsx` |
| `/admin/shopkeepers` | `ShopkeepersScreen` | `src/screens/admin/ShopkeepersScreen.tsx` |
| `/admin/shopkeepers/:shopkeeperId` | `AdminShopkeeperOverviewScreen` | `src/screens/shared/shopkeeper-detail/ShopkeeperOverviewScreen.tsx` |
| `/admin/devices` | `DevicesScreen` | `src/screens/admin/DevicesScreen.tsx` |
| `/admin/reports` | `AdminReportsScreen` | `src/screens/admin/ReportsScreen.tsx` |

### Shopkeeper Routes

| Route | Component | Location |
|-------|-----------|----------|
| `/shopkeeper/onboarding` | `ShopkeeperOnboarding` | `src/screens/shopkeeper/ShopkeeperOnboarding.tsx` |
| `/shopkeeper/dashboard` | `ShopkeeperDashboard` | `src/screens/shopkeeper/ShopkeeperDashboard.tsx` |
| `/shopkeeper/branches` | `BranchesListScreen` | `src/screens/shopkeeper/branches/BranchesListScreen.tsx` |
| `/shopkeeper/branches/:branchId` | `BranchDetailScreen` | `src/screens/shopkeeper/branches/BranchDetailScreen.tsx` |
| `/shopkeeper/inventory` | `InventoryScreen` | `src/screens/shopkeeper/InventoryScreen.tsx` |
| `/shopkeeper/transactions` | `TransactionsScreen` | `src/screens/shopkeeper/TransactionsScreen.tsx` |
| `/shopkeeper/managers` | `ManagersListScreen` | `src/screens/shopkeeper/managers/ManagersListScreen.tsx` |

### Manager Routes

| Route | Component | Location |
|-------|-----------|----------|
| `/manager/branch-selection` | `BranchSelectionScreen` | `src/screens/manager/BranchSelectionScreen.tsx` |
| `/manager/:branchId/dashboard` | `ManagerDashboard` | `src/screens/manager/ManagerDashboard.tsx` |
| `/manager/:branchId/inventory` | `ManagerInventoryScreen` | `src/screens/manager/ManagerInventoryScreen.tsx` |
| `/manager/:branchId/transactions` | `ManagerTransactionsScreen` | `src/screens/manager/ManagerTransactionsScreen.tsx` |
| `/manager/:branchId/customers` | `ManagerCustomersScreen` | `src/screens/manager/ManagerCustomersScreen.tsx` |

---

## Redirect Logic

### Root Redirect (`/`)

```typescript
if (loading) return <PageLoader />;
if (!user) return <Navigate to="/login" replace />;

const home = ROLE_HOME[user.role] ?? '/login';
return <Navigate to={home} replace />;
```

### Role-Based Redirects

```typescript
// Admin accessing /shopkeeper/*
RoleGuard detects wrong role → redirects to /admin/dashboard

// Shopkeeper accessing /admin/*
RoleGuard detects wrong role → redirects to /shopkeeper/dashboard

// Manager accessing legacy routes without branchId
/manager/dashboard → redirects to /manager/branch-selection
/manager/inventory → redirects to /manager/branch-selection
```

### Trial Account Redirects

```typescript
// Trial shopkeeper accessing /shopkeeper/transactions
TrialGuard detects trial account → redirects to /shopkeeper/dashboard

// Trial shopkeeper accessing /shopkeeper/branches/:branchId/transactions
TrialGuard detects trial account → redirects to /shopkeeper/branches/:branchId
```

### Onboarding Redirects

```typescript
// Completed shopkeeper accessing /shopkeeper/onboarding
OnboardingGuard detects needsOnboarding === false → redirects to /shopkeeper/dashboard
```

---

## Navigation Flow Examples

### Example 1: Admin Managing Shopkeeper

```
1. /admin/dashboard
2. Click "Shopkeepers" → /admin/shopkeepers
3. Click shopkeeper row → /admin/shopkeepers/:shopkeeperId
4. Click "Branches" tab → /admin/shopkeepers/:shopkeeperId/branches
5. Click branch row → /admin/shopkeepers/:shopkeeperId/branches/:branchId
6. Click "Devices" → /admin/shopkeepers/:shopkeeperId/branches/:branchId/devices
```

### Example 2: Shopkeeper Onboarding

```
1. Login → OnboardingGuard redirects to /shopkeeper/onboarding
2. Complete profile → needsOnboarding set to false
3. Navigate to /shopkeeper/dashboard
4. Create first branch → /shopkeeper/branches/create
5. Redirect to /shopkeeper/branches/:branchId
6. Add products → /shopkeeper/branches/:branchId/inventory/add
```

### Example 3: Manager Daily Workflow

```
1. Login → /manager/branch-selection
2. Select branch → /manager/:branchId/dashboard
3. Check inventory → /manager/:branchId/inventory
4. View transactions → /manager/:branchId/transactions
5. Check customer → /manager/:branchId/customers/:phone
```

---

**END OF ROUTE TREE**

For detailed information, see [VPOS_ADMIN_REACT_ARCHITECTURE_DOCUMENTATION.md](./VPOS_ADMIN_REACT_ARCHITECTURE_DOCUMENTATION.md)
