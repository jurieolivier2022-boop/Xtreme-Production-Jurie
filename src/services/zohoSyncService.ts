import * as admin from 'firebase-admin';
import { getZohoToken } from '../lib/zohoAuth';

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}
const dbAdmin = admin.firestore();

const ZOHO_API_BASE = 'https://books.zoho.com/api/v3';
const ORG_ID = process.env.ZOHO_ORGANIZATION_ID!;

export async function pushClientToZoho(clientId: string, client: any) {
  const token = await getZohoToken();
  const contactData = {
    contact_name: client.name,
    email: client.email,
    phone: client.phone,
    billing_address: { address: client.address },
  };

  let zohoContactId = client.zohoContactId;

  if (zohoContactId) {
    // UPDATE
    await fetch(`${ZOHO_API_BASE}/contacts/${zohoContactId}?organization_id=${ORG_ID}`, {
      method: 'PUT',
      headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData),
    });
  } else {
    // CREATE
    const response = await fetch(`${ZOHO_API_BASE}/contacts?organization_id=${ORG_ID}`, {
      method: 'POST',
      headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData),
    });
    const result = await response.json();
    if (result.contact) {
      zohoContactId = result.contact.contact_id;
    }
  }

  // Update local Firestore with new zohoContactId and lastSyncedAt
  if (zohoContactId) {
    await dbAdmin.collection('clients').doc(clientId).update({
      zohoContactId,
      lastSyncedAt: admin.firestore.Timestamp.now()
    });
  }
}
