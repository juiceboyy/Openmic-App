import { state } from './state.js';
import { apiRequest } from './api.js';
import { showToast, showConfirm } from './notifications.js';
import { getEl, toggleButtonLoading } from './utils.js';

const LS_KEY = 'openmic_lineup_draft';
let currentLineup = new Array(12).fill(null);
let activeSlotIndex = null;
let draggedItemIndex = null;

function saveToLocalStorage() {
    localStorage.setItem(LS_KEY, JSON.stringify(currentLineup));
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length === 12) {
                currentLineup = parsed;
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
                html += `<div class="px-4 py-3 bg-gray-50 opacity-60 cursor-not-allowed flex justify-between items-center">
                            <div><div class="font-medium text-gray-500">${displayName}</div><div class="text-xs text-gray-400">${artist.firstName} ${artist.lastName}</div></div>
                            <span class="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">Al in lijst</span>
                        </div>`;
            } else {
                html += `<div onclick="selectLineupArtist(${artist.rowIndex})" class="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"> <div class="font-medium text-gray-900">${displayName}</div> <div class="text-xs text-gray-500">${artist.firstName} ${artist.lastName}</div> </div>`;
            }
        });
    }

    resultsDiv.innerHTML = html;
}

export function selectLineupArtist(rowIndex) {
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    
    if (artist && activeSlotIndex !== null) {
        currentLineup[activeSlotIndex] = artist;
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

export async function clearLineup() {
    if (currentLineup.every(slot => slot === null)) return; // Niets te wissen
    
    if (await showConfirm("Weet je zeker dat je het hele speelschema wilt wissen?")) {
        currentLineup = new Array(12).fill(null);
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

export function handleDragStart(event, index) {
    draggedItemIndex = index;
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

export function handleDrop(event, targetIndex) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');

    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

    // Swap items (omwisselen)
    const temp = currentLineup[targetIndex];
    currentLineup[targetIndex] = currentLineup[draggedItemIndex];
    currentLineup[draggedItemIndex] = temp;

    saveToLocalStorage();
    draggedItemIndex = null;
    renderLineupUI();
}

export function handleDragEnd(event) {
    event.target.classList.remove('opacity-40', 'scale-95');
    draggedItemIndex = null;
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
            lineup: currentLineup 
        });

        if (result.status === "success") {
            showToast("Lineup succesvol opgeslagen!", "success");
            
            // Reset state en local storage voor een schone lei
            localStorage.removeItem(LS_KEY);
            currentLineup = new Array(12).fill(null);
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
            html += `<div class="pauze-divider flex items-center justify-center py-3 my-2 border-y border-dashed border-gray-300 bg-gray-50/50 rounded-lg"> <span class="text-gray-500 font-medium text-sm">☕ Pauze</span> </div>`;
        }
        const artist = currentLineup[i];
        const num = i + 1;
        if (artist) {
            const displayName = artist.artistName !== '-' ? artist.artistName : `${artist.firstName} ${artist.lastName}`;
            html += `
            <div draggable="true" 
                 ondragstart="handleDragStart(event, ${i})" 
                 ondragover="handleDragOver(event)" 
                 ondragenter="handleDragEnter(event)" 
                 ondragleave="handleDragLeave(event)" 
                 ondrop="handleDrop(event, ${i})" 
                 ondragend="handleDragEnd(event)"
                 class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group transition-all hover:border-apple-blue/30 cursor-move">
                <i data-lucide="grip-vertical" class="w-4 h-4 text-gray-300 cursor-grab mr-1"></i>
                <div class="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-gray-200 font-semibold text-gray-500 text-sm shadow-sm shrink-0">${num}</div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 truncate">${displayName}</div>
                    <div class="text-xs text-gray-500 truncate">${artist.email || '-'}</div>
                </div>
                <div class="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><button onclick="moveArtistUp(${i})" class="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors ${i === 0 ? 'invisible' : ''}" title="Omhoog"><i data-lucide="arrow-up" class="w-4 h-4"></i></button><button onclick="moveArtistDown(${i})" class="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors ${i === currentLineup.length - 1 ? 'invisible' : ''}" title="Omlaag"><i data-lucide="arrow-down" class="w-4 h-4"></i></button><button onclick="removeArtistFromLineup(${i})" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-1" title="Verwijder"><i data-lucide="x" class="w-4 h-4"></i></button></div>
            </div>`;
        } else {
            // Lege slots zijn ook drop-zones (zodat je naar het einde kunt slepen), maar niet draggable
            html += `<div onclick="openSlotSearch(${i})" class="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors" ondragover="handleDragOver(event)" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event, ${i})"> <i data-lucide="plus" class="w-5 h-5 mr-2"></i> Kies een artiest voor slot ${num} </div>`;
        }
    }
    container.innerHTML = html;
    lucide.createIcons();
}