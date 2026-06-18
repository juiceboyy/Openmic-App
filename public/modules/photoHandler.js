import { state } from './state.js';
import { apiRequest } from './api.js';
import { getEl } from './utils.js';
import { showToast, showConfirm } from './notifications.js';
import { getDisplayName } from './lineupHelpers.js';

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function getMatchStatusHTML(match, index) {
    let isValid = match.matchFound && !match.multipleMatches && match.email && match.email !== '-';
    let matchText = '';
    
    if (match.isCustom) {
        matchText = `<span class="text-green-600 font-medium"><i data-lucide="check-circle-2" class="w-4 h-4 inline mr-1 -mt-0.5"></i> ${match.artistName} <span class="text-xs font-normal">(${match.email})</span> <span class="text-xs text-blue-500 font-normal ml-1">(Gekoppeld)</span></span>
        <br><button type="button" class="text-apple-blue hover:underline text-xs font-normal mt-1 block" onclick="window.enterCustomMatch(${index})">Wijzigen</button>`;
    } else if (match.multipleMatches) {
        let options = `<option value="">Kies de juiste artiest...</option>` + match.candidates.map((c, i) => `<option value="${i}">${c.artistName} (${c.email || 'Geen e-mail'})</option>`).join('');
        matchText = `<div class="flex flex-col gap-1.5"><span class="text-orange-600 font-medium text-xs"><i data-lucide="help-circle" class="w-3.5 h-3.5 inline mr-1 -mt-0.5"></i> Meerdere matches:</span><select data-index="${index}" class="match-resolver border border-orange-300 bg-orange-50 text-orange-800 rounded px-2 py-1 text-xs focus:outline-none w-full max-w-[280px]">${options}</select><button type="button" class="text-apple-blue hover:underline text-left text-xs font-normal" onclick="window.enterCustomMatch(${index})">Of handmatig zoeken...</button></div>`;
    } else if(isValid) { 
        matchText = `<span class="text-green-600 font-medium"><i data-lucide="check-circle-2" class="w-4 h-4 inline mr-1 -mt-0.5"></i> ${match.artistName} <span class="text-xs font-normal">(${match.email})</span></span>`; 
    } else if (match.matchFound) { 
        matchText = `<span class="text-orange-500 font-medium"><i data-lucide="alert-triangle" class="w-4 h-4 inline mr-1 -mt-0.5"></i> ${match.artistName} <span class="text-xs font-normal">(Geen E-mail)</span></span><br><button type="button" class="text-apple-blue hover:underline text-xs font-normal mt-1 block" onclick="window.enterCustomMatch(${index})">Handmatig zoeken</button>`; 
    } else { 
        matchText = `<span class="text-red-500"><i data-lucide="x-circle" class="w-4 h-4 inline mr-1 -mt-0.5"></i> Geen match</span><br><button type="button" class="text-apple-blue hover:underline text-xs font-normal mt-1 block" onclick="window.enterCustomMatch(${index})">Handmatig zoeken</button>`; 
    }
    return matchText;
}

