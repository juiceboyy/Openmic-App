const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Forceer IPv4

// 1. Gereedschappen inladen
require('dotenv').config(); // Laadt geheime variabelen uit je .env bestand
const express = require('express'); // Het web-framework
const cors = require('cors'); // Zorgt dat je frontend met je backend mag praten
const path = require('path');
const { addArtistData, getSheetData, updateArtistData } = require('./googleSheets.js');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { processIncomingEmails } = require('./services/gmailService.js');

// 2. De server (app) opstarten
const app = express();
const PORT = process.env.PORT || 3000; // Poort 3000 voor lokaal testen

// Vertrouw de Railway proxy zodat we de échte client IP's krijgen voor de rate limiter
app.set('trust proxy', 1);

// 3. Middleware instellen (De portiers van je server)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Zorgt dat we inkomende JSON-data kunnen lezen (verhoogd naar 10mb)
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 🛠️ DEBUG LOGGING: Klikspaan die ELK inkomend verzoek print
app.use((req, res, next) => {
  console.log(`➡️ Inkomend verzoek: [${req.method}] ${req.url}`);
  next();
});

// 4. Frontend koppelen
// Dit vertelt de server: "Als iemand naar localhost:3000 gaat, laat dan de bestanden uit de 'public' map zien"
app.use(express.static(path.join(__dirname, 'public')));

// 5. Stateless API Authenticatie Middleware
app.use('/api', (req, res, next) => {
  if (req.path === '/verify-pin' || req.path === '/public-subscribe' || req.path === '/sync/callback' || req.path === '/luisterlab') return next(); // De check zélf mag altijd door
  
  const clientPin = req.headers['x-app-pin'];
  if (clientPin && clientPin === process.env.APP_PIN) return next();
  
  console.warn(`🔒 Toegang geweigerd! URL: ${req.path} | Gestuurde PIN: "${clientPin}"`);
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
  message: { success: false, message: 'Te veel aanmeldingen. Probeer het over een uur weer.' },
  standardHeaders: true, // Geef rate limit info mee in the `RateLimit-*` headers
  legacyHeaders: false, // Schakel de oude `X-RateLimit-*` headers uit
});

