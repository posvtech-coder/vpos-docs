# Legal Consent Management System - VPOS

**Date**: June 2, 2026  
**Purpose**: Automatically show consent dialog when privacy policy/terms are updated  
**Compliance**: IT Act 2000, Consumer Protection Act 2019

---

## 🎯 Problem Statement

**Current Privacy Policy Claims**:
> "We may update this policy occasionally. When we do, we will:
> - Show a notification on the login screen
> - Continued use of VPOS means you accept any changes"

**Issues**:
- ❌ "Show notification on login" → NOT IMPLEMENTED
- ❌ "Continued use = acceptance" → Weak legally, bad UX
- ❌ No tracking of who accepted which version
- ❌ No automated consent flow when documents are updated

---

## ✅ Recommended Solution

### **System Components**:

1. **Version Tracking** - Track privacy policy & terms versions in Firestore
2. **Consent Records** - Store who accepted which version when
3. **Automatic Consent Dialog** - Block app access until user accepts latest version
4. **Admin Control** - Update documents and trigger consent requirement

---

## 📊 Database Schema

### **Collection: `legal_documents`**

Stores current versions of legal documents:

```javascript
legal_documents/
├── privacy_policy/
│   ├── version: "2.1"
│   ├── effectiveDate: Timestamp(June 2, 2026)
│   ├── url: "https://vposindia.com/legal/privacy-policy.html"
│   ├── changelog: "Removed payment services claim, updated third-party services"
│   ├── requiresConsent: true  // Set to true when admin updates it
│   ├── updatedAt: Timestamp
│   └── updatedBy: "admin_uid_123"
│
└── terms_and_conditions/
    ├── version: "1.3"
    ├── effectiveDate: Timestamp(March 15, 2026)
    ├── url: "https://vposindia.com/legal/terms-and-conditions.html"
    ├── changelog: "Updated data retention periods"
    ├── requiresConsent: false  // Minor change, no consent required
    ├── updatedAt: Timestamp
    └── updatedBy: "admin_uid_456"
```

### **Subcollection: `users/{userId}/consentRecords` or `shopkeepers/{shopkeeperId}/consentRecords`**

Stores consent history for each user:

```javascript
shopkeepers/{shopkeeperId}/consentRecords/
├── privacy_policy_v2.1/
│   ├── documentType: "privacy_policy"
│   ├── version: "2.1"
│   ├── acceptedAt: Timestamp
│   ├── ipAddress: "103.15.240.10" (optional)
│   ├── userAgent: "Mozilla/5.0 ..." (optional)
│   └── deviceInfo: "Android 13, VPOS v1.0.7" (optional)
│
├── terms_and_conditions_v1.3/
│   ├── documentType: "terms_and_conditions"
│   ├── version: "1.3"
│   ├── acceptedAt: Timestamp
│   └── ...
│
└── privacy_policy_v2.0/  // Historical record
    ├── documentType: "privacy_policy"
    ├── version: "2.0"
    ├── acceptedAt: Timestamp(March 1, 2026)
    └── ...
```

---

## 🔧 Implementation

### **Cloud Functions**

#### **1. Check If User Needs Consent**

**Function**: `checkConsentRequired`

