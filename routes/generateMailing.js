const express = require('express');
const router = express.Router();

// Vaste gegevens voor de uitnodiging
const MOLLIE_LOGO_LINK = process.env.MOLLIE_LOGO_LINK || 'https://pay.mollie.com/haagse-open-mic-logo';

router.post('/', async (req, res) => {
    const { eventDate } = req.body;

    if (!eventDate) {
        return res.status(400).json({ status: 'error', message: 'eventDate is verplicht.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ status: 'error', message: 'GEMINI_API_KEY is niet geconfigureerd op de server.' });
    }

    const prompt = `Schrijf een uitnodigings-e-mail in het Nederlands voor artiesten voor de Haagse Open Mic avond op ${eventDate}.

Gebruik deze vaste gegevens ALTIJD letterlijk:
- Locatie: Amare, Den Haag
- Aanvang show: 19:00 uur
- Inschrijven / soundcheck: vanaf 18:30 uur
- Regels: alleen eigen werk (geen covers), maximaal 10 minuten optreden
- Merchandise: artiesten kunnen een opstrijklogo van Haagse Open Mic bestellen. BestelLink: ${MOLLIE_LOGO_LINK}

Schrijfstijl: enthousiast, warm, muzikaal en persoonlijk. Gebruik geen formele toon.

Geef je antwoord in exact dit formaat:
Onderwerp: [een pakkende, korte onderwerpregel]

[De volledige e-mailtekst. Begin NIET met een aanhef zoals "Hoi [naam]," of "Beste artist," want die wordt automatisch voor de tekst geplaatst. Sluit af met een enthousiaste groet namens Haagse Open Mic.]`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API fout (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('Geen tekst ontvangen van Gemini.');

        // Splits onderwerp van de bodytekst
        const lines = text.split('\n');
        let subject = '';
        let bodyLines = [];
        let foundSubject = false;

        for (const line of lines) {
            if (!foundSubject && line.toLowerCase().startsWith('onderwerp:')) {
                subject = line.replace(/^onderwerp:/i, '').trim();
                foundSubject = true;
            } else if (foundSubject) {
                bodyLines.push(line);
            }
        }

        // Verwijder lege regels aan het begin van de body
        while (bodyLines.length > 0 && bodyLines[0].trim() === '') {
            bodyLines.shift();
        }

        res.json({ status: 'success', subject, body: bodyLines.join('\n') });
    } catch (error) {
        console.error('Fout bij Gemini API aanroep:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
