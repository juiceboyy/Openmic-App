async function startAIGenderAnalysis() {
    const btn = document.getElementById('ai-gender-btn');
    if (!btn) return;

    const artists = window.loadedArtists || [];
    const unknown = artists.filter(a => {
        const g = (a.gender || '').toLowerCase().trim();
        return !g || g === '?' || g === 'onbekend';
    });

    if (unknown.length === 0) {
        alert('Geen artiesten gevonden met onbekend gender.');
        return;
    }

    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳';
    btn.title = `Analyseren… (0/${unknown.length})`;

    let updated = 0;

    for (let i = 0; i < unknown.length; i++) {
        const artist = unknown[i];
        btn.title = `Analyseren… (${i + 1}/${unknown.length})`;

        let naam = (artist.firstName || '').trim();
        if (!naam || naam === '-') {
            const parts = (artist.artistName || '').trim().split(/\s+/);
            naam = parts[0] || '';
        }
        if (!naam || naam === '-') continue;

        try {
            const res = await fetch(`https://api.genderize.io/?name=${encodeURIComponent(naam)}`);

            if (res.status === 429) {
                alert('API limiet bereikt (1000/dag). Probeer het morgen weer of wissel van internetverbinding.');
                break;
            }

            if (!res.ok) continue;

            const data = await res.json();

            if (data.gender && data.probability > 0.85) {
                const genderValue = data.gender === 'male' ? 'Man' : data.gender === 'female' ? 'Vrouw' : null;
                if (!genderValue) continue;

                const select = document.querySelector(`select[data-field="Gender"][data-row="${artist.rowIndex}"]`);
                if (select) {
                    select.value = genderValue;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    updated++;
                }
            }
        } catch (e) {
            console.warn('Genderize fout voor', naam, e);
        }

        await new Promise(r => setTimeout(r, 1500));
    }

    btn.disabled = false;
    btn.innerHTML = originalHTML;
    btn.title = 'Auto-fill onbekende genders (AI)';

    alert(`Klaar! ${updated} van de ${unknown.length} genders succesvol ingevuld.`);
}

window.startAIGenderAnalysis = startAIGenderAnalysis;