```javascript
// File: vpos-admin/functions/src/legal/consent.functions.ts

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

/**
 * Check if user needs to accept updated legal documents
 * 
 * Returns list of documents that require consent
 */
export const checkConsentRequired = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = request.auth.uid;
  
  // Get current legal document versions
  const legalDocsSnapshot = await admin.firestore()
    .collection('legal_documents')
    .where('requiresConsent', '==', true)
    .get();

  if (legalDocsSnapshot.empty) {
    return {
      consentRequired: false,
      documents: []
    };
  }

  // Check user's consent records
  const consentRecordsSnapshot = await admin.firestore()
    .collection('shopkeepers')
    .doc(userId)
    .collection('consentRecords')
    .get();

  const userConsents = new Map();
  consentRecordsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    userConsents.set(data.documentType, data.version);
  });

  // Find documents that need consent
  const documentsNeedingConsent = [];
  
  for (const doc of legalDocsSnapshot.docs) {
    const docData = doc.data();
    const documentType = doc.id;
    const currentVersion = docData.version;
    const userAcceptedVersion = userConsents.get(documentType);

    // User needs to consent if:
    // 1. Never consented before, OR
    // 2. Consented to older version
    if (!userAcceptedVersion || userAcceptedVersion !== currentVersion) {
      documentsNeedingConsent.push({
        type: documentType,
        version: currentVersion,
        url: docData.url,
        effectiveDate: docData.effectiveDate,
        changelog: docData.changelog
      });
    }
  }

  return {
    consentRequired: documentsNeedingConsent.length > 0,
    documents: documentsNeedingConsent
  };
});
```

#### **2. Record User Consent**

**Function**: `recordConsent`

```javascript
/**
 * Record user's acceptance of legal documents
 * 
 * Parameters:
 * - documentType: "privacy_policy" or "terms_and_conditions"
 * - version: "2.1"
 * - accepted: true/false
 */
export const recordConsent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const { documentType, version, accepted } = request.data;

  if (!documentType || !version || accepted !== true) {
    throw new HttpsError('invalid-argument', 'Invalid consent data');
  }

  const userId = request.auth.uid;

  // Verify document version exists
  const legalDocRef = admin.firestore()
    .collection('legal_documents')
    .doc(documentType);
  
  const legalDoc = await legalDocRef.get();
  
  if (!legalDoc.exists) {
    throw new HttpsError('not-found', 'Legal document not found');
  }

  if (legalDoc.data().version !== version) {
    throw new HttpsError('invalid-argument', 'Version mismatch');
  }

  // Record consent
  const consentId = `${documentType}_v${version.replace(/\./g, '_')}`;
  
  await admin.firestore()
    .collection('shopkeepers')
    .doc(userId)
    .collection('consentRecords')
    .doc(consentId)
    .set({
      documentType,
      version,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: request.rawRequest?.ip || null,
      userAgent: request.rawRequest?.headers['user-agent'] || null
    });

  // Update legal document to mark consent no longer required (optional)
  // Only if ALL users have consented (you'd need to track this separately)

  // Log activity
  await admin.firestore()
    .collection('activity_logs')
    .add({
      userId,
      action: 'consent_recorded',
      documentType,
      version,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

  return {
    success: true,
    message: `Consent recorded for ${documentType} v${version}`
  };
});
```

#### **3. Update Legal Document (Admin Only)**

**Function**: `updateLegalDocument`

```javascript
/**
 * Update legal document version and trigger consent requirement
 * 
 * Admin only - triggers consent flow for all users
 */
export const updateLegalDocument = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  // Verify admin role
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(request.auth.uid)
    .get();

  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  const { documentType, version, url, changelog, requiresConsent } = request.data;

  if (!documentType || !version || !url) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  // Update legal document
  await admin.firestore()
    .collection('legal_documents')
    .doc(documentType)
    .set({
      version,
      effectiveDate: admin.firestore.FieldValue.serverTimestamp(),
      url,
      changelog: changelog || 'Document updated',
      requiresConsent: requiresConsent !== false, // Default to true
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid
    });

  // Log activity
  await admin.firestore()
    .collection('activity_logs')
    .add({
      userId: request.auth.uid,
      action: 'legal_document_updated',
      documentType,
      version,
      requiresConsent,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

  return {
    success: true,
    message: `${documentType} updated to v${version}. ${requiresConsent ? 'User consent required.' : 'No consent required.'}`
  };
});
```

---

## 🎨 Flutter UI Implementation

### **1. Consent Dialog Widget**

**File**: `vpos-admin/lib/shared/widgets/consent_dialog.dart`

