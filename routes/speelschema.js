const express = require('express');
const router = express.Router();
const { getSheetNames, getPreviousLineup, getCurrentLineup, saveLineup } = require('../googleSheets.js');

router.post('/sheets', async (req, res) => {
  try {
    const sheetNames = await getSheetNames();
    res.json({ status: 'success', sheetNames });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/previous', async (req, res) => {
  try {
    const { mainNames, reserveNames } = await getPreviousLineup(req.body.prevSheetName);
    res.json({ status: 'success', names: mainNames, reserveNames });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/current', async (req, res) => {
  try {
    const result = await getCurrentLineup(req.body.sheetName);
    res.json({ status: 'success', ...result });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/save', async (req, res) => {
  try {
    const { sheetName, lineup, reserve } = req.body;
    await saveLineup(sheetName, lineup, reserve);
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;