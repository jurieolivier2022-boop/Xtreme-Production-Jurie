import express from "express";
import path from "path";
import axios from "axios";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin for server-side operations
initializeApp();
const db = getFirestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Zoho Sync Routes
  app.get("/api/zoho/connect", (req, res) => {
      const authUrl = `https://accounts.zoho.eu/oauth/v2/auth?scope=ZohoBooks.contacts.ALL&client_id=${process.env.ZOHO_CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${process.env.ZOHO_REDIRECT_URI}`;
      res.redirect(authUrl);
  });
  
  app.get("/api/zoho/callback", async (req, res) => {
      const { code } = req.query;
      try {
          const tokenResponse = await axios.post(`https://accounts.zoho.eu/oauth/v2/token`, null, {
              params: {
                  code,
                  client_id: process.env.ZOHO_CLIENT_ID,
                  client_secret: process.env.ZOHO_CLIENT_SECRET,
                  redirect_uri: process.env.ZOHO_REDIRECT_URI,
                  grant_type: 'authorization_code'
              }
          });
          
          // Store tokens in Firestore
          await db.collection('settings').doc('zoho').set(tokenResponse.data);
          res.send("Successfully connected to Zoho Books. You can close this window.");
      } catch (error) {
          console.error('OAuth Callback Error:', error);
          res.status(500).send("OAuth failed");
      }
  });

  app.post("/api/zoho/webhook", async (req, res) => {
      // Handle Zoho webhook: verify trigger, then update client in database
      const event = req.body;
      console.log("Zoho Webhook Received:", event);
      // Logic: If contact.updated, fetch updated contact from Zoho, then find/update in Firestore
      res.status(200).send("ok");
  });
  
  app.post("/api/zoho/sync", async (req, res) => {
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
              tokens = { ...tokens, ...refreshResponse.data, expires_at: Date.now() + 3600 * 1000 };
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
  });

  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite only in development
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built static files
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Fallback to index.html for SPA routing
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
