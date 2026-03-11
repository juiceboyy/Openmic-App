// 1. Gereedschappen inladen
require('dotenv').config(); // Laadt geheime variabelen uit je .env bestand
const express = require('express'); // Het web-framework
const cors = require('cors'); // Zorgt dat je frontend met je backend mag praten
const path = require('path');
const nodemailer = require('nodemailer');
const { getSheetData, updateArtistData, addArtistData, deleteArtistData, getSheetNames, getPreviousLineup, getCurrentLineup, saveLineup } = require('./googleSheets.js');
const { getSubFolders } = require('./googleDrive.js');

// 2. De server (app) opstarten
const app = express();
const PORT = process.env.PORT || 3000; // Poort 3000 voor lokaal testen

// 3. Middleware instellen (De portiers van je server)
app.use(cors());
app.use(express.json()); // Zorgt dat we inkomende JSON-data (de 'payload') kunnen lezen

// 4. Frontend koppelen
// Dit vertelt de server: "Als iemand naar localhost:3000 gaat, laat dan de bestanden uit de 'public' map zien"
app.use(express.static(path.join(__dirname, 'public')));

// Configureer de email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'haagseopenmic@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// ==========================================
// API ROUTES (Hier vangen we commando's op)
// ==========================================

// Test-route: Haal alle artiesten uit de Google Sheet
app.get('/api/artists', async (req, res) => {
  try {
    const data = await getSheetData();
    
    if (!data || data.length === 0) {
      return res.json({ status: 'warning', message: 'De sheet is leeg of niet gevonden.' });
    }

    // Data transformatie: Van 2D Array (rijen) naar Array van Objecten
    const headers = data[0];
    const rows = data.slice(1); // Alles behalve de header-rij

    const formattedData = rows.map((row, index) => {
      const obj = {};
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex];
      });
      // rowIndex toevoegen (0-based array index + 1 voor header + 1 voor 1-based sheet row = index + 2)
      obj.rowIndex = index + 2;
      return obj;
    });

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Edit-route: Ontvangt wijzigingen van de frontend en stuurt ze naar de Sheet
app.post('/api/artists/edit', async (req, res) => {
  try {
    const payload = req.body;
    const rowIndex = payload._rowIndex;
    
    // Check of we wel weten welke rij we moeten aanpassen
    if (!rowIndex) {
      return res.status(400).json({ status: 'error', message: 'Geen _rowIndex meegegeven in de payload.' });
    }
    
    console.log(`Verzoek ontvangen om rij ${rowIndex} te updaten...`);
    
    // Roep onze nieuwe functie aan!
    const result = await updateArtistData(rowIndex, payload);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Add-route: Nieuwe artiest toevoegen
app.post('/api/artists/add', async (req, res) => {
  try {
    const payload = req.body;
    console.log("Verzoek ontvangen om nieuwe artiest toe te voegen.");
    
    const result = await addArtistData(payload);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Delete-route: Artiest verwijderen
app.post('/api/artists/delete', async (req, res) => {
  try {
    const payload = req.body;
    const rowIndex = payload._rowIndex;

    if (!rowIndex) {
      return res.status(400).json({ status: 'error', message: 'Geen _rowIndex meegegeven voor verwijdering.' });
    }

    console.log(`Verzoek ontvangen om rij ${rowIndex} te verwijderen.`);
    const result = await deleteArtistData(rowIndex);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Mailing-route: Hier komt straks je Brevo logica in te staan
app.post('/api/mailing', async (req, res) => {
  const payload = req.body;
  console.log("Mailing verzoek ontvangen voor:", payload.subject);

  try {
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await brevoResponse.json();

    if (!brevoResponse.ok) {
      console.error('Brevo API Error:', data);
      throw new Error(data.message || 'Fout bij het versturen van de mail via Brevo.');
    }

    res.json({ status: 'success', message: 'Mails succesvol verstuurd' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Scan-route: Foto map scannen en matchen met artiesten
app.post('/api/photos/scan', async (req, res) => {
  try {
    const { folderUrl } = req.body;
    const folderIdMatch = folderUrl.match(/[-\w]{25,}/);
    
    if (!folderIdMatch) {
      return res.status(400).json({ status: 'error', message: 'Ongeldige Google Drive URL.' });
    }
    const folderId = folderIdMatch[0];

    // 1. Submappen ophalen uit Drive
    const subFolders = await getSubFolders(folderId);

    // 2. Artist data ophalen uit Sheet
    const sheetData = await getSheetData();
    if (!sheetData || sheetData.length <= 1) {
      return res.json({ status: 'warning', message: 'Geen data gevonden in sheet.' });
    }

    // Transformeer naar objecten
    const headers = sheetData[0];
    const rows = sheetData.slice(1);
    const artists = rows.map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h.trim()] = row[i]);
      return obj;
    });

    const matches = [];

    // 3. Matching logica uitvoeren
    subFolders.forEach(sub => {
      let fName = sub.name;
      let fLink = sub.webViewLink;
      let folderStr = String(fName).toLowerCase().trim();
      let candidates = [];

      // A. Exacte Email Match
      let exactEmailMatch = artists.find(a => {
        let email = String(a['E-mailadres'] || '').toLowerCase().trim();
        return email && email !== '-' && (folderStr === email || folderStr.includes(email));
      });

      if (exactEmailMatch) {
        candidates.push(exactEmailMatch);
      } else {
        // B. Artiestennaam Match
        let artistNameMatches = artists.filter(a => {
          let actName = String(a['Artiestennaam'] || '').toLowerCase().trim();
          if (actName && actName !== '-') {
            if (folderStr.includes(actName)) return true;
            if (folderStr.length > 2 && actName.includes(folderStr)) return true;
          }
          return false;
        });

        if (artistNameMatches.length > 0) {
          candidates = artistNameMatches;
        } else {
          // C. Echte Naam Match
          let realNameMatches = artists.filter(a => {
            let firstName = String(a['Voornaam'] || '').toLowerCase().trim();
            let lastName = String(a['Achternaam'] || '').toLowerCase().trim();
            let fullName = `${firstName} ${lastName}`.trim();
            
            if (fullName && fullName !== '-' && folderStr.includes(fullName)) return true;
            if (firstName && firstName !== '-' && firstName.length > 2 && folderStr.includes(firstName)) return true;
            if (folderStr.length > 2 && fullName && fullName !== '-' && fullName.includes(folderStr)) return true;
            return false;
          });
          candidates = realNameMatches;
        }
      }

      // Resultaten formatteren en dedupliceren
      let formattedCandidates = candidates.map(c => {
        const artiestennaam = c['Artiestennaam'];
        const voornaam = c['Voornaam'];
        const achternaam = c['Achternaam'];
        const nameToUse = (artiestennaam && artiestennaam !== '-') ? artiestennaam : `${voornaam} ${achternaam}`.trim();
        return { artistName: nameToUse, email: c['E-mailadres'] };
      });

      formattedCandidates = formattedCandidates.filter((v, i, a) => 
        a.findIndex(t => (t.email === v.email && t.artistName === v.artistName)) === i
      );

      matches.push({
        folderName: fName,
        folderLink: fLink,
        matchFound: formattedCandidates.length > 0,
        multipleMatches: formattedCandidates.length > 1,
        candidates: formattedCandidates,
        artistName: formattedCandidates.length === 1 ? formattedCandidates[0].artistName : null,
        email: formattedCandidates.length === 1 ? formattedCandidates[0].email : null,
        selected: false
      });
    });

    res.json({ status: 'success', matches });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Send-route: Emails versturen via Gmail
app.post('/api/photos/send', async (req, res) => {
  try {
    const { matches, testMode, testEmail } = req.body;
    let sentCount = 0;

    const emailPromises = matches.map(async (match) => {
      if (match.selected && match.email && match.email !== '-') {
        let subject = testMode ? "[TEST] Jouw foto's van de Haagse Open Mic!" : "Jouw foto's van de Haagse Open Mic!";
        let recipientEmail = testMode ? testEmail : match.email;
        
        let testWarning = testMode ? 
          `<p style="color:#d97706; font-size:12px; background:#fef3c7; padding:8px; border-radius:4px;"><b>TEST MODUS ACTIEF:</b> Deze mail zou in het echt verstuurd worden naar: <b>${match.email}</b><br>En in Cc naar: <b>haagseopenmic@gmail.com</b></p>` : "";
        
        let body = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">${testWarning}Hoi ${match.artistName},<br><br>Bedankt voor je optreden! We hebben de foto's binnengekregen van JCSFotografie.<br><br>Via de onderstaande link kun je jouw persoonlijke foto's bekijken en downloaden:<br><a href="${match.folderLink}" style="color: #0071e3;">${match.folderLink}</a><br><br>Deel je ze op Instagram? Vergeet dan niet de fotograaf (<b>@jcsfotografie_</b>) en ons (<b>@haagseopenmic</b>) te taggen!<br><br>Hartelijke groet,<br><br>Gijs en Ro<br><br><b>Haagse Open Mic</b><br>Elke 2e dinsdag van de maand<br>19u - 22u<br>IG: <a href="https://instagram.com/haagseopenmic" style="color: #0071e3; text-decoration: none;">@HaagseOpenMic</a></div>`;

        let mailOptions = {
          from: '"Haagse Open Mic" <haagseopenmic@gmail.com>',
          to: recipientEmail,
          subject: subject,
          html: body
        };

        if (!testMode) {
          mailOptions.cc = "haagseopenmic@gmail.com";
        }

        await transporter.sendMail(mailOptions);
        sentCount++;
      }
    });

    await Promise.all(emailPromises);

    res.json({ status: 'success', sentCount });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ==========================================
// SPEELSCHEMA ROUTES
// ==========================================

app.post('/api/speelschema/sheets', async (req, res) => {
  try {
    const sheetNames = await getSheetNames();
    res.json({ status: 'success', sheetNames });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/speelschema/previous', async (req, res) => {
  try {
    const names = await getPreviousLineup(req.body.prevSheetName);
    res.json({ status: 'success', names });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/speelschema/current', async (req, res) => {
  try {
    const result = await getCurrentLineup(req.body.sheetName);
    res.json({ status: 'success', ...result });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/speelschema/save', async (req, res) => {
  try {
    const { sheetName, lineup, reserve } = req.body;
    await saveLineup(sheetName, lineup, reserve);
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
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