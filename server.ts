import express from "express";
import path from "path";
import * as admin from 'firebase-admin';

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json()); // Required for JSON webhooks

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Zoho Webhook endpoint
  app.post("/api/webhooks/zoho", async (req, res) => {
    try {
      console.log("Receiving Zoho webhook:", JSON.stringify(req.body));
      const contact = req.body.contact;
      if (!contact) {
        return res.status(400).send("No contact data in payload");
      }

      const zohoContactId = contact.contact_id;
      
      // Look up client in Firestore by zohoContactId
      const clientSnapshot = await admin.firestore().collection('clients')
        .where('zohoContactId', '==', zohoContactId).get();
      
      if (clientSnapshot.empty) {
        console.log(`Client not found for zohoContactId: ${zohoContactId}`);
        // Handle potential new record, but for now just log
        return res.status(200).send("Client not found locally");
      }

      const clientDoc = clientSnapshot.docs[0];
      const clientData = clientDoc.data();

      // Loop Prevention check
      const now = admin.firestore.Timestamp.now().toMillis();
      const lastSyncedAt = clientData.lastSyncedAt ? clientData.lastSyncedAt.toMillis() : 0;
      
      // If synced less than 30 seconds ago, ignore
      if (now - lastSyncedAt < 30000) {
        console.log(`Ignoring webhook update due to recent local sync for ${clientDoc.id}`);
        return res.status(200).send("Ignored recent update");
      }

      // Update Firestore
      await clientDoc.ref.update({
        name: contact.contact_name,
        email: contact.email,
        phone: contact.phone,
        address: contact.billing_address?.address, // Assuming nested?
        lastSyncedAt: admin.firestore.Timestamp.now()
      });

      res.status(200).send("Webhook processed successfully");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Internal Server Error");
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
