import { state } from './state.js';
import { apiRequest } from './api.js';
import { showToast, showLineupConflictDialog, showConfirm } from './notifications.js';
import { getEl, toggleButtonLoading } from './utils.js';
import { isFuzzyMatch, saveToLocalStorage, loadFromLocalStorage, clearLocalStorage, copyLineupToClipboard, getDisplayName, createLineupItemHTML, createEmptySlotHTML, createReserveItemHTML } from './lineupHelpers.js';
import * as DD from './lineupDragDrop.js';
import { LINEUP_CONFIG } from './config.js';

let currentLineup = new Array(LINEUP_CONFIG.MAX_SLOTS).fill(null);
let reserveLineup = [];
let playedLastMonth = [];
let activeSlotIndex = null;
let activeSessionName = '';
let addingToReserve = false;

const save = () => saveToLocalStorage(currentLineup, reserveLineup);

export function resizeLineup(newSize) {
    if (newSize > currentLineup.length) {
        while (currentLineup.length < newSize) currentLineup.push(null);
    } else if (newSize < currentLineup.length) {
        currentLineup.splice(newSize).forEach(artist => { if (artist) reserveLineup.push(artist); });
    }
    save(); renderLineupUI();
}

export function openLineupModal() {
    if (currentLineup.every(slot => slot === null)) {
        const p = loadFromLocalStorage();
        if (p?.main) { currentLineup = p.main; reserveLineup = p.reserve || []; }
        else if (Array.isArray(p) && p.length === LINEUP_CONFIG.MAX_SLOTS) currentLineup = p;
    }
    getEl('lineup-modal').classList.remove('hidden'); renderLineupUI(); lucide.createIcons(); fetchAvailableSheets();
}

export const closeLineupModal = () => getEl('lineup-modal').classList.add('hidden');

export async function loadCurrentSession(event) {
    const sessionName = getEl('current-session-name').value.trim();
    if (!sessionName) return showToast("Kies eerst een sessie.", "error");
    const btn = event.currentTarget; const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    try {
        const res = await apiRequest({ _action: 'get_current_lineup', sheetName: sessionName });
        if (res.status !== "success") return showToast("Fout: " + res.message, "error");
        currentLineup = new Array(LINEUP_CONFIG.MAX_SLOTS).fill(null);
        reserveLineup = [];
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
        activeSessionName = sessionName; getEl('lineup-editor-container').classList.remove('hidden'); renderLineupUI();
    } catch (e) { showToast("Kon sessie niet laden.", "error"); } finally { toggleButtonLoading(btn, false, orig); }
}

export async function fetchAvailableSheets() {
    try {
        const res = await apiRequest({ _action: 'get_sheet_names' });
        if (res.status === "success" && Array.isArray(res.sheetNames)) {
            const options = res.sheetNames.map(name => `<option value="${name}">${name}</option>`).join(''); 
            const setOpts = (id, txt) => { const el = getEl(id); if(el) el.innerHTML = `<option value="" disabled selected>${txt}</option>${options}`; };
            setOpts('current-session-name', 'Kies de huidige sessie...'); setOpts('prev-sheet-name', 'Kies de vorige sessie...');
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
    activeSlotIndex = index;
    const input = getEl('slot-search-input');
    input.placeholder = 'Zoek artiest of naam...';
    getEl('lineup-search-modal').classList.remove('hidden'); input.value = ''; getEl('slot-search-results').innerHTML = ''; input.focus();
}

export function openReserveSearch() {
    addingToReserve = true;
    activeSlotIndex = null;
    const input = getEl('slot-search-input');
    input.placeholder = 'Zoek artiest voor reservelijst...';
    getEl('lineup-search-modal').classList.remove('hidden'); input.value = ''; getEl('slot-search-results').innerHTML = ''; input.focus();
}

export function closeSlotSearch() {
    getEl('lineup-search-modal').classList.add('hidden');
    activeSlotIndex = null;
    addingToReserve = false;
}

export function handleLineupSearch(event) {
    const q = event.target.value.toLowerCase().trim();
    if (!q) { getEl('slot-search-results').innerHTML = ''; return; }
    const matches = state.allArtists.filter(a => ((a.artistName || '').toLowerCase().includes(q) || (a.firstName || '').toLowerCase().includes(q) || (a.lastName || '').toLowerCase().includes(q)));
    getEl('slot-search-results').innerHTML = matches.length === 0 ? '<div class="px-4 py-3 text-sm text-gray-500">Geen artiesten gevonden...</div>' : matches.map(a => {
        const dn = getDisplayName(a);
        return currentLineup.some(s => s?.rowIndex === a.rowIndex) 
            ? `<div class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 opacity-60 cursor-not-allowed flex justify-between items-center"><div><div class="font-medium text-gray-500 dark:text-gray-400">${dn}</div><div class="text-xs text-gray-400 dark:text-gray-500">${a.firstName} ${a.lastName}</div></div><span class="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Al in lijst</span></div>`
            : `<div onclick="selectLineupArtist(${a.rowIndex})" class="px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"><div class="font-medium text-gray-900 dark:text-gray-100">${dn}</div><div class="text-xs text-gray-500 dark:text-gray-400">${a.firstName} ${a.lastName}</div></div>`;
    }).join('');
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

export async function clearLineup() {
    try {
        if (currentLineup.every(slot => slot === null)) return;
        if (await showConfirm("Weet je zeker dat je het hele speelschema wilt wissen?")) {
            currentLineup.fill(null); reserveLineup = []; save(); renderLineupUI(); showToast("Speelschema leeggemaakt.", "success");
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

export function handleDropOnMain(event, targetIndex) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');
    if (DD.processDropOnMain(targetIndex, currentLineup, reserveLineup)) { save(); DD.resetDraggedItem(); renderLineupUI(); }
}

export function handleDropOnReserve(event) {
    event.preventDefault();
    if (DD.processDropOnReserve(currentLineup, reserveLineup)) { save(); DD.resetDraggedItem(); renderLineupUI(); }
}

export const { handleDragStart, handleDragOver, handleDragEnter, handleDragLeave, handleDragEnd } = DD;

export async function saveLineupToDatabase() {
    if (!activeSessionName) return showToast('Laad eerst een sessie voordat je opslaat.', 'error');
    const btn = getEl('btn-save-lineup'); const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    try {
        const res = await apiRequest({ _action: 'save_lineup', sheetName: activeSessionName, lineup: currentLineup, reserve: reserveLineup });
        if (res.status === "success") {
            showToast("Lineup succesvol opgeslagen!", "success");
            clearLocalStorage();
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
        html += artist ? createLineupItemHTML(i, artist, i + 1, starred) : createEmptySlotHTML(i, i + 1);
    }
    container.innerHTML = html;

    getEl('reserve-list-content').innerHTML = reserveLineup.length === 0
        ? '<div class="text-sm text-orange-800/50 dark:text-orange-400/50 italic text-center py-2">Sleep artiesten hierheen voor de reservelijst</div>'
        : reserveLineup.map((artist, i) => {
            const starred = state.previousReserveList.some(name => isFuzzyMatch(artist, name));
            return createReserveItemHTML(i, artist, starred);
          }).join('');
    lucide.createIcons();
}