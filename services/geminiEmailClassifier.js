/**
 * Classificeert een inkomende e-mail om te bepalen of het een verzoek is om te spelen op de open mic.
 */
async function classifyEmailRelevance({ apiKey, name, email, subject, body }) {
  if (!apiKey) {
    return { isPlayRequest: true, explanation: 'Geen GEMINI_API_KEY geconfigureerd, standaard als relevant gemarkeerd.' };
  }

  const classificationPrompt = `
Je bent een administratieve hulp voor de Haagse Open Mic.
Jouw taak is om te bepalen of een inkomende e-mail een verzoek, vraag of aanmelding is om te komen optreden (spelen) op de Haagse Open Mic.

Hier is de e-mail van ${name || email}:
Onderwerp: ${subject}
Inhoud:
${body}

Geef een JSON-antwoord terug met de volgende structuur:
{
  "isPlayRequest": true of false,
  "explanation": "korte uitleg waarom dit wel of niet een verzoek is om te spelen"
}
Geef ALLEEN de JSON terug. Geen markdown code blocks.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: classificationPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(text.trim());
    return {
      isPlayRequest: Boolean(parsed.isPlayRequest),
      explanation: parsed.explanation || ''
    };
  } catch (err) {
    console.error('[Gemini Classifier] Fout bij classificeren e-mail:', err);
    return { isPlayRequest: true, explanation: 'Classificatiefout, veiligheidshalve als relevant behandeld.' };
  }
}

/**
 * Genereert een context-bewuste respons via Gemini.
 */
async function generateEmailReply({ apiKey, name, email, subject, body, systemInstructions }) {
  if (!apiKey) return '';

  const prompt = `${systemInstructions}\n\nAfzender: ${name || email}\nE-mail onderwerp: ${subject}\nE-mail inhoud:\n${body}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text.includes('```html')) {
      text = text.split('```html')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0].trim();
    }
    return text.trim();
  } catch (err) {
    console.error('[Gemini Classifier] Fout bij genereren antwoord via Gemini:', err);
    return '';
  }
}

function getFallbackReplyHtml(name) {
  const firstName = name ? name.split(' ')[0] : 'muziekliefhebber';
  return `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
      <p>Hoi ${firstName},</p>
      <p>Bedankt voor je e-mail naar Haagse Open Mic. We hebben je bericht goed ontvangen.</p>
      <p>We nemen zo snel mogelijk contact met je op. Als je je wilt aanmelden om op te treden, kan dit direct via de website: <a href="https://www.haagseopenmic.nl" style="color: #0071e3; text-decoration: none;">www.haagseopenmic.nl</a></p>
      <p>Met muzikale groet,<br>
      <strong>Team Haagse Open Mic</strong></p>
    </div>
  `;
}

module.exports = {
  classifyEmailRelevance,
  generateEmailReply,
  getFallbackReplyHtml
};
