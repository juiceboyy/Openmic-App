import { state } from './state.js';
import { apiRequest } from './api.js';
import { showToast } from './notifications.js';
import { getEl, toggleButtonLoading } from './utils.js';

let currentLineup = [];
let selectedArtistRowIndex = null;
let draggedItemIndex = null;

export function openLineupModal() {
    getEl('lineup-modal').classList.remove('hidden');
    renderLineupUI();
    lucide.createIcons();
}

export function closeLineupModal() {
    getEl('lineup-modal').classList.add('hidden');
}

export function handleLineupSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    const resultsDiv = getEl('lineup-search-results');

    if (!query) {
        resultsDiv.classList.add('hidden');
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
            html += `<div onclick="selectLineupArtist(${artist.rowIndex}, '${displayName.replace(/'/g, "\\'")}')" class="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"> <div class="font-medium text-gray-900">${displayName}</div> <div class="text-xs text-gray-500">${artist.firstName} ${artist.lastName}</div> </div>`;
        });
    }

    resultsDiv.innerHTML = html;
    resultsDiv.classList.remove('hidden');
}

export function selectLineupArtist(rowIndex, displayName) {
    selectedArtistRowIndex = rowIndex;
    getEl('lineup-search-input').value = displayName;
    getEl('lineup-search-results').classList.add('hidden');
}

export function addSelectedArtistToLineup() {
    if (selectedArtistRowIndex === null) {
        showToast('Zoek en selecteer eerst een artiest.', 'error');
        return;
    }
    addArtistToLineup(selectedArtistRowIndex);
    selectedArtistRowIndex = null;
    getEl('lineup-search-input').value = '';
}

export function addArtistToLineup(rowIndexInput) {
    const rowIndex = parseInt(rowIndexInput);
    
    if (isNaN(rowIndex)) {
        showToast("Selecteer eerst een artiest.", "error");
        return;
    }

    if (currentLineup.length >= 12) {
        showToast("De lineup zit vol (max 12).", "error");
        return;
    }

    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (!artist) return;

    if (currentLineup.some(a => a.rowIndex === artist.rowIndex)) {
        showToast("Deze artiest staat al in de lijst.", "error");
        return;
    }

    currentLineup.push(artist);
    renderLineupUI();
}

export function removeArtistFromLineup(index) {
    currentLineup.splice(index, 1);
    renderLineupUI();
}

export function moveArtistUp(index) {
    if (index > 0) {
        [currentLineup[index - 1], currentLineup[index]] = [currentLineup[index], currentLineup[index - 1]];
        renderLineupUI();
    }
}

export function moveArtistDown(index) {
    if (index < currentLineup.length - 1) {
        [currentLineup[index + 1], currentLineup[index]] = [currentLineup[index], currentLineup[index + 1]];
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

    // Verplaats item in array
    const item = currentLineup.splice(draggedItemIndex, 1)[0];
    currentLineup.splice(targetIndex, 0, item);

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
            html += `<div class="flex items-center justify-center py-3 my-2 border-y border-dashed border-gray-300 bg-gray-50/50 rounded-lg"> <span class="text-gray-500 font-medium text-sm">☕ Pauze (Na 6 artiesten)</span> </div>`;
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
            html += `<div ondragover="handleDragOver(event)" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event, ${i})" class="flex items-center gap-3 p-3 border border-dashed border-gray-200 rounded-lg transition-colors"><div class="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full border border-gray-100 font-semibold text-gray-300 text-sm ml-6">${num}</div><div class="text-sm text-gray-400 italic">Leeg slot</div></div>`;
        }
    }
    container.innerHTML = html;
    lucide.createIcons();
}