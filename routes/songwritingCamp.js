const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const {
  upsertWritingCampInterest,
  buildAdminNotificationHtml,
  buildArtistConfirmationHtml,
} = require('../services/writingCampService');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Rate limiter: maximaal 5 aanmeldingen per IP per uur
const writingCampLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Te veel aanmeldingen verstuurd. Probeer het over een uur nog eens.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', writingCampLimiter, async (req, res) => {
  try {
    const formData = req.body || {};
    const { firstName, lastName, email } = formData;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Voornaam, achternaam en e-mailadres zijn verplicht.',
      });
    }

    if (!process.env.BREVO_API_KEY) {
      console.error('Missende BREVO_API_KEY voor Songwriting Camp interesseformulier.');
      return res.status(500).json({
        success: false,
        message: 'E-mailservice is tijdelijk niet beschikbaar op de server.',
      });
    }

    // 1. Sla contact op of werk bestaand contact bij in Google Sheets
    let sheetStatus;
    try {
      sheetStatus = await upsertWritingCampInterest(formData);
      console.log(`Songwriting Camp interesse (${sheetStatus.action}) opgeslagen in Sheet voor ${email}`);
    } catch (sheetErr) {
      console.error('Fout bij opslaan Songwriting Camp interesse in Google Sheets:', sheetErr);
      sheetStatus = { error: sheetErr.message };
    }

    const recipientEmail = process.env.NOTIFICATION_EMAIL || 'openmicamare@gmail.com';
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // 2. Stuur notificatiemail naar organisatie
    const adminPayload = {
      sender: {
        name: 'Haagse Open Mic',
        email: process.env.EMAIL_USER || 'info@haagseopenmic.nl',
      },
      to: [{ email: recipientEmail, name: 'Haagse Open Mic Organisatie' }],
      replyTo: { email: email.trim(), name: fullName },
      subject: `Interesse Songwriting Camp: ${fullName}`,
      htmlContent: buildAdminNotificationHtml(formData, sheetStatus),
    };

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(adminPayload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('Brevo API Error bij songwriting camp:', response.status, errorBody);
      return res.status(500).json({
        success: false,
        message: errorBody.message || 'Kon de aanmelding niet verzenden via de e-mailservice.',
      });
    }

    console.log(`Songwriting Camp interesse verzonden voor ${fullName} (${email}) naar ${recipientEmail}`);

    // 3. Stuur automatische bevestigingsmail naar de artiest (Fire and forget)
    const confirmationPayload = {
      sender: {
        name: 'Haagse Open Mic',
        email: process.env.EMAIL_USER || 'info@haagseopenmic.nl',
      },
      to: [{ email: email.trim(), name: fullName }],
      replyTo: { email: recipientEmail, name: 'Haagse Open Mic' },
      subject: 'Bedankt voor je interesse - Songwriting Camp',
      htmlContent: buildArtistConfirmationHtml(formData),
    };

    fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(confirmationPayload),
    })
      .then(async (confRes) => {
        if (!confRes.ok) {
          console.error('Fout bij verzenden bevestigingsmail naar artiest:', confRes.status, await confRes.text());
        } else {
          console.log(`Bevestigingsmail Songwriting Camp interesse verstuurd naar: ${email}`);
        }
      })
      .catch((err) => console.error('Netwerkfout bij sturen bevestigingsmail:', err));

    return res.json({ success: true, message: 'Interesse succesvol verzonden.' });
  } catch (error) {
    console.error('Fout bij verwerken Songwriting Camp interesseformulier:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een serverfout opgetreden bij het verzenden.',
    });
  }
});

module.exports = router;
