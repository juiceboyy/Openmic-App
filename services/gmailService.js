const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const { getSheetData, addArtistData } = require('../googleSheets');
const {
  getOAuth2Client,
  parseSender,
  getEmailBody,
  ensureLabelExists,
  buildMimeMessage
} = require('./gmailHelpers');
const {
  classifyEmailRelevance,
  generateEmailReply,
  getFallbackReplyHtml
} = require('./geminiEmailClassifier');

async function processIncomingEmails(options = {}) {
  const { isManualTrigger = false } = options;
  let syncRoute;
  try {
    syncRoute = require('../routes/sync');
  } catch (e) {}

  const inMemoryTokens = syncRoute?.getStoredTokens ? syncRoute.getStoredTokens() : null;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || inMemoryTokens?.refresh_token;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!refreshToken && !inMemoryTokens) {
    const msg = 'GOOGLE_OAUTH_REFRESH_TOKEN is niet geconfigureerd en er is geen actief sessietoken.';
    console.warn(`[Gmail Service] ${msg}`);
    return { success: false, error: msg };
  }

  try {
    const oauth2Client = getOAuth2Client();
    if (inMemoryTokens) {
      oauth2Client.setCredentials(inMemoryTokens);
    } else {
      oauth2Client.setCredentials({ refresh_token: refreshToken });
    }
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const checkedLabelName = 'Checked-By-App';
    const checkedLabelId = await ensureLabelExists(gmail, checkedLabelName);

    const query = `is:unread label:INBOX -label:${checkedLabelName}`;
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) {
      console.log('[Gmail Service] Geen nieuwe ongelezen e-mails gevonden.');
      return { success: true, count: 0, message: 'Geen nieuwe ongelezen e-mails gevonden.' };
    }

    console.log(`[Gmail Service] ${messages.length} ongelezen e-mail(s) gevonden voor verwerking.`);

    let systemInstructions = 'Je bent een behulpzame AI-assistent voor Haagse Open Mic. Schrijf een vriendelijke reactie op deze e-mail.';
    try {
      const instructionsPath = path.join(__dirname, '../templates/ai_reply_instructions.txt');
      systemInstructions = await fs.readFile(instructionsPath, 'utf8');
    } catch (readErr) {
      console.warn('[Gmail Service] ai_reply_instructions.txt niet gevonden, standaard prompt gebruikt.');
    }

    let existingEmails = new Set();
    let emailColIdx = -1;
    try {
      const sheetData = await getSheetData();
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
      console.error('[Gmail Service] Fout bij ophalen contacten sheet:', err);
    }

    const results = [];

    for (const msgObj of messages) {
      try {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: msgObj.id,
          format: 'full'
        });

        const headers = msg.data.payload?.headers || [];
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(Geen onderwerp)';
        const messageIdHeader = headers.find(h => h.name.toLowerCase() === 'message-id')?.value || '';

        const { name, email } = parseSender(fromHeader);
        if (!email) {
          results.push({ id: msgObj.id, status: 'skipped', reason: 'Afzender e-mail kon niet worden uitgelezen' });
          continue;
        }

        const emailBody = getEmailBody(msg.data.payload);

        // 1. Relevantie beoordelen via AI
        const relevance = await classifyEmailRelevance({
          apiKey,
          name,
          email,
          subject: subjectHeader,
          body: emailBody
        });

        if (!relevance.isPlayRequest) {
          console.log(`[Gmail Service] Bericht ${msgObj.id} is geen optreedverzoek. Overgeslagen (${relevance.explanation}).`);
          if (checkedLabelId) {
            await gmail.users.messages.batchModify({
              userId: 'me',
              requestBody: {
                ids: [msgObj.id],
                addLabelIds: [checkedLabelId]
              }
            });
          }
          results.push({ id: msgObj.id, email, status: 'ignored_not_play_request', explanation: relevance.explanation });
          continue;
        }

        // 2. Toevoegen aan database indien nieuw
        let addedToSheet = false;
        if (emailColIdx !== -1 && !existingEmails.has(email.toLowerCase().trim())) {
          let firstName = '';
          let lastName = '';
          if (name) {
            const parts = name.trim().split(/\s+/);
            if (parts.length > 1) {
              firstName = parts.slice(0, -1).join(' ');
              lastName = parts[parts.length - 1];
            } else {
              firstName = parts[0];
            }
          } else {
            firstName = email.split('@')[0];
          }

          await addArtistData({
            "Voornaam": firstName,
            "Achternaam": lastName,
            "E-mailadres": email,
            "Soort contact": "Artiest",
            "Regio Den Haag": true,
            "Datum toegevoegd": new Date().toLocaleDateString('nl-NL')
          });
          existingEmails.add(email.toLowerCase().trim());
          addedToSheet = true;
          console.log(`[Gmail Service] Nieuw contact toegevoegd aan Sheet: ${email}`);
        }

        // 3. Reactie opstellen
        let replyHtml = await generateEmailReply({
          apiKey,
          name,
          email,
          subject: subjectHeader,
          body: emailBody,
          systemInstructions
        });

        if (!replyHtml) {
          replyHtml = getFallbackReplyHtml(name);
        }

        // 4. Concept (draft) klaarzetten in dezelfde e-mailthread
        const encodedMime = buildMimeMessage({
          to: email,
          subject: subjectHeader,
          inReplyTo: messageIdHeader,
          references: messageIdHeader,
          htmlBody: replyHtml
        });

        const draftRes = await gmail.users.drafts.create({
          userId: 'me',
          requestBody: {
            message: {
              raw: encodedMime,
              threadId: msg.data.threadId
            }
          }
        });

        console.log(`[Gmail Service] Concept klaargezet voor ${email} (Draft ID: ${draftRes.data.id}).`);

        // 5. Markeren als checked (laat UNREAD staan zodat het concept opvalt in de inbox)
        if (checkedLabelId) {
          await gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: {
              ids: [msgObj.id],
              addLabelIds: [checkedLabelId]
            }
          });
        }

        results.push({
          id: msgObj.id,
          email,
          status: 'draft_created',
          draftId: draftRes.data.id,
          addedToSheet
        });
      } catch (itemErr) {
        console.error(`[Gmail Service] Fout bij verwerken bericht ${msgObj.id}:`, itemErr);
        results.push({ id: msgObj.id, status: 'error', error: itemErr.message });
      }
    }

    return { success: true, count: messages.length, results };
  } catch (err) {
    console.error('[Gmail Service] Fatale fout in email processor:', err);
    return {
      success: false,
      error: err.message,
      code: err.code || err.status
    };
  }
}

module.exports = {
  processIncomingEmails
};
