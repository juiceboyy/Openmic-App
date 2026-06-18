import { state } from './state.js';
import { apiRequest } from './api.js';
import { showToast, showLineupConflictDialog, showConfirm } from './notifications.js';
import { getEl, toggleButtonLoading, checkSimilarity } from './utils.js';
import { isFuzzyMatch, saveToLocalStorage, loadFromLocalStorage, clearLocalStorage, copyLineupToClipboard, getDisplayName, createLineupItemHTML, createEmptySlotHTML, createReserveItemHTML, createCandidateItemHTML, getArtistId } from './lineupHelpers.js';
import * as DD from './lineupDragDrop.js';
import { LINEUP_CONFIG } from './config.js';

let currentLineup = new Array(LINEUP_CONFIG.MAX_SLOTS).fill(null);
let reserveLineup = [];
let candidateLineup = [];
let playedLastMonth = [];
let allPastPerformers = [];
let maidenOverrides = [];
let activeSlotIndex = null;
let activeSessionName = '';
let addingToReserve = false;
let addingToCandidates = false;

const save = () => saveToLocalStorage(currentLineup, reserveLineup, candidateLineup, maidenOverrides, activeSessionName);

export function resizeLineup(newSize) {
    if (newSize > currentLineup.length) {
        while (currentLineup.length < newSize) currentLineup.push(null);
    } else if (newSize < currentLineup.length) {
        currentLineup.splice(newSize).forEach(artist => { if (artist) reserveLineup.push(artist); });
    }
    save(); renderLineupUI();
}

export function openLineupModal() {
    if (currentLineup.every(slot => slot === null) && reserveLineup.length === 0 && candidateLineup.length === 0) {
        const p = loadFromLocalStorage();
        if (p?.main) { 
            currentLineup = p.main; 
            reserveLineup = p.reserve || []; 
            candidateLineup = p.candidates || [];
            maidenOverrides = p.maidenOverrides || [];
            activeSessionName = p.activeSessionName || '';
        }
        else if (Array.isArray(p) && p.length === LINEUP_CONFIG.MAX_SLOTS) currentLineup = p;
    }
    if (activeSessionName) {
        getEl('lineup-editor-container').classList.remove('hidden');
    } else {
        getEl('lineup-editor-container').classList.add('hidden');
    }
    getEl('lineup-modal').classList.remove('hidden'); renderLineupUI(); lucide.createIcons(); fetchAvailableSheets(); fetchAllPastPerformers();
}

export const closeLineupModal = () => getEl('lineup-modal').classList.add('hidden');

export async function fetchAllPastPerformers() {
    if (!activeSessionName) return;
    try {
        const reqSessionName = activeSessionName;
        const res = await apiRequest({ _action: 'get_all_past_performers', currentSheetName: reqSessionName });
        if (res.status === 'success' && Array.isArray(res.names)) {
            if (activeSessionName === reqSessionName) {
                allPastPerformers = res.names || [];
                renderLineupUI();
            }
        }
    } catch (e) {
        console.error("Kon eerdere artiestengeschiedenis niet laden:", e);
    }
}

export async function loadCurrentSession(event) {
    const sessionName = getEl('current-session-name').value.trim();
    if (!sessionName) return showToast("Kies eerst een sessie.", "error");
    const btn = event.currentTarget; const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    try {
        const res = await apiRequest({ _action: 'get_current_lineup', sheetName: sessionName });
        if (res.status !== "success") return showToast("Fout: " + res.message, "error");
        currentLineup = new Array(LINEUP_CONFIG.MAX_SLOTS).fill(null);
        reserveLineup = [];
        candidateLineup = [];
        if (!res.isNew && Array.isArray(res.data)) {
            res.data.forEach((item, i) => {
                if (i >= LINEUP_CONFIG.MAX_SLOTS || !item?.name || item.name.toLowerCase().includes('pauze') || item.name.includes('☕')) return;
                const searchName = item.name.toLowerCase();
                const artist = state.allArtists.find(a => (a.artistName?.toLowerCase() === searchName) || (`${a.firstName} ${a.lastName}`.toLowerCase() === searchName));
                currentLineup[i] = artist || { artistName: item.name, notes: item.notes || '', fallback: true };
            });
        }
        if (Array.isArray(res.reserveData)) {
            res.reserveData.forEach(item => {
                if (!item?.name) return;
                const searchName = item.name.toLowerCase();
                const artist = state.allArtists.find(a => (a.artistName?.toLowerCase() === searchName) || (`${a.firstName} ${a.lastName}`.toLowerCase() === searchName));
                reserveLineup.push(artist || { artistName: item.name, notes: item.notes || '', fallback: true });
            });
        }
        showToast(res.isNew ? 'Nieuwe sessie gestart.' : 'Bestaande sessie ingeladen!', 'success');
        activeSessionName = sessionName; getEl('lineup-editor-container').classList.remove('hidden'); 
        save();
        await fetchAllPastPerformers();
        renderLineupUI();
    } catch (e) { showToast("Kon sessie niet laden.", "error"); } finally { toggleButtonLoading(btn, false, orig); }
}

