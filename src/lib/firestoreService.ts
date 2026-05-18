import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  doc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  orderBy,
  limit,
  runTransaction,
  increment,
  type DocumentData,
  type QueryConstraint
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { useState, useEffect } from 'react';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Safely stringifies an object that might contain circular references.
 * Improved implementation to be more robust.
 */
function safeJsonStringify(obj: any) {
  const cache = new Set();
  const stringified = JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    return value;
  }, 2);
  cache.clear();
  return stringified;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Extract ONLY string/primitive properties to ensure we never touch circular structures in internal objects
  let errorMessage = 'Unknown error';
  let errorCode = 'unknown-code';

  if (error instanceof Error) {
    errorMessage = error.message;
    if ('code' in error) errorCode = String((error as any).code);
  } else if (typeof error === 'object' && error !== null) {
    errorMessage = (error as any).message || String(error);
    errorCode = (error as any).code || 'unknown-code';
  } else {
    errorMessage = String(error);
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  // Log a simplified version first to console to be safe
  console.error(`Firestore Error [${operationType}] at ${path}:`, errorMessage, `(Code: ${errorCode})`);
  
  try {
    // Only throw the stringified version if we really have to (for system diagnosis)
    const safeErrInfo = safeJsonStringify(errInfo);
    throw new Error(safeErrInfo);
  } catch (stringifyError) {
    // Ultimate fallback if even the simple errInfo failed to stringify
    throw new Error(`{"error":"${errorMessage.replace(/"/g, '\\"')}", "operationType":"${operationType}", "path":"${path}"}`);
  }
}

export function useCollection<T>(collectionPath: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    try {
      const q = query(collection(db, collectionPath), ...constraints);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!isMounted) return;
        
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(docs);
        setLoading(false);
        setError(null);
      }, (err: any) => {
        if (!isMounted) return;
        const msg = err?.message || String(err);
        console.error(`Subscription error for ${collectionPath}:`, msg);
        setError(new Error(msg));
        setLoading(false);
      });
      
      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (err: any) {
      if (isMounted) {
        setError(err);
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath, constraints.length]); 

  return { data, loading, error };
}

/**
 * Hook to monitor Firestore connection status
 */
export function useFirestoreConnection() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  useEffect(() => {
    const unsub = onSnapshot(doc(db, '_connection_test_', 'check'), 
      () => setIsConnected(true),
      (err) => {
        // If it's a permission error, we're still connected to the service
        if (err.code === 'permission-denied') {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      }
    );
    return unsub;
  }, []);
  
  return { isConnected };
}

export async function getCollection<T>(collectionPath: string, constraints: QueryConstraint[] = []) {
  try {
    const q = query(collection(db, collectionPath), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

export function subscribeToCollection<T>(
  collectionPath: string, 
  constraints: QueryConstraint[], 
  callback: (data: T[]) => void
) {
  const q = query(collection(db, collectionPath), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  });
}

export async function createDocument<T extends DocumentData>(collectionPath: string, data: T) {
  try {
    const docRef = await addDoc(collection(db, collectionPath), data);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionPath);
    return null;
  }
}

export async function updateDocument<T extends DocumentData>(collectionPath: string, id: string, data: Partial<T>) {
  try {
    const docRef = doc(db, collectionPath, id);
    await updateDoc(docRef, data as any);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionPath}/${id}`);
    return false;
  }
}

export async function setDocument<T extends DocumentData>(collectionPath: string, id: string, data: T) {
  try {
    const docRef = doc(db, collectionPath, id);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionPath}/${id}`);
    return false;
  }
}

export async function deleteDocument(collectionPath: string, id: string) {
  try {
    const docRef = doc(db, collectionPath, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionPath}/${id}`);
    return false;
  }
}

export async function getDocument<T>(collectionPath: string, id: string) {
  try {
    const docRef = doc(db, collectionPath, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collectionPath}/${id}`);
    return null;
  }
}

export async function getNextSequence(sequenceName: string): Promise<number | null> {
  const counterRef = doc(db, 'counters', sequenceName);
  
  try {
    const nextId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      if (!counterDoc.exists()) {
        transaction.set(counterRef, { current: 1 });
        return 1;
      }
      
      const newVal = (counterDoc.data()?.current || 0) + 1;
      transaction.update(counterRef, { current: newVal });
      return newVal;
    });
    
    return nextId;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `counters/${sequenceName}`);
    return null;
  }
}
