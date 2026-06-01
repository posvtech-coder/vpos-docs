# Edit Mode & Price Edit Flow Implementation

**Date:** May 26, 2026  
**App:** vpos-billing ONLY  
**Status:** ⏳ Implementation Required

---

## 📋 Requirements Summary

### Two INDEPENDENT Behaviors

#### 1. **allowStaffPriceEdit Flag** (Product-Level Setting)
- **When enabled:** Show price edit popup BEFORE adding item to cart
- **Applies to:**
  - Manual product card taps
  - Barcode scan additions
  - Automatic additions (Enter key in quick scan mode)
- **Behavior:** Always intercept cart addition and show QuickPriceEditDialog first
- **Independent of:** Edit mode toggle state

#### 2. **Edit Mode Toggle** (Settings Screen)
- **When enabled + Manager:**
  - Product card tap → Opens full EditItemDialog (name, price, category, etc.)
  - Replaces the "add to cart" gesture entirely
- **When enabled + Staff with allowStaffPriceEdit:**
  - Product card tap → Opens QuickPriceEditDialog
  - Replaces the "add to cart" gesture entirely
- **When disabled:**
  - Product card tap → Normal cart addition behavior
  - But still shows price popup if allowStaffPriceEdit is enabled

---

## 🎯 Decision Flow Chart

```
Product Card Tapped
  ↓
Is Edit Mode Enabled?
  ├─ YES → Is user a Manager?
  │         ├─ YES → Show EditItemDialog (full edit)
  │         └─ NO  → Does product have allowStaffPriceEdit=true?
  │                  ├─ YES → Show QuickPriceEditDialog (price only)
  │                  └─ NO  → Do nothing (staff can't edit)
  │
  └─ NO → Does product have allowStaffPriceEdit=true?
           ├─ YES → Show QuickPriceEditDialog → Then add to cart
           └─ NO  → Add to cart directly
```

---

## 🛠️ Implementation Tasks

### Task 1: Verify ItemModel has allowStaffPriceEdit Field

**Check:** Does `lib/models/compatibility_models.dart` or `lib/models/business_models.dart` contain allowStaffPriceEdit?

**If NO:** Add it to ItemModel:
```dart
class ItemModel {
  final String productCode;
  final String productName;
  final double sellingPrice;
  final double mrp;
  final String unit;
  final List<String> categoryIds;
  final int? gstSlabId;
  final String? barcode;
  final String? imageUrl;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool allowStaffPriceEdit; // ✅ ADD THIS
  
  ItemModel({
    required this.productCode,
    required this.productName,
    required this.sellingPrice,
    required this.mrp,
    required this.unit,
    required this.categoryIds,
    this.gstSlabId,
    this.barcode,
    this.imageUrl,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    this.allowStaffPriceEdit = false, // ✅ ADD THIS with default
  });
  
  factory ItemModel.fromFirestore(Map<String, dynamic> data, String docId) {
    return ItemModel(
      // ... existing fields ...
      allowStaffPriceEdit: data['allowStaffPriceEdit'] as bool? ?? false, // ✅ ADD THIS
    );
  }
}
```

---

### Task 2: Update _addToCart Method Logic

**File:** `lib/screens/product_selection_screen.dart`

**Current code** (around line 232):
```dart
void _addToCart(ItemModel item) {
  // Close keyboard first
  FocusScope.of(context).unfocus();

  final unit = item.unit.toLowerCase();
  // ... handles kg, liter, dozen, piece logic
}
```

