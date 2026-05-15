# Branch Contract Changes Summary

**Quick Reference for Flutter Implementation**

## Changes Made (May 13, 2026)

### 1. Removed `businessName` field
- Delete from Branch model
- Remove from create/edit screens
- Remove from Cloud Function calls

### 2. Added `email` field
- Add to Branch model as optional String?
- Add email TextField to create/edit screens with validation
- Add email parameter to Cloud Function calls
- vpos-billing-offline: Add database migration to add email column

## Files to Modify

### vpos-billing
```
lib/models/branch.dart
lib/screens/branch/create_branch_screen.dart
lib/screens/branch/edit_branch_screen.dart
lib/services/branch_service.dart
```

### vpos-billing-offline
```
lib/models/branch.dart
lib/screens/branch/create_branch_screen.dart
lib/screens/branch/edit_branch_screen.dart
lib/services/branch_service.dart
lib/data/database/tables.dart
lib/data/database/database_helper.dart (migration)
lib/services/sync/branch_sync_service.dart
```

## Full Documentation
See [BRANCH_CONTRACT_CHANGES_MAY2026.md](./BRANCH_CONTRACT_CHANGES_MAY2026.md) for:
- Complete code examples
- Database migration scripts
- Testing checklist
- Rollback procedures