export async function fetchAvailableSheets() {
    try {
        const res = await apiRequest({ _action: 'get_sheet_names' });
        if (res.status === "success" && Array.isArray(res.sheetNames)) {
            const options = res.sheetNames.map(name => `<option value="${name}">${name}</option>`).join(''); 
            const setOpts = (id, txt) => { const el = getEl(id); if(el) el.innerHTML = `<option value="" disabled selected>${txt}</option>${options}`; };
            setOpts('current-session-name', 'Kies de huidige sessie...'); setOpts('prev-sheet-name', 'Kies de vorige sessie...');
            if (activeSessionName) {
                const el = getEl('current-session-name');
                if (el) el.value = activeSessionName;
            }
        }
    } catch (e) {}
}

export async function loadPreviousLineup(event) {
    const prevSheetName = getEl('prev-sheet-name').value.trim();
    if (!prevSheetName) return showToast("Kies eerst de vorige sessie.", "error");
    const btn = event.currentTarget; const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    try {
        const res = await apiRequest({ _action: 'get_previous_lineup', prevSheetName });
        if (res.status === "success") {
            playedLastMonth = res.names || [];
            state.previousReserveList = res.reserveNames || [];
            showToast(`Historie geladen: ${playedLastMonth.length} artiesten gevonden.`, "success");
            renderLineupUI();
        } else showToast("Kon historie niet laden: " + res.message, "error");
    } catch (e) { showToast("Fout bij ophalen historie.", "error"); } finally { toggleButtonLoading(btn, false, orig); }
}

export function openSlotSearch(index) {
    addingToReserve = false;
    addingToCandidates = false;
    activeSlotIndex = index;
    const input = getEl('slot-search-input');
    input.placeholder = 'Zoek artiest of naam...';
    getEl('lineup-search-modal').classList.remove('hidden'); input.value = ''; getEl('slot-search-results').innerHTML = ''; input.focus();
}

export function openReserveSearch() {
    addingToReserve = true;
    addingToCandidates = false;
    activeSlotIndex = null;
    const input = getEl('slot-search-input');
    input.placeholder = 'Zoek artiest voor reservelijst...';
    getEl('lineup-search-modal').classList.remove('hidden'); input.value = ''; getEl('slot-search-results').innerHTML = ''; input.focus();
}

export function openCandidateSearch() {
    addingToReserve = false;
    addingToCandidates = true;
    activeSlotIndex = null;
    const input = getEl('slot-search-input');
    input.placeholder = 'Meld artiest aan (kandidatenpool)...';
    getEl('lineup-search-modal').classList.remove('hidden'); input.value = ''; getEl('slot-search-results').innerHTML = ''; input.focus();
}

export function closeSlotSearch() {
    getEl('lineup-search-modal').classList.add('hidden');
    const quickAdd = getEl('quick-add-new-artist');
    if (quickAdd) quickAdd.classList.add('hidden');
    const emailInput = getEl('new-artist-email');
    if (emailInput) emailInput.value = '';
    activeSlotIndex = null;
    addingToReserve = false;
    addingToCandidates = false;
}

export function handleLineupSearch(event) {
    const q = event.target.value.toLowerCase().trim();
    const quickAdd = getEl('quick-add-new-artist');
    if (!q) { getEl('slot-search-results').innerHTML = ''; if (quickAdd) quickAdd.classList.add('hidden'); return; }
    const matches = state.allArtists.filter(a =>
        !q ||
        checkSimilarity(q, a.artistName) ||
        checkSimilarity(q, a.firstName) ||
        checkSimilarity(q, a.lastName) ||
        checkSimilarity(q, a.firstName + ' ' + a.lastName) ||
        (a.notes || '').toLowerCase().includes(q)
    );
    if (matches.length === 0) {
        getEl('slot-search-results').innerHTML = '<div class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Geen artiesten gevonden...</div>';
        if (quickAdd) { quickAdd.classList.remove('hidden'); lucide.createIcons(); }
    } else {
        if (quickAdd) quickAdd.classList.add('hidden');
        getEl('slot-search-results').innerHTML = matches.map(a => {
            const dn = getDisplayName(a);
            return currentLineup.some(s => s?.rowIndex === a.rowIndex)
                ? `<div class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 opacity-60 cursor-not-allowed flex justify-between items-center"><div><div class="font-medium text-gray-500 dark:text-gray-400">${dn}</div><div class="text-xs text-gray-400 dark:text-gray-500">${a.firstName} ${a.lastName}</div></div><span class="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Al in lijst</span></div>`
                : `<div onclick="selectLineupArtist(${a.rowIndex})" class="px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"><div class="font-medium text-gray-900 dark:text-gray-100">${dn}</div><div class="text-xs text-gray-500 dark:text-gray-400">${a.firstName} ${a.lastName}</div></div>`;
        }).join('');
    }
}

