const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let authOptions = { scopes: SCOPES };

// 1. Check individuele env vars
if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
  authOptions.credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
} 
// 2. Check complete JSON string env var
else if (process.env.GOOGLE_CREDENTIALS_JSON) {
  try {
    authOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  } catch (error) {
    console.error('FOUT: Kon GOOGLE_CREDENTIALS_JSON niet parsen.', error);
  }
} 
// 3. Fallback naar lokaal bestand
else {
  authOptions.keyFile = path.join(__dirname, 'google-credentials.json');
}

const auth = new google.auth.GoogleAuth(authOptions);

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SPEELSCHEMA_ID = process.env.SPEELSCHEMA_SPREADSHEET_ID;

// 2. Functie om data op te halen (Lezen)
async function getSheetData() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      // LET OP: Verander 'Blad1' hieronder naar de exacte naam van jullie tabblad (bijv. 'Artiesten' of 'Sheet1')
      range: 'contacts!A:Z', 
    });
    return response.data.values; // Dit geeft een array met alle rijen terug
  } catch (error) {
    console.error('Fout bij ophalen Google Sheets:', error);
    throw error;
  }
}

// Hulpfunctie: Vertaalt een kolom-nummer (0, 1, 2) naar een letter (A, B, C)
function indexToLetter(index) {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// 3. Functie om specifieke cellen te updaten (Bewerken)
async function updateArtistData(rowIndex, dataToUpdate) {
  try {
    // A. Haal eerst de headers (rij 1) op om te weten waar alles staat
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'contacts!1:1', // LET OP: Check of je tabblad nog steeds 'Blad1' heet
    });
    const headers = headersResponse.data.values[0];

    // B. Maak een lijstje van alle cellen die gewijzigd moeten worden
    const changes = [];

    for (const key in dataToUpdate) {
      // Sla de systeemvelden over (net als in je oude GAS code)
      if (key === '_action' || key === '_rowIndex') continue;

      const columnIndex = headers.indexOf(key);
      
      // Als we de kolomnaam gevonden hebben in de sheet...
      if (columnIndex !== -1) {
        const columnLetter = indexToLetter(columnIndex);
        const cellRange = `contacts!${columnLetter}${rowIndex}`;
        
        // ...zet de nieuwe waarde klaar voor deze specifieke cel
        changes.push({
          range: cellRange,
          values: [[ dataToUpdate[key] ]] // API vereist een 'array in een array'
        });
      }
    }

    // C. Als er niks te updaten is, stop dan
    if (changes.length === 0) return { status: 'success', message: 'Geen geldige velden gevonden om te updaten.' };

    // D. Stuur in één klap alle wijzigingen naar Google Sheets!
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED', // Zorgt dat checkboxes en datums goed worden begrepen
        data: changes
      }
    });

    return { status: 'success', updatedFields: changes.length };
  } catch (error) {
    console.error('Fout bij updaten Google Sheets:', error);
    throw error;
  }
}

// 4. Functie om nieuwe artiest toe te voegen (Toevoegen)
async function addArtistData(newArtistData) {
  try {
    // A. Haal eerst de headers op om de volgorde te bepalen
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'contacts!1:1',
    });
    const headers = headersResponse.data.values[0];

    // B. Bouw de nieuwe rij op basis van de header volgorde
    const newRow = headers.map(header => newArtistData[header] || "");

    // C. Voeg de rij toe aan de sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'contacts!A:Z',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] }
    });

    return { status: 'success', message: 'Artiest succesvol toegevoegd.' };
  } catch (error) {
    console.error('Fout bij toevoegen aan Google Sheets:', error);
    throw error;
  }
}

// 5. Functie om artiest te verwijderen (Delete)
async function deleteArtistData(rowIndex) {
  try {
    // A. Haal metadata op om de numeric sheetId van 'contacts' te vinden
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const sheet = metadata.data.sheets.find(s => s.properties.title === 'contacts');
    if (!sheet) throw new Error("Tabblad 'contacts' niet gevonden.");
    const sheetId = sheet.properties.sheetId;

    // B. Voer de delete actie uit (0-based indexering)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1, // Frontend stuurt 1-based, API wil 0-based start
              endIndex: rowIndex        // End index is exclusive, dus dit pakt precies 1 rij
            }
          }
        }]
      }
    });

    return { status: 'success', message: 'Rij succesvol verwijderd.' };
  } catch (error) {
    console.error('Fout bij verwijderen uit Google Sheets:', error);
    throw error;
  }
}

// --- SPEELSCHEMA MODULE FUNCTIES ---

async function getSheetNames() {
  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId: SPEELSCHEMA_ID });
    return response.data.sheets.map(s => s.properties.title);
  } catch (error) {
    console.error('Fout bij ophalen tabbladen:', error);
    throw error;
  }
}

async function getPreviousLineup(sheetName) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPEELSCHEMA_ID,
      range: `${sheetName}!A3:B40`,
    });

    const rows = response.data.values || [];
    const mainNames = [];
    const reserveNames = [];
    let inReserveSection = false;
    let rowIndex = 0;

    for (const row of rows) {
      const colA = String(row[0] || '').toLowerCase();
      const colB = String(row[1] || '').trim();

      if (colA.includes('reserve') || rowIndex >= 14) {
        inReserveSection = true;
      }

      // Voeg de naam toe als deze niet leeg is en geen pauze bevat.
      if (colB && !colB.includes("PAUZE")) {
        if (inReserveSection) {
          reserveNames.push(colB);
        } else {
          mainNames.push(colB);
        }
      }
      rowIndex++;
    }

    return { mainNames, reserveNames };
  } catch (error) {
    console.error(`Fout bij ophalen vorige lineup (${sheetName}):`, error);
    throw error;
  }
}

