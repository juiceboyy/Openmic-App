const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { getSheetData, addArtistData } = require('../googleSheets');

// In-memory token opslag (verdwijnt bij server restart — stel GOOGLE_OAUTH_REFRESH_TOKEN in als env var voor persistentie)
let storedTokens = null;

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

// GET /api/sync/auth-url
router.get('/auth-url', (req, res) => {
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return res.status(500).json({ status: 'error', message: 'OAuth2 credentials niet geconfigureerd (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET).' });
  }
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/contacts.readonly'],
    prompt: 'consent'
  });
  res.json({ status: 'success', url });
});

// GET /api/sync/callback — aangeroepen door Google na toestemming (geen PIN nodig, is een Google redirect)
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`<h2>Autorisatie geweigerd: ${error}</h2>`);
  if (!code) return res.status(400).send('<h2>Geen autorisatiecode ontvangen.</h2>');

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    storedTokens = tokens;
    console.log('✅ Google Contacts OAuth2 token ontvangen en opgeslagen.');
    if (tokens.refresh_token) {
      console.log(`ℹ️  Stel GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token} in als env var voor persistentie.`);
    }
    res.send(`<!DOCTYPE html><html><body><script>window.opener && window.opener.postMessage('oauth-success', '*'); window.close();</script><p>Autorisatie gelukt! Je kunt dit venster sluiten.</p></body></html>`);
  } catch (err) {
    console.error('OAuth callback fout:', err);
    res.status(500).send('<h2>Autorisatie mislukt. Probeer opnieuw.</h2>');
  }
});

// POST /api/sync/contacts — haalt contacten op en vergelijkt met de sheet
router.post('/contacts', async (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();

    const tokens = storedTokens ||
      (process.env.GOOGLE_OAUTH_REFRESH_TOKEN ? { refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN } : null);

    if (!tokens) {
      return res.json({ status: 'needs_auth' });
    }

    oauth2Client.setCredentials(tokens);
    storedTokens = tokens;

    // Haal Google Contacts op (max 1000 — genoeg voor een persoonlijk adresboek)
    const people = google.people({ version: 'v1', auth: oauth2Client });
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,emailAddresses,phoneNumbers,biographies'
    });
    const allConnections = response.data.connections || [];

    // Haal bestaande e-mails uit de sheet op
    const sheetData = await getSheetData();
    const headers = sheetData[0];
    const emailCol = headers.indexOf('E-mailadres');
    const existingEmails = new Set(
      sheetData.slice(1)
        .map(row => (row[emailCol] || '').toLowerCase().trim())
        .filter(Boolean)
    );

    // Filter: alleen contacten die nog niet in de sheet staan
    const newContacts = allConnections
      .map(person => ({
        firstName: person.names?.[0]?.givenName || '',
        lastName: person.names?.[0]?.familyName || '',
        email: person.emailAddresses?.[0]?.value || '',
        phone: person.phoneNumbers?.[0]?.value || '',
        notes: person.biographies?.[0]?.value || ''
      }))
      .filter(c => c.email && !existingEmails.has(c.email.toLowerCase().trim()));

    res.json({ status: 'success', contacts: newContacts });
  } catch (err) {
    console.error('Fout bij ophalen Google Contacts:', err);
    if (err.code === 401 || err.message?.includes('invalid_grant') || err.message?.includes('Token has been expired')) {
      storedTokens = null;
      return res.json({ status: 'needs_auth' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/sync/import — importeer geselecteerde contacten naar de sheet
router.post('/import', async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!contacts?.length) {
      return res.status(400).json({ status: 'error', message: 'Geen contacten om te importeren.' });
    }

    const today = new Date().toLocaleDateString('nl-NL');
    for (const contact of contacts) {
      await addArtistData({
        "Voornaam": contact.firstName || '',
        "Achternaam": contact.lastName || '',
        "E-mailadres": contact.email || '',
        "Datum toegevoegd": today
      });
    }

    res.json({ status: 'success', importedCount: contacts.length });
  } catch (err) {
    console.error('Fout bij importeren contacten:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
