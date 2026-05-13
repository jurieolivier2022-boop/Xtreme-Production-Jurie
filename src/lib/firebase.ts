import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with experimentalForceLongPolling for better connectivity in restricted environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// CRITICAL CONSTRAINT: Validate Connection to Firestore on boot
async function testConnection() {
  try {
    // Attempt to fetch a non-existent document to trigger service connectivity check
    await getDocFromServer(doc(db, '_connection_test_', 'check'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.error("Please check your Firebase configuration or network connectivity.");
    }
  }
}

testConnection();
