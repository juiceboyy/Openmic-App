import { state } from './state.js';
import { apiRequest } from './api.js';
import { showToast, showConfirm } from './notifications.js';
import { getEl, toggleButtonLoading } from './utils.js';

const LS_KEY = 'openmic_lineup_draft';
let currentLineup = new Array(12).fill(null);
let reserveLineup = [];
let playedLastMonth = [];
let activeSlotIndex = null;
let draggedItem = null; // { list: 'main'|'reserve', index: 0 }

function saveToLocalStorage() {
    localStorage.setItem(LS_KEY, JSON.stringify({ main: currentLineup, reserve: reserveLineup }));
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            // Backward compatibility check (vroeger was het direct een array)
            if (Array.isArray(parsed) && parsed.length === 12) {
                currentLineup = parsed;
            } else if (parsed.main && Array.isArray(parsed.main)) {
                currentLineup = parsed.main;
                if (parsed.reserve && Array.isArray(parsed.reserve)) {
                    reserveLineup = parsed.reserve;
                }
            }
        } catch (e) {
            console.error("Fout bij laden lineup uit local storage", e);
        }
    }
}

export function openLineupModal() {
    // Als de huidige lineup leeg is (bijv. na refresh), probeer te herstellen uit storage
    if (currentLineup.every(slot => slot === null)) {
        loadFromLocalStorage();
    }
    getEl('lineup-modal').classList.remove('hidden');
    renderLineupUI();
    lucide.createIcons();
}

export function closeLineupModal() {
    getEl('lineup-modal').classList.add('hidden');
}

export async function loadPreviousLineup() {
    const prevSheetName = getEl('prev-sheet-name').value.trim();
    if (!prevSheetName) {
        showToast("Vul eerst de naam van het vorige tabblad in.", "error");
        return;
    }

    const btn = event.currentTarget; // De knop die geklikt is
    const orig = btn.innerHTML;
    toggleButtonLoading(btn, true);

    try {
        const result = await apiRequest({ _action: 'get_previous_lineup', prevSheetName });
        if (result.status === "success") {
            playedLastMonth = result.names || [];
            showToast(`Historie geladen: ${playedLastMonth.length} artiesten gevonden.`, "success");
        } else {
            showToast("Kon historie niet laden: " + result.message, "error");
        }
    } catch (e) {
        showToast("Fout bij ophalen historie.", "error");
        console.error(e);
    } finally {
        toggleButtonLoading(btn, false, orig);
    }
}

export function openSlotSearch(index) {
    activeSlotIndex = index;
    const modal = getEl('lineup-search-modal');
    const input = getEl('slot-search-input');
    const results = getEl('slot-search-results');
    
    modal.classList.remove('hidden');
    input.value = '';
    results.innerHTML = '';
    input.focus();
}

export function closeSlotSearch() {
    getEl('lineup-search-modal').classList.add('hidden');
    activeSlotIndex = null;
}

export function handleLineupSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    const resultsDiv = getEl('slot-search-results');

    if (!query) {
        resultsDiv.innerHTML = '';
        return;
    }

    const matches = state.allArtists.filter(a => {
        const artName = (a.artistName || '').toLowerCase();
        const fName = (a.firstName || '').toLowerCase();
        const lName = (a.lastName || '').toLowerCase();
        return artName.includes(query) || fName.includes(query) || lName.includes(query);
    });

    let html = '';
    if (matches.length === 0) {
        html = '<div class="px-4 py-3 text-sm text-gray-500">Geen artiesten gevonden...</div>';
    } else {
        matches.forEach(artist => {
            const displayName = artist.artistName && artist.artistName !== '-' ? artist.artistName : `${artist.firstName} ${artist.lastName}`;
            const isAlreadyInLineup = currentLineup.some(slot => slot && slot.rowIndex === artist.rowIndex);

            if (isAlreadyInLineup) {
                html += `<div class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 opacity-60 cursor-not-allowed flex justify-between items-center">
                            <div><div class="font-medium text-gray-500 dark:text-gray-400">${displayName}</div><div class="text-xs text-gray-400 dark:text-gray-500">${artist.firstName} ${artist.lastName}</div></div>
                            <span class="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Al in lijst</span>
                        </div>`;
            } else {
                html += `<div onclick="selectLineupArtist(${artist.rowIndex})" class="px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"> <div class="font-medium text-gray-900 dark:text-gray-100">${displayName}</div> <div class="text-xs text-gray-500 dark:text-gray-400">${artist.firstName} ${artist.lastName}</div> </div>`;
            }
        });
    }

    resultsDiv.innerHTML = html;
}

export function selectLineupArtist(rowIndex) {
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    
    if (artist && activeSlotIndex !== null) {
        const displayName = artist.artistName && artist.artistName !== '-' ? artist.artistName : `${artist.firstName} ${artist.lastName}`;
        
        // Check of artiest vorige maand speelde
        const playedRecently = playedLastMonth.some(name => name.toLowerCase() === displayName.toLowerCase());

        if (playedRecently) {
            reserveLineup.push(artist);
            showToast('Let op: Deze artiest speelde vorige maand al! Verplaatst naar reservelijst.', 'error');
        } else {
            currentLineup[activeSlotIndex] = artist;
        }

        saveToLocalStorage();
        closeSlotSearch();
        renderLineupUI();
    }
}

