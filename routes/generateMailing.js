const express = require('express');
const router = express.Router();

// Vaste gegevens voor de uitnodiging
const MOLLIE_LOGO_LINK = process.env.MOLLIE_LOGO_LINK || 'https://pay.mollie.com/haagse-open-mic-logo';

router.post('/', async (req, res) => {
    const { eventDate, extraInput } = req.body;

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
- Merchandise: artiesten kunnen een opstrijklogo van Haagse Open Mic kopen. Neem een eigen shirt mee, betalen kan gewoon ter plekke.

${extraInput && extraInput.trim() !== '' ? `EXTRA MEDEDELING VAN DE ORGANISATIE:\nVerwerk de volgende specifieke mededeling op een logische en natuurlijke manier ergens in de e-mail:\n"${extraInput}"\n` : ''}Schrijfstijl: enthousiast, muzikaal en persoonlijk, maar hou het nuchter en to-the-point. Gebruik GEEN overdreven bloemrijk taalgebruik, clichés, of onnodige bijvoeglijke naamwoorden. Geen formele toon, gewoon heldere en vlotte spreektaal.

--- VOORBEELD VAN STIJL EN OPBOUW ---
Onderwerp: Zet je gitaar alvast klaar: Open Mic op [Datum]!

De tweede dinsdag van de maand komt er alweer aan, en dat betekent dat het tijd is om de stof van je lyrics sheets te blazen en je gitaar te stemmen. We transformeren de vertrouwde omgeving van Amare weer in onze eigen muzikale huiskamer.

Locatie: Amare Den Haag, Spuiplein 150.
Inschrijving: Vanaf 18:30 uur (wees op tijd: we hebben beperkte ruimte).
Aanvang: 19:00 uur.
Rules: Alleen eigen werk, max 3 liedjes / 4 gedichten, max 10 minuten. Muzikanten, producers, spoken word artiesten — iedereen is welkom. Neem gerust je eigen backingtrack of een extra muzikant mee.

NIEUW: Draag de Club met trots!
We kregen vaak de vraag naar merchandise, en we hebben iets vets bedacht. We hebben nu officieel onze eigen merchandise! Geen standaard stapels shirts, maar een duurzame en persoonlijke optie: je kunt nu je eigen shirt laten bedrukken met ons logo. Breng je favoriete (vintage) shirt mee naar de club, en laat zien dat je onderdeel bent van de tofste songwriter-community van Den Haag.
LET OP: neem je eigen shirt mee, je scoort je opstrijklogo gewoon ter plekke bij ons!
--- EINDE VOORBEELD ---

Instructie voor de output:
Gebruik bovenstaand voorbeeld als inspiratie voor de sfeer, maar zorg dat de tekst uniek en fris aanvoelt voor de editie op ${eventDate}.

Belangrijk: Sluit de tekst NIET af met een groet (zoals 'Groet', 'Tot dan', namen, of een handtekening). Stop direct na de laatste inhoudelijke zin of de Mollie-link. De groet wordt er later door het systeem automatisch achter geplakt.

Geef je antwoord in exact dit formaat:
Onderwerp: [een pakkende, korte onderwerpregel]

[De volledige e-mailtekst. Begin NIET met een aanhef zoals "Hoi [naam]," of "Beste artist," want die wordt automatisch voor de tekst geplaatst.]`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
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

        // Verwijder ook eventuele AI-gegenereerde groet aan het einde (voor de zekerheid)
        while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') {
            bodyLines.pop();
        }

        const VASTE_GROET = `\n\nHartelijke groet,\n\nGijs en Ro\n\nHaagse Open Mic\nElke 2e dinsdag van de maand\n19u - 22u\nIG: @HaagseOpenMic`;

        const body = bodyLines.join('\n') + VASTE_GROET;

        res.json({ status: 'success', subject, body });
    } catch (error) {
        console.error('Fout bij Gemini API aanroep:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
