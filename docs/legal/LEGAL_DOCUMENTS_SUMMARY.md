# VPOS Legal Documents Summary

**Last Updated:** June 1, 2026

## 📋 Overview

This document provides a comprehensive summary of VPOS legal policies, data retention periods, user roles, and compliance information. These policies apply to all VPOS applications: VPOS Admin, VPOS Billing, and VPOS Billing Offline.

---

## 👥 User Roles & Permissions

### 1. **Admin** (Platform Administrator)
**Full Access** — Manages the entire VPOS ecosystem

**Capabilities:**
- Create and manage all user accounts (shopkeepers, service agents, admins, managers)
- Register and assign billing devices to branches
- Create and manage subscription plans
- View system-wide reports and analytics
- Enable/disable user accounts
- Schedule account deletions with retention periods
- Manage inventory image deletion schedules
- Full access to all system features

**Access:** VPOS Admin application only

**Created by:** System / Other admins

---

### 2. **Service Agent** (Support Staff)
**Support Role** — Assists shopkeepers with technical and account issues

**Capabilities:**
- Create shopkeeper accounts (if granted permission by admin)
- Update shopkeeper profile information (phone, email, address, GST, etc.)
- View shopkeeper data for support purposes
- Cannot enable/disable accounts
- Cannot change customer types (cloud/offline)
- Cannot modify subscription plans

**Restrictions:**
- Cannot update `isActive` field (enable/disable accounts)
- Cannot update `customerType` field (affects login behavior)
- All other profile fields are editable

**Access:** VPOS Admin application only

**Created by:** Admins only

---

### 3. **Shopkeeper** (Business Owner)
**Business Management** — Manages their own retail business operations

**Capabilities:**
- Create and manage multiple branch locations
- Create and manage manager accounts for their branches
- Manage inventory, categories, and products
- Upload and manage product images
- Process billing transactions
- View sales reports and transaction history
- Configure branch-specific settings (inventory images, price editing, etc.)
- Cannot view other shopkeepers' data

**Access:** VPOS Admin (management) and VPOS Billing applications

**Created by:** Admins or Service Agents (with permission)

**Branch Limit:** Defined by subscription plan

---

### 4. **Manager** (Branch Manager)
**Branch Operations** — Manages specific branches assigned by shopkeeper

**Capabilities:**
- Manage inventory for assigned branches only
- View sales reports for assigned branches
- Process billing transactions
- Cannot create or delete branches
- Cannot modify subscription or device settings
- Cannot view data from unassigned branches

**Access:** VPOS Admin (branch view) and VPOS Billing applications

**Created by:** Shopkeepers only

**Assignment:** Managers are assigned to specific branches and can only access those branches

---

## 🗑️ Data Retention Periods

### Account Retention

| Account Status | Retention Period | Description |
|---------------|------------------|-------------|
| **Active Account** | Indefinite | Data retained while account is active |
| **Deactivated Account** | 90 days | Allows reactivation within 90 days before permanent deletion |
| **Scheduled for Deletion** | 15 days | Grace period to cancel deletion before permanent removal |
| **Manager Account Deletion** | 15 days | Same grace period as shopkeeper accounts |
| **Service Agent Deletion** | 15 days | Standard retention before permanent deletion |

### Transaction & Business Data

| Data Type | Retention Period | Purpose | Compliance |
|-----------|------------------|---------|------------|
| **Sales Transactions** | Minimum 3 years | Tax compliance and audit trail | Indian Income Tax Act |
| **Billing Records** | Minimum 3 years | GST compliance | GST Act |
| **Customer Information** | Indefinite (while active) | Business operations | Consent-based collection |
| **Audit Logs** | 90 days | Security monitoring | Internal policy |
| **Activity Logs** | 90 days | System tracking | Internal policy |

### Inventory & Media

