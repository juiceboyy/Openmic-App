import { state } from './state.js';
import { apiRequest } from './api.js';
import { showToast, showConfirm } from './notifications.js';
import { getEl, toggleButtonLoading } from './utils.js';
import { isFuzzyMatch, saveToLocalStorage, loadFromLocalStorage, clearLocalStorage, copyLineupToClipboard, getDisplayName, createLineupItemHTML, createEmptySlotHTML, createReserveItemHTML } from './lineupHelpers.js';
import * as DD from './lineupDragDrop.js';
import { LINEUP_CONFIG } from './config.js';

let currentLineup = new Array(LINEUP_CONFIG.MAX_SLOTS).fill(null);
let reserveLineup = [];
let playedLastMonth = [];
let activeSlotIndex = null;
let activeSessionName = '';

const save = () => saveToLocalStorage(currentLineup, reserveLineup);

export function resizeLineup(newSize) {
    if (newSize > currentLineup.length) {
        while (currentLineup.length < newSize) currentLineup.push(null);
    } else if (newSize < currentLineup.length) {
        const removed = currentLineup.splice(newSize);
        removed.forEach(artist => { if (artist) reserveLineup.push(artist); });
    }
    save(); renderLineupUI();
}

export function openLineupModal() {
    if (currentLineup.every(slot => slot === null)) {
        const p = loadFromLocalStorage();
        if (p) { if (Array.isArray(p) && p.length === LINEUP_CONFIG.MAX_SLOTS) currentLineup = p; else if (p.main) { currentLineup = p.main; if (p.reserve) reserveLineup = p.reserve; } }
    }
    getEl('lineup-modal').classList.remove('hidden');
    renderLineupUI();
    lucide.createIcons(); fetchAvailableSheets();
}

export const closeLineupModal = () => getEl('lineup-modal').classList.add('hidden');

export async function loadCurrentSession(event) {
    const sessionName = getEl('current-session-name').value.trim();
    if (!sessionName) { showToast("Kies eerst een sessie.", "error"); return; }
    const btn = event.currentTarget; const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    try {
        const result = await apiRequest({ _action: 'get_current_lineup', sheetName: sessionName });
        if (result.status === "success") {
            currentLineup = new Array(LINEUP_CONFIG.MAX_SLOTS).fill(null);
            if (!result.isNew && result.data && Array.isArray(result.data)) {
                result.data.forEach((item, i) => {
                    const isPause = item && item.name && (item.name.toLowerCase().includes('pauze') || item.name.includes('☕'));
                    if (i < LINEUP_CONFIG.MAX_SLOTS && item && item.name && !isPause) {
                        const searchName = item.name.toLowerCase();
                        const artist = state.allArtists.find(a => (a.artistName && a.artistName.toLowerCase() === searchName) || (`${a.firstName} ${a.lastName}`.toLowerCase() === searchName));
                        if (artist) currentLineup[i] = artist; else currentLineup[i] = { artistName: item.name, notes: item.notes || '', fallback: true };
                    } else if (i < LINEUP_CONFIG.MAX_SLOTS) currentLineup[i] = null;
                });
            }
            showToast(result.isNew ? 'Nieuwe sessie gestart.' : 'Bestaande sessie ingeladen!', 'success');
            activeSessionName = sessionName; getEl('lineup-editor-container').classList.remove('hidden'); renderLineupUI();
        } else showToast("Fout: " + result.message, "error");
    } catch (e) { showToast("Kon sessie niet laden.", "error"); console.error(e); } finally { toggleButtonLoading(btn, false, orig); }
}

export async function fetchAvailableSheets() {
    try {
        const result = await apiRequest({ _action: 'get_sheet_names' });
        if (result.status === "success" && Array.isArray(result.sheetNames)) {
            const options = result.sheetNames.map(name => `<option value="${name}">${name}</option>`).join(''); 
            const setOpts = (id, txt) => { const el = getEl(id); if(el) el.innerHTML = `<option value="" disabled selected>${txt}</option>${options}`; };
            setOpts('current-session-name', 'Kies de huidige sessie...'); setOpts('prev-sheet-name', 'Kies de vorige sessie...');
        }
    } catch (e) { console.error("Fout bij ophalen tabbladen:", e); }
}

export async function loadPreviousLineup(event) {
    const prevSheetName = getEl('prev-sheet-name').value.trim();
    if (!prevSheetName) { showToast("Kies eerst de vorige sessie.", "error"); return; }
    const btn = event.currentTarget; const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    try {
        const result = await apiRequest({ _action: 'get_previous_lineup', prevSheetName });
        if (result.status === "success") {
            playedLastMonth = result.names || [];
            showToast(`Historie geladen: ${playedLastMonth.length} artiesten gevonden.`, "success");
        } else showToast("Kon historie niet laden: " + result.message, "error");
    } catch (e) { showToast("Fout bij ophalen historie.", "error"); console.error(e); } finally { toggleButtonLoading(btn, false, orig); }
}

export function openSlotSearch(index) {
    activeSlotIndex = index; getEl('lineup-search-modal').classList.remove('hidden');
    const input = getEl('slot-search-input'); input.value = ''; getEl('slot-search-results').innerHTML = ''; input.focus();
}

export function closeSlotSearch() {
    getEl('lineup-search-modal').classList.add('hidden');
    activeSlotIndex = null;
}

