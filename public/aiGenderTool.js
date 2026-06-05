import { showToast } from './modules/notifications.js';
import { state } from './modules/state.js';
import { applyFilters } from './modules/uiHandler.js';

async function startAIGenderAnalysis() {
    const btn = document.getElementById('ai-gender-btn');
    if (!btn) return;

    const artists = window.loadedArtists || [];
    const unknown = artists.filter(a => {
        const g = (a.gender || '').toLowerCase().trim();
        return !g || g === '?' || g === 'onbekend';
    });

    if (unknown.length === 0) {
        showToast('Geen artiesten gevonden met onbekend gender.', 'error');
        return;
    }

    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block animate-spin">⏳</span>';
    btn.title = `Analyseren… (${unknown.length} contacten)`;

    showToast(`Gender-analyse gestart voor ${unknown.length} contacten met Gemini...`, 'success');

    try {
        const pin = localStorage.getItem('appPin') || '';
        const response = await fetch('/api/artists/analyze-genders', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-app-pin': pin
            },
            body: JSON.stringify({ artists: unknown })
        });

        if (response.status === 401) {
            showToast('Niet geautoriseerd. Voer de pincode opnieuw in.', 'error');
            setTimeout(() => window.location.reload(), 1500);
            return;
        }

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            const updatedCount = data.updatedCount || 0;
            
            // Werk de lokale client state bij
            if (data.updates && Array.isArray(data.updates)) {
                data.updates.forEach(upd => {
                    const artist = state.allArtists.find(a => a.rowIndex === upd.rowIndex);
                    if (artist) {
                        artist.gender = upd.gender;
                    }
                });
            }

            // Update UI
            applyFilters();
            
            showToast(`Klaar! ${updatedCount} van de ${unknown.length} genders succesvol ingevuld.`, 'success');
        } else {
            showToast(data.message || 'Fout bij gender analyse.', 'error');
        }
    } catch (e) {
        console.error('Fout bij gender analyse:', e);
        showToast('Er ging iets mis bij het verbinden met de server.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        btn.title = 'Auto-fill onbekende genders (AI)';
    }
}

window.startAIGenderAnalysis = startAIGenderAnalysis;
