# Staff Price Adjustment Feature Implementation

## 📋 Overview

Allows managers to enable a "staff-editable price" toggle on inventory items. When enabled, staff operators on billing devices can quickly adjust selling prices for near-expiry or promotional items without full edit permissions.

## 🎯 Use Cases

- **Near-expiry discounts**: Reduce prices on items approaching expiration
- **Promotional pricing**: Quick price adjustments for sales
- **Clearance items**: Mark down slow-moving inventory
- **Time-sensitive deals**: Happy hour or daily specials

## 🏗️ Architecture

### Field Name: `allowStaffPriceEdit`

**Firestore Schema Addition** (`shopkeepers/{sid}/branches/{bid}/inventory/{itemId}`)

```typescript
{
  // ... existing fields ...
  allowStaffPriceEdit: boolean,                  // Toggle: staff can edit price
  staffPriceEditEnabledBy: string | null,        // Email of who enabled
  staffPriceEditEnabledAt: Timestamp | null,     // When enabled
  staffPriceEditDisabledBy: string | null,       // Email of who disabled
  staffPriceEditDisabledAt: Timestamp | null,    // When disabled
  lastPriceEditBy: string | null,                // Last staff who edited price
  lastPriceEditAt: Timestamp | null,             // Last price edit timestamp
  priceEditHistory: Array<{                      // Price change audit trail
    oldPrice: number,
    newPrice: number,
    editedBy: string,
    editedAt: Timestamp,
    reason?: string
  }>
}
```

## 🔧 Implementation by Platform

### 1. Cloud Functions (`vpos-admin/functions/src/shopkeepers/inventory.functions.ts`)

#### A. `addInventoryItem` Function

**Add to request parameters:**
```typescript
const {
  // ... existing fields ...
  allowStaffPriceEdit = false,  // Default: false
} = product;
```

**Add to inventoryData object:**
```typescript
const inventoryData = {
  // ... existing fields ...
  allowStaffPriceEdit: allowStaffPriceEdit === true,
  staffPriceEditEnabledBy: allowStaffPriceEdit ? request.auth.token.email : null,
  staffPriceEditEnabledAt: allowStaffPriceEdit ? admin.firestore.FieldValue.serverTimestamp() : null,
  staffPriceEditDisabledBy: null,
  staffPriceEditDisabledAt: null,
  lastPriceEditBy: null,
  lastPriceEditAt: null,
  priceEditHistory: [],
};
```

#### B. `updateInventoryItem` Function

**Handle toggle state changes:**
```typescript
// Check if allowStaffPriceEdit toggle changed
if (updateData.hasOwnProperty('allowStaffPriceEdit')) {
  const wasEnabled = existingItem.allowStaffPriceEdit || false;
  const isEnabled = updateData.allowStaffPriceEdit === true;
  
  if (isEnabled && !wasEnabled) {
    // Enabling: record who enabled it
    updateData.staffPriceEditEnabledBy = request.auth.token.email;
    updateData.staffPriceEditEnabledAt = admin.firestore.FieldValue.serverTimestamp();
  } else if (!isEnabled && wasEnabled) {
    // Disabling: record who disabled it
    updateData.staffPriceEditDisabledBy = request.auth.token.email;
    updateData.staffPriceEditDisabledAt = admin.firestore.FieldValue.serverTimestamp();
  }
}
```

**Handle price-only updates from staff:**
```typescript
// Check if this is a price-only update (from billing device staff)
const isPriceOnlyUpdate = Object.keys(updateData).length === 1 && 
                         updateData.hasOwnProperty('sellingPrice');

if (isPriceOnlyUpdate && existingItem.allowStaffPriceEdit) {
  // Staff price edit - add to history
  const oldPrice = existingItem.sellingPrice || 0;
  const newPrice = updateData.sellingPrice;
  
  updateData.lastPriceEditBy = request.auth?.token?.email || 'staff';
  updateData.lastPriceEditAt = admin.firestore.FieldValue.serverTimestamp();
  updateData.priceEditHistory = admin.firestore.FieldValue.arrayUnion({
    oldPrice,
    newPrice,
    editedBy: request.auth?.token?.email || 'staff',
    editedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
```

#### C. New Function: `updateItemPrice` (Optional - Dedicated Endpoint)

