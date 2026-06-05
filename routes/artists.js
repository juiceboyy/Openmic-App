const express = require('express');
const router = express.Router();
const { getSheetData, updateArtistData, batchUpdateGenders, addArtistData, deleteArtistData } = require('../googleSheets.js');

// Test-route: Haal alle artiesten uit de Google Sheet
router.get('/', async (req, res) => {
  try {
    const data = await getSheetData();
    
    if (!data || data.length === 0) {
      return res.json({ status: 'warning', message: 'De sheet is leeg of niet gevonden.' });
    }

    // Data transformatie: Van 2D Array (rijen) naar Array van Objecten
    const headers = data[0];
    const rows = data.slice(1);

    const formattedData = rows.map((row, index) => {
      const obj = {};
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex];
      });
      obj.rowIndex = index + 2;
      return obj;
    });

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Edit-route: Ontvangt wijzigingen van de frontend en stuurt ze naar de Sheet
router.post('/edit', async (req, res) => {
  try {
    const payload = req.body;
    const rowIndex = payload._rowIndex;
    
    if (!rowIndex) {
      return res.status(400).json({ status: 'error', message: 'Geen _rowIndex meegegeven in de payload.' });
    }
    
    console.log(`Verzoek ontvangen om rij ${rowIndex} te updaten...`);
    const result = await updateArtistData(rowIndex, payload);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Add-route: Nieuwe artiest toevoegen
router.post('/add', async (req, res) => {
  try {
    const payload = req.body;
    console.log("Verzoek ontvangen om nieuwe artiest toe te voegen.");
    const result = await addArtistData(payload);
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Delete-route: Artiest verwijderen
router.post('/delete', async (req, res) => {
  try {
    const payload = req.body;
    const rowIndex = payload._rowIndex;

    if (!rowIndex) {
      return res.status(400).json({ status: 'error', message: 'Geen _rowIndex meegegeven voor verwijdering.' });
    }

    console.log(`Verzoek ontvangen om rij ${rowIndex} te verwijderen.`);
    const result = await deleteArtistData(rowIndex);
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Route om genders te analyseren via Gemini
router.post('/analyze-genders', async (req, res) => {
  try {
    const { artists } = req.body;
    if (!artists || !Array.isArray(artists) || artists.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Geen artiesten meegegeven voor analyse.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ status: 'error', message: 'GEMINI_API_KEY is niet geconfigureerd op de server.' });
    }

    // Bouw de lijst met namen op voor de prompt
    const namesList = artists.map(a => {
      let naam = (a.firstName || '').trim();
      if (!naam || naam === '-') {
        const parts = (a.artistName || '').trim().split(/\s+/);
        naam = parts[0] || '';
      }
      return { id: a.rowIndex, name: naam };
    }).filter(item => item.name && item.name !== '-');

    if (namesList.length === 0) {
      return res.json({ status: 'success', message: 'Geen geldige namen gevonden om te analyseren.', updatedCount: 0 });
    }

    const prompt = `Je bent een administratieve hulp die de voornamen van personen classificeert naar gender.
We hebben een lijst met namen gekregen. Geef voor elke naam aan of het gender 'Man', 'Vrouw', of 'Non-binair' is.
Als een naam unisex is, te weinig informatie heeft (bijvoorbeeld een afkorting zoals 'J.' of een bandnaam), of als je het niet zeker weet, geef dan null op.
Houd rekening met typisch Nederlandse en internationale voornamen.

Hier is de lijst met namen in JSON-formaat:
${JSON.stringify(namesList, null, 2)}

Geef de resultaten terug als een JSON-array van objecten, waarbij elk object exact de volgende structuur heeft:
{
  "id": <het ID dat in de invoer is meegegeven als id (rowIndex)>,
  "gender": "Man" | "Vrouw" | "Non-binair" | null
}
Produceer ALLEEN de JSON array. Geen markdown code blocks.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API fout (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Geen antwoord ontvangen van Gemini.');
    }

    let classifications;
    try {
      classifications = JSON.parse(text.trim());
    } catch (e) {
      console.error('Kon Gemini response niet parsen als JSON:', text);
      throw new Error('Fout bij het parsen van het Gemini antwoord.');
    }

    if (!Array.isArray(classifications)) {
      throw new Error('Gemini antwoord is geen geldige array.');
    }

    const updates = classifications
      .filter(c => c.id && c.gender && ['Man', 'Vrouw', 'Non-binair'].includes(c.gender))
      .map(c => ({
        rowIndex: parseInt(c.id),
        gender: c.gender
      }));

    if (updates.length > 0) {
      await batchUpdateGenders(updates);
    }

    res.json({
      status: 'success',
      message: `${updates.length} genders succesvol bijgewerkt.`,
      updatedCount: updates.length,
      updates
    });

  } catch (error) {
    console.error('Fout bij /analyze-genders route:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;