export function addNewArtistFromSearch() {
    const rawName = getEl('slot-search-input').value.trim();
    const email = getEl('new-artist-email')?.value.trim() || '';
    if (!rawName) return showToast('Voer eerst een naam in het zoekveld in.', 'error');
    const parts = rawName.split(/\s+/);
    const newArtist = {
        rowIndex: null,
        artistName: rawName,
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
        email: email || '-',
        gender: '',
        notes: 'NIEUW',
        isNew: true,
    };
    if (addingToReserve) {
        reserveLineup.push(newArtist);
        showToast(`${rawName} toegevoegd aan reservelijst als nieuwe artiest.`, 'success');
    } else if (addingToCandidates) {
        candidateLineup.push(newArtist);
        showToast(`${rawName} toegevoegd aan aanmeldingslijst als nieuwe artiest.`, 'success');
    } else if (activeSlotIndex !== null) {
        currentLineup[activeSlotIndex] = newArtist;
        showToast(`${rawName} toegevoegd aan speelschema als nieuwe artiest.`, 'success');
    } else { return; }
    save(); closeSlotSearch(); renderLineupUI();
}

export async function selectLineupArtist(rowIndex) {
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (!artist) return;

    if (addingToReserve) {
        if (!reserveLineup.some(a => a.rowIndex === artist.rowIndex)) {
            reserveLineup.push(artist);
            showToast(`${getDisplayName(artist)} toegevoegd aan reservelijst.`, 'success');
        } else {
            showToast('Artiest staat al in de reservelijst.', 'error');
        }
        save(); closeSlotSearch(); renderLineupUI();
        return;
    }

    if (addingToCandidates) {
        if (!candidateLineup.some(a => a.rowIndex === artist.rowIndex)) {
            candidateLineup.push(artist);
            showToast(`${getDisplayName(artist)} toegevoegd aan aanmeldingslijst.`, 'success');
        } else {
            showToast('Artiest staat al in de aanmeldingslijst.', 'error');
        }
        save(); closeSlotSearch(); renderLineupUI();
        return;
    }

    if (activeSlotIndex !== null) {
        const matchedName = playedLastMonth.find(name => isFuzzyMatch(artist, name));
        if (matchedName) {
            const choice = await showLineupConflictDialog(`<strong>${getDisplayName(artist)}</strong> lijkt erg op <strong>${matchedName}</strong> die vorige keer al heeft gespeeld.`);
            if (choice === 'cancel') return;
            if (choice === 'reserve') {
                reserveLineup.push(artist); showToast('Artiest toegevoegd aan reservelijst.', 'info');
            } else {
                currentLineup[activeSlotIndex] = artist;
            }
        } else {
            currentLineup[activeSlotIndex] = artist;
        }
        save(); closeSlotSearch(); renderLineupUI();
    }
}

export function addArtistToLineup(rowIndexInput) {
    const rowIndex = parseInt(rowIndexInput); if (isNaN(rowIndex)) return showToast("Selecteer eerst een artiest.", "error");
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (!artist) return;
    const emptyIndex = currentLineup.findIndex(slot => slot === null);
    if (emptyIndex === -1) return showToast(`Het speelschema is vol (max ${LINEUP_CONFIG.MAX_SLOTS}).`, "error");
    if (currentLineup.some(a => a?.rowIndex === artist.rowIndex)) return showToast("Deze artiest staat al in de lijst.", "error");
    currentLineup[emptyIndex] = artist; save(); renderLineupUI();
}

export function removeArtistFromLineup(index) {
    try {
        currentLineup[index] = null;
        save();
        renderLineupUI();
    } catch (e) {
        console.error('Fout bij verwijderen uit speelschema:', e);
        showToast('Kon artiest niet verwijderen.', 'error');
    }
}

