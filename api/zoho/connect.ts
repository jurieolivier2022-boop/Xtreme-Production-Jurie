// api/zoho/connect.ts
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { ZOHO_CLIENT_ID, ZOHO_REDIRECT_URI } = process.env;
  if (!ZOHO_CLIENT_ID || !ZOHO_REDIRECT_URI) {
    return res.status(500).send('Missing environment variables');
  }
  const authUrl = `https://accounts.zoho.eu/oauth/v2/auth?scope=ZohoBooks.contacts.ALL&client_id=${ZOHO_CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${ZOHO_REDIRECT_URI}`;
  res.redirect(authUrl);
}