**New code:**
```dart
void _addToCart(ItemModel item) {
  // Close keyboard first
  FocusScope.of(context).unfocus();

  final authService = Provider.of<DeviceAuthService>(context, listen: false);
  final staffRole = authService.staffData?['role']?.toString().toLowerCase() ?? 'operator';
  final isManager = staffRole == 'manager';

  // ═══════════════════════════════════════════════════════════
  // EDIT MODE LOGIC — Tap to edit instead of adding to cart
  // ═══════════════════════════════════════════════════════════
  
  if (_isEditMode) {
    if (isManager) {
      // Manager in edit mode: show full item edit dialog
      _showEditItemDialog(item);
      return;
    } else if (item.allowStaffPriceEdit) {
      // Staff with price edit permission in edit mode: show price edit dialog
      _showQuickPriceEditDialog(item);
      return;
    } else {
      // Staff without permission: do nothing in edit mode
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You don\'t have permission to edit this product'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // NORMAL ADD TO CART LOGIC (Edit mode OFF)
  // ═══════════════════════════════════════════════════════════
  
  final unit = item.unit.toLowerCase();
  final itemName = item.productName;
  final itemPrice = item.sellingPrice;

  // DEBUG: Print complete product data
  debugPrint('\n${'=' * 80}');
  debugPrint('🗂️ COMPLETE ITEM DATA STRUCTURE:');
  debugPrint('   productCode: ${item.productCode}');
  debugPrint('   productName: ${item.productName}');
  debugPrint('   allowStaffPriceEdit: ${item.allowStaffPriceEdit}');
  debugPrint('=' * 80);

  // Check if price edit is required BEFORE adding
  if (item.allowStaffPriceEdit) {
    debugPrint('💰 Price edit enabled - showing price popup before adding');
    _showPriceEditBeforeAdd(item, unit);
    return;
  }

  // No price edit required - proceed with normal unit-based logic
  if (unit == 'kg') {
    debugPrint('⚖️ Kg item clicked, current weight: $_currentWeight kg');
    // ... existing kg logic
  } else if (unit == 'liter') {
    debugPrint('🥤 Liter item selected, showing popup');
    // ... existing liter logic
  } else if (unit == 'dozen') {
    debugPrint('🎁 Dozen item selected, showing popup');
    // ... existing dozen logic
  } else {
    debugPrint('📦 Per-piece item selected, adding immediately');
    // ... existing piece logic
  }
}
```

---

### Task 3: Create Price Edit Before Add Method

**Add after _addToCart method:**

```dart
/// Show price edit dialog before adding to cart (allowStaffPriceEdit=true items)
Future<void> _showPriceEditBeforeAdd(ItemModel item, String unit) async {
  final originalPrice = item.sellingPrice;
  
  final result = await showDialog<double>(
    context: context,
    barrierDismissible: false,
    builder: (context) => QuickPriceEditDialog(
      item: item,
      onPriceConfirmed: (newPrice) {
        Navigator.pop(context, newPrice);
      },
    ),
  );

  if (result == null) {
    // User cancelled
    debugPrint('❌ Price edit cancelled, not adding to cart');
    return;
  }

  // User confirmed price (may be same or different)
  debugPrint('✅ Price confirmed: ₹$result (original: ₹$originalPrice)');
  
  // Create a modified item with the new price
  final modifiedItem = ItemModel(
    productCode: item.productCode,
    productName: item.productName,
    sellingPrice: result, // ✅ Use edited price
    mrp: item.mrp,
    unit: item.unit,
    categoryIds: item.categoryIds,
    gstSlabId: item.gstSlabId,
    barcode: item.barcode,
    imageUrl: item.imageUrl,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    allowStaffPriceEdit: item.allowStaffPriceEdit,
  );

  // Now proceed with unit-based addition logic using modified item
  if (unit == 'kg') {
    if (_currentWeight > 0.01) {
      _addProductToCart(modifiedItem, _currentWeight);
      setState(() {
        _selectedItem = modifiedItem;
      });
      Future.delayed(const Duration(milliseconds: 300), () {
        if (mounted) setState(() => _selectedItem = null);
      });
    } else {
      setState(() => _selectedItem = modifiedItem);
    }
  } else if (unit == 'liter') {
    setState(() => _selectedItem = modifiedItem);
    _showVolumeInputDialog(modifiedItem);
  } else if (unit == 'dozen') {
    _showDozenSelectionDialog(modifiedItem);
  } else {
    // Piece item - add directly
    setState(() => _selectedItem = modifiedItem);
    _addProductToCart(modifiedItem, 1.0);
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) setState(() => _selectedItem = null);
    });
  }
}
```

---

### Task 4: Create Edit Item Dialog Method

**Add after _showPriceEditBeforeAdd:**