export function removeArtistFromReserve(index) {
    try {
        reserveLineup.splice(index, 1);
        save();
        renderLineupUI();
    } catch (e) {
        console.error('Fout bij verwijderen uit reservelijst:', e);
        showToast('Kon artiest niet verwijderen uit reserve.', 'error');
    }
}

export function removeArtistFromCandidates(index) {
    try {
        candidateLineup.splice(index, 1);
        save();
        renderLineupUI();
    } catch (e) {
        console.error('Fout bij verwijderen uit aanmeldingslijst:', e);
        showToast('Kon artiest niet verwijderen.', 'error');
    }
}

export function toggleMaidenOverride(artistId) {
    const idStr = String(artistId);
    const idx = maidenOverrides.findIndex(id => String(id) === idStr);
    if (idx === -1) {
        maidenOverrides.push(idStr);
        showToast("Artiest aangemerkt als eerste-keer optredende.", "success");
    } else {
        maidenOverrides.splice(idx, 1);
        showToast("Historie-check hersteld.", "info");
    }
    save();
    renderLineupUI();
}

export async function clearLineup() {
    try {
        if (currentLineup.every(slot => slot === null) && reserveLineup.length === 0 && candidateLineup.length === 0) return;
        if (await showConfirm("Weet je zeker dat je het hele speelschema en de aanmeldingslijst wilt wissen?")) {
            currentLineup.fill(null); 
            reserveLineup = []; 
            candidateLineup = []; 
            maidenOverrides = [];
            save(); 
            renderLineupUI(); 
            showToast("Speelschema en aanmeldingslijst leeggemaakt.", "success");
        }
    } catch (e) {
        console.error('Fout bij wissen speelschema:', e);
        showToast('Kon speelschema niet wissen.', 'error');
    }
}

export async function exportLineupToClipboard() {
    if (await copyLineupToClipboard(currentLineup)) showToast("Lijst gekopieerd naar klembord!", "success");
    else showToast("Kon niet kopiëren of lijst is leeg.", "error");
}

let pendingDOMRebuild = false;

export function handleDragStart(event, index, list) {
    DD.setSnapshots(currentLineup, reserveLineup, candidateLineup);
    pendingDOMRebuild = true;
    DD.handleDragStart(event, index, list);
}

export function handleDropOnMain(event, targetIndex) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');
    if (DD.processDropOnMain(targetIndex, currentLineup, reserveLineup, candidateLineup)) {
        pendingDOMRebuild = false;
        save(); DD.resetDraggedItem(); renderLineupUI();
    }
}

export function handleDropOnReserve(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');
    if (DD.processDropOnReserve(currentLineup, reserveLineup, candidateLineup)) {
        pendingDOMRebuild = false;
        save(); DD.resetDraggedItem(); renderLineupUI();
    }
}

export function handleDropOnCandidate(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');
    if (DD.processDropOnCandidate(currentLineup, reserveLineup, candidateLineup)) {
        pendingDOMRebuild = false;
        save(); DD.resetDraggedItem(); renderLineupUI();
    }
}

export function handleDragEnd(event) {
    DD.handleDragEnd(event);
    if (pendingDOMRebuild) {
        const { newMain, newReserve, newCandidates } = DD.rebuildFromDOM(
            getEl('lineup-list-container'),
            getEl('reserve-list-content'),
            getEl('candidate-list-content')
        );
        for (let i = 0; i < newMain.length; i++) currentLineup[i] = newMain[i];
        reserveLineup.length = 0;
        newReserve.forEach(x => reserveLineup.push(x));
        candidateLineup.length = 0;
        if (newCandidates) newCandidates.forEach(x => candidateLineup.push(x));
        save();
        renderLineupUI();
    }
    pendingDOMRebuild = false;
}

export const { handleDragOver, handleDragEnter, handleDragLeave } = DD;

