// 1. Gereedschappen inladen
require('dotenv').config(); // Laadt geheime variabelen uit je .env bestand
const express = require('express'); // Het web-framework
const cors = require('cors'); // Zorgt dat je frontend met je backend mag praten
const path = require('path');
const { addArtistData } = require('./googleSheets.js');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

// Nodemailer transporter instellen voor e-mailnotificaties
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true voor 465, false voor andere poorten
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 2. De server (app) opstarten
const app = express();
const PORT = process.env.PORT || 3000; // Poort 3000 voor lokaal testen

// Vertrouw de Railway proxy zodat we de échte client IP's krijgen voor de rate limiter
app.set('trust proxy', 1);

// 3. Middleware instellen (De portiers van je server)
app.use(cors());
app.use(express.json()); // Zorgt dat we inkomende JSON-data (de 'payload') kunnen lezen

// 4. Frontend koppelen
// Dit vertelt de server: "Als iemand naar localhost:3000 gaat, laat dan de bestanden uit de 'public' map zien"
app.use(express.static(path.join(__dirname, 'public')));

// 5. Stateless API Authenticatie Middleware
app.use('/api', (req, res, next) => {
  if (req.path === '/verify-pin' || req.path === '/public-subscribe') return next(); // De check zélf mag altijd door
  
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

// Rate limiter specifiek voor de publieke aanmeld-route om spam te voorkomen
const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // Tijdsvak: 1 uur
  max: 5, // Maximaal 5 aanmeldingen per IP-adres per uur
  message: { success: false, message: 'Te veel aanmeldingen vanaf dit apparaat. Probeer het later opnieuw.' },
  standardHeaders: true, // Geef rate limit info mee in the `RateLimit-*` headers
  legacyHeaders: false, // Schakel de oude `X-RateLimit-*` headers uit
});

app.post('/api/public-subscribe', subscribeLimiter, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    
    const newContact = {
      "Voornaam": firstName || "",
      "Achternaam": lastName || "",
      "E-mailadres": email || "",
      "Soort contact": "Publiek",
      "Datum toegevoegd": new Date().toLocaleDateString('nl-NL')
    };

    await addArtistData(newContact);

    // Succes-response direct sturen zodat de bezoeker niet hoeft te wachten
    res.json({ success: true, message: "Aanmelding gelukt!" });

    // Notificatie e-mail asynchroon sturen op de achtergrond (Fire and forget)
    const mailOptions = {
      from: `"Open Mic Aanmeldingen" <${process.env.EMAIL_USER}>`,
      to: process.env.NOTIFICATION_EMAIL,
      subject: `🎉 Nieuwe Publiek Aanmelding: ${firstName || ''} ${lastName || ''}`.trim(),
      html: `<p>Er is een nieuwe aanmelding binnengekomen via de publieke pagina:</p>
             <p><strong>Naam:</strong> ${firstName || ''} ${lastName || ''}</p>
             <p><strong>E-mailadres:</strong> ${email || ''}</p>`
    };

    transporter.sendMail(mailOptions)
      .then(info => console.log('Mail verstuurd:', info.messageId))
      .catch(err => console.error('Fout bij sturen mail:', err));
  } catch (error) {
    console.error("Fout bij openbare aanmelding:", error);
    res.status(500).json({ success: false, message: "Aanmelding mislukt door een serverfout." });
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