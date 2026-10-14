const express = require('express');
const router = express.Router();
require('dotenv').config();

async function translateToEnglish(subject, message) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY ontbreekt, kan mailing niet vertalen naar Engels.');
    return { subject, message };
  }

  const prompt = `Translate this email invitation/announcement for Haagse Open Mic from Dutch into natural, friendly, and professional English.
Do NOT include a greeting (like 'Hi [name]' or 'Dear') and do NOT include a sign-off or signature, as the system appends those automatically.

Dutch subject: "${subject}"
Dutch content:
${message}

Respond ONLY with valid JSON in this exact structure without markdown code blocks:
{
  "subject": "Translated English subject",
  "message": "Translated English email text"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini vertaling fout:', await response.text());
      return { subject, message };
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        subject: parsed.subject || subject,
        message: parsed.message || message
      };
    }
  } catch (err) {
    console.error('Fout bij vertalen met Gemini:', err);
  }
  return { subject, message };
}

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
      actualRecipients = [{ email: testEmail || 'haagseopenmic@gmail.com', name: 'Test Ontvanger', isInternational: recipients.some(r => r.isInternational) }];
    } else {
      // Deduplicate recipients by email address (case-insensitive)
      const seenEmails = new Set();
      actualRecipients = recipients.filter(r => {
        if (!r || !r.email) return false;
        const emailLower = r.email.trim().toLowerCase();
        if (seenEmails.has(emailLower)) return false;
        seenEmails.add(emailLower);
        return true;
      });
    }

    const hasInternational = actualRecipients.some(r => r.isInternational);
    let engSubject = subject;
    let engMessage = message;

    if (hasInternational) {
      console.log('Internationale ontvangers gedetecteerd, tekst wordt vertaald naar Engels via Gemini...');
      const trans = await translateToEnglish(subject, message);
      engSubject = trans.subject;
      engMessage = trans.message;
    }

    const bodyHtml = message.replace(/\n/g, '<br>');
    const engBodyHtml = engMessage.replace(/\n/g, '<br>');

    const messageVersions = actualRecipients.map(r => {
      if (r.isInternational) {
        return {
          to: [{ email: r.email, name: r.name }],
          subject: testMode ? `[TEST] ${engSubject}` : engSubject,
          htmlContent: `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">Hi ${r.name},<br><br>${engBodyHtml}</div>`
        };
      }
      return {
        to: [{ email: r.email, name: r.name }],
        subject: testMode ? `[TEST] ${subject}` : subject,
        htmlContent: `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">Hoi ${r.name},<br><br>${bodyHtml}</div>`
      };
    });

    const brevoPayload = {
      sender: { name: 'Haagse Open Mic', email: 'nieuwsbrief@haagseopenmic.nl' },
      subject: testMode ? `[TEST] ${subject}` : subject,
      htmlContent: `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">${bodyHtml}</div>`,
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