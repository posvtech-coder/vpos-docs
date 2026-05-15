# VPOS — System Architecture

**Owner:** posvtech-coder
**Repositories:** 3 Flutter apps + 1 legal site + shared Cloud Functions
**Firebase Projects:** `smbs-dev-b84ad` (DEV) · `smbs-7b59e` (PROD) · Region: `asia-south1`

> ⚠️ **Workspace-only file.** This file is only visible when all repos are checked out together.
> Each repo contains its own self-contained copy in `docs/SYSTEM_ARCHITECTURE.md`:
> - [vpos-admin/docs/SYSTEM_ARCHITECTURE.md](./vpos-admin/docs/SYSTEM_ARCHITECTURE.md)
> - [vpos-billing/docs/SYSTEM_ARCHITECTURE.md](./vpos-billing/docs/SYSTEM_ARCHITECTURE.md)
> - [vpos-billing-offline/docs/SYSTEM_ARCHITECTURE.md](./vpos-billing-offline/docs/SYSTEM_ARCHITECTURE.md)

---

## Repository Map

| Repo | Purpose | Firebase Role | Branch |
|------|---------|--------------|--------|
| [`vpos-admin`](./vpos-admin/) | Web + Android admin portal — device management, user management, subscriptions, reports | **Primary** — owns all Cloud Functions + Firestore rules | `development` / `main` |
| [`vpos-billing`](./vpos-billing/) | Android POS billing device — cloud-connected, offline-first | **Consumer** — calls Cloud Functions, reads/writes Firestore via functions | `development` / `main` |
| [`vpos-billing-offline`](./vpos-billing-offline/) | Android POS — 100% offline P2P, optional cloud backup | **Minimal** — Crashlytics + Analytics only; Firestore reserved for future cloud backup | `development` / `main` |
| [`vpos-legal`](./vpos-legal/) | Privacy Policy, Terms & Conditions, Support page (static HTML) | None | independent |

---

## System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                        Firebase Cloud (asia-south1)                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Firestore              RTDB              Cloud Functions (22+)  │  │
│  │  users                 device_presence   auth, shopkeepers       │  │
│  │  shopkeepers/          device_presence   branches, managers      │  │
│  │    branches            _history          inventory, categories   │  │
│  │    managers                              billing, devices        │  │
│  │  billing_devices                         reports, permissions    │  │
│  │  bills                                   users, staff, admin     │  │
│  │  categories                                                      │  │
│  │  gst_slabs             Auth       FCM     Storage                │  │
│  │  sales_reports         Phone OTP  Push    profile images         │  │
│  │  images                Custom     FCM     inventory images       │  │
│  │  activity_log          Claims     tokens  receipts               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│           ▲                     ▲                     ▲               │
│           │ CRUD via CF         │ CF only             │ Crashlytics   │
└───────────┼─────────────────────┼─────────────────────┼───────────────┘
            │                     │                     │
   ┌────────┴────────┐   ┌────────┴────────┐   ┌───────┴──────────────┐
   │   vpos-admin    │   │  vpos-billing   │   │ vpos-billing-offline │
   │  (Web+Android)  │   │   (Android)     │   │    (Android)         │
   │                 │   │                 │   │                      │
   │  • Register     │   │  • Activate     │   │  • 100% offline      │
   │    devices      │──▶│    device QR    │   │  • P2P LAN sync      │
   │  • Assign to    │   │  • Sync inv.    │   │  • TCP/UDP over WiFi │
   │    shopkeeper   │   │  • Save bills   │   │  • mDNS discovery    │
   │  • Manage users │   │  • Print ESC/POS│   │  • Optional Firebase │
   │  • Reports      │   │  • Scales RS232 │   │    cloud backup      │
   │  • Cloud Funcs  │   │  • 5-min sync   │   │                      │
   └─────────────────┘   └─────────────────┘   └──────────────────────┘
