// 1. Gereedschappen inladen
require('dotenv').config(); // Laadt geheime variabelen uit je .env bestand
const express = require('express'); // Het web-framework
const cors = require('cors'); // Zorgt dat je frontend met je backend mag praten
const path = require('path');

// 2. De server (app) opstarten
const app = express();
const PORT = process.env.PORT || 3000; // Poort 3000 voor lokaal testen

// 3. Middleware instellen (De portiers van je server)
app.use(cors());
app.use(express.json()); // Zorgt dat we inkomende JSON-data (de 'payload') kunnen lezen

// 4. Frontend koppelen
// Dit vertelt de server: "Als iemand naar localhost:3000 gaat, laat dan de bestanden uit de 'public' map zien"
app.use(express.static(path.join(__dirname, 'public')));

// 5. Stateless API Authenticatie Middleware
app.use('/api', (req, res, next) => {
  if (req.path === '/verify-pin') return next(); // De check zélf mag altijd door
  
  const clientPin = req.headers['x-app-pin'];
  if (clientPin && clientPin === process.env.APP_PIN) return next();
  
  return res.status(401).json({ status: 'error', message: 'Niet geautoriseerd: ongeldige of ontbrekende PIN' });
});

app.post('/api/verify-pin', (req, res) => {
  const { pin } = req.body;
  if (pin && pin === process.env.APP_PIN) {
    res.json({ success: true, status: 'success', message: 'Toegang verleend' });
  } else {
    res.status(401).json({ success: false, status: 'error', message: 'Onjuiste pincode' });
  }
});

// 6. API Modules koppelen aan hun routes
app.use('/api/artists', require('./routes/artists'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/mailing', require('./routes/mailing'));
app.use('/api/speelschema', require('./routes/speelschema'));

// ==========================================
// SERVER STARTEN
// ==========================================
// Door '0.0.0.0' toe te voegen, openen we de deuren voor de Railway Proxy!
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🎤 Haagse Open Mic Backend is LIVE!`);
  console.log(`🌐 Server luistert op poort: ${PORT}`);
  console.log(`=========================================`);
});