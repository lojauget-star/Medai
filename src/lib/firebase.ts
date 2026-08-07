import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously as originalSignInAnonymously, signOut as originalSignOut, onAuthStateChanged as originalOnAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore,
  collection as originalCollection,
  doc as originalDoc,
  query as originalQuery,
  where as originalWhere,
  orderBy as originalOrderBy,
  getDocs as originalGetDocs,
  getDoc as originalGetDoc,
  addDoc as originalAddDoc,
  setDoc as originalSetDoc,
  updateDoc as originalUpdateDoc,
  deleteDoc as originalDeleteDoc,
  onSnapshot as originalOnSnapshot,
  serverTimestamp as originalServerTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// LOCAL GUEST FALLBACK ENGINE (UX Lego/Disney Philosophy: zero friction, works flawlessly even if auth/network fails)
let localGuestUser: any = null;
const authListeners = new Set<(user: any) => void>();
const collectionListeners = new Map<string, Set<() => void>>();

function createMockUser() {
  const rawUser = {
    uid: 'guest-local-uid',
    email: 'convidado@vetmind.com',
    displayName: 'Veterinário Convidado',
    isAnonymous: true,
    emailVerified: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString()
    },
    phoneNumber: null,
    photoURL: null,
    providerId: 'firebase',
    reload: async () => {},
    getIdToken: async () => 'mock-id-token',
    getIdTokenResult: async () => ({ token: 'mock-id-token', claims: {} })
  };

  return new Proxy(rawUser, {
    get(target: any, prop: string | symbol) {
      if (prop in target) {
        return target[prop as any];
      }
      
      if (typeof prop === 'string') {
        if (prop.startsWith('_') || prop === 'reload' || prop === 'getIdToken' || prop === 'getIdTokenResult') {
          return (...args: any[]) => {
            if (prop === 'getIdToken') return Promise.resolve('mock-id-token');
            if (prop === 'getIdTokenResult') return Promise.resolve({ token: 'mock-id-token', claims: {} });
            return undefined;
          };
        }
      }
      return undefined;
    }
  });
}

function notifyAuthStateListeners() {
  const currentUser = auth.currentUser;
  authListeners.forEach(listener => {
    try {
      listener(currentUser);
    } catch (e) {
      console.error("Error in auth state listener:", e);
    }
  });
}

function notifyCollectionListeners(collectionName: string) {
  const listeners = collectionListeners.get(collectionName);
  if (listeners) {
    listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        console.error(`Error in collection listener for ${collectionName}:`, e);
      }
    });
  }
}

export function activateLocalGuestMode() {
  localGuestUser = createMockUser();
  localStorage.setItem('vetmind_local_guest', 'true');
  notifyAuthStateListeners();
}

export function deactivateLocalGuestMode() {
  localGuestUser = null;
  localStorage.removeItem('vetmind_local_guest');
  notifyAuthStateListeners();
}

export function isLocalGuestActive() {
  return !!localGuestUser || localStorage.getItem('vetmind_local_guest') === 'true';
}

// Intercept auth.currentUser property to transparently support mock user across all components
const originalDescriptor = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(auth),
  'currentUser'
);
const originalGetter = originalDescriptor?.get || (() => null);

Object.defineProperty(auth, 'currentUser', {
  get() {
    if (localGuestUser) return localGuestUser;
    if (localStorage.getItem('vetmind_local_guest') === 'true') {
      if (!localGuestUser) {
        localGuestUser = createMockUser();
      }
      return localGuestUser;
    }
    return originalGetter.call(auth);
  },
  set(val) {
    const originalSetter = originalDescriptor?.set;
    if (originalSetter) {
      try {
        originalSetter.call(auth, val);
      } catch (e) {
        console.warn("Error calling original auth.currentUser setter:", e);
      }
    }
  },
  configurable: true
});

// WRAPPED AUTH METHODS
export async function signInAnonymously(authInstance: any) {
  try {
    const result = await originalSignInAnonymously(authInstance);
    return result;
  } catch (error: any) {
    console.warn("Firebase signInAnonymously failed (network-request-failed or offline). Falling back to Local Guest Session.", error);
    activateLocalGuestMode();
    return { user: auth.currentUser };
  }
}

export async function signOut(authInstance: any) {
  deactivateLocalGuestMode();
  return await originalSignOut(authInstance);
}

export const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {
  authListeners.add(callback);
  
  // Call immediately with the current state
  callback(auth.currentUser);

  const unsubscribeOriginal = originalOnAuthStateChanged(authInstance, (user) => {
    if (!isLocalGuestActive()) {
      callback(user);
    }
  });

  return () => {
    authListeners.delete(callback);
    unsubscribeOriginal();
  };
};

