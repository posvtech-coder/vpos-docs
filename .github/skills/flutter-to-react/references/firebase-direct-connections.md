# Firebase Direct Connections — Flutter to React Migration

This file maps every Firebase service used directly in `vpos-admin` (Flutter) to its
exact React/JS SDK equivalent, including Auth, Firestore, Storage, FCM, RTDB, and App Check.

---

## 1. Firebase Initialisation

```ts
// src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getMessaging, isSupported as isFCMSupported } from "firebase/messaging";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL, // for RTDB presence
};

export const app       = initializeApp(firebaseConfig);
export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const storage   = getStorage(app);
export const rtdb      = getDatabase(app);
export const functions = getFunctions(app, "asia-south1"); // MUST match Flutter region

// App Check — mirrors Flutter's reCAPTCHA v3 web provider
if (import.meta.env.PROD) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
} else {
  // Enable debug token for local dev (set FIREBASE_APPCHECK_DEBUG_TOKEN in .env)
  (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN ?? true;
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

// Local emulator wiring (dev only)
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === "true") {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
}
```

---

## 2. Firebase Auth

### Flutter patterns → React equivalents

| Flutter | React (firebase/auth) |
|---------|----------------------|
| `signInWithEmailAndPassword` | `signInWithEmailAndPassword(auth, email, pass)` |
| `authStateChanges().listen(...)` | `onAuthStateChanged(auth, cb)` — in `useEffect` |
| `user.getIdTokenResult(true)` | `user.getIdTokenResult(true)` — identical API |
| `claims['role']` | `result.claims['role']` |
| `sendPasswordResetEmail` | `sendPasswordResetEmail(auth, email)` |
| `setPersistence(Persistence.LOCAL)` | `setPersistence(auth, browserLocalPersistence)` |
| `setPersistence(Persistence.SESSION)` | `setPersistence(auth, browserSessionPersistence)` |
| `signOut()` | `signOut(auth)` |

### Auth store (Zustand) — mirrors Flutter AuthProvider

```ts
// src/store/useAuthStore.ts
import { create } from "zustand";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  setPersistence, browserLocalPersistence, browserSessionPersistence,
  User, IdTokenResult,
} from "firebase/auth";
import { auth } from "../services/firebase";

interface AppUser {
  uid: string;
  email: string | null;
  role: string;
  parentShopkeeperId?: string;
  claims: Record<string, unknown>;
}

interface AuthStore {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  firebaseUser: null,
  loading: true,

  login: async (email, password, remember) => {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const tokenResult: IdTokenResult = await cred.user.getIdTokenResult(true);
    set({
      firebaseUser: cred.user,
      user: {
        uid: cred.user.uid,
        email: cred.user.email,
        role: String(tokenResult.claims["role"] ?? ""),
        parentShopkeeperId: tokenResult.claims["parentShopkeeperId"] as string | undefined,
        claims: tokenResult.claims,
      },
    });
    // Mirror Flutter: start periodic token refresh every 5 min
    startTokenRefresh();
  },

  logout: async () => {
    stopTokenRefresh();
    await signOut(auth);
    set({ user: null, firebaseUser: null });
  },

  refreshToken: async () => {
    const fbUser = get().firebaseUser;
    if (!fbUser) return;
    const tokenResult = await fbUser.getIdTokenResult(true);
    set(s => s.user
      ? { user: { ...s.user, role: String(tokenResult.claims["role"] ?? ""), claims: tokenResult.claims } }
      : {}
    );
  },
}));

// Mirror Flutter's Timer.periodic(Duration(minutes: 5), ...)
let refreshInterval: ReturnType<typeof setInterval> | null = null;
function startTokenRefresh() {
  stopTokenRefresh();
  refreshInterval = setInterval(() => useAuthStore.getState().refreshToken(), 5 * 60 * 1000);
}
function stopTokenRefresh() {
  if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
}

// Bootstrap — call once in App.tsx
export function initAuth() {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const tokenResult = await fbUser.getIdTokenResult(true);
      useAuthStore.setState({
        firebaseUser: fbUser,
        user: {
          uid: fbUser.uid,
          email: fbUser.email,
          role: String(tokenResult.claims["role"] ?? ""),
          parentShopkeeperId: tokenResult.claims["parentShopkeeperId"] as string | undefined,
          claims: tokenResult.claims,
        },
        loading: false,
      });
      startTokenRefresh();
    } else {
      stopTokenRefresh();
      useAuthStore.setState({ user: null, firebaseUser: null, loading: false });
    }
  });
}
```