```

---

## 1. vpos-admin — Admin Portal

**Version:** 1.0.5+13 | **Flutter SDK:** ^3.9.2

### Features
- Phone OTP authentication (Firebase Auth)
- Multi-role RBAC: Admin → Service Agent → Shopkeeper → Manager → Branch Manager
- Device registration via QR code (AES-256-CBC decrypt with `pointycastle`)
- Device assignment to shopkeeper/branch (sets billing devices live)
- Subscription plan management
- Bulk employee import (Excel via `file_picker` + `excel`)
- Real-time analytics dashboard (`fl_chart`)
- App Check (reCAPTCHA v3 web, silent Android)

### Key Paths
| Path | Purpose |
|------|---------|
| `lib/features/admin/` | Admin screens (dashboard, user mgmt, device mgmt, subscriptions) |
| `lib/features/auth/` | Phone OTP login |
| `lib/features/service_agent/` | Service agent dashboard |
| `lib/features/shopkeeper/` | Shopkeeper portal |
| `lib/shared/services/device_service.dart` | Device CRUD + assignment logic |
| `lib/shared/services/encryption_service.dart` | AES-256-CBC — **must match vpos-billing** |
| `lib/core/routes/app_router.dart` | Role-based GoRouter navigation |
| `functions/src/` | All Cloud Function source (TypeScript) |
| `functions/lib/` | Pre-built JavaScript (deployed) |
| `docs/` | Technical documentation |

### Cloud Functions Owned by vpos-admin
> **All 22+ Cloud Functions are deployed from `vpos-admin/functions/`**.  
> vpos-billing calls these — do not move or rename without updating vpos-billing.

| Category | Functions |
|----------|-----------|
| Auth | `checkPhoneInAuth` |
| Devices | `registerDevice`, `registerDeviceFromQR`, `scanDeviceQR`, `assignDevice`, `updateDeviceStatus`, `getDeviceAssignmentHistory`, `getBranchDevices`, `extendDeviceValidity` |
| Shopkeepers | `createShopkeeperAccount`, `updateShopkeeperProfile`, `getShopkeeperOrBranchDetails` |
| Branches | `getBranchDetails`, `getBranchGstConfig`, `createBranchSubcollection`, `updateBranchSubcollection`, `getMyBranchesSubcollection` |
| Managers | `createManagerSubcollection`, `getMyManagersSubcollection`, `updateManagerProfileSubcollection`, `getBranchManagers`, `getManagerBranchDetails` |
| Inventory | `getInventory`, `addInventoryItem`, `updateInventoryItem`, `deleteInventoryItem`, `bulkUpdatePrice`, `bulkUpdateStock`, `checkInventoryDuplicates`, `getItemHistory` |
| Categories | `getCategories`, `addCategory`, `updateCategory`, `deleteCategory` |
| Billing | `saveBill`, `getBill`, `getBills`, `getBillsByDateRange`, `getBranchBills`, `getBillingData`, `getBillByInvoice`, `queryBills`, `billReturn`, `returnRequest`, `fetchBranchCustomers`, `getCustomerInvoices` |
| Users | `createServiceAgent`, `updateServiceAgentStatus`, `toggleUserAuth`, `getUserAuthStatus`, `updateEmployeeProfile` |
| Staff | `getBranchStaff`, `createStaff`, `updateStaff`, `deleteStaff` |
| Permissions | `getUserPermissions`, `updateUserPermissions`, `checkUserPermission`, `getBulkUserPermissions` |
| Reports | `emailReport`, `getBranchEmailReportSettings`, `updateBranchEmailReportSettings` |
| Admin | `getCloudStatistics`, `getFunctionLogs`, `getFunctionStats` |

### Key Dependencies

```yaml
# Firebase
firebase_core: ^4.4.0
firebase_auth: ^6.4.0
cloud_firestore: ^6.3.0
firebase_database: ^12.3.0   # RTDB — device presence
cloud_functions: ^6.2.0
firebase_storage: ^13.3.0
firebase_app_check: ^0.4.3
firebase_messaging: ^16.2.0
firebase_crashlytics: ^5.2.0

# Encryption (shared standard)
pointycastle: ^4.0.0          # AES-256-CBC — must match vpos-billing

# Navigation
go_router: ^17.2.1

