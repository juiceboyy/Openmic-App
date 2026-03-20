const express = require('express');
const router = express.Router();
const { getSheetData, updateArtistData, addArtistData, deleteArtistData } = require('../googleSheets.js');

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

module.exports = router;