async function getCurrentLineup(sheetName) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPEELSCHEMA_ID,
      range: `${sheetName}!A3:F40`,
    });

    const rawData = response.data.values || [];
    const parsedData = [];
    const reserveData = [];
    let inReserveSection = false;

    rawData.forEach((row, rowIndex) => {
      const colA = String(row[0] || '').toLowerCase();
      const name = row[1] ? row[1].toString().trim() : "";
      const notes = row[5] ? row[5].toString().trim() : "";

      if (colA.includes('reserve') || rowIndex >= 14) {
        inReserveSection = true;
      }

      if (name.includes("PAUZE") || name.includes("☕")) return;

      if (inReserveSection) {
        if (name) reserveData.push({ name, notes });
      } else {
        parsedData.push({ name, notes });
      }
    });

    // Aanvullen tot 12 slots
    const finalData = parsedData.slice(0, 12);
    while (finalData.length < 12) {
      finalData.push({ name: "", notes: "" });
    }

    return { isNew: false, data: finalData, reserveData };
  } catch (error) {
    // Als het tabblad niet bestaat, is het een nieuwe sessie
    return { isNew: true, data: [], reserveData: [] };
  }
}

async function saveLineup(sheetName, lineup, reserves = []) {
  try {
    // 1. Wis de oude range
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPEELSCHEMA_ID,
      range: `${sheetName}!A3:F40`,
    });

    // 2. Bouw de nieuwe data
    const rowsToInsert = [];
    let volgnummer = 1;

    lineup.forEach(artist => {
      let displayName = "";
      let notes = "";

      if (artist) {
        displayName = (artist.artistName && artist.artistName !== '-') ? artist.artistName : `${artist.firstName || ''} ${artist.lastName || ''}`.trim();
        notes = (artist.notes && artist.notes !== '-') ? artist.notes : '';
      }

      rowsToInsert.push([volgnummer, displayName, "", "", "", notes]);

      if (volgnummer === 6) {
        rowsToInsert.push(["-", "☕ --- PAUZE ---", "", "", "", ""]);
      }
      volgnummer++;
    });

    // Opvulling: Rij 16 en 17 leegmaken (index 13 en 14 in onze array)
    rowsToInsert.push(["", "", "", "", "", ""]);
    rowsToInsert.push(["", "", "", "", "", ""]);

    // Reserve-sectie altijd schrijven (ook als leeg), zodat handmatig toevoegen in Sheets mogelijk is
    if (reserves && reserves.length > 0) {
      reserves.forEach((artist, index) => {
        let displayName = "";
        if (artist) {
          displayName = (artist.artistName && artist.artistName !== '-')
            ? artist.artistName
            : `${artist.firstName || ''} ${artist.lastName || ''}`.trim();
        }
        const label = index === 0 ? "Reserve" : "";
        rowsToInsert.push([label, displayName, "", "", "", ""]);
      });
    } else {
      // Lege reserve-sectie: alleen de header-rij, zodat de gebruiker in Sheets kan zien waar reserves horen
      rowsToInsert.push(["Reserve", "", "", "", "", ""]);
    }

    // 3. Schrijf de data
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPEELSCHEMA_ID,
      range: `${sheetName}!A3`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rowsToInsert },
    });

    return { status: 'success' };
  } catch (error) {
    console.error('Fout bij opslaan lineup:', error);
    throw error;
  }
}

let pastPerformersCache = null;
let pastPerformersCacheTime = 0;

async function getAllPastPerformers() {
  const now = Date.now();
  // Cache voor 5 minuten om API-quota te sparen
  if (pastPerformersCache && (now - pastPerformersCacheTime < 5 * 60 * 1000)) {
    return pastPerformersCache;
  }

  try {
    const sheetNames = await getSheetNames();
    const allNames = new Set();

    if (sheetNames.length === 0) return [];

    const ranges = sheetNames.map(name => `${name}!A3:B40`);
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPEELSCHEMA_ID,
      ranges: ranges
    });

    const valueRanges = response.data.valueRanges || [];
    valueRanges.forEach(vr => {
      const rows = vr.values || [];
      let inReserve = false;
      rows.forEach((row, rowIndex) => {
        const colA = String(row[0] || '').toLowerCase();
        const colB = String(row[1] || '').trim();

        if (colA.includes('reserve') || rowIndex >= 14) {
          inReserve = true;
        }

        // Voeg de naam toe als het niet de pauze is en niet in de reserve-sectie staat
        if (colB && !inReserve && !colB.includes("PAUZE") && !colB.includes("☕")) {
          allNames.add(colB.toLowerCase());
        }
      });
    });

    pastPerformersCache = Array.from(allNames);
    pastPerformersCacheTime = now;
    return pastPerformersCache;
  } catch (error) {
    console.error('Fout bij ophalen alle eerdere artiesten:', error);
    throw error;
  }
}

module.exports = {
  sheets,
  getSheetData,
  updateArtistData,
  addArtistData,
  deleteArtistData,
  SPREADSHEET_ID,
  getSheetNames,
  getPreviousLineup,
  getCurrentLineup,
  saveLineup,
  getAllPastPerformers
};