// LOCAL DB HELPERS (Uses localStorage to keep app fully functional in local sandbox mode)
function getLocalDB(collectionName: string): any[] {
  const data = localStorage.getItem(`vetmind_local_db_${collectionName}`);
  return data ? JSON.parse(data) : [];
}

function saveLocalDB(collectionName: string, data: any[]) {
  localStorage.setItem(`vetmind_local_db_${collectionName}`, JSON.stringify(data));
}

export class MockDocSnap {
  id: string;
  _data: any;
  ref: { id: string; path: string };
  constructor(id: string, data: any, path: string) {
    this.id = id;
    this._data = data;
    this.ref = { id, path };
  }
  exists() {
    return !!this._data;
  }
  data() {
    return this._data;
  }
}

export class MockQuerySnap {
  docs: MockDocSnap[];
  constructor(docs: MockDocSnap[]) {
    this.docs = docs;
  }
  get size() {
    return this.docs.length;
  }
  get empty() {
    return this.docs.length === 0;
  }
  forEach(callback: (doc: MockDocSnap, index: number) => void) {
    this.docs.forEach((doc, idx) => callback(doc, idx));
  }
}

// WRAPPED FIRESTORE METHODS (Route to local DB when in guest mode or offline)
export function isGuest() {
  return isLocalGuestActive();
}

export function collection(dbInstance: any, path: string) {
  if (isGuest()) {
    return { isMock: true, path };
  }
  return originalCollection(dbInstance, path);
}

export function doc(first: any, ...segments: any[]) {
  if (isGuest() || first?.isMock) {
    let path = '';
    let docId = '';
    
    if (first?.isMock) {
      path = first.path;
      docId = segments[0] || '';
    } else if (typeof first === 'string') {
      path = first;
      docId = segments[0] || '';
    } else {
      path = segments[0] || '';
      docId = segments[1] || '';
    }
    
    return { isMock: true, path, id: docId, segments: [path, docId] };
  }
  return originalDoc(first, ...segments);
}

export function query(ref: any, ...constraints: any[]) {
  if (isGuest() || ref?.isMock) {
    return { isMock: true, ref, constraints };
  }
  return originalQuery(ref, ...constraints);
}

export function where(field: string, op: any, value: any) {
  if (isGuest()) {
    return { type: 'where', field, op, value };
  }
  return originalWhere(field, op, value);
}

export function orderBy(field: string, direction: any = 'asc') {
  if (isGuest()) {
    return { type: 'orderBy', field, direction };
  }
  return originalOrderBy(field, direction);
}

