import { state, isTrue } from './state.js';
import { fetchArtistsData } from './api.js';
import { getEl } from './utils.js';

export function toggleGlobalLoading(element, show) {
    if (element) element.style.display = show ? 'flex' : 'none';
}

export function toggleNote(element) {
    const textDiv = element.querySelector('.note-text');
    const hintDiv = element.querySelector('.note-hint');
    if (textDiv.classList.contains('line-clamp-3')) {
        textDiv.classList.remove('line-clamp-3');
        hintDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="m18 15-6-6-6 6"/></svg> Inklappen';
        hintDiv.classList.remove('opacity-0', 'group-hover:opacity-100');
    } else {
        textDiv.classList.add('line-clamp-3');
        hintDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="m6 9 6 6 6-6"/></svg> Lees meer';
        hintDiv.classList.add('opacity-0', 'group-hover:opacity-100');
    }
}

export function renderBadges(artist) {
    let badges = '';
    if (artist.blacklist) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200 mb-1">Blacklist</span> `;
    else if (artist.bookable) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200 mb-1">Boekbaar</span> `;
    if (artist.favGijs) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 mb-1" title="Fav Gijs"><i data-lucide="star" class="w-3 h-3 mr-1"></i> Gijs</span> `;
    if (artist.favRo) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 mb-1" title="Fav Ro"><i data-lucide="star" class="w-3 h-3 mr-1"></i> Ro</span> `;
    return badges;
}