app.post('/api/public-subscribe', subscribeLimiter, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    const data = await getSheetData();
    const headers = data[0];
    const rows = data.slice(1);
    const emailColIndex = headers.indexOf('E-mailadres');
    const notesColIndex = headers.indexOf('Notities');

    const existingRowIndex = rows.findIndex(row =>
      (row[emailColIndex] || '').toLowerCase() === (email || '').toLowerCase()
    );

    let isUpdate = false;

    if (existingRowIndex !== -1) {
      // Bestaand contact gevonden — alleen Notities bijwerken, Soort contact ongemoeid laten
      isUpdate = true;
      const sheetRowIndex = existingRowIndex + 2; // rij 1 = header, data begint op rij 2
      const huidigNotities = (rows[existingRowIndex][notesColIndex] || '').trim();
      const basisNotities = huidigNotities === '-' ? '' : huidigNotities;
      const nieuweNotities = basisNotities.includes('Nieuwsbrief')
        ? basisNotities
        : (basisNotities ? `${basisNotities} | Nieuwsbrief` : 'Nieuwsbrief');

      await updateArtistData(sheetRowIndex, { "Notities": nieuweNotities });
      console.log(`Bestaand contact bijgewerkt (rij ${sheetRowIndex}): Nieuwsbrief toegevoegd aan notities.`);
    } else {
      // Nieuw contact — toevoegen als Publiek met Nieuwsbrief in notities
      const newContact = {
        "Voornaam": firstName || "",
        "Achternaam": lastName || "",
        "E-mailadres": email || "",
        "Soort contact": "Publiek",
        "Notities": "Nieuwsbrief",
        "Datum toegevoegd": new Date().toLocaleDateString('nl-NL')
      };
      await addArtistData(newContact);
      console.log(`Nieuw contact toegevoegd: ${email}`);
    }

    // Succes-response direct sturen zodat de bezoeker niet hoeft te wachten
    res.json({ success: true, message: "Aanmelding gelukt!" });

    // Notificatie e-mail asynchroon sturen via Brevo (Fire and forget)
    const actieLabel = isUpdate ? 'UPDATE bestaand contact' : 'NIEUW contact';
    const brevoPayload = {
      sender: { name: 'Haagse Open Mic', email: process.env.EMAIL_USER },
      to: [{ email: process.env.NOTIFICATION_EMAIL, name: 'Beheerder' }],
      subject: `🎉 Nieuwsbrief aanmelding (${actieLabel}): ${firstName || ''} ${lastName || ''}`.trim(),
      htmlContent: `<p>Er is een aanmelding binnengekomen via de publieke pagina.</p>
             <p><strong>Type:</strong> ${actieLabel}</p>
             <p><strong>Naam:</strong> ${firstName || ''} ${lastName || ''}</p>
             <p><strong>E-mailadres:</strong> ${email || ''}</p>`
    };

    fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(brevoPayload)
    })
    .then(async (response) => {
      if (!response.ok) throw new Error(await response.text());
      console.log('Brevo notificatie succesvol verstuurd!');
    })
    .catch(err => console.error('Fout bij sturen Brevo mail:', err));

    // Welkomstmail naar de aanmelder (Fire and forget)
    const welcomePayload = {
      sender: { name: 'Haagse Open Mic', email: process.env.EMAIL_USER || 'nieuwsbrief@haagseopenmic.nl' },
      to: [{ email: email, name: `${firstName || ''} ${lastName || ''}`.trim() || 'Muziekliefhebber' }],
      subject: 'Welkom bij de Haagse Open Mic! 🎙️',
      htmlContent: `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welkom bij de Haagse Open Mic!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #f3f4f6;">
    <tr>
      <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">Haagse Open Mic</h1>
        <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 16px;">Jouw podium voor Haags talent</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="margin-top: 0; color: #1e3a8a; font-size: 22px; font-weight: 600;">Hoi ${firstName || 'muziekliefhebber'},</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
          Wat ontzettend leuk dat je je hebt aangemeld voor de nieuwsbrief van de <strong>Haagse Open Mic</strong>! Vanaf nu ben jij als eerste op de hoogte van onze nieuwe edities, het speelschema en al het talent dat op ons podium schittert.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
          Onze edities vinden regelmatig plaats in <strong>Amare</strong> (Den Haag). Het belooft telkens een fantastische avond te worden met diverse acts van muzikanten, dichters en andere podiumkunstenaars.
        </p>
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; border-radius: 12px; margin: 30px 0; padding: 20px;">
          <tr>
            <td>
              <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #111827; font-weight: 600;">Wil je zelf optreden?</h3>
              <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.5; color: #4b5563;">
                Ben je zelf artiest of wil je jouw talent delen met ons publiek? Meld je dan aan voor een van de komende edities!
              </p>
              <a href="https://haagseopenmic.nl/aanmelden" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 10px 20px; font-size: 14px; font-weight: 500; border-radius: 8px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);">Meld je aan als Artiest</a>
            </td>
          </tr>
        </table>

        <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
          We hopen je snel te zien bij de volgende Haagse Open Mic!
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 0;">
          Met vriendelijke groet,<br>
          <strong>Team Haagse Open Mic</strong>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #f3f4f6;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
          Dit is een automatische bevestiging van je aanmelding voor de nieuwsbrief van de Haagse Open Mic.<br>
          © 2026 Haagse Open Mic
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
    };

    fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(welcomePayload)
    })
    .then(async (response) => {
      if (!response.ok) throw new Error(await response.text());
      console.log(`Welkomstmail succesvol verstuurd naar: ${email}`);
    })
    .catch(err => console.error('Fout bij sturen welkomstmail:', err));
  } catch (error) {
    console.error("Fout bij openbare aanmelding:", error);
    res.status(500).json({ success: false, message: "Aanmelding mislukt door een serverfout." });
  }
});

// 6. API Modules koppelen aan hun routes
// BELANGRIJK: app.use('/api/photos', ...) koppelt de Google Drive functionaliteit aan je server!
app.use('/api/artists', require('./routes/artists'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/mailing', require('./routes/mailing'));
app.use('/api/speelschema', require('./routes/speelschema'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/generate-mailing', require('./routes/generateMailing'));
app.use('/api/luisterlab', require('./routes/luisterlab'));

// 7. Statische bestanden Fallback (Voor Single Page Applications)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// SERVER STARTEN
// ==========================================
// Door '0.0.0.0' toe te voegen, openen we de deuren voor de Railway Proxy!
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🎤 Haagse Open Mic Backend is LIVE!`);
  console.log(`🌐 Server luistert op poort: ${PORT}`);
  console.log(`=========================================`);

  // Start de Gmail Auto-Reply & Contact Import cronjob
  const autoReplyEnabled = process.env.GMAIL_AUTO_REPLY_ENABLED === 'true' || process.env.GMAIL_AUTO_REPLY_ENABLED === undefined;
  if (autoReplyEnabled) {
    console.log('⏰ [Cron] Scheduling Gmail auto-reply and contact sync poll every 5 minutes.');
    cron.schedule('*/5 * * * *', async () => {
      try {
        await processIncomingEmails();
      } catch (err) {
        console.error('❌ [Cron] Error running processIncomingEmails:', err);
      }
    });

    // Run direct bij opstarten na 5 seconden om eventuele wachtende mails te verwerken
    setTimeout(() => {
      processIncomingEmails().catch(err => console.error('❌ [Startup] Initial processIncomingEmails failed:', err));
    }, 5000);
  }
});