export async function addDoc(collectionRef: any, data: any) {
  if (isGuest() || collectionRef?.isMock) {
    const collectionName = collectionRef?.isMock ? collectionRef.path : collectionRef;
    const dbList = getLocalDB(collectionName);
    const newDoc = {
      id: Math.random().toString(36).substring(2, 11),
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    dbList.push(newDoc);
    saveLocalDB(collectionName, dbList);
    
    notifyCollectionListeners(collectionName);
    return { id: newDoc.id, isMock: true };
  }
  return await originalAddDoc(collectionRef, data);
}

export async function setDoc(docRef: any, data: any, options?: any) {
  if (isGuest() || docRef?.isMock) {
    const path = docRef.path;
    const id = docRef.id;
    
    if (path === 'users') {
      const users = getLocalDB('users');
      const existingIndex = users.findIndex((u: any) => u.id === id);
      if (existingIndex > -1) {
        if (options?.merge) {
          users[existingIndex] = { ...users[existingIndex], ...data };
        } else {
          users[existingIndex] = { id, ...data };
        }
      } else {
        users.push({ id, ...data });
      }
      saveLocalDB('users', users);
      return;
    }
    
    const dbList = getLocalDB(path);
    const existingIndex = dbList.findIndex((item: any) => item.id === id);
    if (existingIndex > -1) {
      if (options?.merge) {
        dbList[existingIndex] = { ...dbList[existingIndex], ...data };
      } else {
        dbList[existingIndex] = { id, ...data };
      }
    } else {
      dbList.push({ id, ...data });
    }
    saveLocalDB(path, dbList);
    notifyCollectionListeners(path);
    return;
  }
  return await originalSetDoc(docRef, data, options);
}

export async function updateDoc(docRef: any, data: any) {
  if (isGuest() || docRef?.isMock) {
    const path = docRef.path;
    const id = docRef.id;
    const dbList = getLocalDB(path);
    const existingIndex = dbList.findIndex((item: any) => item.id === id);
    if (existingIndex > -1) {
      dbList[existingIndex] = { ...dbList[existingIndex], ...data };
      saveLocalDB(path, dbList);
      notifyCollectionListeners(path);
    }
    return;
  }
  return await originalUpdateDoc(docRef, data);
}

export async function deleteDoc(docRef: any) {
  if (isGuest() || docRef?.isMock) {
    const path = docRef.path;
    const id = docRef.id;
    let dbList = getLocalDB(path);
    dbList = dbList.filter((item: any) => item.id !== id);
    saveLocalDB(path, dbList);
    notifyCollectionListeners(path);
    return;
  }
  return await originalDeleteDoc(docRef);
}

export async function getDoc(docRef: any) {
  if (isGuest() || docRef?.isMock) {
    const path = docRef.path;
    const id = docRef.id;
    
    if (path === 'users') {
      const users = getLocalDB('users');
      const userDoc = users.find((u: any) => u.id === id) || null;
      return new MockDocSnap(id, userDoc, path);
    }
    
    const dbList = getLocalDB(path);
    const docData = dbList.find((item: any) => item.id === id) || null;
    return new MockDocSnap(id, docData, path);
  }
  return await originalGetDoc(docRef);
}

export async function getDocs(queryOrRef: any) {
  if (isGuest() || queryOrRef?.isMock) {
    let collectionName = '';
    let constraints: any[] = [];
    
    if (queryOrRef.ref) {
      collectionName = queryOrRef.ref.path;
      constraints = queryOrRef.constraints || [];
    } else {
      collectionName = queryOrRef.path || queryOrRef;
    }
    
    let list = getLocalDB(collectionName);
    
    // Filter matching where clauses
    for (const c of constraints) {
      if (c.type === 'where') {
        const { field, op, value } = c;
        list = list.filter((item: any) => {
          const itemVal = item[field];
          if (op === '==') return itemVal === value;
          if (op === '!=') return itemVal !== value;
          if (op === '>') return itemVal > value;
          if (op === '>=') return itemVal >= value;
          if (op === '<') return itemVal < value;
          if (op === '<=') return itemVal <= value;
          if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(value);
          return true;
        });
      }
    }
    
    // Filter sorting orderBy clauses
    for (const c of constraints) {
      if (c.type === 'orderBy') {
        const { field, direction } = c;
        list.sort((a: any, b: any) => {
          const valA = a[field];
          const valB = b[field];
          if (valA === undefined || valB === undefined) return 0;
          
          const aCompare = (valA?.seconds !== undefined) ? valA.seconds : valA;
          const bCompare = (valB?.seconds !== undefined) ? valB.seconds : valB;
          
          if (aCompare < bCompare) return direction === 'desc' ? 1 : -1;
          if (aCompare > bCompare) return direction === 'desc' ? -1 : 1;
          return 0;
        });
      }
    }
    
    const docSnaps = list.map((item: any) => new MockDocSnap(item.id, item, collectionName));
    return new MockQuerySnap(docSnaps);
  }
  try {
    return await originalGetDocs(queryOrRef);
  } catch (err: any) {
    console.warn("Firestore getDocs failed, falling back to local guest mode:", err?.message || err);
    activateLocalGuestMode();
    return await getDocs(queryOrRef);
  }
}

export function onSnapshot(queryOrRef: any, onNext: any, onError?: any) {
  if (isGuest() || queryOrRef?.isMock) {
    const collectionName = queryOrRef.ref ? queryOrRef.ref.path : (queryOrRef.path || queryOrRef);
    
    const update = async () => {
      try {
        const snap = await getDocs(queryOrRef);
        onNext(snap);
      } catch (err) {
        if (onError) onError(err);
      }
    };
    
    update();
    
    if (!collectionListeners.has(collectionName)) {
      collectionListeners.set(collectionName, new Set());
    }
    const listeners = collectionListeners.get(collectionName)!;
    listeners.add(update);
    
    return () => {
      listeners.delete(update);
    };
  }
  try {
    return originalOnSnapshot(queryOrRef, onNext, (err: any) => {
      console.warn("Firestore onSnapshot stream error, switching to local guest mode:", err?.message || err);
      activateLocalGuestMode();
      if (onError) onError(err);
    });
  } catch (err: any) {
    console.warn("Firestore onSnapshot setup failed, switching to local mode:", err);
    activateLocalGuestMode();
    return () => {};
  }
}

export function serverTimestamp() {
  if (isGuest()) {
    return new Date().toISOString();
  }
  return originalServerTimestamp();
}
