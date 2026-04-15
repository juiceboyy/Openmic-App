import { STORAGE_KEYS, LINEUP_CONFIG } from './config.js';

export const normalize = (str) => (!str || str === '-') ? '' : str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

const levenshtein = (a, b) => {
    if (!a.length) return b.length; if (!b.length) return a.length;
    const matrix = Array(b.length + 1).fill(null).map((_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i - 1] === a[j - 1] ? matrix[i - 1][j - 1] : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[b.length][a.length];
};

export function isFuzzyMatch(artist, historicalName) {
    const h = normalize(historicalName);
    if (!h) return false;
    
    const checkSimilarity = (strA, strB) => {
        if (!strA || !strB) return false;
        if (strB.includes(strA) || strA.includes(strB)) return true;
        if (strA.length > 3 && strB.length > 3) {
            const dist = levenshtein(strA, strB);
            const maxDist = Math.floor(Math.min(strA.length, strB.length) / 4) + 1; 
            return dist <= maxDist;
        }
        return false;
    };

    if (artist.artistName && artist.artistName !== '-' && checkSimilarity(normalize(artist.artistName), h)) return true;
    const f = normalize(artist.firstName); const l = normalize(artist.lastName); const full = `${f} ${l}`.trim();
    if (full && checkSimilarity(full, h)) return true;
    return false;
}

export const saveToLocalStorage = (currentLineup, reserveLineup) => localStorage.setItem(STORAGE_KEYS.LINEUP_DRAFT, JSON.stringify({ main: currentLineup, reserve: reserveLineup }));

export function loadFromLocalStorage() {
    const stored = localStorage.getItem(STORAGE_KEYS.LINEUP_DRAFT);
    if (!stored) return null;
    try { return JSON.parse(stored); } catch (e) { console.error("Fout bij laden lineup uit local storage", e); return null; }
}

export const clearLocalStorage = () => localStorage.removeItem(STORAGE_KEYS.LINEUP_DRAFT);

export async function copyLineupToClipboard(currentLineup) {
    if (currentLineup.every(slot => slot === null)) return false;
    let text = `🎤 *Open Mic Lineup* 🎤\n\n`;
    for (let i = 0; i < LINEUP_CONFIG.MAX_SLOTS; i++) {
        if (i === LINEUP_CONFIG.PAUSE_INDEX) text += `\n☕ *Pauze*\n\n`;
        const artist = currentLineup[i];
        const name = artist ? (artist.artistName !== '-' ? artist.artistName : `${artist.firstName} ${artist.lastName}`) : '...';
        text += `${i + 1}. ${name}\n`;
    }
    try { await navigator.clipboard.writeText(text); return true; } catch (err) { return false; }
}

export const getDisplayName = (artist) => artist.artistName && artist.artistName !== '-' ? artist.artistName : `${artist.firstName} ${artist.lastName}`;

export const createLineupItemHTML = (i, artist, num, starred = false) => `
    <div ondragstart="handleDragStart(event, ${i}, 'main')" ondragover="handleDragOver(event)" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropOnMain(event, ${i})" ondragend="handleDragEnd(event); this.removeAttribute('draggable')" class="draggable-item flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 group transition-all hover:border-apple-blue/30">
        <div class="drag-handle flex items-center justify-center p-2 -ml-2 cursor-grab" onmousedown="this.closest('.draggable-item').setAttribute('draggable', 'true')" ontouchstart="this.closest('.draggable-item').setAttribute('draggable', 'true')" onmouseup="this.closest('.draggable-item').removeAttribute('draggable')" ontouchend="this.closest('.draggable-item').removeAttribute('draggable')" onmouseleave="this.closest('.draggable-item').removeAttribute('draggable')">
            <i data-lucide="grip-vertical" class="w-4 h-4 text-gray-400"></i>
        </div>
        <div class="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-600 font-semibold text-gray-500 dark:text-gray-400 text-sm shadow-sm shrink-0">${num}</div>
        <div class="flex-1 min-w-0"><div class="font-medium text-gray-900 dark:text-gray-100 truncate">${starred ? '⭐ ' : ''}${getDisplayName(artist)}</div><div class="text-xs text-gray-500 dark:text-gray-400 truncate">${artist.email && artist.email !== '-' ? `<a href="mailto:${artist.email}" class="hover:underline hover:text-apple-blue transition-colors" onclick="event.stopPropagation()">${artist.email}</a>` : '-'}</div></div>
        <div class="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><button onclick="removeArtistFromLineup(${i})" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors ml-1" title="Verwijder"><i data-lucide="x" class="w-4 h-4"></i></button></div>
    </div>`;

export const createEmptySlotHTML = (i, num) => `<div onclick="openSlotSearch(${i})" class="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors" ondragover="handleDragOver(event)" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropOnMain(event, ${i})"> <i data-lucide="plus" class="w-5 h-5 mr-2"></i> Kies een artiest voor slot ${num} </div>`;

export const createReserveItemHTML = (i, artist, starred = false) => `<div ondragstart="handleDragStart(event, ${i}, 'reserve')" ondragend="handleDragEnd(event); this.removeAttribute('draggable')" class="draggable-item flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-100 dark:border-orange-900/30 shadow-sm hover:border-orange-300 transition-colors"><div class="drag-handle flex items-center justify-center p-2 -ml-2 cursor-grab" onmousedown="this.closest('.draggable-item').setAttribute('draggable', 'true')" ontouchstart="this.closest('.draggable-item').setAttribute('draggable', 'true')" onmouseup="this.closest('.draggable-item').removeAttribute('draggable')" ontouchend="this.closest('.draggable-item').removeAttribute('draggable')" onmouseleave="this.closest('.draggable-item').removeAttribute('draggable')"><i data-lucide="grip-vertical" class="w-4 h-4 text-gray-400"></i></div><div class="flex-1 font-medium text-gray-900 dark:text-gray-100">${starred ? '⭐ ' : ''}${getDisplayName(artist)}</div><button onclick="removeArtistFromReserve(${i})" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"><i data-lucide="x" class="w-4 h-4"></i></button></div>`;