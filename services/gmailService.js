const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const { getSheetData, addArtistData } = require('../googleSheets');

// OAuth2 client helper
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

/**
 * Parses the "From" header to extract the name and email address.
 */
function parseSender(fromHeader) {
  if (!fromHeader) return { name: '', email: '' };
  const emailRegex = /<([^>]+)>/;
  const match = fromHeader.match(emailRegex);
  if (match) {
    const email = match[1].trim();
    const name = fromHeader.replace(emailRegex, '').replace(/"/g, '').trim();
    return { name, email };
  }
  return { name: '', email: fromHeader.trim() };
}

/**
 * Recursively parses the Gmail message payload to extract the email body content.
 */
function getEmailBody(payload) {
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8');
  }
  if (payload.parts) {
    // Prefer plain text, fall back to HTML
    const plainPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plainPart && plainPart.body && plainPart.body.data) {
      return Buffer.from(plainPart.body.data, 'base64').toString('utf8');
    }
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      return Buffer.from(htmlPart.body.data, 'base64').toString('utf8');
    }
    // Recursively check sub-parts
    for (const part of payload.parts) {
      const body = getEmailBody(part);
      if (body) return body;
    }
  }
  return '';
}

/**
 * Ensures that a Gmail label exists. Creates it if it doesn't.
 * Returns the label ID.
 */
async function ensureLabelExists(gmail, labelName) {
  try {
    const res = await gmail.users.labels.list({ userId: 'me' });
    const labels = res.data.labels || [];
    const existing = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
    if (existing) return existing.id;

    console.log(`🏷️ [Gmail Service] Label "${labelName}" not found. Creating it...`);
    const createRes = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: labelName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show'
      }
    });
    return createRes.data.id;
  } catch (err) {
    console.error(`❌ [Gmail Service] Error ensuring label ${labelName} exists:`, err);
    return null;
  }
}

/**
 * Triggers the process of reading incoming unread emails,
 * checking relevance, responding via Gemini AI, and adding new contacts.
 */