```dart
/// Show full edit item dialog (managers only, edit mode)
Future<void> _showEditItemDialog(ItemModel item) async {
  if (!_isOnline(context)) {
    _showOfflineError();
    return;
  }

  final authService = Provider.of<DeviceAuthService>(context, listen: false);
  final shopkeeperId = authService.assignedShopkeeperId;
  final branchId = authService.assignedBranchId;

  if (shopkeeperId == null || branchId == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Unable to edit item: Branch information not available'),
        backgroundColor: Colors.red,
      ),
    );
    return;
  }

  final result = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (context) => EditItemDialog(
      shopkeeperId: shopkeeperId,
      branchId: branchId,
      item: item,
      categories: _categories,
      gstSlabs: _gstSlabs,
    ),
  );

  if (result == true) {
    // Reload inventory to show updated item
    await _loadInventory();
  }
}
```

---

### Task 5: Create Quick Price Edit Dialog Method

**Add after _showEditItemDialog:**

```dart
/// Show quick price edit dialog (staff with permission, edit mode)
Future<void> _showQuickPriceEditDialog(ItemModel item) async {
  final result = await showDialog<double>(
    context: context,
    barrierDismissible: true,
    builder: (context) => QuickPriceEditDialog(
      item: item,
      onPriceConfirmed: (newPrice) {
        Navigator.pop(context, newPrice);
      },
    ),
  );

  if (result != null) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Price updated to ₹${result.toStringAsFixed(2)}'),
        duration: const Duration(seconds: 2),
      ),
    );
    // Note: In edit mode, we're just viewing/editing the price
    // Not adding to cart - that's the whole point of edit mode
  }
}
```

---

### Task 6: Update Barcode Scan Logic

**Find the barcode scan handler** (search for where barcodes are processed)

**Before calling _addToCart or _addProductToCart:**

```dart
// If barcode scan found a product
if (matchedItem != null) {
  if (matchedItem.allowStaffPriceEdit) {
    // Show price edit dialog before adding
    _showPriceEditBeforeAdd(matchedItem, matchedItem.unit.toLowerCase());
  } else {
    // Add directly
    _addToCart(matchedItem);
  }
}
```

---

## 🧪 Testing Checklist

### Test Scenario 1: allowStaffPriceEdit = true, Edit Mode OFF
- [ ] Product card tap → Shows QuickPriceEditDialog
- [ ] Confirm price → Adds to cart with confirmed price
- [ ] Cancel → Does not add to cart
- [ ] Barcode scan → Shows price dialog before adding

### Test Scenario 2: allowStaffPriceEdit = false, Edit Mode OFF
- [ ] Product card tap → Adds to cart directly
- [ ] No price dialog shown
- [ ] Normal unit-based flow (kg/liter/dozen/piece)

### Test Scenario 3: Edit Mode ON, Manager Role
- [ ] Product card tap → Shows EditItemDialog
- [ ] Can edit all fields (name, price, category, etc.)
- [ ] Does NOT add to cart
- [ ] Inventory reloads after successful edit

### Test Scenario 4: Edit Mode ON, Staff with allowStaffPriceEdit
- [ ] Product card tap → Shows QuickPriceEditDialog
- [ ] Can only edit price
- [ ] Does NOT add to cart
- [ ] Shows confirmation message

### Test Scenario 5: Edit Mode ON, Staff without allowStaffPriceEdit
- [ ] Product card tap → Shows "no permission" message
- [ ] Does NOT add to cart
- [ ] Does NOT show any dialog

---

## 📝 Notes

1. **Edit mode toggle state** is loaded from SharedPreferences on app launch (_loadEditModeState already implemented)
2. **QuickPriceEditDialog** already exists from previous implementation
3. **EditItemDialog** may need to be imported/created for managers
4. **allowStaffPriceEdit** field needs to be added to ItemModel if not present
5. This implementation is for **vpos-billing ONLY** - vpos-billing-offline does not need these changes

---

**Status:** 🟡 Awaiting Implementation  
**Priority:** High (Core billing flow feature)  
**Estimated Time:** 2-3 hours for complete implementation and testing
