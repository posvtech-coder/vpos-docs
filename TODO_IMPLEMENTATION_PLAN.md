# VPOS TODO Implementation Plan
>
> Generated: April 7, 2026 | Repo: vpos-billing

---

## Overview

All 5 TODOs are in `vpos-billing`. `vpos-admin` and `vpos-billing-offline` are clean.

| # | Priority | Risk | Effort | TODO Description |
|---|----------|------|--------|-----------------|
| A | 🔴 CRITICAL | High | Medium | `load_hold_customer_dialog.dart` — null DAO crash |
| B | 🟠 HIGH | Medium | Small | `local_bills_cleanup_service.dart` — cleanup is no-op |
| C | 🟡 MEDIUM | Medium | Medium | `billing_inventory_service.dart` — products sync commented out |
| D | 🟡 MEDIUM | Low | Small | `billing_inventory_service.dart` — branch sync commented out |
| E | 🔵 LOW | High | Large | `compatibility_models.dart` — Transaction → SaleData migration |

---

## TODO A — Load Hold Customer Dialog (CRITICAL, Fix first)

**File:** `lib/widgets/load_hold_customer_dialog.dart`  
**Problem:** `_holdCustomerDao` is hardcoded to `null` (stub). Any call to `.getHoldCustomers()` or `.delete()` will throw a `NoSuchMethodError` at runtime.  
**Manager Ready:** `HoldCustomersStorageManager` is fully implemented with all required methods.

### What Needs to Change

#### 1. `lib/widgets/load_hold_customer_dialog.dart` (PRIMARY — full rewrite of DAO usage)

- **Remove** the `HoldCustomerModel` stub class at the top (lines 25–55) — the real one is in `hold_customers_storage_manager.dart`
- **Remove** `dynamic get _holdCustomerDao => null;` stub
- **Add** `final _holdStorage = HoldCustomersStorageManager();` field
- **Replace** `_holdCustomerDao.getHoldCustomers()` → `_holdStorage.getActiveHoldCustomers()`
- **Replace** `_holdCustomerDao.delete(customer.id)` → `_holdStorage.deleteHoldCustomer(customer.customerId)`

#### Field Mapping (stub → real model)

| Stub field used | Real `HoldCustomerModel` field | Notes |
|---|---|---|
| `customer.id` | `customer.customerId` | Name change |
| `customer.name` | ❌ No `name` field | Extract from `cartDataJson` or show customerId |
| `customer.phoneNumber` | ❌ No `phoneNumber` field | Extract from cartData or omit |
| `customer.cartDataJson` | `customer.cartDataJson` ✅ | Same |
| `customer.cartData` | `customer.cartData` (getter) ✅ | Same |
| `customer.itemCount` | `customer.itemCount` ✅ | Same |
| `customer.totalAmount` | `customer.totalAmount` ✅ | Same |
| `customer.syncStatus` | `customer.syncStatus` ✅ | Same |
| `customer.createdAt` | `customer.createdAt` ✅ | Same |

#### ⚠️ UI Impact

- The list display uses `customer.name` and `customer.phoneNumber` which don't exist in real model
- These values need to be parsed from `customer.cartDataJson` (the JSON has a `name` and `phone` key from cart)
- The search filter uses `customer.id` vs real `customer.customerId`
- **No visual change** if we extract name/phone from cartData correctly

#### Data Flow

```
Cloud (Firestore) → HoldCustomersSyncService (already works)
                          ↓
              HoldCustomersStorageManager (encrypted file)
                          ↓
              LoadHoldCustomerDialog reads via getActiveHoldCustomers()
                          ↓
              CartProvider.addCartItem() to restore the cart
```

#### Risk: LOW

- `HoldCustomersStorageManager` is already being used by `HoldCustomersSyncService`
- Cart loading logic uses `customer.cartDataJson` which is correct in real model
- Only the list display and DAO reference need updating

---

## TODO B — Local Bills Cleanup Service (HIGH, Easy fix)

**File:** `lib/services/local_bills_cleanup_service.dart`  
**Problem:** The entire cleanup body is `return 0` (no-op). Bills accumulate in the encrypted sales file forever, causing storage bloat.  
**Manager Ready:** `SalesStorageManager` has `deleteSale(saleId)` and find-by-date methods.

### What Needs to Change

#### 1. `lib/services/local_bills_cleanup_service.dart` (PRIMARY — implement cleanup logic)

- Replace the commented-out block with `SalesRepository`-based logic (Drift/SQLite):

  ```
  1. final repo = SalesRepository.instance;
  2. repo.getOldSyncedSales(beforeDate: cutoffDate)  — needs adding to SalesRepository
  3. For each: repo.deleteSale(sale.saleId)
  4. Return count of deleted
  ```