---

## 3. Firestore — Direct Collections

### Collections accessed directly (not via Cloud Functions)

| Collection | React pattern | Notes |
|------------|--------------|-------|
| `users/{uid}` | `getDoc(doc(db, "users", uid))` | Post-login profile fetch |
| `users` | `getDocs(query(..., where(...), orderBy(...)))` | Admin listing |
| `users` | `onSnapshot(query(...))` | Real-time admin/agent lists |
| `shopkeepers` | `onSnapshot(collection(db, "shopkeepers"))` | Service agent dashboard |
| `shopkeepers/{id}` | `getDoc(doc(db, "shopkeepers", id))` | Profile fetch |
| `shopkeepers/{id}/branches` | `getDocs(query(..., where("isActive", "==", true), orderBy("createdAt")))` | Branch picker |
| `shopkeepers/{id}/managers/{uid}` | `getDoc(doc(db, "shopkeepers", id, "managers", uid))` | Manager profile |
| `devices` | `onSnapshot(collection(db, "devices"))` | Live device list |

### Reusable Firestore hooks

```ts
// src/hooks/useDocument.ts
import { useEffect, useState } from "react";
import { doc, onSnapshot, DocumentData } from "firebase/firestore";
import { db } from "../services/firebase";

export function useDocument<T = DocumentData>(path: string, id: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, path, id),
      (snap) => { setData(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null); setLoading(false); },
      (err) => { setError(err); setLoading(false); }
    );
    return unsub;
  }, [path, id]);

  return { data, loading, error };
}

// src/hooks/useCollection.ts
import { useEffect, useState } from "react";
import { collection, query, onSnapshot, QueryConstraint, DocumentData } from "firebase/firestore";
import { db } from "../services/firebase";

export function useCollection<T = DocumentData>(path: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, path), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => { setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as T))); setLoading(false); },
      (err) => { setError(err); setLoading(false); }
    );
    return unsub;
  }, [path, JSON.stringify(constraints)]);  // stable dep

  return { data, loading, error };
}
```

### Usage examples

```ts
// Real-time admin list (mirrors Flutter: users.where('role','admin').snapshots())
import { where, orderBy } from "firebase/firestore";
const { data: admins, loading } = useCollection<AppUser>("users", [
  where("role", "==", "admin"),
  orderBy("createdAt", "desc"),
]);

// Real-time device list
const { data: devices } = useCollection("devices");

// Real-time presence — see RTDB section below
```

---

## 4. Cloud Functions — Callable

All 60+ Cloud Functions use `httpsCallable` via the shared caller defined below.
The region **must** be `asia-south1` — same as Flutter's `FirebaseFunctions.instanceFor(region: 'asia-south1')`.

