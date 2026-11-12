const { getSheetData, addArtistData, updateArtistData } = require('../googleSheets');

function escapeHtml(str) {
  if (!str) return '-';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isEmptySheetValue(val) {
  if (val === undefined || val === null) return true;
  const trimmed = String(val).trim();
  return trimmed === '' || trimmed === '-';
}

function buildInterestNote({ instruments, remarks }) {
  const today = new Date().toLocaleDateString('nl-NL');
  const parts = [`Writing Camp interesse (${today})`];
  if (instruments && instruments.trim()) {
    parts.push(`Instrumenten/Rol: ${instruments.trim()}`);
  }
  if (remarks && remarks.trim()) {
    parts.push(`Opmerking: ${remarks.trim()}`);
  }
  return parts.join(' | ');
}

/**
 * Voegt een interesse-aanmelding toe aan het tabblad 'contacts' of werkt een bestaand contact bij.
 * Zet altijd 'Interesse in workshops (Ja/Nee)' op true en laat 'Writing Camp (Ja/Nee)' ongemoeid/uit.
 */
async function upsertWritingCampInterest(formData) {
  const {
    firstName,
    lastName,
    email,
    phone,
    artistName,
    genre,
    instruments,
    socialMedia,
    liveLink,
    remarks,
  } = formData;

  const sheetData = await getSheetData();
  if (!sheetData || sheetData.length === 0) {
    throw new Error('Google Sheet bevat geen headers.');
  }

  const headers = sheetData[0];
  const rows = sheetData.slice(1);
  const emailColIndex = headers.indexOf('E-mailadres');

  if (emailColIndex === -1) {
    throw new Error("Kolom 'E-mailadres' niet gevonden in Google Sheets.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingRowIndex = rows.findIndex(
    (row) => (row[emailColIndex] || '').trim().toLowerCase() === normalizedEmail
  );

  const interestNote = buildInterestNote({ instruments, remarks });

  if (existingRowIndex !== -1) {
    const existingRow = rows[existingRowIndex];
    const sheetRowIndex = existingRowIndex + 2;
    const getExisting = (colName) => {
      const idx = headers.indexOf(colName);
      return idx !== -1 ? existingRow[idx] : '';
    };

    const updates = {
      'Interesse in workshops (Ja/Nee)': true,
    };

    const fillIfEmpty = (colName, value) => {
      if (value && value.trim() && isEmptySheetValue(getExisting(colName))) {
        updates[colName] = value.trim();
      }
    };

    fillIfEmpty('Voornaam', firstName);
    fillIfEmpty('Achternaam', lastName);
    fillIfEmpty('Artiestennaam', artistName);
    fillIfEmpty('Telefoonnummer', phone);
    fillIfEmpty('Social media', socialMedia);
    fillIfEmpty('Live Link', liveLink);
    fillIfEmpty('Omschrijving', genre);

    const existingNotes = (getExisting('Notities') || '').trim();
    updates['Notities'] = isEmptySheetValue(existingNotes)
      ? interestNote
      : `${existingNotes}\n${interestNote}`;

    await updateArtistData(sheetRowIndex, updates);
    return { action: 'updated', rowIndex: sheetRowIndex };
  }

  const newContact = {
    'Voornaam': firstName.trim(),
    'Achternaam': lastName.trim(),
    'Artiestennaam': artistName?.trim() || '-',
    'E-mailadres': email.trim(),
    'Telefoonnummer': phone?.trim() || '-',
    'Social media': socialMedia?.trim() || '-',
    'Live Link': liveLink?.trim() || '-',
    'Omschrijving': genre?.trim() || '-',
    'Notities': interestNote,
    'Soort contact': 'Artiest',
    'Regio Den Haag': true,
    'Interesse in workshops (Ja/Nee)': true,
    'Datum toegevoegd': new Date().toLocaleDateString('nl-NL'),
  };

  await addArtistData(newContact);
  return { action: 'created' };
}

function buildAdminNotificationHtml(formData, sheetStatus) {
  const {
    firstName,
    lastName,
    email,
    phone,
    artistName,
    genre,
    instruments,
    socialMedia,
    liveLink,
    remarks,
  } = formData;
  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  let statusText = 'Contact is toegevoegd aan de database met het vinkje <em>Interesse in workshops</em>.';
  if (sheetStatus?.action === 'updated') {
    statusText = 'Bestaand contact gevonden in de database: lege velden zijn aangevuld, notitie toegevoegd en <em>Interesse in workshops</em> aangevinkt.';
  } else if (sheetStatus?.error) {
    statusText = `Let op: automatisch opslaan in Google Sheets is mislukt (${escapeHtml(sheetStatus.error)}). Voeg dit contact handmatig toe.`;
  }

  const safeLiveLink = liveLink && liveLink.trim() ? liveLink.trim() : '';
  const liveLinkHref = safeLiveLink && !/^https?:\/\//i.test(safeLiveLink) ? `https://${safeLiveLink}` : safeLiveLink;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; max-width: 620px; line-height: 1.6;">
      <h2 style="color: #111827; margin-bottom: 4px;">Nieuwe interesse-aanmelding Songwriting Camp</h2>
      <p style="color: #6b7280; font-size: 14px; margin-top: 0;">Interesselijst voor toekomstige edities</p>

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
          <td style="padding: 10px 0; font-weight: 600; color: #374151;">Social media</td>
          <td style="padding: 10px 0; color: #111827;">${escapeHtml(socialMedia)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; font-weight: 600; color: #374151;">Live link / Demo</td>
          <td style="padding: 10px 0; color: #111827;">
            ${safeLiveLink ? `<a href="${escapeHtml(liveLinkHref)}" target="_blank" style="color: #0071e3;">${escapeHtml(safeLiveLink)}</a>` : '-'}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; font-weight: 600; color: #374151;">Opmerkingen / Voorkeur</td>
          <td style="padding: 10px 0; color: #111827;">${escapeHtml(remarks)}</td>
        </tr>
      </table>

      <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
        ${statusText}
      </p>
    </div>
  `;
}

function buildArtistConfirmationHtml(formData) {
  const {
    firstName,
    lastName,
    artistName,
    genre,
    instruments,
    socialMedia,
    liveLink,
    remarks,
  } = formData;
  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; max-width: 600px; line-height: 1.6;">
      <h2 style="color: #111827; margin-bottom: 8px;">Hoi ${escapeHtml(firstName.trim())},</h2>
      <p style="font-size: 15px; color: #374151;">
        Bedankt voor het doorgeven van je interesse in het <strong>Songwriting Camp</strong> van de Haagse Open Mic.
      </p>
      <p style="font-size: 15px; color: #374151;">
        We hebben je gegevens genoteerd op onze interesselijst voor toekomstige edities. Zodra er een nieuwe datum gepland staat, hoor je als eerste van ons per e-mail.
      </p>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 24px 0; font-size: 14px; color: #374151;">
        <strong>Jouw ingevulde gegevens:</strong><br>
        Naam: ${escapeHtml(fullName)}<br>
        ${artistName ? `Artiestennaam: ${escapeHtml(artistName)}<br>` : ''}
        ${genre ? `Muziekstijl / Genre: ${escapeHtml(genre)}<br>` : ''}
        ${instruments ? `Instrumenten / Rol: ${escapeHtml(instruments)}<br>` : ''}
        ${socialMedia ? `Social media: ${escapeHtml(socialMedia)}<br>` : ''}
        ${liveLink ? `Live link / Demo: ${escapeHtml(liveLink)}<br>` : ''}
        ${remarks ? `Opmerkingen / Voorkeur: ${escapeHtml(remarks)}<br>` : ''}
      </div>
      <p style="font-size: 15px; color: #374151;">
        Heb je tussentijds vragen? Je kunt altijd direct reageren op deze mail.
      </p>
      <p style="font-size: 15px; color: #374151; margin-top: 24px;">
        Hartelijke groet,<br>
        <strong>Gijs en Ro</strong><br>
        Haagse Open Mic
      </p>
    </div>
  `;
}

module.exports = {
  upsertWritingCampInterest,
  buildAdminNotificationHtml,
  buildArtistConfirmationHtml,
};