export function handleLineupSearch(event) {
    const q = event.target.value.toLowerCase().trim();
    if (!q) { getEl('slot-search-results').innerHTML = ''; return; }
    const matches = state.allArtists.filter(a => {
        const an = (a.artistName || '').toLowerCase(), fn = (a.firstName || '').toLowerCase(), ln = (a.lastName || '').toLowerCase();
        return an.includes(q) || fn.includes(q) || ln.includes(q);
    });
    let html = '';
    if (matches.length === 0) html = '<div class="px-4 py-3 text-sm text-gray-500">Geen artiesten gevonden...</div>';
    else {
        matches.forEach(artist => {
            const dn = getDisplayName(artist);
            if (currentLineup.some(slot => slot && slot.rowIndex === artist.rowIndex)) {
                html += `<div class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 opacity-60 cursor-not-allowed flex justify-between items-center">
                            <div><div class="font-medium text-gray-500 dark:text-gray-400">${dn}</div><div class="text-xs text-gray-400 dark:text-gray-500">${artist.firstName} ${artist.lastName}</div></div>
                            <span class="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Al in lijst</span>
                        </div>`;
            } else html += `<div onclick="selectLineupArtist(${artist.rowIndex})" class="px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"> <div class="font-medium text-gray-900 dark:text-gray-100">${dn}</div> <div class="text-xs text-gray-500 dark:text-gray-400">${artist.firstName} ${artist.lastName}</div> </div>`;
        });
    }
    getEl('slot-search-results').innerHTML = html;
}

export async function selectLineupArtist(rowIndex) {
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (artist && activeSlotIndex !== null) {
        const matchedName = playedLastMonth.find(name => isFuzzyMatch(artist, name));
        if (matchedName) {
            if (await showConfirm(`Let op: <strong>${getDisplayName(artist)}</strong> lijkt erg op <strong>${matchedName}</strong> die vorige keer al heeft gespeeld.<br><br>Wil je deze artiest toch toevoegen aan het hoofdschema?`)) currentLineup[activeSlotIndex] = artist;
            else { reserveLineup.push(artist); showToast('Artiest verplaatst naar reservelijst.', 'info'); }
        } else currentLineup[activeSlotIndex] = artist;
        save();
        closeSlotSearch();
        renderLineupUI();
    }
}

export function addArtistToLineup(rowIndexInput) {
    const rowIndex = parseInt(rowIndexInput);
    if (isNaN(rowIndex)) { showToast("Selecteer eerst een artiest.", "error"); return; }
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (!artist) return;
    const emptyIndex = currentLineup.findIndex(slot => slot === null);
    if (emptyIndex === -1) { showToast(`Het speelschema is vol (max ${LINEUP_CONFIG.MAX_SLOTS}).`, "error"); return; }
    if (currentLineup.some(a => a && a.rowIndex === artist.rowIndex)) { showToast("Deze artiest staat al in de lijst.", "error"); return; }
    currentLineup[emptyIndex] = artist;
    save(); renderLineupUI();
}

export const removeArtistFromLineup = (index) => { currentLineup[index] = null; save(); renderLineupUI(); };
export const removeArtistFromReserve = (index) => { reserveLineup.splice(index, 1); save(); renderLineupUI(); };

export async function clearLineup() {
    if (currentLineup.every(slot => slot === null)) return; // Niets te wissen
    if (await showConfirm("Weet je zeker dat je het hele speelschema wilt wissen?")) {
        currentLineup = new Array(LINEUP_CONFIG.MAX_SLOTS).fill(null);
        reserveLineup = [];
        save();
        renderLineupUI();
        showToast("Speelschema leeggemaakt.", "success");
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

export const handleDragStart = DD.handleDragStart;
export const handleDragOver = DD.handleDragOver;
export const handleDragEnter = DD.handleDragEnter;
export const handleDragLeave = DD.handleDragLeave;
export const handleDragEnd = DD.handleDragEnd;

export async function saveLineupToDatabase() {
    if (!activeSessionName) { showToast('Laad eerst een sessie voordat je opslaat.', 'error'); return; }
    const btn = getEl('btn-save-lineup'); const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    try {
        const result = await apiRequest({ _action: 'save_lineup', sheetName: activeSessionName, lineup: currentLineup, reserve: reserveLineup });

        if (result.status === "success") {
            showToast("Lineup succesvol opgeslagen!", "success");
            // Reset state en local storage voor een schone lei
            clearLocalStorage();
            currentLineup = new Array(LINEUP_CONFIG.MAX_SLOTS).fill(null);
            reserveLineup = [];
            activeSessionName = '';
            getEl('current-session-name').value = '';
            getEl('lineup-editor-container').classList.add('hidden');
            renderLineupUI();
            closeLineupModal();
        } else showToast("Fout: " + result.message, "error");
    } catch (e) { showToast("Opslaan mislukt.", "error"); console.error(e); } finally { toggleButtonLoading(btn, false, orig); }
}

export function renderLineupUI() {
    const container = getEl('lineup-list-container');
    let html = '';
    for (let i = 0; i < LINEUP_CONFIG.MAX_SLOTS; i++) {
        if (i === LINEUP_CONFIG.PAUSE_INDEX) html += `<div class="pauze-divider flex items-center justify-center py-3 my-2 border-y border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg"> <span class="text-gray-500 dark:text-gray-400 font-medium text-sm">☕ Pauze</span> </div>`;
        const artist = currentLineup[i];
        html += artist ? createLineupItemHTML(i, artist, i + 1) : createEmptySlotHTML(i, i + 1);
    }
    container.innerHTML = html;

    // Render Reserve List
    const reserveContainer = getEl('reserve-list-content');
    reserveContainer.innerHTML = reserveLineup.length === 0 
        ? '<div class="text-sm text-orange-800/50 dark:text-orange-400/50 italic text-center py-2">Sleep artiesten hierheen voor de reservelijst</div>'
        : reserveLineup.map((artist, i) => createReserveItemHTML(i, artist)).join('');
    lucide.createIcons();
}