const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Readable } = require('stream');
const path = require('path');
const { drive } = require('../googleDrive');
const { sheets, SPREADSHEET_ID } = require('../googleSheets');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Alleen afbeeldingen zijn toegestaan.'));
    cb(null, true);
  },
});

// POST /api/luisterlab
router.post('/', upload.single('bandfoto'), async (req, res) => {
  try {
    const {
      actNaam,
      contactNaam,
      email,
      telefoon,
      omschrijving,
      liveLink,
      akkoordRegels,
      vrijwilliger,
      speelduur,
    } = req.body;

    if (!actNaam || !contactNaam || !email || !telefoon || !omschrijving || !liveLink) {
      return res.status(400).json({ error: 'Niet alle verplichte velden zijn ingevuld.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Bandfoto is verplicht.' });
    }
    if (akkoordRegels !== 'true' && akkoordRegels !== true) {
      return res.status(400).json({ error: 'Akkoord met spelregels is verplicht.' });
    }

    // 1. Upload bandfoto naar Google Drive
    const folderId = process.env.LUISTERLAB_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error('LUISTERLAB_DRIVE_FOLDER_ID is niet geconfigureerd.');

    const driveResponse = await drive.files.create({
      requestBody: {
        name: `${actNaam}_bandfoto_${Date.now()}${path.extname(req.file.originalname)}`,
        parents: [folderId],
      },
      media: { mimeType: req.file.mimetype, body: Readable.from(req.file.buffer) },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    const fileId = driveResponse.data.id;
    const photoLink = driveResponse.data.webViewLink;
    const fileUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w500`;

    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });

    // 2. Haal huidige sheet-data op voor duplicate check
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'contacts!A:Z',
    });
    const allRows = sheetResponse.data.values || [];
    const headers = allRows[0] || [];

    const emailColIdx = headers.indexOf('E-mailadres');
    const artistColIdx = headers.indexOf('Artiestennaam');
    const notesColIdx = headers.indexOf('Notities');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedArtist = actNaam.trim().toLowerCase();

    let existingRowNum = null;
    let existingNotes = '';

    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      const rowEmail = emailColIdx !== -1 ? (row[emailColIdx] || '').trim().toLowerCase() : '';
      const rowArtist = artistColIdx !== -1 ? (row[artistColIdx] || '').trim().toLowerCase() : '';
      if (rowEmail === normalizedEmail || rowArtist === normalizedArtist) {
        existingRowNum = i + 1; // Sheets-rijen zijn 1-based; rij 1 = headers
        existingNotes = notesColIdx !== -1 ? (row[notesColIdx] || '') : '';
        break;
      }
    }

    const isNew = existingRowNum === null;

    // 3. Naamvelden splitsen
    const nameParts = contactNaam.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // 4. Notities bepalen
    let notities;
    if (isNew) {
      notities = 'LuisterLab - NIEUW';
    } else {
      const currentNotes = (existingNotes || '').trim();
      const basisNotes = currentNotes === '-' ? '' : currentNotes;
      notities = basisNotes.includes('LuisterLab')
        ? basisNotes
        : (basisNotes ? `${basisNotes} | LuisterLab - Update` : 'LuisterLab - Update');
    }

    // 5. 25-koloms array opbouwen (volgorde = exacte kolomvolgorde in de sheet)
    const rowData = [
      firstName,                                                         // [0]  Voornaam
      lastName,                                                          // [1]  Achternaam
      actNaam,                                                           // [2]  Artiestennaam
      notities,                                                          // [3]  Notities
      email,                                                             // [4]  E-mailadres
      telefoon ? `'${telefoon}` : '',                                    // [5]  Telefoonnummer
      '',                                                                // [6]  Instagram account
      fileUrl,                                                           // [7]  Profielfoto
      speelduur || '20',                                                 // [8]  Speelduur
      '',                                                                // [9]  Interesse in workshops
      '',                                                                // [10] Workshop 7 nov
      '',                                                                // [11] Unsubscribed
      '',                                                                // [12] Blacklist
      '',                                                                // [13] Regio Den Haag
      '',                                                                // [14] Regio Rotterdam
      'Artiest',                                                         // [15] Soort contact
      true,                                                              // [16] Boekbaar
      '',                                                                // [17] Favoriet Gijs
      '',                                                                // [18] Favoriet Ro
      '',                                                                // [19] Mailing Selectie
      '',                                                                // [20] Gender
      omschrijving,                                                      // [21] Omschrijving
      liveLink,                                                          // [22] Live Link
      '',                                                                // [23] Bandfoto Link (niet meer in gebruik)
      vrijwilliger === 'true' || vrijwilliger === true,                  // [24] Vrijwilliger
    ];

    // 6. Schrijf naar Google Sheets
    if (isNew) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'contacts!A:Y',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
      console.log(`[LuisterLab] Nieuw toegevoegd: ${actNaam} (${email})`);
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `contacts!A${existingRowNum}:Y${existingRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
      console.log(`[LuisterLab] Geüpdatet: ${actNaam} (${email}), rij ${existingRowNum}`);
    }

    // 7. Stuur notificatie-e-mail naar info@haagseopenmic.nl
    try {
      const subject = isNew
        ? `Nieuwe LuisterLab Aanmelding: ${actNaam}`
        : `LuisterLab Update: ${actNaam}`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.8; max-width: 600px;">
          <h2 style="color: #1a1a1a;">${isNew ? '🎶 Nieuwe LuisterLab Aanmelding' : '🔄 LuisterLab Update'}</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; white-space: nowrap;">Artiestennaam</td><td>${actNaam}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; white-space: nowrap;">Contactpersoon</td><td>${contactNaam}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; white-space: nowrap;">E-mailadres</td><td><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; white-space: nowrap;">Telefoonnummer</td><td>${telefoon || '—'}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; white-space: nowrap;">Speelduur</td><td>${speelduur || '20'} minuten</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; white-space: nowrap;">Vrijwilliger</td><td>${vrijwilliger === 'true' || vrijwilliger === true ? 'Ja' : 'Nee'}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; white-space: nowrap; vertical-align: top;">Omschrijving</td><td>${omschrijving}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; white-space: nowrap;">Live Link</td><td><a href="${liveLink}">${liveLink}</a></td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; white-space: nowrap;">Profielfoto Link</td><td><a href="${photoLink}">${photoLink}</a></td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; white-space: nowrap;">Status</td><td><strong>${isNew ? 'NIEUW' : 'UPDATE van bestaand contact'}</strong></td></tr>
          </table>
        </div>`;

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Haagse Open Mic', email: 'nieuwsbrief@haagseopenmic.nl' },
          to: [{ email: 'openmicamare@gmail.com', name: 'Haagse Open Mic' }],
          subject,
          htmlContent: htmlBody,
        }),
      });
      console.log(`[LuisterLab] Notificatie-e-mail verstuurd voor: ${actNaam}`);
    } catch (mailError) {
      console.error('[LuisterLab] Notificatie-e-mail mislukt (niet kritiek):', mailError.message);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('[LuisterLab] Fout bij aanmelding:', error);
    res.status(500).json({ error: 'Er is een serverfout opgetreden. Probeer het later opnieuw.' });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Foto is te groot (max 10 MB).' });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