# Reports & Files
fl_chart: ^1.1.1
file_picker: ^10.3.10
excel: ^4.0.6
```

### Firebase Config Files
| File | Project |
|------|---------|
| `lib/core/config/firebase_options_dev.dart` | smbs-dev-b84ad |
| `lib/core/config/firebase_options_prod.dart` | smbs-7b59e |
| `android/app/src/dev/google-services.json` | smbs-dev-b84ad |
| `android/app/src/prod/google-services.json` | smbs-7b59e |
| `.firebaserc` | default=dev, prod alias |

---

## 2. vpos-billing — Cloud-Connected Billing Device

**Version:** 1.0.4+5 | **Flutter SDK:** ^3.9.2

### Features
- Employee ID + PIN login (SQLite, with Firebase fallback)
- Offline-first — bills saved to SQLite immediately
- Cloud sync every 5 minutes (`auto_sync_service.dart`) + on bill creation + on exit
- Inventory pulled from Cloud Function `getBillingData` → local encrypted storage
- Parallel carts — hold/resume multiple customers (V1, V2, V3…)
- Multi-cashier session tracking
- Hardware: Weighing scales RS-232/USB + ESC/POS thermal printers
- GST calculation with HSN codes (CGST/SGST/IGST)
- Advanced invoice numbering (multi-device collision-safe, 4-digit random suffix)
- Device activation via QR code scan → calls `scanDeviceQR` Cloud Function

### Integration Points with vpos-admin
| Integration | How it works |
|-------------|--------------|
| Device activation | Scans QR generated by admin, decrypts with AES-256-CBC, calls `scanDeviceQR` CF |
| Inventory sync | Calls `getBillingData` CF → saves to `InventoryStorageManager` |
| Bill upload | Calls `saveBill` CF → stored in Firestore `bills/` |
| Branch info | Calls `getBranchDetails` CF → flag `allowImages`, `floatingCustomers`, etc. |
| Staff sync | Calls `getBranchStaff` CF → saves to `StaffStorageManager` |
| Category sync | Calls `getCategories` CF → saves to `CategoryStorageManager` |
| GST slabs | Calls `getBranchGstConfig` CF |
| Bill history | Calls `getBills` / `getBillsByDateRange` CF |
| Reports | Calls `getBranchBills`, `emailReport` CF |
| FCM notifications | Receives push from admin via `firebase_messaging` |

### Key Paths
| Path | Purpose |
|------|---------|
| `lib/services/auto_sync_service.dart` | 5-min background sync orchestrator |
| `lib/services/billing_inventory_service.dart` | Inventory + bill Cloud Function calls |
| `lib/services/device_auth_service.dart` | Device activation QR flow |
| `lib/services/device_encryption_service.dart` | AES-256-CBC — **must match vpos-admin** |
| `lib/local_storage/managers/` | 11 encrypted file-based storage managers |
| `lib/local_storage/base_secure_storage_manager.dart` | AES-256-CBC base class for all storage |
| `lib/screens/device_activation_screen.dart` | QR scan → activate device |
| `lib/screens/product_selection_screen.dart` | Main billing UI (75/25 split) |
| `lib/screens/checkout_screen.dart` | Payment, GST, print |

### Key Dependencies

```yaml
# Firebase
firebase_core: ^4.7.0
firebase_auth: ^6.4.0
cloud_firestore: ^6.3.0
cloud_functions: ^6.2.0       # Calls vpos-admin functions, region: asia-south1
firebase_storage: ^13.3.0
firebase_database: ^12.3.0
firebase_messaging: ^16.2.0
firebase_analytics: ^12.3.0
firebase_app_check: ^0.4.3
firebase_crashlytics: ^5.2.0

# Local database
drift: ^2.32.0                 # SQLite ORM
sqlite3_flutter_libs: ^0.5.41

# Encryption (shared standard with vpos-admin)
pointycastle: ^4.0.0           # AES-256-CBC