```dart
import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:url_launcher/url_launcher.dart';

/// Consent dialog shown on login when legal documents are updated
class ConsentDialog extends StatefulWidget {
  final List<Map<String, dynamic>> documents;
  final VoidCallback onConsented;

  const ConsentDialog({
    super.key,
    required this.documents,
    required this.onConsented,
  });

  @override
  State<ConsentDialog> createState() => _ConsentDialogState();
}

class _ConsentDialogState extends State<ConsentDialog> {
  final Map<String, bool> _acceptedDocs = {};
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    // Initialize acceptance map
    for (var doc in widget.documents) {
      _acceptedDocs[doc['type']] = false;
    }
  }

  bool get allAccepted => _acceptedDocs.values.every((accepted) => accepted);

  Future<void> _submitConsent() async {
    if (!allAccepted) return;

    setState(() => _isSubmitting = true);

    try {
      final functions = FirebaseFunctions.instanceFor(region: 'asia-south1');
      
      // Record consent for each document
      for (var doc in widget.documents) {
        await functions.httpsCallable('recordConsent').call({
          'documentType': doc['type'],
          'version': doc['version'],
          'accepted': true,
        });
      }

      if (mounted) {
        widget.onConsented();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to record consent: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => false, // Prevent dismissal
      child: AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.policy, color: Colors.blue),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Updated Legal Documents',
                style: TextStyle(fontSize: 18),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'We\'ve updated our legal documents. Please review and accept to continue using VPOS.',
                style: TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 16),
              
              // List documents that need acceptance
              ...widget.documents.map((doc) => _buildDocumentCard(doc)),
              
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.orange, size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'You must accept all documents to continue using the app.',
                        style: TextStyle(fontSize: 12, color: Colors.orange),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          ElevatedButton(
            onPressed: (allAccepted && !_isSubmitting) ? _submitConsent : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
              disabledBackgroundColor: Colors.grey.shade300,
            ),
            child: _isSubmitting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Text('Accept & Continue'),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentCard(Map<String, dynamic> doc) {
    final String type = doc['type'];
    final String version = doc['version'];
    final String? changelog = doc['changelog'];
    final String url = doc['url'];
    
    final bool isAccepted = _acceptedDocs[type] ?? false;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isAccepted ? Colors.green : Colors.grey.shade300,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  type == 'privacy_policy' 
                      ? 'Privacy Policy' 
                      : 'Terms & Conditions',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue.shade100,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'v$version',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.blue.shade700,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          if (changelog != null) ...[
            const SizedBox(height: 8),
            Text(
              changelog,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton.icon(
                onPressed: () async {
                  final uri = Uri.parse(url);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri);
                  }
                },
                icon: const Icon(Icons.open_in_new, size: 16),
                label: const Text('Read Document', style: TextStyle(fontSize: 12)),
              ),
              CheckboxListTile(
                value: isAccepted,
                onChanged: (value) {
                  setState(() {
                    _acceptedDocs[type] = value ?? false;
                  });
                },
                title: const Text(
                  'I accept',
                  style: TextStyle(fontSize: 13),
                ),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                dense: true,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
```

### **2. Login Screen Integration**

**File**: `vpos-admin/lib/features/auth/screens/login_screen.dart`

```dart
// Add after successful login, before navigating to dashboard

Future<void> _checkConsentRequired() async {
  try {
    final result = await FirebaseFunctions.instanceFor(region: 'asia-south1')
        .httpsCallable('checkConsentRequired')
        .call();

    if (result.data['consentRequired'] == true) {
      final List<Map<String, dynamic>> documents = 
          List<Map<String, dynamic>>.from(result.data['documents']);

      if (mounted) {
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => ConsentDialog(
            documents: documents,
            onConsented: () {
              Navigator.pop(context);
              // Now proceed to dashboard
              _navigateToDashboard();
            },
          ),
        );
      }
    } else {
      // No consent required, proceed normally
      _navigateToDashboard();
    }
  } catch (e) {
    print('Error checking consent: $e');
    // Proceed anyway (don't block login if check fails)
    _navigateToDashboard();
  }
}

// Call this after successful authentication
void _onLoginSuccess() {
  _checkConsentRequired();
}
```