```typescript
/**
 * Quick price update for staff on billing devices
 * Only updates selling price, requires allowStaffPriceEdit: true
 */
export const updateItemPrice = onCall(
  FunctionConfigs.light,
  async (request) => {
    // Authenticate staff (use existing staff auth pattern)
    const {shopkeeperId, branchId, itemId, newPrice, staffEmail} = request.data;
    
    // Validate item allows staff price edit
    const itemDoc = await firestore
      .collection('shopkeepers').doc(shopkeeperId)
      .collection('branches').doc(branchId)
      .collection('inventory').doc(itemId)
      .get();
    
    if (!itemDoc.exists || !itemDoc.data()?.allowStaffPriceEdit) {
      throw new HttpsError('permission-denied', 'Price editing not allowed for this item');
    }
    
    const oldPrice = itemDoc.data()?.sellingPrice || 0;
    
    // Update price with audit trail
    await itemDoc.ref.update({
      sellingPrice: newPrice,
      lastPriceEditBy: staffEmail,
      lastPriceEditAt: admin.firestore.FieldValue.serverTimestamp(),
      priceEditHistory: admin.firestore.FieldValue.arrayUnion({
        oldPrice,
        newPrice,
        editedBy: staffEmail,
        editedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    });
    
    return {success: true, message: 'Price updated successfully'};
  }
);
```

---

### 2. vpos-billing (Flutter) - Billing Device

#### A. Update `add_item_dialog.dart`

**Add state variable:**
```dart
bool _allowStaffPriceEdit = false;
```

**Add toggle in form:**
```dart
// After stock field, before buttons
const SizedBox(height: 16),
Container(
  padding: const EdgeInsets.all(16),
  decoration: BoxDecoration(
    color: Colors.blue.shade50,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: Colors.blue.shade200),
  ),
  child: Row(
    children: [
      Icon(Icons.price_change, color: Colors.blue.shade700, size: 24),
      const SizedBox(width: 12),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Allow Staff Price Adjustment',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.blue.shade700,
              ),
            ),
            Text(
              'Staff can edit selling price on billing device',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
      Switch(
        value: _allowStaffPriceEdit,
        onChanged: _isLoading ? null : (value) {
          setState(() => _allowStaffPriceEdit = value);
        },
        activeColor: Colors.blue.shade700,
      ),
    ],
  ),
),
```

**Add to Cloud Function payload:**
```dart
await functions.httpsCallable('addInventoryItem').call({
  'shopkeeperId': shopkeeperId,
  'branchId': branchId,
  'product': {
    // ... existing fields ...
    'allowStaffPriceEdit': _allowStaffPriceEdit,
  },
});
```

#### B. Update `edit_item_dialog.dart`

**Similar changes as add_item_dialog.dart**

**Initialize from item:**
```dart
@override
void initState() {
  super.initState();
  // ... existing initializations ...
  _allowStaffPriceEdit = widget.item.allowStaffPriceEdit ?? false;
}
```

#### C. Create `quick_price_edit_dialog.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../models/item_model.dart';
import '../services/crashlytics_logger.dart';

/// Quick Price Edit Dialog for Staff (Billing Device Only)
///
/// Allows staff operators to quickly adjust selling price for items
/// where allowStaffPriceEdit is enabled. Lightweight dialog with
/// price-only editing and audit trail.
class QuickPriceEditDialog extends StatefulWidget {
  final ItemModel item;
  final String shopkeeperId;
  final String branchId;
  final String staffEmail;
  final VoidCallback onSuccess;

  const QuickPriceEditDialog({
    super.key,
    required this.item,
    required this.shopkeeperId,
    required this.branchId,
    required this.staffEmail,
    required this.onSuccess,
  });

  @override
  State<QuickPriceEditDialog> createState() => _QuickPriceEditDialogState();
}

