require('dotenv').config();

const SPEELSCHEMA_ID = process.env.SPEELSCHEMA_SPREADSHEET_ID;

let pastPerformersCache = null;
let pastPerformersCacheTime = 0;

function createSpeelschemaService(sheets) {
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

      for (const row of rows) {
        const colA = String(row[0] || '').toLowerCase();
        const colB = String(row[1] || '').trim();

        if (colA.includes('reserve')) {
          inReserveSection = true;
        }

        if (colB && !colB.includes("PAUZE")) {
          if (inReserveSection) {
            reserveNames.push(colB);
          } else {
            mainNames.push(colB);
          }
        }
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

      rawData.forEach((row) => {
        const colA = String(row[0] || '').toLowerCase();
        const name = row[1] ? row[1].toString().trim() : "";
        const notes = row[5] ? row[5].toString().trim() : "";

        if (colA.includes('reserve')) {
          inReserveSection = true;
        }

        if (name.includes("PAUZE") || name.includes("☕")) return;

        if (inReserveSection) {
          if (name) reserveData.push({ name, notes });
        } else {
          parsedData.push({ name, notes });
        }
      });

      const finalData = parsedData.slice(0, 12);
      while (finalData.length < 12) {
        finalData.push({ name: "", notes: "" });
      }

      return { isNew: false, data: finalData, reserveData };
    } catch (error) {
      return { isNew: true, data: [], reserveData: [] };
    }
  }

  async function saveLineup(sheetName, lineup, reserves = []) {
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPEELSCHEMA_ID,
        range: `${sheetName}!A3:F40`,
      });

      const rowsToInsert = [];
      let volgnummer = 1;

      lineup.forEach(artist => {
        let displayName = "";
        let notes = "";

        if (artist) {
          displayName = (artist.artistName && artist.artistName !== '-')
            ? artist.artistName
            : `${artist.firstName || ''} ${artist.lastName || ''}`.trim();
          notes = (artist.notes && artist.notes !== '-') ? artist.notes : '';
        }

        rowsToInsert.push([volgnummer, displayName, "", "", "", notes]);

        if (volgnummer === 6) {
          rowsToInsert.push(["-", "☕ --- PAUZE ---", "", "", "", ""]);
        }
        volgnummer++;
      });

      rowsToInsert.push(["", "", "", "", "", ""]);
      rowsToInsert.push(["", "", "", "", "", ""]);
      rowsToInsert.push(["", "", "", "", "", ""]);

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
        rowsToInsert.push(["Reserve", "", "", "", "", ""]);
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPEELSCHEMA_ID,
        range: `${sheetName}!A3`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rowsToInsert },
      });

      pastPerformersCache = null;
      return { status: 'success' };
    } catch (error) {
      console.error('Fout bij opslaan lineup:', error);
      throw error;
    }
  }

  async function getAllPastPerformers(excludeSheetName) {
    const now = Date.now();
    if (!pastPerformersCache || (now - pastPerformersCacheTime >= 5 * 60 * 1000)) {
      try {
        const sheetNames = await getSheetNames();
        const newCache = {};

        if (sheetNames.length > 0) {
          const ranges = sheetNames.map(name => `${name}!A3:B40`);
          const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPEELSCHEMA_ID,
            ranges: ranges
          });

          const valueRanges = response.data.valueRanges || [];
          valueRanges.forEach((vr, index) => {
            const sheetName = sheetNames[index];
            const rows = vr.values || [];
            const sheetNamesList = [];
            let inReserve = false;

            rows.forEach((row) => {
              const colA = String(row[0] || '').toLowerCase();
              const colB = String(row[1] || '').trim();

              if (colA.includes('reserve')) {
                inReserve = true;
              }

              if (colB && !inReserve && !colB.includes("PAUZE") && !colB.includes("☕")) {
                sheetNamesList.push(colB.toLowerCase());
              }
            });
            newCache[sheetName.toLowerCase()] = sheetNamesList;
          });
        }
        pastPerformersCache = newCache;
        pastPerformersCacheTime = now;
      } catch (error) {
        console.error('Fout bij ophalen alle eerdere artiesten:', error);
        throw error;
      }
    }

    const allNames = new Set();
    const excludeLower = excludeSheetName ? excludeSheetName.toLowerCase().trim() : null;

    for (const [sheetName, names] of Object.entries(pastPerformersCache)) {
      if (excludeLower && sheetName.trim() === excludeLower) {
        continue;
      }
      names.forEach(name => allNames.add(name));
    }

    return Array.from(allNames);
  }

  return {
    getSheetNames,
    getPreviousLineup,
    getCurrentLineup,
    saveLineup,
    getAllPastPerformers
  };
}

module.exports = { createSpeelschemaService };