- Need to add `getOldSyncedSales(DateTime beforeDate)` method to `SalesRepository`
- Add import for `SalesRepository`

#### Field Mapping

| Old logic | `SaleRow` (Drift) / `SaleData` field | Match |
|---|---|---|
| `uploadedToCloud = true` | `syncStatus == 'synced'` | ✅ Semantic match |
| `transactionDate < cutoff` | `saleDate < cutoff` | ✅ Same meaning |

#### No Other Files Need Changes

- `LocalBillsCleanupService` is called from `auto_sync_service.dart` — no change needed there
- The return value (int count) is the same

#### ⚠️ Data Integrity Risk: MEDIUM

- Must only delete `syncStatus == 'synced'` sales (not `pending` or `failed`)
- Must keep bills from last 7 days regardless of sync status (that part is already correct in the logic)
- `deleteSale` does hard delete — double check before deleting (use `saleDate` AND `syncStatus`)

#### Risk: LOW-MEDIUM

- No UI impact (cleanup is background service)
- The `SalesStorageManager.deleteSale()` is a hard delete from encrypted file — irreversible
- Mitigation: add a check that `allSales.length > deletedCount` to avoid wiping everything

---

## TODO C — Products Sync via InventoryStorageManager (MEDIUM)

**File:** `lib/services/billing_inventory_service.dart` (line 1199)  
**Problem:** Products fetched from Firebase Cloud Function are NOT saved to local storage. If the app goes offline after fetching, `InventoryStorageManager` is empty — `searchProducts()` returns nothing.  
**Manager Ready:** `InventoryStorageManager` with `syncFromFirebase()` method exists.

### What Needs to Change

#### 1. `lib/services/billing_inventory_service.dart` (PRIMARY)

- Add import: `import '../local_storage/managers/inventory_storage_manager.dart';`
- Add import: `import '../local_storage/models/inventory_item.dart';`
- In `_syncToDatabase()` microtask, replace the commented block with:

  ```
  final allItemsRaw = inventoryData['allItems'] as List<dynamic>? ?? [];
  final allItems = allItemsRaw.map((item) => Map<String,dynamic>.from(item as Map)).toList();
  if (allItems.isNotEmpty) {
    final manager = InventoryStorageManager();
    await manager.init();
    await manager.syncFromFirebase(allItems);
  }
  ```

- `InventoryItem.fromFirebase()` already handles Firebase field names (`sellingPrice`, `gstSlabId`, etc.)

#### Field Verification (Firebase data → `InventoryItem.fromFirebase`)

| Firebase field | InventoryItem maps it? |
|---|---|
| `productCode` / `product_code` | ✅ |
| `productName` / `product_name` | ✅ |
| `categoryId` / `category_id` | ✅ |
| `unit` | ✅ |
| `sellingPrice` / `selling_price` | ✅ |
| `mrp` | ✅ |
| `gstSlabId` | ✅ |
| `gstRate` / `gst_rate` | ✅ |
| `barcode` | ✅ |
| `productImageUrl` | ✅ (in extended fields) |

#### Files That Read Inventory (must still work after change)

| File | Method Used | Impact |
|---|---|---|
| `product_selection_screen.dart` | `InventoryStorageManager().searchItems()` | ✅ Will now have data |
| `billing_inventory_service.dart` | `inventoryResponse.allItems` (in-memory) | ✅ Unchanged |
| `checkout_screen.dart` | Cart items from product selection | ✅ No change |

#### ⚠️ Risk: LOW-MEDIUM

- `syncFromFirebase()` calls `saveAll()` which **overwrites** the entire inventory file
- This is fine for a full sync (same behavior as old DB approach)
- If the cloud returns 0 items (error or empty branch), `saveAll([])` will wipe stored inventory
- Mitigation: check `allItems.isNotEmpty` before calling `syncFromFirebase` ✅ (already planned above)

---

## TODO D — Branch Sync (MEDIUM, Lowest value of the 4)

**File:** `lib/services/billing_inventory_service.dart` (line 1068)  
**Problem:** Branch name, shopkeeperID, floatingCustomers etc. are NOT being saved to a dedicated local store. However, `floatingCustomers` and `branchName` ARE already being saved to `SharedPreferences` (lines 180–215 of the same file).

### Wait — Is This Already Done?

After investigation: **branch data IS already being saved to SharedPrefs** in `_fetchFromCloud()`:

- `floatingCustomers` → `SharedPrefsHelper.saveBool(SharedPrefsKeys.floatingCustomers, ...)`
- `trackOfflineTimings` → `SharedPrefsHelper.saveBool(SharedPrefsKeys.trackOfflineTimings, ...)`
- `branchName` → Stored in `InventoryResponseModel` in-memory cache

