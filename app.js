const App = {
    config: {
        WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzk7SHUUOUEhgMAgKZ9XUUgna3oz_1XDa5Na8m4a5VV7TbTa0lpB7Ku_6SOgmaMIGxE/exec',
    },
    state: {
        allArtists: [],
        currentFilteredData: [],
        currentEditRowIndex: null,
        scannedMatches: [],
        fetchedSyncContacts: [],
        mailingRecipients: [],
    },
    dom: {},
    util: {
        isTrue: (val) => String(val).toLowerCase() === 'ja' || val === true || val === 'TRUE',
        getEl: (id) => document.getElementById(id),
        toggleLoading: (btn, isLoading, originalContent) => {
             if (!btn) return;
             btn.disabled = isLoading;
             if (isLoading) {
                 const isWhite = btn.classList.contains('text-white');
                 const spinnerColor = isWhite ? 'border-white/30 border-t-white' : 'border-current border-t-transparent';
                 btn.innerHTML = `<div class="w-4 h-4 border-2 ${spinnerColor} rounded-full animate-spin"></div>`;
             } else {
                 btn.innerHTML = originalContent;
             }
        }
    },
    api: {
        async fetch(body = null) {
            const options = body ? {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(body)
            } : {};
            const res = await fetch(App.config.WEB_APP_URL, options);
            return await res.json();
        }
    },
    ui: {
        toggleGlobalLoading(show) {
            const el = App.dom.loadingState;
            if(el) el.style.display = show ? 'flex' : 'none';
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
        renderTable(dataToRender) {
            const { artistTableBody, emptyState, contactCount } = App.dom;
            contactCount.innerText = dataToRender.length;
            artistTableBody.innerHTML = '';
            if (dataToRender.length === 0) { emptyState.classList.remove('hidden'); return; } 
            
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
                    <td class="px-6 py-4"><div class="font-medium text-gray-900">${fullName || '-'}</div>${artistNameHTML}</td>
                    <td class="px-6 py-4"><div class="flex flex-col gap-1.5"><div class="flex items-center text-gray-600 text-xs"><i data-lucide="mail" class="w-3.5 h-3.5 mr-2 text-gray-400"></i> <span class="truncate max-w-[180px]" title="${artist.email}">${artist.email}</span></div><div class="flex items-center text-gray-600 text-xs"><i data-lucide="phone" class="w-3.5 h-3.5 mr-2 text-gray-400"></i> ${artist.phone}</div>${instaHTML}</div></td>
                    <td class="px-6 py-4"><div class="font-medium text-gray-900">${artist.type}</div><div class="flex items-center text-xs text-gray-500 mt-1"><i data-lucide="map-pin" class="w-3 h-3 mr-1"></i> ${regionTags.join(' & ') || '-'}</div></td>
                    <td class="px-6 py-4"><div class="flex flex-col">${detailsHTML}</div></td>
                    <td class="px-6 py-4"><div class="flex flex-wrap gap-1">${App.ui.renderBadges(artist)} ${artist.unsubscribed ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 mb-1">Unsubscribed</span>` : ''}</div></td>
                    <td class="px-6 py-4 max-w-[200px]">${notesHTML}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button data-index="${artist.rowIndex}" class="btn-edit text-apple-blue bg-blue-50 border border-blue-100 hover:bg-apple-blue hover:text-white transition-colors px-3 py-1.5 rounded-lg focus:outline-none flex items-center justify-center shadow-sm"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i><span class="text-xs font-medium ml-1">Bewerk</span></button>
                            <button data-index="${artist.rowIndex}" class="btn-delete text-red-500 bg-red-50 border border-red-100 hover:bg-red-500 hover:text-white transition-colors p-2 rounded-lg focus:outline-none flex items-center justify-center shadow-sm"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </td>`;
                artistTableBody.appendChild(tr);
            });
            lucide.createIcons();
        },
        renderSyncContacts() {
            const { syncContactsBody, btnImportContacts } = App.dom;
            syncContactsBody.innerHTML = '';
            if(App.state.fetchedSyncContacts.length === 0) {
                syncContactsBody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">Je bent helemaal up-to-date! Er zijn geen nieuwe contacten gevonden in je adresboek.</td></tr>`;
                btnImportContacts.style.display = 'none'; return;
            }
            btnImportContacts.style.display = 'flex';
            App.state.fetchedSyncContacts.forEach((contact, index) => {
                let nameStr = `${contact.firstName} ${contact.lastName}`.trim() || '<span class="text-gray-400 italic">Geen naam</span>';
                let contactStr = '';
                if(contact.email) contactStr += `<div><i data-lucide="mail" class="w-3.5 h-3.5 inline mr-1 text-gray-400"></i> ${contact.email}</div>`;
                if(contact.phone) contactStr += `<div><i data-lucide="phone" class="w-3.5 h-3.5 inline mr-1 text-gray-400"></i> ${contact.phone}</div>`;
                
                syncContactsBody.innerHTML += `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-4 py-3 text-center align-top pt-3.5">
                            <input type="checkbox" id="sync-cb-${index}" checked class="sync-checkbox rounded text-apple-blue focus:ring-apple-blue w-4 h-4 cursor-pointer">
                        </td>
                        <td class="px-4 py-3 font-medium text-gray-800 align-top pt-3">${nameStr}</td>
                        <td class="px-4 py-3 text-gray-600 text-xs align-top pt-3.5 space-y-1">${contactStr || '-'}</td>
                        <td class="px-4 py-3 text-gray-500 text-xs align-top pt-3 line-clamp-2" title="${contact.notes}">${contact.notes || '-'}</td>
                    </tr>`;
            });
            lucide.createIcons();
        },
        renderMatches() {
            const { photoMatchesBody } = App.dom;
            photoMatchesBody.innerHTML = '';
            if(App.state.scannedMatches.length === 0) { photoMatchesBody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-gray-500">Geen submappen gevonden.</td></tr>`; return; }
            App.state.scannedMatches.forEach((match, index) => {
                let isValid = match.matchFound && !match.multipleMatches && match.email && match.email !== '-';
                let checkbox = `<input type="checkbox" id="match-cb-${index}" class="rounded text-apple-blue focus:ring-apple-blue w-4 h-4 cursor-pointer" ${isValid ? 'checked' : 'disabled'}>`;
                let matchText = '';
                
                if (match.multipleMatches) {
                    let options = `<option value="">Kies de juiste artiest...</option>` + match.candidates.map((c, i) => `<option value="${i}">${c.artistName} (${c.email || 'Geen e-mail'})</option>`).join('');
                    matchText = `<div class="flex flex-col gap-1.5"><span class="text-orange-600 font-medium text-xs"><i data-lucide="help-circle" class="w-3.5 h-3.5 inline mr-1 -mt-0.5"></i> Meerdere matches:</span><select data-index="${index}" class="match-resolver border border-orange-300 bg-orange-50 text-orange-800 rounded px-2 py-1 text-xs focus:outline-none w-full max-w-[280px]">${options}</select></div>`;
                } else if(isValid) { matchText = `<span class="text-green-600 font-medium"><i data-lucide="check-circle-2" class="w-4 h-4 inline mr-1 -mt-0.5"></i> ${match.artistName} <span class="text-xs font-normal">(${match.email})</span></span>`; } 
                else if (match.matchFound) { matchText = `<span class="text-orange-500 font-medium"><i data-lucide="alert-triangle" class="w-4 h-4 inline mr-1 -mt-0.5"></i> ${match.artistName} <span class="text-xs font-normal">(Geen E-mail)</span></span>`; } 
                else { matchText = `<span class="text-red-500"><i data-lucide="x-circle" class="w-4 h-4 inline mr-1 -mt-0.5"></i> Geen match</span>`; }
                
                let rowClass = match.multipleMatches ? 'bg-orange-50/30' : (!isValid ? 'bg-gray-50' : '');
                photoMatchesBody.innerHTML += `<tr class="${rowClass} transition-colors" id="match-row-${index}"><td class="px-4 py-3 align-top pt-3.5">${checkbox}</td><td class="px-4 py-3 font-medium text-gray-800 align-top pt-3.5"><a href="${match.folderLink}" target="_blank" class="hover:text-apple-blue hover:underline flex items-start"><i data-lucide="folder" class="w-4 h-4 mr-2 text-gray-400 shrink-0 mt-0.5"></i> <span class="break-all">${match.folderName}</span></a></td><td class="px-4 py-3 align-top pt-3">${matchText}</td></tr>`;
            });
            lucide.createIcons();
        }
    },
    handlers: {
        async loadArtists() {
            try {
                const data = await App.api.fetch();
                App.state.allArtists = data.map(row => ({
                    rowIndex: row.rowIndex, 
                    firstName: String(row['Voornaam'] || '-'), lastName: String(row['Achternaam'] || '-'), artistName: String(row['Artiestennaam'] || '-'),
                    email: String(row['E-mailadres'] || '-'), phone: String(row['Telefoonnummer'] || '-'), instagram: String(row['Instagram account'] || '-'),
                    bookable: App.util.isTrue(row['Boekbaar (Ja/Nee)']), favGijs: App.util.isTrue(row['Favoriet Gijs (Ja/Nee)']), favRo: App.util.isTrue(row['Favoriet Ro (Ja/Nee)']),
                    setLength: String(row['Speelduur'] || '-'), regionDH: App.util.isTrue(row['Regio Den Haag']), regionRdam: App.util.isTrue(row['Regio Rotterdam']),
                    workshops: App.util.isTrue(row['Interesse in workshops (Ja/Nee)']), workshop7Nov: App.util.isTrue(row['Workshop 7 nov (Ja/Nee)']),
                    unsubscribed: App.util.isTrue(row['Unsubscribed (Ja/Nee)']), type: String(row['Soort contact'] || '-').trim(),
                    blacklist: App.util.isTrue(row['Blacklist (Ja/Nee)']), notes: String(row['Notities'] || '-')
                }));
                App.ui.toggleGlobalLoading(false);
                App.handlers.applyFilters();
            } catch (error) { App.dom.loadingState.innerHTML = `<p class="text-sm font-medium text-red-500">Er is een fout opgetreden.</p>`; }
        },
        applyFilters() {
            const searchTerm = App.dom.searchInput.value.toLowerCase();
            const regionFilter = App.dom.filterRegion.value;
            const typeFilter = App.dom.filterType.value;
            const bookableFilter = App.dom.filterBookable.value;

            App.state.currentFilteredData = App.state.allArtists.filter(artist => {
                const matchesSearch = (artist.firstName + ' ' + artist.lastName + artist.artistName + artist.email).toLowerCase().includes(searchTerm);
                let matchesRegion = regionFilter === 'all' || (regionFilter === 'Den Haag' && artist.regionDH) || (regionFilter === 'Rotterdam' && artist.regionRdam);
                const matchesType = typeFilter === 'all' || artist.type === typeFilter;
                let matchesBookable = bookableFilter === 'all' || (bookableFilter === 'ja' && artist.bookable) || (bookableFilter === 'nee' && !artist.bookable);
                return matchesSearch && matchesRegion && matchesType && matchesBookable;
            });
            App.ui.renderTable(App.state.currentFilteredData);
        },
        openContactModal(rowIndex = null) {
            const { newContactForm, modalTitle, contactModal } = App.dom;
            newContactForm.reset(); App.state.currentEditRowIndex = rowIndex;
            if (rowIndex !== null) {
                modalTitle.innerHTML = `<i data-lucide="edit-2" class="w-5 h-5 text-apple-blue mr-2"></i> Contact Bewerken`;
                const artist = App.state.allArtists.find(a => a.rowIndex === rowIndex);
                if (artist) {
                    newContactForm.elements['Voornaam'].value = artist.firstName; newContactForm.elements['Achternaam'].value = artist.lastName; newContactForm.elements['Artiestennaam'].value = artist.artistName !== '-' ? artist.artistName : ''; newContactForm.elements['E-mailadres'].value = artist.email !== '-' ? artist.email : ''; newContactForm.elements['Telefoonnummer'].value = artist.phone !== '-' ? artist.phone : ''; newContactForm.elements['Instagram account'].value = artist.instagram !== '-' ? artist.instagram : ''; newContactForm.elements['Soort contact'].value = artist.type !== '-' ? artist.type : 'Artiest'; newContactForm.elements['Speelduur'].value = artist.setLength !== '-' ? artist.setLength : ''; newContactForm.elements['Notities'].value = artist.notes !== '-' ? artist.notes : '';
                    newContactForm.elements['Regio Den Haag'].checked = artist.regionDH; newContactForm.elements['Regio Rotterdam'].checked = artist.regionRdam; newContactForm.elements['Boekbaar (Ja/Nee)'].checked = artist.bookable; newContactForm.elements['Favoriet Gijs (Ja/Nee)'].checked = artist.favGijs; newContactForm.elements['Favoriet Ro (Ja/Nee)'].checked = artist.favRo; newContactForm.elements['Interesse in workshops (Ja/Nee)'].checked = artist.workshops; newContactForm.elements['Workshop 7 nov (Ja/Nee)'].checked = artist.workshop7Nov; newContactForm.elements['Unsubscribed (Ja/Nee)'].checked = artist.unsubscribed; newContactForm.elements['Blacklist (Ja/Nee)'].checked = artist.blacklist;
                }
            } else { modalTitle.innerHTML = '<i data-lucide="user-plus" class="w-5 h-5 text-apple-blue mr-2"></i> Nieuw Contact Toevoegen'; }
            contactModal.classList.remove('hidden'); lucide.createIcons();
        },
        async submitContactForm() {
            const btn = App.dom.btnSaveContact; const orig = btn.innerHTML; App.util.toggleLoading(btn, true);
            const payload = {}; for (let [key, value] of new FormData(App.dom.newContactForm).entries()) { payload[key] = value === 'on' ? true : (value || "-"); }
            ["Regio Den Haag", "Regio Rotterdam", "Boekbaar (Ja/Nee)", "Favoriet Gijs (Ja/Nee)", "Favoriet Ro (Ja/Nee)", "Interesse in workshops (Ja/Nee)", "Workshop 7 nov (Ja/Nee)", "Unsubscribed (Ja/Nee)", "Blacklist (Ja/Nee)"].forEach(f => { if (!payload.hasOwnProperty(f)) payload[f] = false; });
            payload._action = App.state.currentEditRowIndex !== null ? 'edit' : 'add'; if(App.state.currentEditRowIndex) payload._rowIndex = App.state.currentEditRowIndex;
            try {
                const data = await App.api.fetch(payload);
                if (data.status === "success") { App.dom.contactModal.classList.add('hidden'); App.ui.toggleGlobalLoading(true); App.handlers.loadArtists(); } else { alert("Fout: " + data.message); }
            } catch (e) { alert("Kon niet opslaan."); } finally { App.util.toggleLoading(btn, false, orig); }
        },
        async deleteContact(rowIndex) {
            if (!confirm("Zeker weten?")) return;
            App.ui.toggleGlobalLoading(true);
            try {
                const res = await App.api.fetch({ _action: 'delete', _rowIndex: rowIndex });
                if (res.status === "success") App.handlers.loadArtists();
            } catch (e) { alert("Fout bij verwijderen."); App.ui.toggleGlobalLoading(false); }
        },
        openSyncModal() {
            App.dom.syncModal.classList.remove('hidden'); App.dom.syncStep1.classList.remove('hidden'); App.dom.syncStep2.classList.add('hidden'); App.dom.syncModalFooter.classList.add('hidden'); App.dom.syncContactsBody.innerHTML = ''; App.state.fetchedSyncContacts = []; lucide.createIcons();
        },
        async fetchGoogleContacts() {
            const btn = App.dom.btnSyncStart; const orig = btn.innerHTML; App.util.toggleLoading(btn, true);
            try {
                const result = await App.api.fetch({ _action: 'fetch_google_contacts' });
                if (result.status === "success") {
                    App.state.fetchedSyncContacts = result.contacts; App.ui.renderSyncContacts();
                    App.dom.syncStep1.classList.add('hidden'); App.dom.syncStep2.classList.remove('hidden'); App.dom.syncModalFooter.classList.remove('hidden');
                } else { alert("Fout bij ophalen: " + result.message); }
            } catch (e) { alert("Kon contacten niet ophalen."); } finally { App.util.toggleLoading(btn, false, orig); }
        },
        toggleAllSyncCheckboxes(source) {
            document.querySelectorAll('.sync-checkbox').forEach(cb => cb.checked = source.checked);
        },
        async importSelectedContacts() {
            const toImport = []; App.state.fetchedSyncContacts.forEach((c, idx) => { if(App.util.getEl(`sync-cb-${idx}`).checked) { toImport.push(c); } });
            if(toImport.length === 0) { alert("Selecteer minstens één contact."); return; }
            const btn = App.dom.btnImportContacts; const orig = btn.innerHTML; App.util.toggleLoading(btn, true);
            try {
                const result = await App.api.fetch({ _action: 'import_contacts', contacts: toImport });
                if (result.status === "success") { alert(`Succes! ${result.importedCount} toegevoegd.`); App.dom.syncModal.classList.add('hidden'); App.ui.toggleGlobalLoading(true); App.handlers.loadArtists(); } else { alert("Fout: " + result.message); }
            } catch (e) { alert("Importeren mislukt."); } finally { App.util.toggleLoading(btn, false, orig); }
        },
        openMailingModal() {
            App.state.mailingRecipients = App.state.currentFilteredData.filter(a => a.email && a.email !== '-' && !a.unsubscribed && !a.blacklist).map(a => ({ email: a.email, name: a.artistName !== '-' ? a.artistName : a.firstName }));
            App.dom.mailingCount.innerText = App.state.mailingRecipients.length;
            const hasRecipients = App.state.mailingRecipients.length > 0;
            App.dom.btnMailingTest.disabled = !hasRecipients; App.dom.btnMailingSend.disabled = !hasRecipients;
            App.dom.btnMailingSend.classList.toggle('opacity-50', !hasRecipients); App.dom.btnMailingSend.classList.toggle('cursor-not-allowed', !hasRecipients);
            App.dom.mailingSubject.value = ''; App.dom.mailingBody.value = ''; App.dom.mailingModal.classList.remove('hidden'); lucide.createIcons();
        },
        async sendMailing(isTest) {
            const subject = App.dom.mailingSubject.value.trim(); const message = App.dom.mailingBody.value.trim();
            if (!subject || !message) { alert("Vul onderwerp en bericht in."); return; }
            if (App.state.mailingRecipients.length === 0) return;
            if (!confirm(isTest ? "TEST: Stuur 1 mail naar halfhide@gmail.com?" : `Weet je zeker dat je ${App.state.mailingRecipients.length} mails wilt sturen?`)) return;
            const btn = isTest ? App.dom.btnMailingTest : App.dom.btnMailingSend; const orig = btn.innerHTML; App.util.toggleLoading(btn, true);
            try {
                const result = await App.api.fetch({ _action: 'send_mailing', recipients: isTest ? [App.state.mailingRecipients[0]] : App.state.mailingRecipients, subject, message, testMode: isTest, testEmail: 'halfhide@gmail.com' });
                if (result.status === "success") { alert(`Gelukt! ${result.sentCount} mail(s) verzonden.`); if (!isTest) App.dom.mailingModal.classList.add('hidden'); } else { alert("Fout: " + result.message); }
            } catch (e) { alert("Verzenden mislukt."); } finally { App.util.toggleLoading(btn, false, orig); }
        },
        openPhotoModal() {
            App.dom.photoModal.classList.remove('hidden'); App.dom.photoStep1.classList.remove('hidden'); App.dom.photoStep2.classList.add('hidden'); App.dom.photoModalFooter.classList.add('hidden'); App.dom.driveFolderUrl.value = ''; App.dom.photoMatchesBody.innerHTML = ''; App.state.scannedMatches = []; lucide.createIcons();
        },
        async scanFolder() {
            const url = App.dom.driveFolderUrl.value; if(!url) { alert("Plak eerst een link!"); return; }
            const btn = App.dom.btnScanFolder; const orig = btn.innerHTML; App.util.toggleLoading(btn, true);
            try {
                const result = await App.api.fetch({ _action: 'scan_folder', folderUrl: url });
                if (result.status === "success") { App.state.scannedMatches = result.matches; App.ui.renderMatches(); App.dom.photoStep1.classList.add('hidden'); App.dom.photoStep2.classList.remove('hidden'); App.dom.photoModalFooter.classList.remove('hidden'); } else { alert("Fout: " + result.message); }
            } catch (e) { alert("Scan mislukt."); } finally { App.util.toggleLoading(btn, false, orig); }
        },
        resolveMultipleMatch(index, selectElement) {
            let cb = App.util.getEl(`match-cb-${index}`); let row = App.util.getEl(`match-row-${index}`); let val = selectElement.value;
            if (val === "") { cb.checked = false; cb.disabled = true; row.classList.add('bg-orange-50/30'); App.state.scannedMatches[index].selected = false; } else {
                let chosen = App.state.scannedMatches[index].candidates[val]; App.state.scannedMatches[index].artistName = chosen.artistName; App.state.scannedMatches[index].email = chosen.email;
                if (chosen.email && chosen.email !== '-') { cb.disabled = false; cb.checked = true; App.state.scannedMatches[index].selected = true; selectElement.classList.replace('border-orange-300', 'border-green-300'); selectElement.classList.replace('bg-orange-50', 'bg-green-50'); row.classList.remove('bg-orange-50/30'); } 
                else { cb.checked = false; cb.disabled = true; App.state.scannedMatches[index].selected = false; alert("Geen geldig e-mailadres."); }
            }
        },
        async sendPhotos() {
            App.state.scannedMatches.forEach((m, idx) => { const cb = App.util.getEl(`match-cb-${idx}`); m.selected = cb ? cb.checked : false; });
            const toSend = App.state.scannedMatches.filter(m => m.selected); if(toSend.length === 0) { alert("Geen vinkjes gezet!"); return; }
            if(!confirm(`Stuur e-mail naar ${toSend.length} artiest(en)?`)) return;
            const btn = App.dom.btnSendPhotos; const orig = btn.innerHTML; App.util.toggleLoading(btn, true);
            try {
                const result = await App.api.fetch({ _action: 'send_emails', matches: App.state.scannedMatches });
                if (result.status === "success") { alert(`Gelukt! ${result.sentCount} e-mails verstuurd.`); App.dom.photoModal.classList.add('hidden'); } else { alert("Fout: " + result.message); }
            } catch (e) { alert("Verzenden mislukt."); } finally { App.util.toggleLoading(btn, false, orig); }
        }
    },
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            // Cache DOM
            const ids = [
                'search-input', 'filter-region', 'filter-type', 'filter-bookable',
                'btn-open-sync', 'btn-open-mailing', 'btn-open-photo', 'btn-open-add',
                'btn-sync-start', 'sync-select-all', 'btn-import-contacts',
                'btn-mailing-test', 'btn-mailing-send', 'btn-scan-folder', 'btn-send-photos',
                'btn-save-contact', 'artist-table-body', 'empty-state', 'contact-count',
                'loading-state', 'sync-modal', 'sync-step-1', 'sync-step-2', 'sync-modal-footer',
                'sync-contacts-body', 'mailing-modal', 'mailing-count', 'mailing-subject', 'mailing-body',
                'photo-modal', 'photo-step-1', 'photo-step-2', 'photo-modal-footer', 'drive-folder-url',
                'photo-matches-body', 'contact-modal', 'new-contact-form', 'modal-title'
            ];
            ids.forEach(id => App.dom[id.replace(/-./g, x=>x[1].toUpperCase())] = App.util.getEl(id));

            // Bind Events
            App.dom.searchInput.addEventListener('input', App.handlers.applyFilters);
            App.dom.filterRegion.addEventListener('change', App.handlers.applyFilters);
            App.dom.filterType.addEventListener('change', App.handlers.applyFilters);
            App.dom.filterBookable.addEventListener('change', App.handlers.applyFilters);

            App.dom.btnOpenSync.addEventListener('click', App.handlers.openSyncModal);
            App.dom.btnOpenMailing.addEventListener('click', App.handlers.openMailingModal);
            App.dom.btnOpenPhoto.addEventListener('click', App.handlers.openPhotoModal);
            App.dom.btnOpenAdd.addEventListener('click', () => App.handlers.openContactModal());

            App.dom.btnSyncStart.addEventListener('click', App.handlers.fetchGoogleContacts);
            App.dom.syncSelectAll.addEventListener('change', (e) => App.handlers.toggleAllSyncCheckboxes(e.target));
            App.dom.btnImportContacts.addEventListener('click', App.handlers.importSelectedContacts);
            
            App.dom.btnMailingTest.addEventListener('click', () => App.handlers.sendMailing(true));
            App.dom.btnMailingSend.addEventListener('click', () => App.handlers.sendMailing(false));
            
            App.dom.btnScanFolder.addEventListener('click', App.handlers.scanFolder);
            App.dom.btnSendPhotos.addEventListener('click', App.handlers.sendPhotos);
            
            App.dom.btnSaveContact.addEventListener('click', App.handlers.submitContactForm);

            document.querySelectorAll('[data-close]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const modalId = btn.getAttribute('data-close');
                    App.util.getEl(modalId).classList.add('hidden');
                    if (modalId === 'contact-modal') App.state.currentEditRowIndex = null;
                });
            });

            // Delegated Events
            App.dom.artistTableBody.addEventListener('click', (e) => {
                const btnEdit = e.target.closest('.btn-edit');
                const btnDelete = e.target.closest('.btn-delete');
                const noteToggle = e.target.closest('.note-toggle');

                if (btnEdit) App.handlers.openContactModal(parseInt(btnEdit.dataset.index));
                if (btnDelete) App.handlers.deleteContact(parseInt(btnDelete.dataset.index));
                if (noteToggle) App.ui.toggleNote(noteToggle);
            });

            App.dom.photoMatchesBody.addEventListener('change', (e) => {
                if (e.target.classList.contains('match-resolver')) {
                    App.handlers.resolveMultipleMatch(parseInt(e.target.dataset.index), e.target);
                }
            });

            // Initial Load
            lucide.createIcons();
            App.handlers.loadArtists();
        });
    }
};
App.init();