async function processIncomingEmails() {
  console.log('📬 [Gmail Service] Starting incoming email check...');
  
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!refreshToken) {
    console.warn('⚠️ [Gmail Service] GOOGLE_OAUTH_REFRESH_TOKEN is not configured. Skipping check.');
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ [Gmail Service] GEMINI_API_KEY is not configured. Gemini features will not be available.');
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Ensure the Checked-By-App label exists
    const checkedLabelName = 'Checked-By-App';
    const checkedLabelId = await ensureLabelExists(gmail, checkedLabelName);

    // Fetch unread messages in the INBOX that have NOT been checked yet
    const query = `is:unread label:INBOX -label:${checkedLabelName}`;
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) {
      console.log('📬 [Gmail Service] No new unread emails found.');
      return;
    }

    console.log(`📬 [Gmail Service] Found ${messages.length} unread email(s) to process.`);

    // Read the system instructions for Gemini
    let systemInstructions = '';
    try {
      const instructionsPath = path.join(__dirname, '../templates/ai_reply_instructions.txt');
      systemInstructions = await fs.readFile(instructionsPath, 'utf8');
    } catch (err) {
      console.error('❌ [Gmail Service] Could not read system instructions. Using a minimal default.', err);
      systemInstructions = 'Je bent een behulpzame AI-assistent voor Haagse Open Mic. Schrijf een vriendelijke reactie op deze e-mail.';
    }

    // Load existing contact emails from the database (Google Sheet)
    let sheetData;
    let existingEmails = new Set();
    let emailColIdx = -1;

    try {
      sheetData = await getSheetData();
      if (sheetData && sheetData.length > 0) {
        const headers = sheetData[0];
        emailColIdx = headers.indexOf('E-mailadres');
        if (emailColIdx !== -1) {
          existingEmails = new Set(
            sheetData.slice(1)
              .map(row => (row[emailColIdx] || '').toLowerCase().trim())
              .filter(Boolean)
          );
        }
      }
    } catch (err) {
      console.error('❌ [Gmail Service] Error reading contacts sheet. Skipping contact check but continuing processing.', err);
    }

    for (const msgObj of messages) {
      try {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: msgObj.id,
          format: 'full'
        });

        const headers = msg.data.payload.headers || [];
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const messageIdHeader = headers.find(h => h.name.toLowerCase() === 'message-id')?.value || '';
        
        const { name, email } = parseSender(fromHeader);
        console.log(`📬 [Gmail Service] Processing email from: ${name || 'Unknown'} <${email}>, Subject: "${subjectHeader}"`);

        if (!email) {
          console.warn(`⚠️ [Gmail Service] Skipping message ${msgObj.id} because email could not be parsed.`);
          continue;
        }

        const emailBody = getEmailBody(msg.data.payload);

        // 1. Classification Step via Gemini
        let isPlayRequest = false;
        if (apiKey) {
          const classificationPrompt = `
Je bent een administratieve hulp voor de Haagse Open Mic.
Jouw taak is om te bepalen of een inkomende e-mail een verzoek, vraag of aanmelding is om te komen optreden (spelen) op de Haagse Open Mic.

Hier is de e-mail van ${name || email}:
Onderwerp: ${subjectHeader}
Inhoud:
${emailBody}

Geef een JSON-antwoord terug met de volgende structuur:
{
  "isPlayRequest": true of false,
  "explanation": "korte uitleg waarom dit wel of niet een verzoek is om te spelen"
}
Geef ALLEEN de JSON terug. Geen markdown code blocks.`;

          try {
            console.log(`🤖 [Gmail Service] Querying Gemini AI to classify email relevance...`);
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: classificationPrompt }] }],
                  generationConfig: { responseMimeType: "application/json" }
                })
              }
            );

            if (!geminiRes.ok) {
              throw new Error(`Gemini API returned status ${geminiRes.status}`);
            }

            const geminiData = await geminiRes.json();
            const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const classification = JSON.parse(aiText.trim());
            
            isPlayRequest = !!classification.isPlayRequest;
            console.log(`🤖 [Gmail Service] Classification result: isPlayRequest=${isPlayRequest} (${classification.explanation})`);
          } catch (geminiErr) {
            console.error('❌ [Gmail Service] Gemini classification failed. Defaulting to true to be safe:', geminiErr);
            isPlayRequest = true; // Fallback to true in case of failure to prevent missing important emails
          }
        } else {
          isPlayRequest = true; // Default to true if Gemini is not configured
        }

        // 2. Route based on relevance
        if (!isPlayRequest) {
          console.log(`📬 [Gmail Service] Email is NOT a play request. Skipping auto-reply and contact addition.`);
          
          // Mark as checked so we don't query it next time, but KEEP it UNREAD in Gmail
          if (checkedLabelId) {
            console.log(`🏷️ [Gmail Service] Adding "${checkedLabelName}" label to message ${msgObj.id}...`);
            await gmail.users.messages.batchModify({
              userId: 'me',
              requestBody: {
                ids: [msgObj.id],
                addLabelIds: [checkedLabelId]
              }
            });
          }
          console.log(`✅ [Gmail Service] Message ${msgObj.id} skipped & marked as checked!`);
          continue;
        }

        // 3. Add to Contacts Google Sheet (if play request and not yet existing)
        if (emailColIdx !== -1 && !existingEmails.has(email.toLowerCase().trim())) {
          console.log(`👤 [Gmail Service] New contact detected! Adding to sheet: ${email}`);
          
          let firstName = '';
          let lastName = '';
          if (name) {
            const nameParts = name.trim().split(/\s+/);
            if (nameParts.length > 1) {
              firstName = nameParts.slice(0, -1).join(' ');
              lastName = nameParts[nameParts.length - 1];
            } else {
              firstName = nameParts[0];
            }
          } else {
            firstName = email.split('@')[0];
          }

          const newContact = {
            "Voornaam": firstName,
            "Achternaam": lastName,
            "E-mailadres": email,
            "Soort contact": "Artiest",
            "Datum toegevoegd": new Date().toLocaleDateString('nl-NL')
          };

          try {
            await addArtistData(newContact);
            console.log(`👤 [Gmail Service] Successfully added ${email} to Sheets.`);
            existingEmails.add(email.toLowerCase().trim());
          } catch (sheetErr) {
            console.error(`❌ [Gmail Service] Error adding contact ${email} to sheets:`, sheetErr);
          }
        }

        // 4. Generate AI Auto-Reply
        let replyHtml = '';
        if (apiKey) {
          const prompt = `${systemInstructions}\n\nAfzender: ${name || email}\nE-mail onderwerp: ${subjectHeader}\nE-mail inhoud:\n${emailBody}`;
          
          try {
            console.log(`🤖 [Gmail Service] Querying Gemini AI for context-aware reply...`);
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }]
                })
              }
            );

            if (!geminiRes.ok) {
              throw new Error(`Gemini API returned status ${geminiRes.status}`);
            }

            const geminiData = await geminiRes.json();
            let aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            // Clean up any potential markdown wrapped HTML
            if (aiText.includes('```html')) {
              aiText = aiText.split('```html')[1].split('```')[0].trim();
            } else if (aiText.includes('```')) {
              aiText = aiText.split('```')[1].split('```')[0].trim();
            }
            replyHtml = aiText.trim();
          } catch (geminiErr) {
            console.error('❌ [Gmail Service] Gemini generation failed, falling back to static template:', geminiErr);
          }
        }

        // Fallback static template if Gemini failed or is disabled
        if (!replyHtml) {
          const firstName = name ? name.split(' ')[0] : 'muziekliefhebber';
          replyHtml = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
              <p>Hoi ${firstName},</p>
              <p>Bedankt voor je e-mail naar Haagse Open Mic! We hebben je bericht goed ontvangen.</p>
              <p>We nemen zo snel mogelijk contact met je op. Als je je wilt aanmelden om op te treden, kan dit direct via de website: 👉 <a href="https://www.haagseopenmic.nl" style="color: #0071e3; text-decoration: none;">www.haagseopenmic.nl</a></p>
              <p>Met muzikale groet,<br>
              <strong>Team Haagse Open Mic 🎙️📝</strong></p>
            </div>
          `;
        }

        // 5. Send reply on thread
        console.log(`✉️ [Gmail Service] Sending thread reply to ${email}...`);
        const replySubject = subjectHeader.toLowerCase().startsWith('re:') ? subjectHeader : `Re: ${subjectHeader}`;
        const encodedSubject = `=?utf-8?B?${Buffer.from(replySubject).toString('base64')}?=`;

        const mimeParts = [
          `To: ${email}`,
          `Subject: ${encodedSubject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8'
        ];

        if (messageIdHeader) {
          mimeParts.push(`In-Reply-To: ${messageIdHeader}`);
          mimeParts.push(`References: ${messageIdHeader}`);
        }

        mimeParts.push('');
        mimeParts.push(replyHtml);

        const rawMime = mimeParts.join('\r\n');
        const encodedMime = Buffer.from(rawMime)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMime,
            threadId: msg.data.threadId
          }
        });
        console.log(`✉️ [Gmail Service] Reply sent successfully.`);

        // 6. Remove UNREAD label and Add Checked-By-App label
        console.log(`🏷️ [Gmail Service] Marking message ${msgObj.id} as read and checked...`);
        
        const modifyPayload = {
          ids: [msgObj.id],
          removeLabelIds: ['UNREAD']
        };
        if (checkedLabelId) {
          modifyPayload.addLabelIds = [checkedLabelId];
        }

        await gmail.users.messages.batchModify({
          userId: 'me',
          requestBody: modifyPayload
        });
        console.log(`✅ [Gmail Service] Message ${msgObj.id} processed successfully!`);

      } catch (msgErr) {
        console.error(`❌ [Gmail Service] Error processing message ${msgObj.id}:`, msgErr);
      }
    }
  } catch (err) {
    console.error('❌ [Gmail Service] Fatal error in email processor:', err);
  }
}

module.exports = {
  processIncomingEmails
};
