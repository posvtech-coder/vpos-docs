# Firebase Flutter SDK → Firebase JS SDK Migration

## Setup

```bash
npm install firebase
```

```ts
// src/services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

## Firestore API Mapping

| Flutter (cloud_firestore) | JS SDK (firebase/firestore) |
|---------------------------|----------------------------|
| `FirebaseFirestore.instance` | `getFirestore(app)` |
| `collection('col')` | `collection(db, 'col')` |
| `doc('col/id')` | `doc(db, 'col', 'id')` |
| `.get()` | `getDocs(query)` / `getDoc(ref)` |
| `.set(data)` | `setDoc(ref, data)` |
| `.update(data)` | `updateDoc(ref, data)` |
| `.delete()` | `deleteDoc(ref)` |
| `.snapshots()` (stream) | `onSnapshot(ref, cb)` |
| `where('field', isEqualTo: v)` | `where('field', '==', v)` |
| `orderBy('field')` | `orderBy('field')` |
| `limit(n)` | `limit(n)` |
| `FieldValue.serverTimestamp()` | `serverTimestamp()` |
| `FieldValue.increment(n)` | `increment(n)` |
| `FieldValue.arrayUnion([…])` | `arrayUnion(…)` |
| `WriteBatch` | `writeBatch(db)` |
| `runTransaction` | `runTransaction(db, async (t) => {…})` |

## Auth API Mapping

| Flutter (firebase_auth) | JS SDK (firebase/auth) |
|-------------------------|------------------------|
| `FirebaseAuth.instance` | `getAuth(app)` |
| `.signInWithEmailAndPassword` | `signInWithEmailAndPassword(auth, email, pass)` |
| `.createUserWithEmailAndPassword` | `createUserWithEmailAndPassword(auth, email, pass)` |
| `.signInAnonymously()` | `signInAnonymously(auth)` |
| `.signOut()` | `signOut(auth)` |
| `.authStateChanges()` | `onAuthStateChanged(auth, cb)` |
| `.currentUser` | `auth.currentUser` |
| `GoogleAuthProvider` | `new GoogleAuthProvider()` + `signInWithPopup` |

## Storage API Mapping

| Flutter (firebase_storage) | JS SDK (firebase/storage) |
|----------------------------|--------------------------|
| `FirebaseStorage.instance.ref(path)` | `ref(storage, path)` |
| `.putFile(file)` | `uploadBytes(ref, file)` |
| `.putData(bytes)` | `uploadBytes(ref, bytes)` |
| `.getDownloadURL()` | `getDownloadURL(ref)` |
| `.delete()` | `deleteObject(ref)` |

## Realtime Firestore Hook Example

```ts
// src/hooks/useCollection.ts
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, Query } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useCollection<T>(path: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, path), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)));
      setLoading(false);
    });
    return unsub;
  }, [path]);
  return { data, loading };
}
```
