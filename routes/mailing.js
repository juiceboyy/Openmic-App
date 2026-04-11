const express = require('express');
const router = express.Router();
require('dotenv').config();

// Mailing-route: Brevo logica
router.post('/', async (req, res) => {
  const payload = req.body;
  console.log("Mailing verzoek ontvangen voor:", payload.subject);

  try {
    const { recipients, subject, message, testMode, testEmail } = payload;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Geen ontvangers gevonden.' });
    }

    let actualRecipients = recipients;
    if (testMode) {
      actualRecipients = [{ email: testEmail || 'haagseopenmic@gmail.com', name: 'Test Ontvanger' }];
    }

    const bodyHtml = message.replace(/\n/g, '<br>');

    const messageVersions = actualRecipients.map(r => ({
      to: [{ email: r.email, name: r.name }],
      htmlContent: `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">Hoi ${r.name},<br><br><br>${bodyHtml}</div>`
    }));

    const brevoPayload = {
      sender: { name: 'Haagse Open Mic', email: 'nieuwsbrief@haagseopenmic.nl' },
      subject: testMode ? `[TEST] ${subject}` : subject,
      messageVersions: messageVersions
    };

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(brevoPayload)
    });

    let data;
    const text = await brevoResponse.text();
    try { data = text ? JSON.parse(text) : {}; } 
    catch (e) { data = { message: text }; }

    if (!brevoResponse.ok) {
      console.error('Brevo API Error:', data);
      throw new Error(data.message || 'Fout bij het versturen van de mail via Brevo.');
    }

    res.json({ status: 'success', message: 'Mails succesvol verstuurd', sentCount: actualRecipients.length });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;