| Data Type | Retention Period | Description |
|-----------|------------------|-------------|
| **Product Images (when disabled)** | 0-365 days (configurable) | Shopkeeper can set delay before deletion |
| **Product Images (feature enabled)** | Indefinite | Images retained while feature is active |
| **Category Data** | Indefinite (while active) | Business operational data |

### System & Backup Data

| Data Type | Retention Period | Purpose |
|-----------|------------------|---------|
| **Deleted User Backups** | 90 days | Recovery and audit trail |
| **Scheduled Task History** | 90 days | System maintenance |
| **Device Scan Logs** | 90 days | Security and diagnostics |
| **Assignment History** | Indefinite | Audit trail for device assignments |

---

## ⚙️ Automated Cleanup Tasks

VPOS uses automated scheduled tasks to maintain data integrity and system performance:

### 1. **Email Report Tasks** (`processEmailTasks`)
- **Schedule:** Daily at 8:00 AM IST
- **Purpose:** Sends daily, weekly, monthly, quarterly, semi-annual, and yearly email reports
- **Location:** Cloud Functions (asia-south1 region)

### 2. **Cleanup Tasks** (`processCleanupTasks`)
- **Schedule:** Daily at 2:00 AM IST
- **Purpose:** Processes DELETE, CLEANUP, ARCHIVE tasks
- **Examples:** Delete old inventory images, clean up expired data
- **Location:** Cloud Functions (asia-south1 region)

### 3. **Transaction Retention** (`processTransactionRetention`)
- **Schedule:** Daily at 2:00 AM IST
- **Purpose:** Archives or deletes transactions older than retention period
- **Minimum Retention:** 3 years (tax compliance)

### 4. **Scheduled Tasks Processor** (`processScheduledTasks`)
- **Schedule:** Daily at 2:00 AM IST
- **Purpose:** Processes pending scheduled tasks from Firestore
- **Examples:** Account deletions after retention period, inventory image deletion

---

## 📊 Inventory Image Deletion Feature

### How It Works

When a shopkeeper or admin disables product images for a branch:

1. **Configuration Phase:**
   - Admin/Service agent enters number of days to keep images (0-365 days)
   - System calculates deletion date = today + configured days
   - Scheduled task is created in Firestore `scheduled_tasks` collection

2. **Retention Phase:**
   - Images remain accessible during the retention period
   - Shopkeeper can re-enable the feature to cancel deletion
   - Task status: `pending`

3. **Deletion Phase:**
   - Automated task runs daily at 2:00 AM IST
   - On scheduled date, images are permanently deleted from Firebase Storage
   - Product `productImageUrl` field is removed from Firestore
   - Task status updated to `completed`

4. **Cancellation:**
   - If feature is re-enabled before deletion date, task is cancelled
   - Images are preserved, task status set to `cancelled`

### Flexibility

- **0 days:** Immediate deletion (within 24 hours)
- **30 days:** Standard retention period
- **90 days:** Extended retention
- **365 days:** Maximum allowed delay

**Use Case:** Temporarily disable images without losing data, useful for testing or troubleshooting.

---

## 🔄 Account Deletion Process

### Scheduled Deletion (15-Day Retention)

**Applicable to:** Shopkeepers, Service Agents, Managers

**Process:**

1. **Admin schedules deletion** via `scheduleShopkeeperDeletion` or similar Cloud Function
2. **15-day grace period begins:**
   - Account remains active
   - Data is fully intact and accessible
   - Account marked with `scheduledDeletionDate` field
3. **During grace period:**
   - Admin can cancel deletion using `cancelScheduledShopkeeperDeletion`
   - Account returns to normal active status
4. **After 15 days:**
   - Automated task `deleteShopkeeperAfterRetention` runs
   - Account permanently deleted
   - All associated data removed (branches, managers, inventory, transactions)
   - Backup created in `deleted_users` and `deleted_shopkeepers` collections (90-day retention)

### Immediate Deactivation (90-Day Retention)

**When an admin disables an account** (without scheduling deletion):

