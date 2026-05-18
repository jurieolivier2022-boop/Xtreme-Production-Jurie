// api/zoho/callback.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}
const db = getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REDIRECT_URI } = process.env;
  
  if (!code) return res.status(400).send('Missing code');
  
  try {
      const tokenResponse = await axios.post(`https://accounts.zoho.eu/oauth/v2/token`, null, {
          params: {
              code,
              client_id: ZOHO_CLIENT_ID,
              client_secret: ZOHO_CLIENT_SECRET,
              redirect_uri: ZOHO_REDIRECT_URI,
              grant_type: 'authorization_code'
          }
      });
      
      // Store tokens in Firestore
      await db.collection('settings').doc('zoho').set({
        ...tokenResponse.data,
        expires_at: Date.now() + (tokenResponse.data.expires_in * 1000)
      });
      res.send("Successfully connected to Zoho Books.");
  } catch (error) {
      console.error('OAuth Callback Error:', error);
      res.status(500).send("OAuth failed");
  }
}