# Network
connectivity_plus: ^7.0.0     # Online/offline detection
```

### Outstanding TODOs (from `TODO_IMPLEMENTATION_PLAN.md`)

| Priority | File | Issue |
|----------|------|-------|
| 🔴 CRITICAL | `load_hold_customer_dialog.dart` | `_holdCustomerDao` is null stub — implement with `HoldCustomersStorageManager` |
| 🟠 HIGH | `local_bills_cleanup_service.dart` | `return 0` no-op — implement cleanup using `SalesRepository` |
| 🟡 MEDIUM | `billing_inventory_service.dart:1199` | Products from CF not saved to local storage — call `InventoryStorageManager.syncFromFirebase()` |
| 🟡 MEDIUM | `billing_inventory_service.dart:1068` | Dead branch sync code — already in SharedPrefs, remove |
| 🔵 LOW | `compatibility_models.dart` | Migrate `Transaction` model to `SaleData` (10+ files) |

---

## 3. vpos-billing-offline — Offline P2P Billing Device

**Version:** 1.0.4+6 | **Flutter SDK:** >=3.9.2 <4.0.0

### Features
- 100% offline — no internet required to operate
- P2P sync over local WiFi/hotspot (TCP port 8765 + UDP mDNS discovery)
- Device roles: Manager/Host (broadcasts) vs Staff/Cashier (receives)
- mDNS device discovery (auto-find other devices on same network)
- Session approval — new devices need host approval before sync
- Hardware: Weighing scales RS-232/USB + ESC/POS thermal printers
- Device type selection on first launch: Billing Device (hardware) vs Personal Device (software only)
- GST compliance with HSN codes, slab-based inclusive/exclusive
- PDF + Excel report export (`pdf`, `excel`, `share_plus`)
- Optional Firebase cloud backup (future — architecture reserved)

### P2P Network Architecture
```
Device 1 (Host/Manager)          Device 2 (Client/Staff)
────────────────────────          ───────────────────────
Manager login                     Staff PIN login (bcrypt)
SQLite with full data             Empty SQLite initially
TCP server: port 8765             TCP client
UDP broadcast every 10s           mDNS listens → discovers host
                                  TCP connect → approval dialog
                                  → Receive full business data sync
                                  → Billing: bills sent via TCP
                                  → Host merges → UDP notify → all sync
```

### Key Paths
| Path | Purpose |
|------|---------|
| `lib/features/sync/` | Complete P2P sync engine |
| `lib/features/sync/sync_service.dart` | TCP listener + UDP broadcaster |
| `lib/features/sync/network_discovery_service.dart` | mDNS host discovery |
| `lib/features/sync/data_sync_broadcaster.dart` | Send sync events to peers |
| `lib/features/sync/sync_event_handler.dart` | Process inbound sync messages |
| `lib/features/sync/sync_data_handler.dart` | Merge remote data into local SQLite |
| `lib/features/device/` | Device type selection, setup flow |
| `lib/services/cloud/` | Optional Firebase cloud backup (future) |
| `lib/data/database/` | Drift SQLite schema |

### Firebase Role (Minimal)
- `firebase_crashlytics` — crash reporting only
- `firebase_analytics` — usage events only
- `cloud_firestore`, `firebase_auth` — **reserved for future cloud backup feature** (already imported, not actively used)
- NO Cloud Functions called — no dependency on vpos-admin functions

### Key Dependencies

```yaml
# Firebase (minimal)
firebase_core: ^4.7.0
firebase_crashlytics: ^5.2.0
firebase_analytics: ^12.3.0
firebase_app_check: ^0.4.3
cloud_firestore: ^6.3.0       # Future: cloud backup
firebase_auth: ^6.4.0         # Future: cloud backup

# Local database
drift: ^2.32.0
sqflite: ^2.4.0
sqlite3_flutter_libs: ^0.5.41

# P2P networking
network_info_plus: ^7.0.0     # WiFi IP address
multicast_dns: ^0.3.2+7       # mDNS service discovery
connectivity_plus: ^7.0.0

# Encryption
pointycastle: ^4.0.0           # AES-256-CBC (shared standard)
bcrypt: ^1.1.3                 # PIN hashing (stronger than vpos-billing)

# State management
provider: ^6.1.2
bloc: ^9.0.0