class _QuickPriceEditDialogState extends State<QuickPriceEditDialog> {
  final _formKey = GlobalKey<FormState>();
  final _logger = CrashlyticsLogger();
  late final TextEditingController _priceController;

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _priceController = TextEditingController(
      text: widget.item.sellingPrice.toString(),
    );
  }

  @override
  void dispose() {
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _updatePrice() async {
    if (!_formKey.currentState!.validate()) return;

    final newPrice = double.tryParse(_priceController.text.trim()) ?? 0;
    final oldPrice = widget.item.sellingPrice;

    // Check if price actually changed
    if ((newPrice - oldPrice).abs() < 0.01) {
      Navigator.of(context).pop();
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final functions = FirebaseFunctions.instanceFor(region: 'asia-south1');

      // Option 1: Use dedicated updateItemPrice function
      await functions.httpsCallable('updateItemPrice').call({
        'shopkeeperId': widget.shopkeeperId,
        'branchId': widget.branchId,
        'itemId': widget.item.id,
        'newPrice': newPrice,
        'staffEmail': widget.staffEmail,
      });

      // Option 2: Use updateInventoryItem with price-only update
      // await functions.httpsCallable('updateInventoryItem').call({
      //   'shopkeeperId': widget.shopkeeperId,
      //   'branchId': widget.branchId,
      //   'productId': widget.item.id,
      //   'product': {'sellingPrice': newPrice},
      // });

      _logger.log('Price updated successfully', data: {
        'itemId': widget.item.id,
        'oldPrice': oldPrice,
        'newPrice': newPrice,
      });

      if (mounted) {
        Navigator.of(context).pop();
        widget.onSuccess();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Price updated: ₹$oldPrice → ₹$newPrice',
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      _logger.logError('Failed to update price: $e');
      setState(() {
        _errorMessage = 'Failed to update price: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF0A1628),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.85,
        constraints: const BoxConstraints(maxWidth: 400),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                const Icon(Icons.price_change, color: Colors.amber, size: 28),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Adjust Price',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70),
                  onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Divider(color: Colors.white24),
            const SizedBox(height: 8),

            // Product Info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.item.productName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Code: ${widget.item.productCode}',
                    style: TextStyle(
                      color: Colors.grey.shade400,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        'Current Price:',
                        style: TextStyle(
                          color: Colors.grey.shade300,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '₹${widget.item.sellingPrice.toStringAsFixed(2)}',
                        style: const TextStyle(
                          color: Colors.amber,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Price Input
            Form(
              key: _formKey,
              child: TextFormField(
                controller: _priceController,
                autofocus: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                ],
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
                decoration: InputDecoration(
                  labelText: 'New Selling Price *',
                  labelStyle: const TextStyle(color: Colors.white70),
                  prefixText: '₹ ',
                  prefixStyle: const TextStyle(
                    color: Colors.amber,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                  enabledBorder: const OutlineInputBorder(
                    borderSide: BorderSide(color: Colors.white30),
                  ),
                  focusedBorder: const OutlineInputBorder(
                    borderSide: BorderSide(color: Colors.amber, width: 2),
                  ),
                  errorBorder: const OutlineInputBorder(
                    borderSide: BorderSide(color: Colors.red),
                  ),
                  helperText: 'Enter new price for this item',
                  helperStyle: TextStyle(color: Colors.grey.shade400),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Price is required';
                  }
                  final price = double.tryParse(value.trim());
                  if (price == null || price <= 0) {
                    return 'Enter a valid price';
                  }
                  if (price > widget.item.mrp) {
                    return 'Price cannot exceed MRP (₹${widget.item.mrp})';
                  }
                  return null;
                },
              ),
            ),

            // Error Message
            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  border: Border.all(color: Colors.red),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error, color: Colors.red, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: Colors.red, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 20),

            // Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: _isLoading ? null : _updatePrice,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber.shade700,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Update Price',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

#### D. Update `ItemModel` class

**Add new field:**
```dart
class ItemModel {
  // ... existing fields ...
  final bool? allowStaffPriceEdit;
  final String? lastPriceEditBy;
  final DateTime? lastPriceEditAt;
  
  ItemModel({
    // ... existing parameters ...
    this.allowStaffPriceEdit,
    this.lastPriceEditBy,
    this.lastPriceEditAt,
  });
  
  factory ItemModel.fromJson(Map<String, dynamic> json) {
    return ItemModel(
      // ... existing mappings ...
      allowStaffPriceEdit: json['allowStaffPriceEdit'] as bool?,
      lastPriceEditBy: json['lastPriceEditBy'] as String?,
      lastPriceEditAt: json['lastPriceEditAt'] != null
          ? (json['lastPriceEditAt'] as Timestamp).toDate()
          : null,
    );
  }
}
```

#### E. Update `ProductCard` widget

**Add price edit badge:**
```dart
// In ProductCard build method, add overlay for price-editable items
if (item.allowStaffPriceEdit == true)
  Positioned(
    top: 4,
    right: 4,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.amber,
        borderRadius: BorderRadius.circular(4),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.price_change, size: 10, color: Colors.white),
          SizedBox(width: 2),
          Text(
            'P',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    ),
  ),
```

#### F. Add Quick Price Edit Access

**In ProductSelectionScreen GridView:**
```dart
// Modify the long-press handler to check for allowStaffPriceEdit
Consumer<DeviceAuthService>(
  builder: (context, authService, _) {
    final staffRole = authService.staffData?['role']?.toString().toLowerCase() ?? '';
    final isManager = staffRole == 'manager';
    final isOperator = staffRole == 'operator';
    final staffEmail = authService.staffData?['email'] as String? ?? '';
    
    return GestureDetector(
      onLongPress: () {
        // Managers: full edit
        if (isManager && connectivity.isOnline) {
          _showEditItemDialog(item);
        }
        // Operators: price edit only (if enabled for item)
        else if (isOperator && 
                 connectivity.isOnline && 
                 item.allowStaffPriceEdit == true) {
          _showQuickPriceEditDialog(item, staffEmail);
        }
      },
      child: ProductCard(...),
    );
  },
)
```

**Add dialog method:**
```dart
void _showQuickPriceEditDialog(ItemModel item, String staffEmail) {
  final authService = Provider.of<DeviceAuthService>(context, listen: false);
  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (_) => QuickPriceEditDialog(
      item: item,
      shopkeeperId: authService.assignedShopkeeperId!,
      branchId: authService.assignedBranchId!,
      staffEmail: staffEmail,
      onSuccess: () => _loadInventory(forceRefresh: true),
    ),
  );
}
```

---

### 3. vpos-admin (Flutter) - Admin Dashboard

Update `lib/shared/screens/inventory/add_item_screen.dart` and `edit_item_screen.dart`:

**Add toggle similar to vpos-billing implementation above**

---

### 4. vpos-admin-react (React TypeScript) - Admin Dashboard

**File**: `src/components/inventory/InventoryItemForm.tsx` (or similar)

**Add toggle field:**
```typescript
const [allowStaffPriceEdit, setAllowStaffPriceEdit] = useState(false);

// In form JSX:
<div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
  <div className="flex items-center space-x-3">
    <PriceChange className="h-6 w-6 text-blue-600" />
    <div>
      <label className="text-sm font-semibold text-blue-700">
        Allow Staff Price Adjustment
      </label>
      <p className="text-xs text-gray-600">
        Staff can edit selling price on billing device
      </p>
    </div>
  </div>
  <Switch
    checked={allowStaffPriceEdit}
    onChange={setAllowStaffPriceEdit}
    className="bg-blue-600"
  />
</div>
```

---

## 🔒 Security Considerations

1. **Permission Checks**:
   - Only managers can enable/disable `allowStaffPriceEdit` toggle
   - Staff operators can only edit price if toggle is enabled
   - Price cannot exceed MRP

2. **Audit Trail**:
   - Every toggle change is logged with user email and timestamp
   - Every price edit is logged in `priceEditHistory`
   - Price changes visible in item history

3. **Validation**:
   - New price must be > 0
   - New price must be ≤ MRP
   - Cloud Function validates `allowStaffPriceEdit` flag before allowing update

## 📊 Testing Checklist

- [ ] Manager can enable toggle in add item dialog (vpos-billing)
- [ ] Manager can enable toggle in edit item dialog (vpos-billing)  
- [ ] Manager can enable toggle in vpos-admin Flutter
- [ ] Manager can enable toggle in vpos-admin-react
- [ ] Toggle shows audit trail (who enabled, when)
- [ ] Product card shows "P" badge when price editable
- [ ] Operator can long-press to edit price (price edit icon visible)
- [ ] Quick price edit dialog opens for operators
- [ ] Price update validates against MRP
- [ ] Price update saves to Firestore with audit trail
- [ ] Inventory refreshes after price update
- [ ] Price edit fails if toggle is disabled
- [ ] Price edit fails if user is offline
- [ ] Manager sees full edit dialog, operator sees price-only dialog

## 🚀 Deployment Steps

1. **Update Cloud Functions** - Deploy with new `allowStaffPriceEdit` field support
2. **Update vpos-billing** - Add toggle to dialogs, create quick price edit dialog
3. **Update vpos-admin Flutter** - Add toggle to inventory screens
4. **Update vpos-admin-react** - Add toggle to inventory forms
5. **Test thoroughly** - All roles, online/offline, permissions
6. **Deploy to production** - After successful dev testing

---

**Feature Name**: "Staff Price Adjustment" or "Quick Price Edit"  
**Status**: Ready for Implementation  
**Priority**: High (improves operational efficiency)