export function addArtistToLineup(rowIndexInput) {
    // Deze functie wordt nu minder gebruikt door de nieuwe UI, 
    // maar kan blijven bestaan voor eventuele andere flows of backward compatibility
    const rowIndex = parseInt(rowIndexInput);
    
    if (isNaN(rowIndex)) {
        showToast("Selecteer eerst een artiest.", "error");
        return;
    }

    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (!artist) return;

    const emptyIndex = currentLineup.findIndex(slot => slot === null);
    if (emptyIndex === -1) {
        showToast("Het speelschema is vol (max 12).", "error");
        return;
    }

    if (currentLineup.some(a => a && a.rowIndex === artist.rowIndex)) {
        showToast("Deze artiest staat al in de lijst.", "error");
        return;
    }

    currentLineup[emptyIndex] = artist;
    saveToLocalStorage();
    renderLineupUI();
}

export function removeArtistFromLineup(index) {
    currentLineup[index] = null;
    saveToLocalStorage();
    renderLineupUI();
}

export function removeArtistFromReserve(index) {
    reserveLineup.splice(index, 1);
    saveToLocalStorage();
    renderLineupUI();
}

export async function clearLineup() {
    if (currentLineup.every(slot => slot === null)) return; // Niets te wissen
    
    if (await showConfirm("Weet je zeker dat je het hele speelschema wilt wissen?")) {
        currentLineup = new Array(12).fill(null);
        reserveLineup = [];
        saveToLocalStorage();
        renderLineupUI();
        showToast("Speelschema leeggemaakt.", "success");
    }
}

export async function exportLineupToClipboard() {
    if (currentLineup.every(slot => slot === null)) {
        showToast("De lineup is leeg.", "error");
        return;
    }

    let text = `🎤 *Open Mic Lineup* 🎤\n\n`;
    
    for (let i = 0; i < 12; i++) {
        if (i === 6) text += `\n☕ *Pauze*\n\n`;
        
        const num = i + 1;
        const artist = currentLineup[i];
        const name = artist ? (artist.artistName !== '-' ? artist.artistName : `${artist.firstName} ${artist.lastName}`) : '...';
        
        text += `${num}. ${name}\n`;
    }

    try {
        await navigator.clipboard.writeText(text);
        showToast("Lijst gekopieerd naar klembord!", "success");
    } catch (err) {
        showToast("Kon niet kopiëren.", "error");
    }
}

export function moveArtistUp(index) {
    if (index > 0) {
        [currentLineup[index - 1], currentLineup[index]] = [currentLineup[index], currentLineup[index - 1]];
        saveToLocalStorage();
        renderLineupUI();
    }
}

export function moveArtistDown(index) {
    if (index < currentLineup.length - 1) {
        [currentLineup[index + 1], currentLineup[index]] = [currentLineup[index], currentLineup[index + 1]];
        saveToLocalStorage();
        renderLineupUI();
    }
}

export function handleDragStart(event, index, sourceList) {
    draggedItem = { list: sourceList, index: index };
    event.dataTransfer.effectAllowed = 'move';
    // Visuele feedback (even wachten zodat de 'ghost' image wel de volle opacity heeft)
    setTimeout(() => event.target.classList.add('opacity-40', 'scale-95'), 0);
}

export function handleDragOver(event) {
    event.preventDefault(); // Nodig om te kunnen droppen
    event.dataTransfer.dropEffect = 'move';
}

export function handleDragEnter(event) {
    event.preventDefault();
    event.currentTarget.classList.add('border-blue-400', 'bg-blue-50/50');
}

export function handleDragLeave(event) {
    event.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');
}

export function handleDropOnMain(event, targetIndex) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');

    if (!draggedItem) return;

    if (draggedItem.list === 'main') {
        // Swap binnen main
        if (draggedItem.index === targetIndex) return;
        const temp = currentLineup[targetIndex];
        currentLineup[targetIndex] = currentLineup[draggedItem.index];
        currentLineup[draggedItem.index] = temp;
    } else if (draggedItem.list === 'reserve') {
        // Van reserve naar main
        const reserveItem = reserveLineup[draggedItem.index];
        const mainItem = currentLineup[targetIndex]; // Kan null zijn of een artiest

        currentLineup[targetIndex] = reserveItem;
        reserveLineup.splice(draggedItem.index, 1);
        
        // Als er al iemand zat, gaat die naar reserve (swap tussen lijsten)
        if (mainItem) {
            reserveLineup.push(mainItem);
        }
    }

    saveToLocalStorage();
    draggedItem = null;
    renderLineupUI();
}

export function handleDropOnReserve(event) {
    event.preventDefault();
    // Visuele feedback op container weghalen (indien toegevoegd)
    
    if (!draggedItem) return;

    if (draggedItem.list === 'main') {
        const item = currentLineup[draggedItem.index];
        if (item) {
            reserveLineup.push(item);
            currentLineup[draggedItem.index] = null;
        }
    }
    // Reserve -> Reserve doen we voor nu even niets mee (of push naar einde), 
    // want re-ordering binnen reserve was optioneel in de prompt.

    saveToLocalStorage();
    draggedItem = null;
    renderLineupUI();
}

