const { google } = require('googleapis');

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

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

function getEmailBody(payload) {
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8');
  }
  if (payload.parts) {
    const plainPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plainPart && plainPart.body && plainPart.body.data) {
      return Buffer.from(plainPart.body.data, 'base64').toString('utf8');
    }
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      return Buffer.from(htmlPart.body.data, 'base64').toString('utf8');
    }
    for (const part of payload.parts) {
      const body = getEmailBody(part);
      if (body) return body;
    }
  }
  return '';
}

async function ensureLabelExists(gmail, labelName) {
  try {
    const res = await gmail.users.labels.list({ userId: 'me' });
    const labels = res.data.labels || [];
    const existing = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
    if (existing) return existing.id;

    console.log(`[Gmail Service] Label "${labelName}" niet gevonden. Bezig met aanmaken...`);
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
    console.error(`[Gmail Service] Fout bij verifiëren of aanmaken label ${labelName}:`, err);
    return null;
  }
}

function buildMimeMessage({ to, subject, inReplyTo, references, htmlBody }) {
  const replySubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
  const encodedSubject = `=?utf-8?B?${Buffer.from(replySubject).toString('base64')}?=`;

  const mimeParts = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8'
  ];

  if (inReplyTo) mimeParts.push(`In-Reply-To: ${inReplyTo}`);
  if (references) mimeParts.push(`References: ${references}`);

  mimeParts.push('');
  mimeParts.push(htmlBody);

  const rawMime = mimeParts.join('\r\n');
  return Buffer.from(rawMime)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

module.exports = {
  getOAuth2Client,
  parseSender,
  getEmailBody,
  ensureLabelExists,
  buildMimeMessage
};
