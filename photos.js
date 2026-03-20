const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
require('dotenv').config();
const { getSubFolders } = require('../googleDrive.js');
const { getSheetData } = require('../googleSheets.js');

// Configureer de email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'haagseopenmic@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Scan-route: Foto map scannen en matchen met artiesten
router.post('/scan', async (req, res) => {
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

      let exactEmailMatch = artists.find(a => {
        let email = String(a['E-mailadres'] || '').toLowerCase().trim();
        return email && email !== '-' && (folderStr === email || folderStr.includes(email));
      });

      if (exactEmailMatch) {
        candidates.push(exactEmailMatch);
      } else {
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
router.post('/send', async (req, res) => {
  try {
    const { matches, testMode, testEmail } = req.body;
    let sentCount = 0;

    const emailPromises = matches.map(async (match) => {
      if (match.selected && match.email && match.email !== '-') {
        let subject = testMode ? "[TEST] Jouw foto's van de Haagse Open Mic!" : "Jouw foto's van de Haagse Open Mic!";
        let recipientEmail = testMode ? testEmail : match.email;
        let testWarning = testMode ? `<p style="color:#d97706; font-size:12px; background:#fef3c7; padding:8px; border-radius:4px;"><b>TEST MODUS ACTIEF:</b> Deze mail zou in het echt verstuurd worden naar: <b>${match.email}</b><br>En in Cc naar: <b>haagseopenmic@gmail.com</b></p>` : "";
        let body = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">${testWarning}Hoi ${match.artistName},<br><br>Bedankt voor je optreden! We hebben de foto's binnengekregen van JCSFotografie.<br><br>Via de onderstaande link kun je jouw persoonlijke foto's bekijken en downloaden:<br><a href="${match.folderLink}" style="color: #0071e3;">${match.folderLink}</a><br><br>Deel je ze op Instagram? Vergeet dan niet de fotograaf (<b>@jcsfotografie_</b>) en ons (<b>@haagseopenmic</b>) te taggen!<br><br>Hartelijke groet,<br><br>Gijs en Ro<br><br><b>Haagse Open Mic</b><br>Elke 2e dinsdag van de maand<br>19u - 22u<br>IG: <a href="https://instagram.com/haagseopenmic" style="color: #0071e3; text-decoration: none;">@HaagseOpenMic</a></div>`;

        let mailOptions = { from: '"Haagse Open Mic" <haagseopenmic@gmail.com>', to: recipientEmail, subject: subject, html: body };
        if (!testMode) mailOptions.cc = "haagseopenmic@gmail.com";

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

module.exports = router;