export function handleDragEnd(event) {
    event.target.classList.remove('opacity-40', 'scale-95');
    draggedItem = null;
}

export async function saveLineupToDatabase() {
    const sheetName = getEl('lineup-sheet-name').value.trim();
    if (!sheetName) {
        showToast('Vul eerst de naam van het tabblad in.', 'error');
        return;
    }

    const btn = getEl('btn-save-lineup');
    const orig = btn.innerHTML;
    toggleButtonLoading(btn, true);

    try {
        const result = await apiRequest({ 
            _action: 'save_lineup', 
            sheetName: sheetName,
            lineup: currentLineup,
            reserve: reserveLineup
        });

        if (result.status === "success") {
            showToast("Lineup succesvol opgeslagen!", "success");
            
            // Reset state en local storage voor een schone lei
            localStorage.removeItem(LS_KEY);
            currentLineup = new Array(12).fill(null);
            reserveLineup = [];
            getEl('lineup-sheet-name').value = '';
            renderLineupUI();
            
            closeLineupModal();
        } else {
            showToast("Fout: " + result.message, "error");
        }
    } catch (e) {
        showToast("Opslaan mislukt.", "error");
        console.error(e);
    } finally {
        toggleButtonLoading(btn, false, orig);
    }
}

export function renderLineupUI() {
    const container = getEl('lineup-list-container');

    let html = '';
    for (let i = 0; i < 12; i++) {
        if (i === 6) {
            html += `<div class="pauze-divider flex items-center justify-center py-3 my-2 border-y border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg"> <span class="text-gray-500 dark:text-gray-400 font-medium text-sm">☕ Pauze</span> </div>`;
        }
        const artist = currentLineup[i];
        const num = i + 1;
        if (artist) {
            const displayName = artist.artistName !== '-' ? artist.artistName : `${artist.firstName} ${artist.lastName}`;
            html += `
            <div draggable="true" 
                 ondragstart="handleDragStart(event, ${i}, 'main')" 
                 ondragover="handleDragOver(event)" 
                 ondragenter="handleDragEnter(event)" 
                 ondragleave="handleDragLeave(event)" 
                 ondrop="handleDropOnMain(event, ${i})" 
                 ondragend="handleDragEnd(event)"
                 class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 group transition-all hover:border-apple-blue/30 cursor-move">
                <i data-lucide="grip-vertical" class="w-4 h-4 text-gray-300 cursor-grab mr-1"></i>
                <div class="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-600 font-semibold text-gray-500 dark:text-gray-400 text-sm shadow-sm shrink-0">${num}</div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 dark:text-gray-100 truncate">${displayName}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">${artist.email || '-'}</div>
                </div>
                <div class="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><button onclick="moveArtistUp(${i})" class="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors ${i === 0 ? 'invisible' : ''}" title="Omhoog"><i data-lucide="arrow-up" class="w-4 h-4"></i></button><button onclick="moveArtistDown(${i})" class="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors ${i === currentLineup.length - 1 ? 'invisible' : ''}" title="Omlaag"><i data-lucide="arrow-down" class="w-4 h-4"></i></button><button onclick="removeArtistFromLineup(${i})" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors ml-1" title="Verwijder"><i data-lucide="x" class="w-4 h-4"></i></button></div>
            </div>`;
        } else {
            // Lege slots zijn ook drop-zones (zodat je naar het einde kunt slepen), maar niet draggable
            html += `<div onclick="openSlotSearch(${i})" class="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors" ondragover="handleDragOver(event)" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropOnMain(event, ${i})"> <i data-lucide="plus" class="w-5 h-5 mr-2"></i> Kies een artiest voor slot ${num} </div>`;
        }
    }
    container.innerHTML = html;

    // Render Reserve List
    const reserveContainer = getEl('reserve-list-content');
    let reserveHtml = '';
    if (reserveLineup.length === 0) {
        reserveHtml = '<div class="text-sm text-orange-800/50 dark:text-orange-400/50 italic text-center py-2">Sleep artiesten hierheen voor de reservelijst</div>';
    } else {
        reserveLineup.forEach((artist, i) => {
            const displayName = artist.artistName !== '-' ? artist.artistName : `${artist.firstName} ${artist.lastName}`;
            reserveHtml += `
            <div draggable="true" ondragstart="handleDragStart(event, ${i}, 'reserve')" ondragend="handleDragEnd(event)" class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-100 dark:border-orange-900/30 shadow-sm cursor-move hover:border-orange-300 transition-colors">
                <i data-lucide="grip-vertical" class="w-4 h-4 text-gray-300 cursor-grab mr-1"></i>
                <div class="flex-1 font-medium text-gray-900 dark:text-gray-100">${displayName}</div>
                <button onclick="removeArtistFromReserve(${i})" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>`;
        });
    }
    reserveContainer.innerHTML = reserveHtml;

    lucide.createIcons();
}