```ts
// src/services/functions.ts
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase"; // already region-locked to asia-south1

export class FunctionError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message); this.name = "FunctionError";
  }
}

export async function call<TReq, TRes>(name: string, data: TReq): Promise<TRes> {
  const fn = httpsCallable<TReq, TRes>(functions, name);
  try {
    return (await fn(data)).data;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string; details?: unknown };
    throw new FunctionError(err.code ?? "unknown", err.message ?? "Error", err.details);
  }
}

// ── Typed callers (add one per function) ──────────────────────────────────────

// Auth / Users
export const createServiceAgent       = (d: unknown) => call("createServiceAgent", d);
export const updateServiceAgentStatus = (d: unknown) => call("updateServiceAgentStatus", d);
export const toggleUserAuth           = (d: unknown) => call("toggleUserAuth", d);
export const getUserAuthStatus        = (d: unknown) => call("getUserAuthStatus", d);
export const updateEmployeeProfile    = (d: unknown) => call("updateEmployeeProfile", d);

// Shopkeepers
export const createShopkeeperAccount  = (d: unknown) => call("createShopkeeperAccount", d);
export const updateShopkeeperProfile  = (d: unknown) => call("updateShopkeeperProfile", d);
export const getShopkeeperOrBranchDetails = (d: unknown) => call("getShopkeeperOrBranchDetails", d);

// Branches
export const getBranchDetails         = (d: unknown) => call("getBranchDetails", d);
export const getBranchGstConfig       = (d: unknown) => call("getBranchGstConfig", d);
export const createBranchSubcollection = (d: unknown) => call("createBranchSubcollection", d);
export const updateBranchSubcollection = (d: unknown) => call("updateBranchSubcollection", d);
export const getMyBranchesSubcollection = (d: unknown) => call("getMyBranchesSubcollection", d);

// Managers
export const createManagerSubcollection        = (d: unknown) => call("createManagerSubcollection", d);
export const getMyManagersSubcollection        = (d: unknown) => call("getMyManagersSubcollection", d);
export const updateManagerProfileSubcollection = (d: unknown) => call("updateManagerProfileSubcollection", d);
export const getBranchManagers                 = (d: unknown) => call("getBranchManagers", d);
export const getManagerBranchDetails           = (d: unknown) => call("getManagerBranchDetails", d);

// Inventory
export const getInventory            = (d: unknown) => call("getInventory", d);
export const addInventoryItem        = (d: unknown) => call("addInventoryItem", d);
export const updateInventoryItem     = (d: unknown) => call("updateInventoryItem", d);
export const deleteInventoryItem     = (d: unknown) => call("deleteInventoryItem", d);
export const bulkUpdatePrice         = (d: unknown) => call("bulkUpdatePrice", d);
export const bulkUpdateStock         = (d: unknown) => call("bulkUpdateStock", d);
export const checkInventoryDuplicates = (d: unknown) => call("checkInventoryDuplicates", d);
export const getItemHistory          = (d: unknown) => call("getItemHistory", d);

// Categories
export const getCategories  = (d: unknown) => call("getCategories", d);
export const addCategory    = (d: unknown) => call("addCategory", d);
export const updateCategory = (d: unknown) => call("updateCategory", d);
export const deleteCategory = (d: unknown) => call("deleteCategory", d);

// Billing
export const saveBill            = (d: unknown) => call("saveBill", d);
export const getBill             = (d: unknown) => call("getBill", d);
export const getBills            = (d: unknown) => call("getBills", d);
export const getBillsByDateRange = (d: unknown) => call("getBillsByDateRange", d);
export const getBranchBills      = (d: unknown) => call("getBranchBills", d);
export const getBillingData      = (d: unknown) => call("getBillingData", d);
export const getBillByInvoice    = (d: unknown) => call("getBillByInvoice", d);
export const queryBills          = (d: unknown) => call("queryBills", d);
export const billReturn          = (d: unknown) => call("billReturn", d);
export const returnRequest       = (d: unknown) => call("returnRequest", d);
export const fetchBranchCustomers = (d: unknown) => call("fetchBranchCustomers", d);
export const getCustomerInvoices = (d: unknown) => call("getCustomerInvoices", d);

// Devices
export const registerDevice               = (d: unknown) => call("registerDevice", d);
export const registerDeviceFromQR         = (d: unknown) => call("registerDeviceFromQR", d);
export const scanDeviceQR                 = (d: unknown) => call("scanDeviceQR", d);
export const assignDevice                 = (d: unknown) => call("assignDevice", d);
export const updateDeviceStatus           = (d: unknown) => call("updateDeviceStatus", d);
export const getDeviceAssignmentHistory   = (d: unknown) => call("getDeviceAssignmentHistory", d);
export const getBranchDevices             = (d: unknown) => call("getBranchDevices", d);
export const extendDeviceValidity         = (d: unknown) => call("extendDeviceValidity", d);

// Permissions
export const getUserPermissions     = (d: unknown) => call("getUserPermissions", d);
export const updateUserPermissions  = (d: unknown) => call("updateUserPermissions", d);
export const checkUserPermission    = (d: unknown) => call("checkUserPermission", d);
export const getBulkUserPermissions = (d: unknown) => call("getBulkUserPermissions", d);

// Reports
export const emailReport                  = (d: unknown) => call("emailReport", d);
export const getBranchEmailReportSettings = (d: unknown) => call("getBranchEmailReportSettings", d);
export const updateBranchEmailReportSettings = (d: unknown) => call("updateBranchEmailReportSettings", d);

// Admin
export const getCloudStatistics = (d: unknown) => call("getCloudStatistics", d);
export const getFunctionLogs    = (d: unknown) => call("getFunctionLogs", d);
export const getFunctionStats   = (d: unknown) => call("getFunctionStats", d);

// Staff
export const getBranchStaff = (d: unknown) => call("getBranchStaff", d);
export const createStaff    = (d: unknown) => call("createStaff", d);
export const updateStaff    = (d: unknown) => call("updateStaff", d);
export const deleteStaff    = (d: unknown) => call("deleteStaff", d);
```

