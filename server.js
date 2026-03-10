// 1. Gereedschappen inladen
require('dotenv').config(); // Laadt geheime variabelen uit je .env bestand
const express = require('express'); // Het web-framework
const cors = require('cors'); // Zorgt dat je frontend met je backend mag praten
const path = require('path');
const { db } = require('./firebase.js'); // Importeer de database-connectie

// 2. De server (app) opstarten
const app = express();
const PORT = process.env.PORT || 3000; // Poort 3000 voor lokaal testen

// 3. Middleware instellen (De portiers van je server)
app.use(cors());
app.use(express.json()); // Zorgt dat we inkomende JSON-data (de 'payload') kunnen lezen

// 4. Frontend koppelen
// Dit vertelt de server: "Als iemand naar localhost:3000 gaat, laat dan de bestanden uit de 'public' map zien"
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// API ROUTES (Hier vangen we commando's op)
// ==========================================

// Test-route: Om te checken of de motor draait
app.get('/api/status', (req, res) => {
  res.json({ status: 'success', message: 'De Haagse Open Mic server draait als een zonnetje! 🚀' });
});

// Test-route: Kijken of Firebase reageert
app.get('/api/test-db', async (req, res) => {
  try {
    // We proberen een nep-artiest toe te voegen aan een 'test' collectie
    const docRef = await db.collection('test').add({
      naam: 'Test Artiest',
      datum: new Date().toISOString(),
      bericht: 'Hallo vanuit VS Code!'
    });
    
    res.json({ 
      status: 'success', 
      message: 'Gelukt! Firebase is gekoppeld.', 
      documentId: docRef.id 
    });
  } catch (error) {
    console.error("Fout met Firebase:", error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Mailing-route: Hier komt straks je Brevo logica in te staan
app.post('/api/mailing', async (req, res) => {
  const payload = req.body; // Dit is exact de payload die je in GAS binnenkreeg
  
  console.log("Mailing verzoek ontvangen voor:", payload.subject);
  
  // TODO: Hier plakken we straks de vernieuwde Brevo code in
  
  res.json({ status: 'success', message: 'Mailing endpoint succesvol bereikt.' });
});

// Database-routes (Voor later: Artiesten ophalen, bewerken, toevoegen)
// app.get('/api/artists', async (req, res) => { ... });
// app.post('/api/artists', async (req, res) => { ... });
// app.put('/api/artists/:id', async (req, res) => { ... });

// ==========================================
// SERVER STARTEN
// ==========================================
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🎤 Haagse Open Mic Backend is LIVE!`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`⚙️  API Status: http://localhost:${PORT}/api/status`);
  console.log(`=========================================`);
});