export function renderTable(dataToRender, elements) {
    const { artistTableBody, emptyState, contactCount } = elements;
    contactCount.innerText = dataToRender.length;
    artistTableBody.innerHTML = '';
    
    if (dataToRender.length === 0) { 
        emptyState.classList.remove('hidden'); 
        return; 
    } 
    
    emptyState.classList.add('hidden');
    const sortedData = [...dataToRender].sort((a, b) => (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName));

    sortedData.forEach(artist => {
        const fullName = `${artist.firstName} ${artist.lastName}`.trim();
        let regionTags = []; if (artist.regionDH) regionTags.push('Den Haag'); if (artist.regionRdam) regionTags.push('Rotterdam');
        
        let artistNameHTML = artist.artistName && artist.artistName !== '-' ? `<div class="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-apple-blue dark:text-blue-400 text-xs font-medium border border-blue-100 dark:border-blue-800"><i data-lucide="mic-2" class="w-2.5 h-2.5 mr-1.5"></i>${artist.artistName}</div>` : '';
        let instaHTML = artist.instagram && artist.instagram !== '-' ? `<div class="flex items-center text-gray-600 dark:text-gray-400 text-xs"><i data-lucide="instagram" class="w-3.5 h-3.5 mr-2 text-gray-400"></i> <a href="${artist.instagram.includes('http') ? artist.instagram : 'https://instagram.com/'+artist.instagram.replace('@','')}" target="_blank" class="hover:text-apple-blue hover:underline truncate max-w-[160px]">${artist.instagram.replace(/https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '')}</a></div>` : '';
        
        let detailsHTML = '';
        if (artist.setLength && artist.setLength !== '-') detailsHTML += `<div class="flex items-center mb-1 text-xs text-gray-600 dark:text-gray-400"><i data-lucide="clock" class="w-3.5 h-3.5 mr-2 text-gray-400"></i> Speelduur: <strong class="ml-1 text-gray-900 dark:text-gray-200">${artist.setLength}</strong></div>`;
        if (artist.workshops) detailsHTML += `<div class="flex items-center mb-1 text-xs text-gray-600 dark:text-gray-400"><i data-lucide="hammer" class="w-3.5 h-3.5 mr-2 text-blue-500"></i> Interesse in workshops</div>`;
        if (artist.workshop7Nov) detailsHTML += `<div class="flex items-center text-xs"><i data-lucide="calendar-check" class="w-3.5 h-3.5 mr-2 text-green-500"></i> <span class="text-green-600 font-medium">Interesse 7 nov</span></div>`;
        if (!detailsHTML) detailsHTML = '<span class="text-gray-400 text-xs">-</span>';

        let notesHTML = '<span class="text-gray-400 text-xs">-</span>';
        if (artist.notes && artist.notes !== '-') {
            const isLong = artist.notes.length > 90 || artist.notes.includes('\n');
            notesHTML = isLong 
                ? `<div class="group cursor-pointer rounded hover:bg-gray-100/50 dark:hover:bg-gray-700/50 p-1.5 -ml-1.5 transition-colors note-toggle"><div class="note-text text-xs text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap leading-relaxed">${artist.notes}</div><div class="note-hint text-[10px] text-apple-blue mt-1 opacity-0 group-hover:opacity-100 transition-opacity font-medium flex items-center"><i data-lucide="chevron-down" class="w-3 h-3 mr-1"></i> Lees meer</div></div>`
                : `<div class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed px-1.5 -ml-1.5 py-1.5">${artist.notes}</div>`;
        }

        const tr = document.createElement('tr'); tr.className = "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group align-top border-b border-gray-100 dark:border-gray-800 last:border-0";
        tr.innerHTML = `
            <td class="px-6 py-4"><div class="font-medium text-gray-900 dark:text-gray-100">${fullName || '-'}</div>${artistNameHTML}</td>
            <td class="px-6 py-4"><div class="flex flex-col gap-1.5"><div class="flex items-center text-gray-600 dark:text-gray-400 text-xs"><i data-lucide="mail" class="w-3.5 h-3.5 mr-2 text-gray-400"></i> <span class="truncate max-w-[180px]" title="${artist.email}">${artist.email}</span></div><div class="flex items-center text-gray-600 dark:text-gray-400 text-xs"><i data-lucide="phone" class="w-3.5 h-3.5 mr-2 text-gray-400"></i> ${artist.phone}</div>${instaHTML}</div></td>
            <td class="px-6 py-4"><div class="font-medium text-gray-900 dark:text-gray-100">${artist.type}</div><div class="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1"><i data-lucide="map-pin" class="w-3 h-3 mr-1"></i> ${regionTags.join(' & ') || '-'}</div></td>
            <td class="px-6 py-4"><div class="flex flex-col">${detailsHTML}</div></td>
            <td class="px-6 py-4"><div class="flex flex-wrap gap-1">${renderBadges(artist)} ${artist.unsubscribed ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 mb-1">Unsubscribed</span>` : ''}</div></td>
            <td class="px-6 py-4 max-w-[200px]">${notesHTML}</td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button data-index="${artist.rowIndex}" class="btn-edit text-apple-blue bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 hover:bg-apple-blue hover:text-white dark:hover:bg-blue-600 transition-colors px-3 py-1.5 rounded-lg focus:outline-none flex items-center justify-center shadow-sm"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i><span class="text-xs font-medium ml-1">Bewerk</span></button>
                    <button data-index="${artist.rowIndex}" class="btn-delete text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 transition-colors p-2 rounded-lg focus:outline-none flex items-center justify-center shadow-sm"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>`;
        artistTableBody.appendChild(tr);
    });
    lucide.createIcons();
}

export async function loadArtists() {
    const loadingState = getEl('loading-state');
    try {
        const data = await fetchArtistsData();
        state.allArtists = data.map(row => ({
            rowIndex: row.rowIndex, firstName: String(row['Voornaam'] || '-'), lastName: String(row['Achternaam'] || '-'), artistName: String(row['Artiestennaam'] || '-'),
            email: String(row['E-mailadres'] || '-'), phone: String(row['Telefoonnummer'] || '-'), instagram: String(row['Instagram account'] || '-'),
            bookable: isTrue(row['Boekbaar (Ja/Nee)']), favGijs: isTrue(row['Favoriet Gijs (Ja/Nee)']), favRo: isTrue(row['Favoriet Ro (Ja/Nee)']),
            setLength: String(row['Speelduur'] || '-'), regionDH: isTrue(row['Regio Den Haag']), regionRdam: isTrue(row['Regio Rotterdam']),
            workshops: isTrue(row['Interesse in workshops (Ja/Nee)']), workshop7Nov: isTrue(row['Workshop 7 nov (Ja/Nee)']),
            unsubscribed: isTrue(row['Unsubscribed (Ja/Nee)']), type: String(row['Soort contact'] || '-').trim(),
            blacklist: isTrue(row['Blacklist (Ja/Nee)']), notes: String(row['Notities'] || '-')
        }));
        toggleGlobalLoading(loadingState, false);
        applyFilters();
    } catch (error) { 
        console.error(error);
        loadingState.innerHTML = `<p class="text-sm font-medium text-red-500">Er is een fout opgetreden bij het laden.</p>`; 
    }
}

export function applyFilters() {
    const searchTerm = getEl('search-input').value.toLowerCase();
    const regionFilter = getEl('filter-region').value;
    const typeFilter = getEl('filter-type').value;
    const bookableFilter = getEl('filter-bookable').value;

    state.currentFilteredData = state.allArtists.filter(artist => {
        const matchesSearch = (artist.firstName + ' ' + artist.lastName + artist.artistName + artist.email).toLowerCase().includes(searchTerm);
        let matchesRegion = regionFilter === 'all' || (regionFilter === 'Den Haag' && artist.regionDH) || (regionFilter === 'Rotterdam' && artist.regionRdam);
        const matchesType = typeFilter === 'all' || artist.type === typeFilter;
        let matchesBookable = bookableFilter === 'all' || (bookableFilter === 'ja' && artist.bookable) || (bookableFilter === 'nee' && !artist.bookable);
        return matchesSearch && matchesRegion && matchesType && matchesBookable;
    });

    const domElements = {
        artistTableBody: getEl('artist-table-body'),
        emptyState: getEl('empty-state'),
        contactCount: getEl('contact-count')
    };
    renderTable(state.currentFilteredData, domElements);
}