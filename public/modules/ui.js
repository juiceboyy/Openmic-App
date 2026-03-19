import { isTrue } from './utils.js';

export const ui = {
    toggleGlobalLoading(element, show) {
        if (element) element.style.display = show ? 'flex' : 'none';
    },

    toggleNote(element) {
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
    },

    renderBadges(artist) {
        let badges = '';
        if (artist.blacklist) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200 mb-1">Blacklist</span> `;
        else if (artist.bookable) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200 mb-1">Boekbaar</span> `;
        if (artist.favGijs) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 mb-1" title="Fav Gijs"><i data-lucide="star" class="w-3 h-3 mr-1"></i> Gijs</span> `;
        if (artist.favRo) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 mb-1" title="Fav Ro"><i data-lucide="star" class="w-3 h-3 mr-1"></i> Ro</span> `;
        return badges;
    },

    renderTable(dataToRender, elements) {
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
            
            let artistNameHTML = artist.artistName && artist.artistName !== '-' ? `<div class="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-apple-blue text-xs font-medium border border-blue-100"><i data-lucide="mic-2" class="w-2.5 h-2.5 mr-1.5"></i>${artist.artistName}</div>` : '';
            let instaHTML = artist.instagram && artist.instagram !== '-' ? `<div class="flex items-center text-gray-600 text-xs"><i data-lucide="instagram" class="w-3.5 h-3.5 mr-2 text-gray-400"></i> <a href="${artist.instagram.includes('http') ? artist.instagram : 'https://instagram.com/'+artist.instagram.replace('@','')}" target="_blank" class="hover:text-apple-blue hover:underline truncate max-w-[160px]">${artist.instagram.replace(/https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '')}</a></div>` : '';
            
            let detailsHTML = '';
            if (artist.setLength && artist.setLength !== '-') detailsHTML += `<div class="flex items-center mb-1 text-xs text-gray-600"><i data-lucide="clock" class="w-3.5 h-3.5 mr-2 text-gray-400"></i> Speelduur: <strong class="ml-1 text-gray-900">${artist.setLength}</strong></div>`;
            if (artist.workshops) detailsHTML += `<div class="flex items-center mb-1 text-xs text-gray-600"><i data-lucide="hammer" class="w-3.5 h-3.5 mr-2 text-blue-500"></i> Interesse in workshops</div>`;
            if (artist.workshop7Nov) detailsHTML += `<div class="flex items-center text-xs"><i data-lucide="calendar-check" class="w-3.5 h-3.5 mr-2 text-green-500"></i> <span class="text-green-600 font-medium">Interesse 7 nov</span></div>`;
            if (!detailsHTML) detailsHTML = '<span class="text-gray-400 text-xs">-</span>';

            let notesHTML = '<span class="text-gray-400 text-xs">-</span>';
            if (artist.notes && artist.notes !== '-') {
                const isLong = artist.notes.length > 90 || artist.notes.includes('\n');
                notesHTML = isLong 
                    ? `<div class="group cursor-pointer rounded hover:bg-gray-100/50 p-1.5 -ml-1.5 transition-colors note-toggle"><div class="note-text text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap leading-relaxed">${artist.notes}</div><div class="note-hint text-[10px] text-apple-blue mt-1 opacity-0 group-hover:opacity-100 transition-opacity font-medium flex items-center"><i data-lucide="chevron-down" class="w-3 h-3 mr-1"></i> Lees meer</div></div>`
                    : `<div class="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed px-1.5 -ml-1.5 py-1.5">${artist.notes}</div>`;
            }

            const tr = document.createElement('tr'); tr.className = "hover:bg-gray-50 transition-colors group align-top";
            tr.innerHTML = `
                <td class="px-4 md:px-6 py-4"><div class="font-medium text-gray-900 text-base md:text-sm">${fullName || '-'}</div>${artistNameHTML}</td>
                <td class="px-4 md:px-6 py-4"><div class="flex flex-col gap-1.5"><div class="flex items-center text-gray-600 text-xs md:text-sm"><i data-lucide="mail" class="w-3.5 h-3.5 mr-2 text-gray-400"></i> <span class="truncate max-w-[180px]" title="${artist.email}">${artist.email}</span></div><div class="flex items-center text-gray-600 text-xs md:text-sm"><i data-lucide="phone" class="w-3.5 h-3.5 mr-2 text-gray-400"></i> ${artist.phone}</div>${instaHTML}</div></td>
                <td class="px-4 md:px-6 py-4"><div class="font-medium text-gray-900 text-base md:text-sm">${artist.type}</div><div class="flex items-center text-xs md:text-sm text-gray-500 mt-1"><i data-lucide="map-pin" class="w-3 h-3 mr-1"></i> ${regionTags.join(' & ') || '-'}</div></td>
                <td class="px-4 md:px-6 py-4"><div class="flex flex-col">${detailsHTML}</div></td>
                <td class="px-4 md:px-6 py-4"><div class="flex flex-wrap gap-1">${ui.renderBadges(artist)} ${artist.unsubscribed ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 mb-1">Unsubscribed</span>` : ''}</div></td>
                <td class="px-4 md:px-6 py-4 max-w-[200px]">${notesHTML}</td>
                <td class="px-4 md:px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button data-index="${artist.rowIndex}" class="btn-edit min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 text-apple-blue bg-blue-50 border border-blue-100 hover:bg-apple-blue hover:text-white transition-colors px-3 py-1.5 rounded-lg focus:outline-none flex items-center justify-center shadow-sm"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i><span class="hidden md:inline text-xs font-medium ml-1">Bewerk</span></button>
                        <button data-index="${artist.rowIndex}" class="btn-delete min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 text-red-500 bg-red-50 border border-red-100 hover:bg-red-500 hover:text-white transition-colors p-2 rounded-lg focus:outline-none flex items-center justify-center shadow-sm"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>`;
            artistTableBody.appendChild(tr);
        });
        lucide.createIcons();
    },

    renderSyncContacts(contacts, elements) {
        const { syncContactsBody, btnImportContacts } = elements;
        syncContactsBody.innerHTML = '';
        if(contacts.length === 0) {
            syncContactsBody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">Je bent helemaal up-to-date! Er zijn geen nieuwe contacten gevonden in je adresboek.</td></tr>`;
            btnImportContacts.style.display = 'none'; return;
        }
        btnImportContacts.style.display = 'flex';
        contacts.forEach((contact, index) => {
            let nameStr = `${contact.firstName} ${contact.lastName}`.trim() || '<span class="text-gray-400 italic">Geen naam</span>';
            let contactStr = '';
            if(contact.email) contactStr += `<div><i data-lucide="mail" class="w-3.5 h-3.5 inline mr-1 text-gray-400"></i> ${contact.email}</div>`;
            if(contact.phone) contactStr += `<div><i data-lucide="phone" class="w-3.5 h-3.5 inline mr-1 text-gray-400"></i> ${contact.phone}</div>`;
            
            syncContactsBody.innerHTML += `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 text-center align-top pt-3.5">
                    <input type="checkbox" id="sync-cb-${index}" checked class="sync-checkbox rounded text-apple-blue focus:ring-apple-blue w-5 h-5 md:w-4 md:h-4 cursor-pointer">
                    </td>
                    <td class="px-4 py-3 font-medium text-gray-800 align-top pt-3">${nameStr}</td>
                    <td class="px-4 py-3 text-gray-600 text-xs align-top pt-3.5 space-y-1">${contactStr || '-'}</td>
                    <td class="px-4 py-3 text-gray-500 text-xs align-top pt-3 line-clamp-2" title="${contact.notes}">${contact.notes || '-'}</td>
                </tr>`;
        });
        lucide.createIcons();
    },

    renderMatches(matches, elements) {
        const { photoMatchesBody } = elements;
        photoMatchesBody.innerHTML = '';
        if(matches.length === 0) { photoMatchesBody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-gray-500">Geen submappen gevonden.</td></tr>`; return; }
        matches.forEach((match, index) => {
            let isValid = match.matchFound && !match.multipleMatches && match.email && match.email !== '-';
        let checkbox = `<input type="checkbox" id="match-cb-${index}" class="rounded text-apple-blue focus:ring-apple-blue w-5 h-5 md:w-4 md:h-4 cursor-pointer" ${isValid ? 'checked' : 'disabled'}>`;
            let matchText = '';
            
            if (match.multipleMatches) {
                let options = `<option value="">Kies de juiste artiest...</option>` + match.candidates.map((c, i) => `<option value="${i}">${c.artistName} (${c.email || 'Geen e-mail'})</option>`).join('');
            matchText = `<div class="flex flex-col gap-1.5"><span class="text-orange-600 font-medium text-xs"><i data-lucide="help-circle" class="w-3.5 h-3.5 inline mr-1 -mt-0.5"></i> Meerdere matches:</span><select data-index="${index}" class="match-resolver border border-orange-300 bg-orange-50 text-orange-800 rounded px-2 py-1 min-h-[44px] md:min-h-0 text-base md:text-xs focus:outline-none w-full max-w-[280px]">${options}</select></div>`;
            } else if(isValid) { matchText = `<span class="text-green-600 font-medium"><i data-lucide="check-circle-2" class="w-4 h-4 inline mr-1 -mt-0.5"></i> ${match.artistName} <span class="text-xs font-normal">(${match.email})</span></span>`; } 
            else if (match.matchFound) { matchText = `<span class="text-orange-500 font-medium"><i data-lucide="alert-triangle" class="w-4 h-4 inline mr-1 -mt-0.5"></i> ${match.artistName} <span class="text-xs font-normal">(Geen E-mail)</span></span>`; } 
            else { matchText = `<span class="text-red-500"><i data-lucide="x-circle" class="w-4 h-4 inline mr-1 -mt-0.5"></i> Geen match</span>`; }
            
            let rowClass = match.multipleMatches ? 'bg-orange-50/30' : (!isValid ? 'bg-gray-50' : '');
            photoMatchesBody.innerHTML += `<tr class="${rowClass} transition-colors" id="match-row-${index}"><td class="px-4 py-3 align-top pt-3.5">${checkbox}</td><td class="px-4 py-3 font-medium text-gray-800 align-top pt-3.5"><a href="${match.folderLink}" target="_blank" class="hover:text-apple-blue hover:underline flex items-start"><i data-lucide="folder" class="w-4 h-4 mr-2 text-gray-400 shrink-0 mt-0.5"></i> <span class="break-all">${match.folderName}</span></a></td><td class="px-4 py-3 align-top pt-3">${matchText}</td></tr>`;
        });
        lucide.createIcons();
    }
};