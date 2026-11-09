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

let isProcessing = false;

async function markThreadChecked(gmail, threadId, checkedLabelId) {
  if (!checkedLabelId || !threadId) return;
  try {
    await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: {
        addLabelIds: [checkedLabelId]
      }
    });
  } catch (err) {
    console.warn(`[Gmail Service] Kon label niet op thread ${threadId} zetten:`, err.message);
  }
}

async function processIncomingEmails(options = {}) {
  if (isProcessing) {
    console.log('[Gmail Service] Verwerking draait al, deze ronde wordt overgeslagen om dubbele drafts te voorkomen.');
    return { success: true, count: 0, message: 'Verwerking is al bezig.' };
  }

  isProcessing = true;

  let syncRoute;
  try {
    syncRoute = require('../routes/sync');
  } catch (e) {}

  const inMemoryTokens = syncRoute?.getStoredTokens ? syncRoute.getStoredTokens() : null;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || inMemoryTokens?.refresh_token;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!refreshToken && !inMemoryTokens) {
    isProcessing = false;
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

    // 1. Controleer bestaande drafts en verwijder eventuele dubbele drafts binnen dezelfde conversatie
    const existingDraftThreadIds = new Set();
    let cleanedDuplicateDrafts = 0;
    try {
      const draftsRes = await gmail.users.drafts.list({ userId: 'me' });
      const drafts = draftsRes.data.drafts || [];
      for (const d of drafts) {
        const tId = d.message?.threadId;
        if (!tId) continue;
        if (existingDraftThreadIds.has(tId)) {
          try {
            await gmail.users.drafts.delete({ userId: 'me', id: d.id });
            cleanedDuplicateDrafts++;
            console.log(`[Gmail Service] Dubbele draft ${d.id} in conversatie ${tId} opgeruimd.`);
          } catch (delErr) {
            console.warn(`[Gmail Service] Kon dubbele draft ${d.id} niet verwijderen:`, delErr.message);
          }
        } else {
          existingDraftThreadIds.add(tId);
        }
      }
    } catch (draftErr) {
      console.warn('[Gmail Service] Kon bestaande drafts niet ophalen:', draftErr.message);
    }

    const query = `is:unread label:INBOX -label:${checkedLabelName} newer_than:14d`;
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 10
    });

    const rawMessages = listRes.data.messages || [];
    if (rawMessages.length === 0) {
      console.log('[Gmail Service] Geen nieuwe ongelezen e-mails gevonden.');
      return {
        success: true,
        count: 0,
        cleanedDuplicateDrafts,
        message: 'Geen nieuwe ongelezen e-mails gevonden.'
      };
    }

    // Groepeer op threadId zodat een conversatie met meerdere berichten maar 1 keer wordt verwerkt (max 5 per run tegen timeouts)
    const uniqueThreadIds = [...new Set(rawMessages.map(m => m.threadId).filter(Boolean))].slice(0, 5);
    console.log(`[Gmail Service] ${uniqueThreadIds.length} unieke conversatie(s) gevonden voor verwerking.`);

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
    const ownEmails = new Set([
      'openmicamare@gmail.com',
      'haagseopenmic@gmail.com',
      'info@haagseopenmic.nl',
      'nieuwsbrief@haagseopenmic.nl'
    ]);

    for (const threadId of uniqueThreadIds) {
      try {
        // Als er al een draft in deze conversatie bestaat, maak nooit een tweede aan
        if (existingDraftThreadIds.has(threadId)) {
          console.log(`[Gmail Service] Conversatie ${threadId} heeft al een concept. Overgeslagen.`);
          await markThreadChecked(gmail, threadId, checkedLabelId);
          results.push({ threadId, status: 'skipped_existing_draft' });
          continue;
        }

        const threadRes = await gmail.users.threads.get({
          userId: 'me',
          id: threadId,
          format: 'full'
        });

        const threadMessages = threadRes.data.messages || [];

        // Zoek het meest recente inkomende bericht (niet van onszelf en geen draft)
        const incomingMessages = threadMessages.filter(m => {
          const labels = m.labelIds || [];
          if (labels.includes('DRAFT')) return false;
          const headers = m.payload?.headers || [];
          const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
          const { email } = parseSender(fromHeader);
          return email && !ownEmails.has(email.toLowerCase().trim());
        });

        const targetMsg = incomingMessages[incomingMessages.length - 1] || threadMessages[threadMessages.length - 1];
        if (!targetMsg) {
          await markThreadChecked(gmail, threadId, checkedLabelId);
          continue;
        }

        const headers = targetMsg.payload?.headers || [];
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(Geen onderwerp)';
        const messageIdHeader = headers.find(h => h.name.toLowerCase() === 'message-id')?.value || '';

        const { name, email } = parseSender(fromHeader);
        if (!email || ownEmails.has(email.toLowerCase().trim())) {
          await markThreadChecked(gmail, threadId, checkedLabelId);
          results.push({ threadId, status: 'skipped', reason: 'Geen externe afzender gevonden' });
          continue;
        }

        const emailBody = getEmailBody(targetMsg.payload);

        // 1. Relevantie beoordelen via AI
        const relevance = await classifyEmailRelevance({
          apiKey,
          name,
          email,
          subject: subjectHeader,
          body: emailBody
        });

        if (!relevance.isPlayRequest) {
          console.log(`[Gmail Service] Conversatie ${threadId} is geen optreedverzoek. Overgeslagen (${relevance.explanation}).`);
          await markThreadChecked(gmail, threadId, checkedLabelId);
          results.push({ threadId, email, status: 'ignored_not_play_request', explanation: relevance.explanation });
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

        // 4. Slechts 1 concept (draft) klaarzetten per conversatie
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
              threadId: threadId
            }
          }
        });

        existingDraftThreadIds.add(threadId);
        console.log(`[Gmail Service] Concept klaargezet voor ${email} in conversatie ${threadId} (Draft ID: ${draftRes.data.id}).`);

        // 5. Markeer de gehele conversatie als checked
        await markThreadChecked(gmail, threadId, checkedLabelId);

        results.push({
          threadId,
          email,
          status: 'draft_created',
          draftId: draftRes.data.id,
          addedToSheet
        });
      } catch (itemErr) {
        console.error(`[Gmail Service] Fout bij verwerken conversatie ${threadId}:`, itemErr);
        results.push({ threadId, status: 'error', error: itemErr.message });
      }
    }

    return {
      success: true,
      count: uniqueThreadIds.length,
      cleanedDuplicateDrafts,
      results
    };
  } catch (err) {
    console.error('[Gmail Service] Fatale fout in email processor:', err);
    return {
      success: false,
      error: err.message,
      code: err.code || err.status
    };
  } finally {
    isProcessing = false;
  }
}

module.exports = {
  processIncomingEmails
};
