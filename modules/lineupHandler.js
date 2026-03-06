import { state } from './state.js';
import { apiRequest } from './api.js';
import { showToast } from './notifications.js';
import { getEl, toggleButtonLoading } from './utils.js';

let currentLineup = [];

export function openLineupModal() {
    getEl('lineup-modal').classList.remove('hidden');
    renderLineupUI();
    lucide.createIcons();
}

export function closeLineupModal() {
    getEl('lineup-modal').classList.add('hidden');
}

export function addArtistToLineup() {
    const select = getEl('lineup-artist-select');
    const rowIndex = parseInt(select.value);
    
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
    select.value = ""; 
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

export async function saveLineupToDatabase() {
    const btn = getEl('btn-save-lineup');
    const orig = btn.innerHTML;
    toggleButtonLoading(btn, true);

    try {
        const result = await apiRequest({ 
            _action: 'save_lineup', 
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
    const select = getEl('lineup-artist-select');
    
    if (select.options.length <= 1) {
        select.innerHTML = '<option value="">Kies een artiest...</option>';
        const sorted = [...state.allArtists].sort((a, b) => (a.artistName !== '-' ? a.artistName : a.firstName).localeCompare(b.artistName !== '-' ? b.artistName : b.firstName));
        sorted.forEach(artist => {
            const name = artist.artistName !== '-' ? `${artist.artistName} (${artist.firstName})` : `${artist.firstName} ${artist.lastName}`;
            const option = document.createElement('option');
            option.value = artist.rowIndex;
            option.textContent = name;
            select.appendChild(option);
        });
    }

    let html = '';
    for (let i = 0; i < 12; i++) {
        const artist = currentLineup[i];
        const num = i + 1;
        if (artist) {
            const displayName = artist.artistName !== '-' ? artist.artistName : `${artist.firstName} ${artist.lastName}`;
            html += `<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group transition-all hover:border-apple-blue/30"><div class="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-gray-200 font-semibold text-gray-500 text-sm shadow-sm">${num}</div><div class="flex-1 min-w-0"><div class="font-medium text-gray-900 truncate">${displayName}</div><div class="text-xs text-gray-500 truncate">${artist.email || '-'}</div></div><div class="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><button onclick="moveArtistUp(${i})" class="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors ${i === 0 ? 'invisible' : ''}" title="Omhoog"><i data-lucide="arrow-up" class="w-4 h-4"></i></button><button onclick="moveArtistDown(${i})" class="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors ${i === currentLineup.length - 1 ? 'invisible' : ''}" title="Omlaag"><i data-lucide="arrow-down" class="w-4 h-4"></i></button><button onclick="removeArtistFromLineup(${i})" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-1" title="Verwijder"><i data-lucide="x" class="w-4 h-4"></i></button></div></div>`;
        } else {
            html += `<div class="flex items-center gap-3 p-3 border border-dashed border-gray-200 rounded-lg"><div class="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full border border-gray-100 font-semibold text-gray-300 text-sm">${num}</div><div class="text-sm text-gray-400 italic">Leeg slot</div></div>`;
        }
    }
    container.innerHTML = html;
    lucide.createIcons();
}