### Using functions with React Query

```ts
// Pattern: wrap every function call in useQuery / useMutation
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as fn from "../services/functions";

// Read
export function useBranchDetails(branchId: string) {
  return useQuery({
    queryKey: ["branch", branchId],
    queryFn: () => fn.getBranchDetails({ branchId }),
    enabled: !!branchId,
    staleTime: 60_000,
  });
}

// Write
export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn.updateInventoryItem,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["inventory", (vars as { branchId: string }).branchId] });
    },
  });
}
```

---

## 5. Firebase Storage

```ts
// src/services/storage.ts
import {
  ref, uploadBytes, getDownloadURL, deleteObject, ref as storageRef,
} from "firebase/storage";
import { storage } from "./firebase";

// Employee / service agent photo
// Mirrors: employee_photos/{filename}
export async function uploadEmployeePhoto(uid: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const r = ref(storage, `employee_photos/${uid}_${Date.now()}.${ext}`);
  await uploadBytes(r, file, { contentType: file.type });
  return getDownloadURL(r);
}

// Product image
// Mirrors: shopkeepers/{id}/branches/{id}/inventory/{productId}/images/{filename}
export async function uploadProductImage(
  shopkeeperId: string, branchId: string, productId: string, file: File
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `shopkeepers/${shopkeeperId}/branches/${branchId}/inventory/${productId}/images/${Date.now()}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type });
  return getDownloadURL(r);
}

