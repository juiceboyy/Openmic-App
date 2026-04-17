const express = require('express');
const router = express.Router();
const multer = require('multer');
const { google } = require('googleapis');
const { Readable } = require('stream');
const path = require('path');
require('dotenv').config();

// --- Google Auth (Drive write + Sheets) ---
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
];

function getAuth() {
  let authOptions = { scopes: SCOPES };

  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      authOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (e) {
      console.error('[LuisterLab] Kon GOOGLE_CREDENTIALS_JSON niet parsen:', e);
    }
  }

  if (!authOptions.credentials) {
    authOptions.keyFile = path.join(__dirname, '..', 'google-credentials.json');
  }

  return new google.auth.GoogleAuth(authOptions);
}

// --- Multer: opslaan in geheugen, max 10 MB ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Alleen afbeeldingen zijn toegestaan.'));
    }
    cb(null, true);
  },
});

// --- POST /api/luisterlab ---
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
    } = req.body;

    // Basisvalidatie
    if (!actNaam || !contactNaam || !email || !telefoon || !omschrijving || !liveLink) {
      return res.status(400).json({ success: false, message: 'Niet alle verplichte velden zijn ingevuld.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Bandfoto is verplicht.' });
    }
    if (akkoordRegels !== 'true' && akkoordRegels !== true) {
      return res.status(400).json({ success: false, message: 'Akkoord met spelregels is verplicht.' });
    }

    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Upload bandfoto naar Google Drive
    const folderId = process.env.LUISTERLAB_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error('LUISTERLAB_DRIVE_FOLDER_ID is niet geconfigureerd.');

    const fileStream = Readable.from(req.file.buffer);
    const driveResponse = await drive.files.create({
      requestBody: {
        name: `${actNaam}_bandfoto_${Date.now()}${path.extname(req.file.originalname)}`,
        parents: [folderId],
      },
      media: {
        mimeType: req.file.mimetype,
        body: fileStream,
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    const fileId = driveResponse.data.id;
    const bandfotoLink = driveResponse.data.webViewLink;

    // Maak het bestand publiek leesbaar
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });

    // 2. Voeg rij toe aan master contacts sheet
    const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'contacts!1:1',
    });
    const headers = headersResponse.data.values[0];

    const newContact = {
      'Voornaam': contactNaam.split(' ')[0] || contactNaam,
      'Achternaam': contactNaam.split(' ').slice(1).join(' ') || '',
      'Artiestennaam': actNaam,
      'E-mailadres': email,
      'Telefoonnummer': telefoon,
      'Soort contact': 'Boekbaar',
      'Datum toegevoegd': new Date().toLocaleDateString('nl-NL'),
      'Omschrijving': omschrijving,
      'Live Link': liveLink,
      'Bandfoto Link': bandfotoLink,
      'Vrijwilliger': vrijwilliger === 'true' || vrijwilliger === true ? 'Ja' : 'Nee',
    };

    const newRow = headers.map(header => newContact[header] || '');

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'contacts!A:Z',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] },
    });

    console.log(`[LuisterLab] Aanmelding opgeslagen: ${actNaam} (${email})`);
    res.json({ success: true, message: 'Aanmelding succesvol ontvangen!' });

  } catch (error) {
    console.error('[LuisterLab] Fout bij aanmelding:', error);
    res.status(500).json({ success: false, message: 'Er is een serverfout opgetreden. Probeer het later opnieuw.' });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Foto is te groot (max 10 MB).' });
  }
  if (err.message) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

module.exports = router;