export function renderMatches(matches, elements) {
    const { photoMatchesBody } = elements;
    photoMatchesBody.innerHTML = '';
    if(matches.length === 0) { photoMatchesBody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-gray-500">Geen submappen gevonden.</td></tr>`; return; }
    matches.forEach((match, index) => {
        let isValid = (match.matchFound && !match.multipleMatches && match.email && match.email !== '-') || match.isCustom;
        let checkbox = `<input type="checkbox" id="match-cb-${index}" class="rounded text-apple-blue focus:ring-apple-blue w-4 h-4 cursor-pointer" ${isValid ? 'checked' : 'disabled'}>`;
        let matchText = getMatchStatusHTML(match, index);
        
        let rowClass = match.multipleMatches ? 'bg-orange-50/30' : (!isValid ? 'bg-gray-50' : '');
        photoMatchesBody.innerHTML += `<tr class="${rowClass} transition-colors" id="match-row-${index}"><td class="px-4 py-3 align-top pt-3.5">${checkbox}</td><td class="px-4 py-3 font-medium text-gray-800 align-top pt-3.5"><a href="${match.folderLink}" target="_blank" class="hover:text-apple-blue hover:underline flex items-start"><i data-lucide="folder" class="w-4 h-4 mr-2 text-gray-400 shrink-0 mt-0.5"></i> <span class="break-all">${match.folderName}</span></a></td><td class="px-4 py-3 align-top pt-3" id="match-status-${index}">${matchText}</td></tr>`;
    });
    lucide.createIcons();
}

export function enterCustomMatch(index) {
    const container = document.getElementById(`match-status-${index}`);
    if (!container) return;
    
    container.innerHTML = `
        <div class="relative flex flex-col gap-1.5 mt-1 max-w-[280px]">
            <div class="flex gap-1 items-center">
                <input type="text" id="photo-search-input-${index}" placeholder="Zoek artiest..." class="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200" autocomplete="off" oninput="window.handlePhotoArtistSearch(${index}, this.value)">
                <button type="button" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xs px-2 py-1" onclick="window.cancelCustomMatch(${index})">Annuleren</button>
            </div>
            <div id="photo-search-results-${index}" class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto z-10 hidden">
            </div>
        </div>
    `;
    setTimeout(() => {
        const input = document.getElementById(`photo-search-input-${index}`);
        if (input) input.focus();
    }, 50);
}

export function handlePhotoArtistSearch(index, query) {
    const resultsContainer = document.getElementById(`photo-search-results-${index}`);
    if (!resultsContainer) return;
    
    const q = query.toLowerCase().trim();
    if (!q) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
        return;
    }
    
    const matches = state.allArtists.filter(a => {
        const artistName = (a.artistName || '').toLowerCase();
        const firstName = (a.firstName || '').toLowerCase();
        const lastName = (a.lastName || '').toLowerCase();
        const email = (a.email || '').toLowerCase();
        const notes = (a.notes || '').toLowerCase();
        const omschrijving = (a.omschrijving || '').toLowerCase();
        
        return artistName.includes(q) || 
               firstName.includes(q) || 
               lastName.includes(q) || 
               email.includes(q) || 
               notes.includes(q) || 
               omschrijving.includes(q);
    });
    
    if (matches.length === 0) {
        resultsContainer.innerHTML = `<div class="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">Geen artiesten gevonden...</div>`;
    } else {
        resultsContainer.innerHTML = matches.map(a => {
            const displayName = getDisplayName(a);
            const emailText = a.email && a.email !== '-' ? a.email : 'Geen e-mail';
            return `<div onclick="window.selectSearchedArtist(${index}, ${a.rowIndex})" class="px-2 py-1.5 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer text-xs transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
                <div class="font-medium text-gray-900 dark:text-gray-100">${escapeHtml(displayName)}</div>
                <div class="text-[10px] text-gray-500 dark:text-gray-400">${escapeHtml(emailText)}</div>
            </div>`;
        }).join('');
    }
    resultsContainer.classList.remove('hidden');
}

export function selectSearchedArtist(index, artistRowIndex) {
    const artist = state.allArtists.find(a => a.rowIndex === artistRowIndex);
    if (!artist) return;
    
    const displayName = getDisplayName(artist);
    const email = artist.email && artist.email !== '-' ? artist.email : '';
    
    const match = state.scannedMatches[index];
    match.artistName = displayName;
    match.email = email || '-';
    match.matchFound = true;
    match.multipleMatches = false;
    match.isCustom = true;
    match.selected = (email && email !== '-');
    
    const statusContainer = document.getElementById(`match-status-${index}`);
    if (statusContainer) {
        statusContainer.innerHTML = getMatchStatusHTML(match, index);
    }
    
    const cb = document.getElementById(`match-cb-${index}`);
    if (cb) {
        if (email && email !== '-') {
            cb.disabled = false;
            cb.checked = true;
        } else {
            cb.disabled = true;
            cb.checked = false;
            showToast(`${displayName} heeft geen e-mailadres in de database.`, "warning");
        }
    }
    
    const row = document.getElementById(`match-row-${index}`);
    if (row) {
        row.className = "transition-colors";
    }
    
    lucide.createIcons();
    showToast("Artiest gekoppeld.", "success");
}

export function cancelCustomMatch(index) {
    const statusContainer = document.getElementById(`match-status-${index}`);
    if (statusContainer) {
        const match = state.scannedMatches[index];
        statusContainer.innerHTML = getMatchStatusHTML(match, index);
        lucide.createIcons();
    }
}