// Category image
// Mirrors: shopkeepers/{id}/branches/{id}/categories/{categoryId}/images/{filename}
export async function uploadCategoryImage(
  shopkeeperId: string, branchId: string, categoryId: string, file: File
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `shopkeepers/${shopkeeperId}/branches/${branchId}/categories/${categoryId}/images/${Date.now()}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type });
  return getDownloadURL(r);
}

// Delete old photo by URL (same as Flutter's refFromURL().delete())
export async function deletePhotoByUrl(url: string): Promise<void> {
  const r = storageRef(storage, url); // accepts full URL
  await deleteObject(r);
}
```

### Image upload component pattern

```tsx
export function ImageUploadField({
  value, onChange, onDelete,
}: { value?: string; onChange: (url: string) => void; onDelete?: () => void }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate: type + max 5 MB
    if (!file.type.startsWith("image/")) return toast.error("Only images allowed");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max file size is 5 MB");
    setUploading(true);
    try {
      const url = await uploadEmployeePhoto("temp", file); // replace with correct path fn
      onChange(url);
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  }

  return (
    <div className="flex items-center gap-4">
      {value
        ? <img src={value} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-border" />
        : <div className="w-16 h-16 rounded-full bg-gray-100 border border-border flex items-center justify-center">
            <ImageIcon size={20} className="text-muted" />
          </div>
      }
      <label className="btn-secondary cursor-pointer">
        {uploading ? <Spinner size="sm" /> : "Choose image"}
        <input type="file" accept="image/*" className="sr-only" onChange={handleFile} disabled={uploading} />
      </label>
      {value && onDelete && (
        <button onClick={onDelete} className="text-error hover:text-red-700 text-sm">Remove</button>
      )}
    </div>
  );
}
```

---

## 6. Firebase Realtime Database (Device Presence)

Mirrors Flutter's `database.ref('device_presence').onValue` stream.

```ts
// src/hooks/useDevicePresence.ts
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "../services/firebase";

export interface PresenceRecord {
  online: boolean;
  lastSeen: number;
  deviceId: string;
}

// All devices (mirrors Flutter's full device_presence stream)
export function useAllDevicePresence() {
  const [presence, setPresence] = useState<Record<string, PresenceRecord>>({});
  useEffect(() => {
    const r = ref(rtdb, "device_presence");
    const unsub = onValue(r, (snap) => setPresence(snap.val() ?? {}));
    return () => unsub();
  }, []);
  return presence;
}

// Single device history (mirrors getDevicePresenceHistory one-time get)
export function useDevicePresenceHistory(deviceId: string) {
  const [history, setHistory] = useState<PresenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!deviceId) return;
    const r = ref(rtdb, `device_presence_history/${deviceId}`);
    const unsub = onValue(r, (snap) => {
      const val = snap.val();
      setHistory(val ? Object.values(val) : []);
      setLoading(false);
    }, { onlyOnce: true }); // one-time get — mirrors Flutter's .get()
    return () => unsub();
  }, [deviceId]);
  return { history, loading };
}
```

---

## 7. Firebase Cloud Messaging (FCM)

Mirrors Flutter's `fcm_notification_service.dart` for web.

```ts
// src/services/fcm.ts
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app } from "./firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export async function initFCM(): Promise<string | null> {
  if (!await isSupported()) return null; // FCM not supported in this browser
  const messaging = getMessaging(app);

  // Request permission (mirrors _messaging.requestPermission())
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  // Get FCM token (mirrors _messaging.getToken())
  const token = await getToken(messaging, { vapidKey: VAPID_KEY });

  // Handle foreground messages
  onMessage(messaging, (payload) => {
    const { title = "Notification", body = "" } = payload.notification ?? {};
    toast(body, { description: title }); // use sonner
  });

  return token;
}
```

**Service worker** (`public/firebase-messaging-sw.js`) — required for background messages:
```js
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js");

firebase.initializeApp({ /* same config */ });
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(
    payload.notification?.title ?? "VPOS",
    { body: payload.notification?.body, icon: "/icon-192.png" }
  );
});
```

---

## 8. Firebase App Check

Already initialised in `firebase.ts` above. No further setup needed per-feature —
App Check tokens are automatically attached to all Firestore, Storage, and Functions calls.

For local development, set in `.env.local`:
```
VITE_APPCHECK_DEBUG_TOKEN=your-debug-token-from-firebase-console
```

---

## Summary — What Connects Directly vs. Via Functions

| Data / Operation | Connect directly (Firestore/RTDB) | Via Cloud Function |
|-----------------|:---------------------------------:|:-----------------:|
| Auth state / token | ✅ | — |
| User profile (`users/{uid}`) | ✅ | — |
| Admin/agent lists | ✅ (real-time) | — |
| Shopkeeper list | ✅ (real-time for service agents) | — |
| Branch list for shopkeeper | ✅ | — |
| Device presence | ✅ (RTDB) | — |
| Everything else (billing, inventory, devices, managers, reports…) | — | ✅ callable |
| Storage uploads | ✅ | — |
| FCM token registration | ✅ (token get) | ✅ (register to backend) |