# Reports & Export
fl_chart: ^1.2.0
pdf: ^3.11.0
excel: ^4.0.6
share_plus: ^12.0.1
```

---

## 4. Shared Infrastructure

### Firebase Projects

| Environment | Project ID | Region | Android Package |
|-------------|-----------|--------|----------------|
| Development | `smbs-dev-b84ad` | `asia-south1` | `com.smbs.admin.dev` / `com.smbs.billing.dev` |
| Production | `smbs-7b59e` | `asia-south1` | `com.smbs.admin` / `com.smbs.billing` |

### Firestore Collections

| Collection | Owner | Consumers |
|------------|-------|-----------|
| `users` | vpos-admin (via CF) | vpos-admin |
| `shopkeepers` | vpos-admin (via CF) | vpos-admin, vpos-billing |
| `shopkeepers/{id}/branches` | vpos-admin (via CF) | vpos-admin, vpos-billing |
| `shopkeepers/{id}/managers/{uid}` | vpos-admin (via CF) | vpos-admin |
| `billing_devices` | vpos-admin (via CF) | vpos-billing (activation) |
| `bills` | vpos-billing (via CF) | vpos-admin (reports) |
| `categories` | vpos-admin (via CF) | vpos-billing (sync) |
| `gst_slabs` | vpos-admin (via CF) | vpos-billing (sync) |
| `sales_reports` | vpos-billing (via CF) | vpos-admin (reports) |
| `images` | vpos-admin (via CF) | vpos-billing (product images) |
| `activity_log` | vpos-admin | vpos-admin |

### RTDB Paths

| Path | Writer | Reader |
|------|--------|--------|
| `device_presence/{deviceId}` | vpos-billing (heartbeat) | vpos-admin (live status) |
| `device_presence_history/{deviceId}` | vpos-billing | vpos-admin |

### Encryption Standard (Shared Across All 3 Apps)

> ⚠️ All three apps must use the same AES-256-CBC key scheme. Changing encryption in one app will break QR code scanning and device activation.

| App | Package | Usage |
|-----|---------|-------|
| vpos-admin | `pointycastle: ^4.0.0` | QR code generation (device registration) |
| vpos-billing | `pointycastle: ^4.0.0` | QR code decryption (device activation) + local file encryption |
| vpos-billing-offline | `pointycastle: ^4.0.0` | Local file encryption (future: P2P message encryption) |

### Data Model Alignment

The following models must stay structurally compatible across vpos-billing and vpos-billing-offline (they don't sync directly, but may in future cloud backup):

| Model | vpos-billing | vpos-billing-offline |
|-------|-------------|---------------------|
| `InventoryItem` | `lib/local_storage/models/inventory_item.dart` | `lib/data/models/` |
| `SaleData` | `lib/local_storage/models/sale_data.dart` | `lib/data/models/` |
| `Category` | via CF JSON | `lib/data/models/` |
| `GstSlab` | `lib/local_storage/models/` | `lib/data/models/` |
| `StaffMember` | `lib/local_storage/models/staff_member.dart` | `lib/data/models/` |
| `PaymentMethod` | `enum` in constants | `enum` in constants |

---

## 5. Device Lifecycle (Cross-Repo Flow)

```
STEP 1 — Admin registers device (vpos-admin)
  Admin scans physical device QR (or manually enters)
  → vpos-admin decrypts QR (AES-256-CBC, pointycastle)
  → Calls CF: registerDevice({ deviceId, serialNumber })
  → Firestore: billing_devices/{deviceId} = { status: "available" }

STEP 2 — Admin assigns device (vpos-admin)
  → Calls CF: assignDevice({ deviceId, shopkeeperId, branchId })
  → Firestore: billing_devices/{deviceId}.currentAssignment = {
      shopkeeperId, branchId, assignedAt
    }
  → status: "assigned"

STEP 3 — Billing device activates (vpos-billing)
  → User opens vpos-billing for first time
  → Scans the device's own QR code (from device info)
  → Calls CF: scanDeviceQR({ encryptedPayload })
  → CF decrypts, looks up Firestore, returns branchId, shopkeeperId
  → vpos-billing saves assignment locally (DeviceAssignmentStorageManager)
  → Device now "active" — shows branch name, ready for billing

STEP 4 — Billing syncs inventory (vpos-billing)
  → Calls CF: getBillingData({ branchId })
  → CF reads Firestore categories + inventory + gst slabs + branch flags
  → Returns JSON → vpos-billing saves to local encrypted storage managers
  → Repeat every 5 min + on launch