The old TODO was about writing branch data to a **SQLite branches table** (which no longer exists — we moved to encrypted storage managers). The app reads `floatingCustomers` from SharedPrefs everywhere correctly.

**Verdict:** The branch sync in `_syncBranchToDatabase()` was a SQLite-era approach. The current SharedPrefs approach already covers all fields the app actually reads. **This TODO can be considered resolved.**

### If We Want Complete Persistence (Optional)

There is no dedicated `BranchStorageManager`. If we want branch data to survive install/SharedPrefs wipes:

- Create `lib/local_storage/managers/branch_storage_manager.dart` (new file)
- Create `lib/local_storage/models/branch_data.dart` (new file)
- Save branch fields from `branchInfo` in `_fetchFromCloud()`

**But this is not blocking any feature.** SharedPrefs is sufficient unless we get reports that branch settings reset after unclear certain edge cases.

### What to Do Now

- Remove the comment block `/* COMMENTED OUT - TODO: Port to storage managers ... */` (cleanup only)
- Remove the `// TODO: Update branch sync to use storage managers` comment
- The method `_syncBranchToDatabase()` can remain as a no-op or be removed entirely

---

## TODO E — Transaction → SaleData Migration (LOW PRIORITY, HIGH EFFORT)

**File:** `lib/models/compatibility_models.dart`  
**Problem:** `Transaction` and `TransactionItem` are compatibility shims. The real model is `SaleData` + `SaleItemData`. 10 files still use `Transaction`.

### Scale of Migration

**Files That Must Be Updated (all in vpos-billing):**

| File | Usage Type | Change Required |
|---|---|---|
| `models/bill_document.dart` | Has `toTransaction()` method, uses `compat.Transaction` | Replace `toTransaction()` with `toSaleData()` or keep as bridge |
| `screens/animated_receipt_screen.dart` | `final Transaction? transaction` prop | Replace prop type with `SaleData` |
| `screens/bill_detail_screen.dart` | `final Transaction transaction` prop | Replace with `SaleData` |
| `screens/checkout_screen.dart` | Creates `Transaction` after billing | Replace with `SaleData` creation |
| `screens/old_bills_screen.dart` | `List<Transaction> _allBills` + loads from both local+cloud | Largest change — dual source |
| `screens/product_selection_screen.dart` | Minor usage | Investigate extent |
| `screens/receipt_screen.dart` | Uses `Transaction` fields | Replace with `SaleData` fields |
| `screens/receipt_viewer_screen.dart` | Heavily uses Transaction fields | Full replacement needed |
| `services/receipt_formatter.dart` | `formatReceipt(Transaction transaction)` | Change parameter type |
| `utils/gst_calculator.dart` | Minor usage | Investigate |

### Field Mapping (Transaction → SaleData)

| `Transaction` field | `SaleData` field | Notes |
|---|---|---|
| `transactionNumber` | `receiptNumber` | Name change |
| `transactionDate` | `saleDate` (alias `transactionDate` getter exists) | ✅ getter already added |
| `totalTax` / `totalGst` | `taxAmount` | Name change |
| `totalDiscount` | `discountAmount` | Name change |
| `finalAmount` / `totalAmount` | `totalAmount` | ✅ Same |
| `subtotal` | `subtotal` | ✅ Same |
| `paymentMethod` | `paymentMethod` | ✅ Same |
| `billedBy` / `staffName` | `staffName` (getter exists in SaleData) | ✅ getter exists |
| `customerName` | `customerName` | ✅ Same |
| `customerPhone` | `customerPhone` | ✅ Same |
| `customerEmail` | `customerEmail` | ✅ Same |
| `customerGstin` | `customerGstin` | ✅ Same |
| `uploadedToCloud` / `isSynced` | `syncStatus == 'synced'` | Logic change |
| `items` (`List<TransactionItem>?`) | `items` (`List<SaleItemData>`) | Type change |
| `returnStatus` | ❌ Not in SaleData yet | New field needed |

### TransactionItem → SaleItemData

| `TransactionItem` field | `SaleItemData` field | Notes |
|---|---|---|
| `productId` | `productId` | ✅ |
| `productCode` | `productCode` | ✅ |
| `productName` | `productName` | ✅ |
| `unit` | `unit` | ✅ |
| `gstRate` | `gstRate` | ✅ |
| `quantity` | `quantity` | ✅ |
| `unitPrice` | `sellingPrice` | Name change |
| `baseAmount` | ❌ (calculated) | Must compute |
| `gstAmount` | `gstAmount` | ✅ |
| `discount` | `discountAmount` | Name change |
| `lineTotal` | `totalAmount` | Name change |
| `netAmount` | ❌ (calculated) | Must compute |
| `returnedQuantity` | ❌ Not in SaleItemData | New field needed |

