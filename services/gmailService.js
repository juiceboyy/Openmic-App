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
 * Triggers the process of reading incoming unread emails,
 * responding to them via Gemini AI, and adding new contacts to the DB.
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
    console.warn('⚠️ [Gmail Service] GEMINI_API_KEY is not configured. Gemini-powered replies will not be available.');
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Fetch unread messages in the INBOX
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread label:INBOX'
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) {
      console.log('📬 [Gmail Service] No unread emails found.');
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

        // 1. Check if contact is new and add to database
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
            // Add to existingEmails set so if they sent multiple emails in this batch, they aren't added again
            existingEmails.add(email.toLowerCase().trim());
          } catch (sheetErr) {
            console.error(`❌ [Gmail Service] Error adding contact ${email} to sheets:`, sheetErr);
          }
        }

        // 2. Generate Gemini Response
        let replyHtml = '';
        const emailBody = getEmailBody(msg.data.payload);

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
              throw new Error(`Gemini API returned status ${geminiRes.status}: ${await geminiRes.text()}`);
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

        // 3. Send reply on thread
        console.log(`✉️ [Gmail Service] Sending thread reply to ${email}...`);
        const replySubject = subjectHeader.toLowerCase().startsWith('re:') ? subjectHeader : `Re: ${subjectHeader}`;
        
        // Encode subject with UTF-8 base64 encoding to prevent encoding issues
        const encodedSubject = `=?utf-8?B?${Buffer.from(replySubject).toString('base64')}?=`;

        // Build RFC 2822 MIME message
        const mimeParts = [
          `To: ${email}`,
          `Subject: ${encodedSubject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8'
        ];

        // Add headers for thread reply
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

        // 4. Remove UNREAD label from original message
        console.log(`🏷️ [Gmail Service] Marking message ${msgObj.id} as read...`);
        await gmail.users.messages.batchModify({
          userId: 'me',
          requestBody: {
            ids: [msgObj.id],
            removeLabelIds: ['UNREAD']
          }
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