STEP 5 — Bill created & synced (vpos-billing → vpos-admin)
  → Employee creates bill → saved to SQLite (offline safe)
  → auto_sync_service.dart triggers
  → Calls CF: saveBill({ bill, branchId, shopkeeperId })
  → Bill stored in Firestore: bills/{billId}
  → vpos-admin reports pull from bills/ collection

STEP 6 — Admin views reports (vpos-admin)
  → Calls CF: getBranchBills, getBillsByDateRange, emailReport
  → Data sourced from bills/ saved by vpos-billing
```

---

## 6. Cross-Repo UI Tracker

> See [UI_CHANGES_TRACKER.md](./UI_CHANGES_TRACKER.md) for full details.

| # | Change | vpos-billing | vpos-billing-offline |
|---|--------|:---:|:---:|
| #1 | Search bar + pending kg bar position | ✅ | ✅ |
| #2 | Product card image toggle (`allowImages` flag) | ✅ | ⬜ Pending |
| #3 | Unit: `kg` only (removed liter/litre) | ✅ | ✅ |
| #4 | Category bar height 48px + scroll padding | ✅ | ✅ |
| #5 | Category chip compact spacing (POS-optimized) | ✅ | ✅ |
| #6 | Menu strip font size + icon sizing | ✅ | ✅ |

---

## 7. Legal & Support

**Repo:** [`vpos-legal`](./vpos-legal/) (separate git repo, static HTML)

| File | Purpose |
|------|---------|
| `index.html` | Landing / legal home |
| `support.html` | User support page |
| `legal/privacy-policy.html` | Privacy Policy |
| `legal/terms-and-conditions.html` | Terms and Conditions |

All three apps must link to these pages in their app store listings and in-app settings screens.

---

## 8. Release Artifacts

**Directory:** [`release-artifacts/`](./release-artifacts/)

| Folder | Contents |
|--------|---------|
| `2026-04-18_vnext/` | Signed APKs for vpos-admin and vpos-billing |

---

## 9. Development Conventions

### Branch Strategy
- All repos: `development` (active work) → `main` (production releases)
- GitHub org: `posvtech-coder`

### Environment Flavors
All Flutter apps support two flavors:
- `dev` — Firebase project `smbs-dev-b84ad`
- `prod` — Firebase project `smbs-7b59e`

Build commands:
```sh
# vpos-admin
flutter run --flavor dev -t lib/main_dev.dart
flutter build apk --flavor prod -t lib/main_prod.dart

# vpos-billing
flutter run --flavor dev
flutter build apk --flavor prod --release

# vpos-billing-offline
flutter run --flavor dev
flutter build apk --flavor prod --release
```

### Firebase Functions Deployment
> Functions are owned and deployed only from `vpos-admin`.

```sh
cd vpos-admin
firebase use dev   # or prod
firebase deploy --only functions
```

### Cloud Functions Region
All callable Cloud Functions are deployed to `asia-south1`.  
**Both vpos-billing and the React admin must use `asia-south1` when calling functions.**

```dart
// Dart (vpos-billing)
FirebaseFunctions.instanceFor(region: 'asia-south1').httpsCallable('functionName')

// TypeScript / React
getFunctions(app, 'asia-south1')
```

---

## 10. Pending / Future Work

| Item | Repo | Priority | Notes |
|------|------|----------|-------|
| Hold customer dialog null DAO | vpos-billing | 🔴 Critical | See `TODO_IMPLEMENTATION_PLAN.md` item A |
| Bills cleanup service no-op | vpos-billing | 🟠 High | See item B |
| Inventory not saved after CF call | vpos-billing | 🟡 Medium | See item C |
| `allowImages` flag in vpos-billing-offline | vpos-billing-offline | 🟡 Medium | UI_CHANGES_TRACKER #2 pending |
| Cloud backup from offline app | vpos-billing-offline | 🔵 Future | Architecture reserved in `lib/services/cloud/` |
| Transaction → SaleData model migration | vpos-billing | 🔵 Low | 10+ files, large effort |
