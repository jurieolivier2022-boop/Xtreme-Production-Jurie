import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with experimentalForceLongPolling for better connectivity in restricted environments
// If databaseId is provided in config, use it.
export const db = firebaseConfig.firestoreDatabaseId 
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(app, { experimentalForceLongPolling: true });

export const auth = getAuth(app);

// CRITICAL CONSTRAINT: Validate Connection to Firestore on boot
async function testConnection() {
  try {
    console.log("Starting Firestore connection test for database:", firebaseConfig.firestoreDatabaseId || '(default)');
    
    // Attempt to fetch a document from a known collection or the test path
    const testDoc = doc(db, '_connection_test_', 'check');
    await getDocFromServer(testDoc);
    
    console.log("Firestore connection test: Service responded.");
  } catch (error: any) {
    console.warn("Firestore connection test encountered an error (this may be expected if doc doesn't exist):", error.message);
    
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.error("CRITICAL: Firebase Connection Error - The client is offline or service is unavailable.");
    }
  }
}

testConnection();
