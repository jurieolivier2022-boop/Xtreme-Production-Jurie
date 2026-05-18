// api/zoho/sync.ts
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
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  
  const { client } = req.body;
  try {
      const docRef = db.collection('settings').doc('zoho');
      const docSnap = await docRef.get();
      if (!docSnap.exists) return res.status(401).send('Zoho not connected');
      
      let tokens = docSnap.data();
      
      // Refresh token if expired
      if (Date.now() > tokens.expires_at) {
          const refreshResponse = await axios.post(`https://accounts.zoho.eu/oauth/v2/token`, null, {
              params: {
                client_id: process.env.ZOHO_CLIENT_ID,
                client_secret: process.env.ZOHO_CLIENT_SECRET,
                refresh_token: tokens.refresh_token,
                grant_type: 'refresh_token'
              }
          });
          tokens = { ...tokens, ...refreshResponse.data, expires_at: Date.now() + (refreshResponse.data.expires_in * 1000) };
          await docRef.set(tokens);
      }

      const zohoContact = {
          contact_name: client.name,
          company_name: client.companyName,
          email: client.email,
          phone: client.phone
      };

      const url = client.zohoContactId 
          ? `https://books.zoho.eu/api/v3/contacts/${client.zohoContactId}?organization_id=${process.env.ZOHO_ORG_ID}`
          : `https://books.zoho.eu/api/v3/contacts?organization_id=${process.env.ZOHO_ORG_ID}`;
      
      const method = client.zohoContactId ? 'put' : 'post';
      
      const response = await axios({
          method,
          url,
          headers: { 'Authorization': `Zoho-oauthtoken ${tokens.access_token}`, 'Content-Type': 'application/json' },
          data: zohoContact
      });
      
      res.json(response.data);
  } catch (error) {
      console.error('Sync Error:', error);
      res.status(500).send('Sync failed');
  }
}
