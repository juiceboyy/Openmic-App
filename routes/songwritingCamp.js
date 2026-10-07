const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Rate limiter: maximaal 5 aanmeldingen per IP per uur
const writingCampLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Te veel aanmeldingen verstuurd. Probeer het over een uur nog eens.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function escapeHtml(str) {
  if (!str) return '-';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

router.post('/', writingCampLimiter, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      artistName,
      genre,
      liveLink,
      instruments,
      dietary,
    } = req.body || {};

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Voornaam, achternaam en e-mailadres zijn verplicht.',
      });
    }

    if (!process.env.BREVO_API_KEY) {
      console.error('Missende BREVO_API_KEY voor Songwriting Camp aanmelding.');
      return res.status(500).json({
        success: false,
        message: 'E-mailservice is tijdelijk niet beschikbaar op de server.',
      });
    }

    const recipientEmail = process.env.NOTIFICATION_EMAIL || 'openmicamare@gmail.com';
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; max-width: 620px; line-height: 1.6;">
        <h2 style="color: #111827; margin-bottom: 4px;">Nieuwe aanmelding Songwriting Camp</h2>
        <p style="color: #6b7280; font-size: 14px; margin-top: 0;">15 november 2026 - Pianino Theater & Broedplaats</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; width: 180px; color: #374151;">Naam</td>
            <td style="padding: 10px 0; color: #111827;">${escapeHtml(fullName)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; color: #374151;">Artiestennaam</td>
            <td style="padding: 10px 0; color: #111827;">${escapeHtml(artistName)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; color: #374151;">E-mailadres</td>
            <td style="padding: 10px 0; color: #111827;"><a href="mailto:${escapeHtml(email)}" style="color: #0071e3;">${escapeHtml(email)}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; color: #374151;">Telefoonnummer</td>
            <td style="padding: 10px 0; color: #111827;">${escapeHtml(phone)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; color: #374151;">Muziekstijl / Genre</td>
            <td style="padding: 10px 0; color: #111827;">${escapeHtml(genre)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; color: #374151;">Instrumenten / Rol</td>
            <td style="padding: 10px 0; color: #111827;">${escapeHtml(instruments)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; color: #374151;">Live link / Demo</td>
            <td style="padding: 10px 0; color: #111827;">
              ${liveLink ? `<a href="${escapeHtml(liveLink)}" target="_blank" style="color: #0071e3;">${escapeHtml(liveLink)}</a>` : '-'}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; color: #374151;">Dieetwensen / Allergieën</td>
            <td style="padding: 10px 0; color: #111827;">${escapeHtml(dietary)}</td>
          </tr>
        </table>

        <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
          Beoordeel deze aanmelding handmatig en voeg de deelnemer toe via het dashboard met het vinkje <em>Writing Camp</em>.
        </p>
      </div>
    `;

    const payload = {
      sender: {
        name: 'Haagse Open Mic',
        email: process.env.EMAIL_USER || 'info@haagseopenmic.nl',
      },
      to: [{ email: recipientEmail, name: 'Haagse Open Mic Organisatie' }],
      replyTo: { email: email.trim(), name: fullName },
      subject: `Aanmelding Songwriting Camp: ${fullName}`,
      htmlContent,
    };

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('Brevo API Error bij songwriting camp:', response.status, errorBody);
      return res.status(500).json({
        success: false,
        message: errorBody.message || 'Kon de aanmelding niet verzenden via de e-mailservice.',
      });
    }

    console.log(`Songwriting Camp aanmelding verzonden voor ${fullName} (${email}) naar ${recipientEmail}`);
    return res.json({ success: true, message: 'Aanmelding succesvol verzonden.' });
  } catch (error) {
    console.error('Fout bij verwerken Songwriting Camp aanmelding:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een serverfout opgetreden bij het verzenden.',
    });
  }
});

module.exports = router;
