const express = require('express');
const router = express.Router();
require('dotenv').config();
const { getSubFolders } = require('../googleDrive.js');
const { getSheetData } = require('../googleSheets.js');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Helperfunctie om strings te normaliseren (verwijder accenten, spaties, koppeltekens, etc. voor robuuste matching)
function normalizeString(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Scan-route: Foto map scannen en matchen met artiesten
router.post('/scan', async (req, res) => {
  try {
    // Vang ook 'url' op voor het geval de frontend het zo noemt
    const urlToScan = req.body.folderUrl || req.body.url;
    console.log('🤖 Scan verzoek ontvangen voor URL:', urlToScan);
    
    if (!urlToScan) throw new Error('Geen geldige URL ontvangen van de voorkant.');

    const folderIdMatch = String(urlToScan).match(/[-\w]{25,}/);
    if (!folderIdMatch) {
      return res.status(400).json({ status: 'error', message: 'Ongeldige Google Drive URL.' });
    }
    const folderId = folderIdMatch[0];
    console.log('📂 Map ID gevonden:', folderId);

    // 1. Submappen ophalen uit Drive
    const subFolders = await getSubFolders(folderId);

    // 2. Artist data ophalen uit Sheet
    const sheetData = await getSheetData();
    if (!sheetData || sheetData.length <= 1) {
      return res.json({ status: 'warning', message: 'Geen data gevonden in sheet.' });
    }

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
      let folderNorm = normalizeString(fName);
      let candidates = [];

      let exactEmailMatch = artists.find(a => {
        let email = String(a['E-mailadres'] || '').toLowerCase().trim();
        return email && email !== '-' && (folderStr === email || folderStr.includes(email));
      });

      if (exactEmailMatch) {
        candidates.push(exactEmailMatch);
      } else {
        // A. Artiestennaam matching (eerst exact of gedeeltelijk via normalisatie)
        let artistNameMatches = artists.filter(a => {
          let actName = String(a['Artiestennaam'] || '').toLowerCase().trim();
          if (actName && actName !== '-') {
            let actNorm = normalizeString(actName);
            if (actNorm.length > 2) {
              if (folderNorm.includes(actNorm)) return true;
              if (actNorm.includes(folderNorm)) return true;
            }
            // Fallback op oude logic
            if (folderStr.includes(actName)) return true;
            if (folderStr.length > 2 && actName.includes(folderStr)) return true;
          }
          return false;
        });

        if (artistNameMatches.length > 0) {
          candidates = artistNameMatches;
        } else {
          // B. Echte naam matching
          let realNameMatches = artists.filter(a => {
            let firstName = String(a['Voornaam'] || '').toLowerCase().trim();
            let lastName = String(a['Achternaam'] || '').toLowerCase().trim();
            let fullName = `${firstName} ${lastName}`.trim();
            
            let firstNorm = normalizeString(firstName);
            let fullNorm = normalizeString(fullName);
            
            if (fullNorm && fullNorm.length > 2) {
              if (folderNorm.includes(fullNorm)) return true;
              if (fullNorm.includes(folderNorm)) return true;
            }
            if (firstNorm && firstNorm.length > 2 && folderNorm.includes(firstNorm)) return true;

            // Fallback op oude logic
            if (fullName && fullName !== '-' && folderStr.includes(fullName)) return true;
            if (firstName && firstName !== '-' && firstName.length > 2 && folderStr.includes(firstName)) return true;
            if (folderStr.length > 2 && fullName && fullName !== '-' && fullName.includes(folderStr)) return true;
            return false;
          });
          candidates = realNameMatches;
        }
      }

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

function buildEmailBody(artistName, folderLink) {
  return `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">Hoi ${artistName},<br><br>Bedankt voor je optreden! We hebben de foto's binnengekregen van JCSFotografie.<br><br>Via de onderstaande link kun je jouw persoonlijke foto's bekijken en downloaden:<br><a href="${folderLink}" style="color: #0071e3;">${folderLink}</a><br><br>Deel je ze op Instagram? Vergeet dan niet de fotograaf (<b>@jcsfotografie_</b>) en ons (<b>@haagseopenmic</b>) te taggen!<br><br>Hartelijke groet,<br><br>Gijs en Ro<br><br><b>Haagse Open Mic</b><br>Elke 2e dinsdag van de maand<br>19u - 22u<br>IG: <a href="https://instagram.com/haagseopenmic" style="color: #0071e3; text-decoration: none;">@HaagseOpenMic</a></div>`;
}

// Send-single route: Één email via Brevo API (HTTPS/443 — geen SMTP nodig)
router.post('/send-single', async (req, res) => {
  if (!process.env.BREVO_API_KEY) {
    console.error('Missende BREVO_API_KEY!');
    return res.status(500).json({ status: 'error', message: 'E-mail instellingen ontbreken op de server' });
  }

  try {
    const { match } = req.body;
    if (!match || !match.email || match.email === '-') {
      return res.json({ status: 'skipped' });
    }

    const payload = {
      sender: { name: 'Haagse Open Mic', email: process.env.EMAIL_USER || 'info@haagseopenmic.nl' },
      to: [{ email: match.email, name: match.artistName || match.email }],
      cc: [{ email: 'haagseopenmic@gmail.com' }],
      subject: "Jouw foto's van de Haagse Open Mic!",
      htmlContent: buildEmailBody(match.artistName, match.folderLink)
    };

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('Brevo API Error:', response.status, errorBody);
      return res.status(500).json({ status: 'error', message: errorBody.message || `Brevo fout (${response.status})` });
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Send-single fout:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;