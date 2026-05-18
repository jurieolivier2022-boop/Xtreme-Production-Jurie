// api/zoho/webhook.ts
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  
  console.log("Zoho Webhook Received:", req.body);
  // Logic: If contact.updated, fetch updated contact from Zoho, then find/update in Firestore
  res.status(200).send("ok");
}