export async function saveLineupToDatabase() {
    if (!activeSessionName) return showToast('Laad eerst een sessie voordat je opslaat.', 'error');
    const btn = getEl('btn-save-lineup'); const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    try {
        const newArtists = [...currentLineup.filter(a => a?.isNew), ...reserveLineup.filter(a => a?.isNew)];
        const today = new Date().toLocaleDateString('nl-NL');
        for (const artist of newArtists) {
            await apiRequest({
                _action: 'add',
                'Voornaam': artist.firstName || '',
                'Achternaam': artist.lastName || '',
                'Artiestennaam': artist.artistName && artist.artistName !== '-' ? artist.artistName : '',
                'E-mailadres': artist.email && artist.email !== '-' ? artist.email : '',
                'Gender': artist.gender || '',
                'Notities': 'NIEUW',
                'Opmerkingen': 'NIEUW',
                'Soort contact': 'Artiest',
                'Datum toegevoegd': today,
            });
            // Markeer de artiest als niet meer nieuw na succesvol toevoegen
            artist.isNew = false;
        }
        const res = await apiRequest({ _action: 'save_lineup', sheetName: activeSessionName, lineup: currentLineup, reserve: reserveLineup });
        if (res.status === "success") {
            const msg = newArtists.length > 0
                ? `Lineup opgeslagen! ${newArtists.length} nieuwe artiest(en) ook toegevoegd aan contacten.`
                : "Lineup succesvol opgeslagen!";
            showToast(msg, "success");
            clearLocalStorage();
            
            // Ververs de lokale database in de frontend
            if (newArtists.length > 0 && typeof window.loadArtists === 'function') {
                await window.loadArtists();
            }
            renderLineupUI();
        } else showToast("Fout: " + res.message, "error");
    } catch (e) { showToast("Opslaan mislukt.", "error"); } finally { toggleButtonLoading(btn, false, orig); }
}

export function renderLineupUI() {
    const container = getEl('lineup-list-container');
    let html = '';
    for (let i = 0; i < LINEUP_CONFIG.MAX_SLOTS; i++) {
        if (i === LINEUP_CONFIG.PAUSE_INDEX) html += `<div class="pauze-divider flex items-center justify-center py-3 my-2 border-y border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg"><span class="text-gray-500 dark:text-gray-400 font-medium text-sm">☕ Pauze</span></div>`;
        const artist = currentLineup[i];
        const starred = artist ? state.previousReserveList.some(name => isFuzzyMatch(artist, name)) : false;
        
        // Regels check
        let isFirstTimer = false;
        let playedLast = false;
        let isOverridden = false;
        let matchedPastNames = [];

        if (artist) {
            const artistId = getArtistId(artist);
            isOverridden = maidenOverrides.includes(String(artistId));
            matchedPastNames = allPastPerformers.filter(name => isFuzzyMatch(artist, name));
            isFirstTimer = matchedPastNames.length === 0 || isOverridden;
            playedLast = !isOverridden && playedLastMonth.some(name => isFuzzyMatch(artist, name));
        }

        html += artist ? createLineupItemHTML(i, artist, i + 1, starred, isFirstTimer, playedLast, isOverridden, matchedPastNames) : createEmptySlotHTML(i, i + 1);
    }
    container.innerHTML = html;

    getEl('reserve-list-content').innerHTML = reserveLineup.length === 0
        ? '<div class="text-sm text-orange-800/50 dark:text-orange-400/50 italic text-center py-2">Sleep artiesten hierheen voor de reservelijst</div>'
        : reserveLineup.map((artist, i) => {
            const starred = state.previousReserveList.some(name => isFuzzyMatch(artist, name));
            let isFirstTimer = false;
            let playedLast = false;
            let isOverridden = false;
            let matchedPastNames = [];

            if (artist) {
                const artistId = getArtistId(artist);
                isOverridden = maidenOverrides.includes(String(artistId));
                matchedPastNames = allPastPerformers.filter(name => isFuzzyMatch(artist, name));
                isFirstTimer = matchedPastNames.length === 0 || isOverridden;
                playedLast = !isOverridden && playedLastMonth.some(name => isFuzzyMatch(artist, name));
            }
            return createReserveItemHTML(i, artist, starred, isFirstTimer, playedLast, isOverridden, matchedPastNames);
          }).join('');

    const candidateListContent = getEl('candidate-list-content');
    if (candidateListContent) {
        candidateListContent.innerHTML = candidateLineup.length === 0
            ? '<div class="text-sm text-blue-800/50 dark:text-blue-400/50 italic text-center py-2">Noteer hier eerst alle aanmeldingen</div>'
            : candidateLineup.map((artist, i) => {
                let starred = false;
                let isFirstTimer = false;
                let playedLast = false;
                let isOverridden = false;
                let matchedPastNames = [];

                if (artist) {
                    starred = state.previousReserveList.some(name => isFuzzyMatch(artist, name));
                    const artistId = getArtistId(artist);
                    isOverridden = maidenOverrides.includes(String(artistId));
                    matchedPastNames = allPastPerformers.filter(name => isFuzzyMatch(artist, name));
                    isFirstTimer = matchedPastNames.length === 0 || isOverridden;
                    playedLast = !isOverridden && playedLastMonth.some(name => isFuzzyMatch(artist, name));
                }
                return createCandidateItemHTML(i, artist, starred, isFirstTimer, playedLast, isOverridden, matchedPastNames);
              }).join('');
    }
    lucide.createIcons();
}