---

## 🌐 React UI Implementation

### **1. Consent Modal Component**

**File**: `vpos-admin-react/src/components/ConsentModal.tsx`

```typescript
import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

interface ConsentDocument {
  type: string;
  version: string;
  url: string;
  changelog?: string;
  effectiveDate: any;
}

interface ConsentModalProps {
  documents: ConsentDocument[];
  onConsented: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ documents, onConsented }) => {
  const [acceptedDocs, setAcceptedDocs] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allAccepted = documents.every(doc => acceptedDocs[doc.type]);

  const handleSubmit = async () => {
    if (!allAccepted) return;

    setIsSubmitting(true);
    try {
      const recordConsent = httpsCallable(functions, 'recordConsent');
      
      for (const doc of documents) {
        await recordConsent({
          documentType: doc.type,
          version: doc.version,
          accepted: true
        });
      }

      onConsented();
    } catch (error) {
      console.error('Failed to record consent:', error);
      alert('Failed to record consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center gap-3">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-xl font-semibold">Updated Legal Documents</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto">
          <p className="text-gray-700 mb-4">
            We've updated our legal documents. Please review and accept to continue using VPOS.
          </p>

          {/* Document Cards */}
          <div className="space-y-4">
            {documents.map(doc => (
              <div
                key={doc.type}
                className={`border rounded-lg p-4 ${
                  acceptedDocs[doc.type] ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {doc.type === 'privacy_policy' ? 'Privacy Policy' : 'Terms & Conditions'}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    v{doc.version}
                  </span>
                </div>

                {doc.changelog && (
                  <p className="text-sm text-gray-600 mb-3">{doc.changelog}</p>
                )}

                <div className="flex items-center justify-between">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    Read Document
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedDocs[doc.type] || false}
                      onChange={(e) =>
                        setAcceptedDocs(prev => ({ ...prev, [doc.type]: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">I accept</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Warning */}
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-orange-800">
              You must accept all documents to continue using the app.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!allAccepted || isSubmitting}
            className={`px-6 py-2 rounded-lg font-medium ${
              allAccepted && !isSubmitting
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Processing...' : 'Accept & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### **2. Login Integration**

**File**: `vpos-admin-react/src/screens/auth/LoginScreen.tsx`

```typescript
import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/firebase';
import { ConsentModal } from '../../components/ConsentModal';

// After successful login
const handleLoginSuccess = async () => {
  try {
    const checkConsent = httpsCallable(functions, 'checkConsentRequired');
    const result = await checkConsent();
    
    const data = result.data as any;
    
    if (data.consentRequired) {
      setShowConsentModal(true);
      setConsentDocuments(data.documents);
    } else {
      // Proceed to dashboard
      navigate('/dashboard');
    }
  } catch (error) {
    console.error('Error checking consent:', error);
    // Proceed anyway (don't block login)
    navigate('/dashboard');
  }
};

// In component JSX
{showConsentModal && (
  <ConsentModal
    documents={consentDocuments}
    onConsented={() => {
      setShowConsentModal(false);
      navigate('/dashboard');
    }}
  />
)}
```

---

## 🔒 Admin UI: Update Legal Documents

### **Admin Screen Component**

**File**: `vpos-admin-react/src/screens/admin/LegalDocumentsScreen.tsx`

```typescript
import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/firebase';

export const LegalDocumentsScreen = () => {
  const [documentType, setDocumentType] = useState('privacy_policy');
  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [requiresConsent, setRequiresConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!version.trim()) {
      alert('Version is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateDoc = httpsCallable(functions, 'updateLegalDocument');
      
      await updateDoc({
        documentType,
        version: version.trim(),
        url: `https://vposindia.com/legal/${
          documentType === 'privacy_policy' ? 'privacy-policy' : 'terms-and-conditions'
        }.html`,
        changelog: changelog.trim() || 'Document updated',
        requiresConsent
      });

      alert(
        `${documentType === 'privacy_policy' ? 'Privacy Policy' : 'Terms & Conditions'} ` +
        `updated to v${version}. ${requiresConsent ? 'Users will be prompted to consent on next login.' : 'No consent required.'}`
      );

      // Reset form
      setVersion('');
      setChangelog('');
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Failed to update document. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Update Legal Documents</h1>

      <div className="max-w-2xl bg-white rounded-lg shadow p-6">
        {/* Document Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value="privacy_policy">Privacy Policy</option>
            <option value="terms_and_conditions">Terms & Conditions</option>
          </select>
        </div>

        {/* Version */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Version *
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="e.g., 2.1"
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use semantic versioning (e.g., 1.0, 2.1, 3.0)
          </p>
        </div>

        {/* Changelog */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Changelog
          </label>
          <textarea
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            placeholder="Describe what changed (e.g., 'Removed payment services claim, updated third-party services')"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 h-24"
          />
        </div>

        {/* Requires Consent */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresConsent}
              onChange={(e) => setRequiresConsent(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Require user consent (show consent dialog on next login)
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Check this for major changes that affect user rights or data handling.
            Uncheck for minor updates like typo fixes.
          </p>
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">⚠️ Important</p>
              <p>
                If "Require user consent" is checked, all users will see a consent dialog 
                on their next login and MUST accept to continue using the app.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !version.trim()}
          className={`w-full py-3 rounded-lg font-medium ${
            isSubmitting || !version.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Updating...' : 'Update Document & Notify Users'}
        </button>
      </div>
    </div>
  );
};
```

---

## 📋 Firestore Security Rules

```javascript
// legal_documents collection
match /legal_documents/{documentId} {
  allow read: if true; // Anyone can read current versions
  allow write: if isAdmin(); // Only admins can update
}

// Consent records
match /shopkeepers/{shopkeeperId}/consentRecords/{recordId} {
  allow read: if request.auth.uid == shopkeeperId || isAdmin();
  allow create: if request.auth.uid == shopkeeperId; // Users can only create their own consent
  allow update, delete: if false; // Consent records are immutable
}

// Helper function
function isAdmin() {
  return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

---

## 🚀 Deployment Steps

### **1. Deploy Cloud Functions**

```bash
cd vpos-admin/functions
firebase deploy --only functions:checkConsentRequired,functions:recordConsent,functions:updateLegalDocument
```

### **2. Initialize Legal Documents**

```bash
# Run this ONCE to set up initial documents
firebase firestore:set legal_documents/privacy_policy '{
  "version": "2.1",
  "effectiveDate": {"_seconds": 1717344000, "_nanoseconds": 0},
  "url": "https://vposindia.com/legal/privacy-policy.html",
  "changelog": "Initial version tracking",
  "requiresConsent": false,
  "updatedAt": {"_seconds": 1717344000, "_nanoseconds": 0}
}'

firebase firestore:set legal_documents/terms_and_conditions '{
  "version": "1.3",
  "effectiveDate": {"_seconds": 1710460800, "_nanoseconds": 0},
  "url": "https://vposindia.com/legal/terms-and-conditions.html",
  "changelog": "Initial version tracking",
  "requiresConsent": false,
  "updatedAt": {"_seconds": 1710460800, "_nanoseconds": 0}
}'
```

### **3. Deploy Flutter App**

Build and deploy Flutter app with consent dialog integration.

### **4. Deploy React App**

```bash
cd vpos-admin-react
npm run build
firebase deploy --only hosting
```

---

## 🧪 Testing Checklist

### **Manual Testing**

- [ ] Admin updates privacy policy version → `requiresConsent: true`
- [ ] User logs in → Sees consent dialog
- [ ] User cannot dismiss dialog (no X button, back button disabled)
- [ ] User clicks "Read Document" → Opens in new tab
- [ ] User checks all checkboxes → "Accept & Continue" button enabled
- [ ] User clicks "Accept & Continue" → Consent recorded in Firestore
- [ ] User redirected to dashboard
- [ ] User logs out and logs back in → No consent dialog (already consented)
- [ ] Admin checks consent records → See user's acceptance with timestamp

### **Edge Cases**

- [ ] Multiple documents need consent at once (both privacy & terms)
- [ ] User closes app during consent → Dialog shows again on next login
- [ ] Network error during consent recording → Show error, don't proceed
- [ ] Admin marks update as `requiresConsent: false` → No dialog shown

---

## 📊 Admin Reporting

**Optional: Consent Compliance Report**

Create an admin screen showing:
- Total users
- Users who have accepted latest version
- Users who haven't accepted yet (need to login)
- Consent acceptance rate over time
- Export to CSV for audit purposes

---

## ⚖️ Legal Compliance

### **Indian Law Requirements**

| Requirement | Implementation | Compliant? |
|-------------|----------------|------------|
| **Notify users of changes** | Consent dialog on login | ✅ YES |
| **Track acceptance** | Firestore consent records | ✅ YES |
| **Allow review before accepting** | "Read Document" link | ✅ YES |
| **Explicit consent for major changes** | Checkbox per document | ✅ YES |
| **Immutable audit trail** | No delete/update on consent records | ✅ YES |
| **Version tracking** | Document versioning system | ✅ YES |

### **Best Practices**

✅ **Do**:
- Show what changed (changelog)
- Allow users to read full document before accepting
- Block app access until consent given (for major changes)
- Keep audit trail of all acceptances
- Use semantic versioning

❌ **Don't**:
- Pre-check checkboxes
- Hide "Read Document" link
- Allow dismissing consent dialog
- Claim "continued use = acceptance" without explicit consent
- Delete old consent records (keep for audit)

---

## 📝 Updated Privacy Policy Wording

Replace the "Changes to This Policy" section with:

```html
<div class="card">
  <h2><span class="icon">📧</span> Changes to This Policy</h2>
  <p>We may update this policy occasionally. When we do, we will:</p>
  <ul>
    <li>Update the "Effective Date" and version number at the top</li>
    <li>Show a consent dialog in the app explaining what changed</li>
    <li>Require you to review and accept the updated policy before continuing to use VPOS</li>
    <li>Keep a record of your acceptance for audit purposes</li>
  </ul>
  
  <p>For minor changes (like typo corrections or clarifications that don't affect your rights), we may not require explicit consent, but we'll still notify you of the update.</p>
  
  <div class="info-box">
    <strong>Your Consent:</strong> By accepting the updated policy in the app, you agree to the new terms. If you don't accept, you won't be able to continue using VPOS.
  </div>
</div>
```

---

## ✅ Summary

**System Features**:
- ✅ Version tracking for privacy policy & terms
- ✅ Automated consent dialog on login
- ✅ Block app access until consent given
- ✅ Track who accepted which version when
- ✅ Admin control to trigger consent flow
- ✅ Immutable audit trail
- ✅ Multi-document consent (privacy + terms together)
- ✅ Changelog visibility
- ✅ "Read Document" links

**Implementation**:
- 3 Cloud Functions (check, record, update)
- Flutter consent dialog widget
- React consent modal component
- Admin UI to update documents
- Firestore schema for versioning
- Security rules for data protection

**Status**: Ready for implementation!

---

**Last Updated**: June 2, 2026  
**Next Steps**: Deploy Cloud Functions, initialize Firestore documents, integrate UI components