// Expose to window for inline HTML onclick handlers
window.enterCustomMatch = enterCustomMatch;
window.handlePhotoArtistSearch = handlePhotoArtistSearch;
window.selectSearchedArtist = selectSearchedArtist;
window.cancelCustomMatch = cancelCustomMatch;

export function openPhotoModal() {
    getEl('photo-modal').classList.remove('hidden'); getEl('photo-step-1').classList.remove('hidden'); getEl('photo-step-2').classList.add('hidden'); getEl('photo-modal-footer').classList.add('hidden'); getEl('drive-folder-url').value = ''; getEl('photo-matches-body').innerHTML = ''; state.scannedMatches = []; lucide.createIcons();
}

export function closePhotoModal(modalId) {
    getEl(modalId).classList.add('hidden');
}

export async function scanFolder() {
    const rawUrl = getEl('drive-folder-url').value.trim();
    if (!rawUrl) { showToast("Plak eerst een Google Drive link!", "error"); return; }

    const folderIdMatch = rawUrl.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
    if (!folderIdMatch) {
        showToast("Ongeldige Google Drive URL. Gebruik een link met '/folders/...' erin.", "error");
        return;
    }

    const btn = getEl('btn-scan-folder');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Scannen... ⏳';

    try {
        const result = await apiRequest({ _action: 'scan_folder', folderUrl: rawUrl });
        if (result.status === 'success') {
            state.scannedMatches = result.matches;
            renderMatches(state.scannedMatches, { photoMatchesBody: getEl('photo-matches-body') });
            getEl('photo-step-1').classList.add('hidden');
            getEl('photo-step-2').classList.remove('hidden');
            getEl('photo-modal-footer').classList.remove('hidden');
        } else {
            showToast('Scan mislukt: ' + (result.message || 'Onbekende fout'), 'error');
        }
    } catch (e) {
        showToast('Scan mislukt: ' + (e.message || 'Controleer je internetverbinding'), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

export function resolveMultipleMatch(index, selectElement) {
    let cb = getEl(`match-cb-${index}`); let row = getEl(`match-row-${index}`); let val = selectElement.value;
    state.scannedMatches[index].isCustom = false;
    if (val === "") { cb.checked = false; cb.disabled = true; row.classList.add('bg-orange-50/30'); state.scannedMatches[index].selected = false; } else {
        let chosen = state.scannedMatches[index].candidates[val]; state.scannedMatches[index].artistName = chosen.artistName; state.scannedMatches[index].email = chosen.email;
        if (chosen.email && chosen.email !== '-') { cb.disabled = false; cb.checked = true; state.scannedMatches[index].selected = true; selectElement.classList.replace('border-orange-300', 'border-green-300'); selectElement.classList.replace('bg-orange-50', 'bg-green-50'); row.classList.remove('bg-orange-50/30'); } 
        else { cb.checked = false; cb.disabled = true; state.scannedMatches[index].selected = false; showToast("Geen geldig e-mailadres.", "error"); }
    }
}

export async function sendPhotos() {
    state.scannedMatches.forEach((m, idx) => { const cb = getEl(`match-cb-${idx}`); m.selected = cb ? cb.checked : false; });
    const toSend = state.scannedMatches.filter(m => m.selected);
    if (toSend.length === 0) { showToast("Geen vinkjes gezet!", "error"); return; }
    if (!await showConfirm(`Stuur e-mail naar ${toSend.length} artiest(en)?`)) return;

    const btn = getEl('btn-send-photos');
    const orig = btn.innerHTML;
    btn.disabled = true;

    let sentCount = 0;
    let errorCount = 0;

    try {
        for (let i = 0; i < toSend.length; i++) {
            btn.innerHTML = `Verzenden... (${i + 1}/${toSend.length})`;
            try {
                const result = await apiRequest({ _action: 'send_single_email', match: toSend[i] });
                if (result.status === 'success') sentCount++;
            } catch (e) {
                errorCount++;
                console.error('Email mislukt voor', toSend[i].email, e);
            }
            if (i < toSend.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        if (errorCount === 0) {
            showToast(`Gelukt! ${sentCount} e-mails verstuurd.`, "success");
        } else {
            showToast(`${sentCount} verstuurd, ${errorCount} mislukt.`, "warning");
        }
        getEl('photo-modal').classList.add('hidden');
    } catch (e) {
        showToast("Verzenden mislukt.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}