### Missing Fields That Need Adding to SaleData

1. `returnStatus` (String: 'none' / 'partial' / 'full') — used in returns flow
2. `SaleItemData.returnedQuantity` (double) — used in receipt viewer for returns

### ⚠️ Risk: HIGH

- `old_bills_screen.dart` loads from BOTH cloud (Firestore JSON → BillDocument → toTransaction()) and local cache — both paths would need updating
- `receipt_viewer_screen.dart` has 50+ uses of Transaction fields
- `receipt_formatter.dart` is used for physical receipt printing — any bug here is visible to end users
- `BillDocument.toTransaction()` is the bridge currently keeping this working — it stays until the migration is complete

### Recommended Approach

**Phased migration (not all at once):**

1. Add `returnStatus` and `returnedQuantity` to `SaleData`/`SaleItemData`
2. Migrate `receipt_formatter.dart` first (isolated, no UI)
3. Migrate `bill_detail_screen.dart` (simple, read-only display)
4. Migrate `receipt_screen.dart`
5. Migrate `animated_receipt_screen.dart`
6. Migrate `receipt_viewer_screen.dart` (most complex)
7. Migrate `old_bills_screen.dart` (most complex, dual data source)
8. Migrate `checkout_screen.dart`
9. Delete `compatibility_models.dart`

---

## Recommended Execution Order

```
Step 1:  TODO A — Fix load_hold_customer_dialog  [1 file, ~50 lines, critical crash fix]
Step 2:  TODO B — Implement bills cleanup logic   [1 file, ~20 lines, background service]
Step 3:  TODO C — Port products sync              [1 file, ~15 lines, add imports + call]
Step 4:  TODO D — Clean up branch sync            [1 file, remove dead code only]
Step 5:  TODO E — Transaction migration           [10+ files, phased, lowest urgency]
```

---

## File Change Summary Per TODO

| TODO | Files Changed | New Files | Risk to UI | Risk to Data | Risk to Firestore/Cloud |
|------|--------------|-----------|------------|--------------|------------------------|
| A (hold customer dialog) | 1 | 0 | Medium (field name changes) | Low | None |
| B (bills cleanup) | 1 | 0 | None | Medium (hard delete) | None |
| C (products sync) | 1 | 0 | None (improves offline) | Low | None |
| D (branch sync cleanup) | 1 | 0 | None | None | None |
| E (Transaction migration) | 10+ | 0 | High | Medium | Medium (receipt printing) |

---

---

## Storage Architecture Clarification (IMPORTANT — READ BEFORE IMPLEMENTING)

vpos-billing uses **two storage systems** for different data categories. The migration from file-based to Drift/SQLite is **partially complete**.

### What runs on Drift / SQLite (AppDatabase)

| Data | Repository | Where Used |
|---|---|---|
| Sales / bills | `SalesRepository` | `checkout_screen.dart`, `old_bills_screen.dart` |
| Auto sync queue | `SalesRepository` | `auto_sync_service.dart` |

### What still runs on Encrypted File Storage (.enc)

| Data | Manager | Where Used |
|---|---|---|
| Staff | `StaffStorageManager` | `login_screen.dart` |
| GST Slabs | `GstSlabStorageManager` | `product_selection_screen.dart`, `business_details_screen.dart` |
| Hold Customers | `HoldCustomersStorageManager` | `hold_customers_sync_service.dart`, `checkout_screen.dart` |
| Inventory/Products | `InventoryStorageManager` | Not yet wired to any screen |
| Bills (legacy JSON) | `BillsStorageManager` | `old_bills_screen.dart` fallback only |

### Drift repositories that are scaffolded but NOT yet called from screens

- `InventoryRepository` — exists, nothing uses it
- `StaffRepository` — exists, nothing uses it
- `CategoriesRepository` — exists, nothing uses it
- `GstSlabsRepository` — exists, nothing uses it
- `HoldCustomersRepository` — exists, nothing uses it

### What This Means for the TODOs

- **TODO B (bills cleanup):** Must target `SalesRepository` (Drift/SQLite) — NOT `SalesStorageManager`
- **TODO C (products sync):** Should target `InventoryRepository` (Drift/SQLite) OR keep using `InventoryStorageManager` (.enc) — decision needed
- **TODO A (hold customer dialog):** Uses `HoldCustomersStorageManager` (.enc) — correct
- **TODO D (branch sync):** SharedPrefs — no change needed

---

## Notes on vpos-billing-offline & vpos-admin

- **vpos-billing-offline**: Zero TODOs. Clean. No changes needed.
- **vpos-admin**: Zero TODOs. Clean. No changes needed.
