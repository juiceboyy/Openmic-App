const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();
const { createSpeelschemaService } = require('./services/speelschemaSheets');

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

// Speelschema service delegatie
const speelschemaService = createSpeelschemaService(sheets);

// 2. Functie om data op te halen (Lezen)
async function getSheetData() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'contacts', 
    });
    return response.data.values;
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
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'contacts!1:1',
    });
    const headers = headersResponse.data.values[0];

    const changes = [];

    for (const key in dataToUpdate) {
      if (key === '_action' || key === '_rowIndex') continue;

      const columnIndex = headers.indexOf(key);
      if (columnIndex !== -1) {
        const columnLetter = indexToLetter(columnIndex);
        const cellRange = `contacts!${columnLetter}${rowIndex}`;
        changes.push({
          range: cellRange,
          values: [[ dataToUpdate[key] ]]
        });
      }
    }

    if (changes.length === 0) return { status: 'success', message: 'Geen geldige velden gevonden om te updaten.' };

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
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
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'contacts!1:1',
    });
    const headers = headersResponse.data.values[0];

    const newRow = headers.map(header => newArtistData[header] || "");

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'contacts',
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
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const sheet = metadata.data.sheets.find(s => s.properties.title === 'contacts');
    if (!sheet) throw new Error("Tabblad 'contacts' niet gevonden.");
    const sheetId = sheet.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex
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

async function batchUpdateGenders(updates) {
  try {
    if (!updates || updates.length === 0) {
      return { status: 'success', updatedFields: 0 };
    }

    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'contacts!1:1',
    });
    const headers = headersResponse.data.values[0];
    const columnIndex = headers.indexOf('Gender');

    if (columnIndex === -1) {
      throw new Error("Kolom 'Gender' niet gevonden in Google Sheets.");
    }

    const columnLetter = indexToLetter(columnIndex);

    const changes = updates.map(u => ({
      range: `contacts!${columnLetter}${u.rowIndex}`,
      values: [[ u.gender ]]
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: changes
      }
    });

    return { status: 'success', updatedFields: changes.length };
  } catch (error) {
    console.error('Fout bij batch updaten genders in Google Sheets:', error);
    throw error;
  }
}

module.exports = {
  sheets,
  getSheetData,
  updateArtistData,
  batchUpdateGenders,
  addArtistData,
  deleteArtistData,
  SPREADSHEET_ID,
  getSheetNames: speelschemaService.getSheetNames,
  getPreviousLineup: speelschemaService.getPreviousLineup,
  getCurrentLineup: speelschemaService.getCurrentLineup,
  saveLineup: speelschemaService.saveLineup,
  getAllPastPerformers: speelschemaService.getAllPastPerformers
};