- Account status set to `isActive: false`
- User cannot log in
- Data retained for 90 days
- Can be reactivated within 90 days
- After 90 days, account may be permanently deleted

---

## 🔐 Data Security & Privacy

### Data Storage

- **Platform:** Google Firebase (Cloud Firestore, Firebase Storage)
- **Region:** asia-south1 (Mumbai, India) — data sovereignty
- **Encryption:** TLS in transit, encrypted at rest
- **Access Control:** Role-based security rules, custom JWT claims

### Data Collection

**Mandatory Data:**
- Email address, phone number, business name
- Branch addresses, inventory data
- Sales transaction records

**Optional Data:**
- Customer information during billing (consent-based)
- Aadhaar ID (collected for identity verification only, stored securely)
- Alternative phone numbers, GST numbers

**Not Collected by Value Tech Solutions:**
- End-customer payment details (handled by shopkeeper directly)
- Banking or credit card information

### GDPR & Indian Compliance

- **IT Act 2000:** Compliant with Indian IT regulations
- **Data Localization:** Data stored in India (asia-south1)
- **Consent:** Customer data collection requires explicit consent
- **Right to Access:** Shopkeepers can export their data
- **Right to Deletion:** Account deletion process with retention periods

---

## 📞 Support & Customization Requests

### Contact Support Team

For any questions about legal policies, retention periods, or to request custom configurations:

**Email:** support@vposindia.com  
**Phone:** 090190 69884  
**Hours:** Monday - Saturday, 9:00 AM - 6:00 PM IST

### Custom Retention Periods

If your business requires:
- Longer retention periods (e.g., 5 years for auditing)
- Shorter cleanup cycles
- Custom deletion schedules
- Extended grace periods for account deletion

**Please contact our support team** at support@vposindia.com or call 090190 69884. We will work with you to configure appropriate settings.

### Account Changes

- **Subscription upgrades/downgrades:** Contact support team
- **Branch limit increases:** Contact support team
- **Device registration issues:** Contact support team
- **Password resets:** Use in-app password reset feature
- **Profile updates (shopkeepers):** Can be done via Admin portal

---

## ⚖️ Legal Compliance (India)

### GST Compliance
- Billing system supports GST-compliant invoicing
- Transaction records retained for 3+ years
- GST reporting features available

### Income Tax Compliance
- Sales data retained for minimum 3 years
- Audit trail maintained via activity logs
- Reports available for tax filing

### Consumer Protection Act, 2019
- Shopkeepers responsible for return/refund policies
- Value Tech Solutions not involved in shopkeeper-customer disputes
- Platform provides tools, shopkeeper manages customer relationships

### IT Act, 2000
- Secure data storage and transmission
- Role-based access controls
- Audit logs for security monitoring

---

## 📄 Document Versions

| Document | Last Updated | Effective Date |
|----------|--------------|----------------|
| Terms & Conditions | June 1, 2026 | June 1, 2026 |
| Privacy Policy | June 1, 2026 | June 1, 2026 |
| Data Retention Policy | June 1, 2026 | June 1, 2026 |

**Changes in June 2026 Update:**
- Added detailed user roles and permissions matrix
- Documented all retention periods with purposes
- Added information about automated cleanup tasks
- Included inventory image deletion feature details
- Updated contact information to emphasize support team
- Added customization request process
- Enhanced copyright and compliance sections

---

## 🔗 Related Documents

- [Terms & Conditions (Full HTML)](../../legal/terms-and-conditions.html)
- [Privacy Policy (Full HTML)](../../legal/privacy-policy.html)
- [VPOS Architecture Documentation](../ARCHITECTURE.md)
- [Cloud Functions Documentation](../../vpos-admin/docs/CLOUD_FUNCTIONS.md)
- [Firestore Database Analysis](../VPOS_FIRESTORE_DATABASE_ANALYSIS.md)

---

**© 2024-2026 Value Tech Solutions. All Rights Reserved.**  
VPOS™ is a registered trademark of Value Tech Solutions.
