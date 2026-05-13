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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useCollection<T>(collectionPath: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    try {
      const q = query(collection(db, collectionPath), ...constraints);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(docs);
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, collectionPath);
        setError(err);
        setLoading(false);
      });
      return unsubscribe;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, collectionPath);
      setError(err);
      setLoading(false);
    }
  }, [collectionPath, JSON.stringify(constraints)]);

  return { data, loading, error };
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
