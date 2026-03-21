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
    const makeCb = (field, label, checked, colorClass) => `
        <label class="inline-flex items-center px-1.5 py-0 rounded text-xs font-medium border cursor-pointer transition-colors ${colorClass} h-5 leading-none">
            <input type="checkbox" class="mr-1 h-3 w-3 rounded" data-row="${artist.rowIndex}" data-field="${field}" ${checked ? 'checked' : ''} onchange="window.updateArtistField(event)">
            ${label}
        </label>
    `;

    let html = '';
    html += makeCb('Boekbaar (Ja/Nee)', 'Boekbaar', artist.bookable, 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300');
    html += makeCb('Favoriet Gijs (Ja/Nee)', '<i data-lucide="star" class="w-3 h-3 mr-1"></i> Gijs', artist.favGijs, 'text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300');
    html += makeCb('Favoriet Ro (Ja/Nee)', '<i data-lucide="star" class="w-3 h-3 mr-1"></i> Ro', artist.favRo, 'text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300');
    html += makeCb('Blacklist (Ja/Nee)', 'Blacklist', artist.blacklist, 'text-red-800 border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300');
    return html;
}

export function renderTable(dataToRender, elements) {
    console.log('🚀 Nieuwe Spreadsheet UI geladen! Aantal artiesten:', dataToRender.length);
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
        const editableSpan = (field, val, placeholder="...", extraClasses="") => `<span contenteditable="true" data-field="${field}" data-row="${artist.rowIndex}" class="editable-text outline-none focus:bg-white dark:focus:bg-gray-700 focus:ring-1 focus:ring-apple-blue rounded px-1 min-w-[20px] inline-block empty:before:content-['${placeholder}'] empty:before:text-gray-400 empty:before:pointer-events-none cursor-text transition-colors ${extraClasses}" onblur="window.handleFieldBlur(event)">${val !== '-' ? val : ''}</span>`;

        let artistNameHTML = `<div class="inline-flex items-center mt-0.5 px-1.5 py-0 rounded-full bg-blue-50 dark:bg-blue-900/30 text-apple-blue dark:text-blue-400 text-[11px] font-medium border border-blue-100 dark:border-blue-800"><i data-lucide="mic-2" class="w-2 h-2 mr-1"></i>${editableSpan('Artiestennaam', artist.artistName, 'Artiestennaam')}</div>`;
        
        let instaHTML = `<div class="flex items-center text-gray-600 dark:text-gray-400 text-xs mt-0.5 w-full overflow-hidden"><i data-lucide="instagram" class="w-3 h-3 mr-1.5 text-gray-400 shrink-0"></i> <div class="w-full overflow-hidden">${editableSpan('Instagram account', artist.instagram !== '-' ? artist.instagram : '', '@insta', 'block truncate w-full')}</div></div>`;
        
        let detailsHTML = '';
        detailsHTML += `<div class="flex items-center mb-0.5 text-xs text-gray-600 dark:text-gray-400"><i data-lucide="clock" class="w-3 h-3 mr-1.5 text-gray-400"></i> Speelduur: <strong class="ml-1 text-gray-900 dark:text-gray-200">${editableSpan('Speelduur', artist.setLength, '...')}</strong></div>`;
        detailsHTML += `<label class="flex items-center mb-0.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 transition-colors"><input type="checkbox" class="form-checkbox h-3 w-3 mr-1.5 rounded text-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500" data-row="${artist.rowIndex}" data-field="Interesse in workshops (Ja/Nee)" ${artist.workshops ? 'checked' : ''} onchange="window.updateArtistField(event)"> Interesse in workshops</label>`;
        detailsHTML += `<label class="flex items-center text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 transition-colors"><input type="checkbox" class="form-checkbox h-3 w-3 mr-1.5 rounded text-green-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-green-500" data-row="${artist.rowIndex}" data-field="Workshop 7 nov (Ja/Nee)" ${artist.workshop7Nov ? 'checked' : ''} onchange="window.updateArtistField(event)"> Workshop 7 nov</label>`;

        let notesHTML = `<div class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-tight px-1.5 py-0.5 editable-text outline-none focus:bg-white dark:focus:bg-gray-700 focus:ring-1 focus:ring-apple-blue rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-600 cursor-text min-h-[30px] empty:before:content-['Notities...'] empty:before:text-gray-400 transition-colors" contenteditable="true" data-field="Notities" data-row="${artist.rowIndex}" onblur="window.handleFieldBlur(event)">${artist.notes !== '-' ? artist.notes : ''}</div>`;
        
        let typeSelect = `<select data-field="Soort contact" data-row="${artist.rowIndex}" onchange="window.updateArtistField(event)" class="bg-transparent font-medium text-gray-900 dark:text-gray-100 text-sm outline-none cursor-pointer focus:ring-1 focus:ring-apple-blue rounded hover:bg-gray-100 dark:hover:bg-gray-700 py-0 px-1 -ml-1 h-5 leading-none transition-colors">
            <option value="Artiest" ${artist.type === 'Artiest' ? 'selected' : ''} class="dark:bg-gray-800">Artiest</option>
            <option value="Bobo" ${artist.type === 'Bobo' ? 'selected' : ''} class="dark:bg-gray-800">Bobo</option>
            <option value="Supplier" ${artist.type === 'Supplier' ? 'selected' : ''} class="dark:bg-gray-800">Supplier</option>
            <option value="Publiek" ${artist.type === 'Publiek' ? 'selected' : ''} class="dark:bg-gray-800">Publiek</option>
            <option value="-" ${artist.type === '-' ? 'selected' : ''} class="dark:bg-gray-800">-</option>
        </select>`;

        let unsubHTML = `<label class="inline-flex items-center px-1.5 py-0 rounded text-xs font-medium border cursor-pointer transition-colors text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 h-5 leading-none">
            <input type="checkbox" class="form-checkbox h-3 w-3 mr-1 rounded text-gray-500 focus:ring-gray-500" data-row="${artist.rowIndex}" data-field="Unsubscribed (Ja/Nee)" ${artist.unsubscribed ? 'checked' : ''} onchange="window.updateArtistField(event)">
            Unsubscribed
        </label>`;

        const tr = document.createElement('tr'); tr.className = "hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-colors group align-top border-b border-gray-100 dark:border-gray-800 last:border-0";
        tr.innerHTML = `
            <td class="px-2 py-1.5 text-center w-8 align-middle"><div class="flex flex-col items-center gap-2"><input type="checkbox" class="rounded text-apple-blue focus:ring-apple-blue w-4 h-4 cursor-pointer" ${artist.mailingSelection ? 'checked' : ''} onchange="window.toggleMailingSelection(${artist.rowIndex}, this.checked)"><button data-index="${artist.rowIndex}" class="btn-delete text-red-300 hover:text-red-600 p-1 rounded transition-colors focus:outline-none opacity-0 group-hover:opacity-100" title="Verwijder Artiest"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></div></td>
            <td class="px-2 py-1.5 min-w-[140px]"><div class="font-medium text-gray-900 dark:text-gray-100 text-sm flex flex-wrap gap-1 mb-0">${editableSpan('Voornaam', artist.firstName, 'Voor')} ${editableSpan('Achternaam', artist.lastName, 'Achter')}</div>${artistNameHTML}</td>
            <td class="px-2 py-1.5 min-w-[200px] max-w-[250px]"><div class="flex flex-col gap-0.5 w-full overflow-hidden"><div class="flex items-center text-gray-600 dark:text-gray-400 text-xs w-full overflow-hidden"><i data-lucide="mail" class="w-3 h-3 mr-1.5 text-gray-400 shrink-0"></i> <div class="w-full overflow-hidden" title="${artist.email}">${editableSpan('E-mailadres', artist.email, 'E-mail', 'block truncate w-full')}</div></div><div class="flex items-center text-gray-600 dark:text-gray-400 text-xs w-full overflow-hidden"><i data-lucide="phone" class="w-3 h-3 mr-1.5 text-gray-400 shrink-0"></i> <div class="w-full overflow-hidden">${editableSpan('Telefoonnummer', artist.phone, 'Tel', 'block truncate w-full')}</div></div>${instaHTML}</div></td>
            <td class="px-2 py-1.5 w-[140px]"><div class="mb-0">${typeSelect}</div><div class="flex flex-col gap-0 text-xs text-gray-500 dark:text-gray-400"><label class="flex items-center cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 transition-colors leading-tight"><input type="checkbox" class="form-checkbox h-3 w-3 mr-1.5 rounded text-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500" data-row="${artist.rowIndex}" data-field="Regio Den Haag" ${artist.regionDH ? 'checked' : ''} onchange="window.updateArtistField(event)"> Den Haag</label><label class="flex items-center cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 transition-colors leading-tight"><input type="checkbox" class="form-checkbox h-3 w-3 mr-1.5 rounded text-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500" data-row="${artist.rowIndex}" data-field="Regio Rotterdam" ${artist.regionRdam ? 'checked' : ''} onchange="window.updateArtistField(event)"> Rotterdam</label></div></td>
            <td class="px-2 py-1.5 w-[160px]"><div class="flex flex-col">${detailsHTML}</div></td>
            <td class="px-2 py-1.5 w-[180px]"><div class="flex flex-wrap items-center gap-1">${renderBadges(artist)} ${unsubHTML}</div></td>
            <td class="px-2 py-1.5 max-w-[130px]">${notesHTML}</td>`;
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
            blacklist: isTrue(row['Blacklist (Ja/Nee)']), notes: String(row['Notities'] || '-'),
            mailingSelection: isTrue(row['Mailing Selectie'])
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