import { getEl, isTrue, toggleButtonLoading } from './modules/utils.js';
import { api } from './modules/api.js';
import { ui } from './modules/ui.js';
import { photoModalTemplate, contactModalTemplate } from './modules/templates.js';

const App = {
    state: {
        allArtists: [],
        currentFilteredData: [],
        currentEditRowIndex: null,
        scannedMatches: [],
        fetchedSyncContacts: [],
        mailingRecipients: [],
    },
    dom: {},
    handlers: {
        async loadArtists() {
            try {
                const data = await api.fetch();
                App.state.allArtists = data.map(row => ({
                    rowIndex: row.rowIndex, 
                    firstName: String(row['Voornaam'] || '-'), lastName: String(row['Achternaam'] || '-'), artistName: String(row['Artiestennaam'] || '-'),
                    email: String(row['E-mailadres'] || '-'), phone: String(row['Telefoonnummer'] || '-'), instagram: String(row['Instagram account'] || '-'),
                    bookable: isTrue(row['Boekbaar (Ja/Nee)']), favGijs: isTrue(row['Favoriet Gijs (Ja/Nee)']), favRo: isTrue(row['Favoriet Ro (Ja/Nee)']),
                    setLength: String(row['Speelduur'] || '-'), regionDH: isTrue(row['Regio Den Haag']), regionRdam: isTrue(row['Regio Rotterdam']),
                    workshops: isTrue(row['Interesse in workshops (Ja/Nee)']), workshop7Nov: isTrue(row['Workshop 7 nov (Ja/Nee)']),
                    unsubscribed: isTrue(row['Unsubscribed (Ja/Nee)']), type: String(row['Soort contact'] || '-').trim(),
                    blacklist: isTrue(row['Blacklist (Ja/Nee)']), notes: String(row['Notities'] || '-')
                }));
                ui.toggleGlobalLoading(App.dom.loadingState, false);
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
            ui.renderTable(App.state.currentFilteredData, App.dom);
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
            const btn = App.dom.btnSaveContact; const orig = btn.innerHTML; toggleButtonLoading(btn, true);
            const payload = {}; for (let [key, value] of new FormData(App.dom.newContactForm).entries()) { payload[key] = value === 'on' ? true : (value || "-"); }
            ["Regio Den Haag", "Regio Rotterdam", "Boekbaar (Ja/Nee)", "Favoriet Gijs (Ja/Nee)", "Favoriet Ro (Ja/Nee)", "Interesse in workshops (Ja/Nee)", "Workshop 7 nov (Ja/Nee)", "Unsubscribed (Ja/Nee)", "Blacklist (Ja/Nee)"].forEach(f => { if (!payload.hasOwnProperty(f)) payload[f] = false; });
            payload._action = App.state.currentEditRowIndex !== null ? 'edit' : 'add'; if(App.state.currentEditRowIndex) payload._rowIndex = App.state.currentEditRowIndex;
            try {
                const data = await api.fetch(payload);
                if (data.status === "success") { App.dom.contactModal.classList.add('hidden'); ui.toggleGlobalLoading(App.dom.loadingState, true); App.handlers.loadArtists(); } else { alert("Fout: " + data.message); }
            } catch (e) { alert("Kon niet opslaan."); } finally { toggleButtonLoading(btn, false, orig); }
        },
        async deleteContact(rowIndex) {
            if (!confirm("Zeker weten?")) return;
            ui.toggleGlobalLoading(App.dom.loadingState, true);
            try {
                const res = await api.fetch({ _action: 'delete', _rowIndex: rowIndex });
                if (res.status === "success") App.handlers.loadArtists();
            } catch (e) { alert("Fout bij verwijderen."); ui.toggleGlobalLoading(App.dom.loadingState, false); }
        },
        openSyncModal() {
            App.dom.syncModal.classList.remove('hidden'); App.dom.syncStep1.classList.remove('hidden'); App.dom.syncStep2.classList.add('hidden'); App.dom.syncModalFooter.classList.add('hidden'); App.dom.syncContactsBody.innerHTML = ''; App.state.fetchedSyncContacts = []; lucide.createIcons();
        },
        async fetchGoogleContacts() {
            const btn = App.dom.btnSyncStart; const orig = btn.innerHTML; toggleButtonLoading(btn, true);
            try {
                const result = await api.fetch({ _action: 'fetch_google_contacts' });
                if (result.status === "success") {
                    App.state.fetchedSyncContacts = result.contacts; ui.renderSyncContacts(App.state.fetchedSyncContacts, App.dom);
                    App.dom.syncStep1.classList.add('hidden'); App.dom.syncStep2.classList.remove('hidden'); App.dom.syncModalFooter.classList.remove('hidden');
                } else { alert("Fout bij ophalen: " + result.message); }
            } catch (e) { alert("Kon contacten niet ophalen."); } finally { toggleButtonLoading(btn, false, orig); }
        },
        toggleAllSyncCheckboxes(source) {
            document.querySelectorAll('.sync-checkbox').forEach(cb => cb.checked = source.checked);
        },
        async importSelectedContacts() {
            const toImport = []; App.state.fetchedSyncContacts.forEach((c, idx) => { if(getEl(`sync-cb-${idx}`).checked) { toImport.push(c); } });
            if(toImport.length === 0) { alert("Selecteer minstens één contact."); return; }
            const btn = App.dom.btnImportContacts; const orig = btn.innerHTML; toggleButtonLoading(btn, true);
            try {
                const result = await api.fetch({ _action: 'import_contacts', contacts: toImport });
                if (result.status === "success") { alert(`Succes! ${result.importedCount} toegevoegd.`); App.dom.syncModal.classList.add('hidden'); ui.toggleGlobalLoading(App.dom.loadingState, true); App.handlers.loadArtists(); } else { alert("Fout: " + result.message); }
            } catch (e) { alert("Importeren mislukt."); } finally { toggleButtonLoading(btn, false, orig); }
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
            const btn = isTest ? App.dom.btnMailingTest : App.dom.btnMailingSend; const orig = btn.innerHTML; toggleButtonLoading(btn, true);
            try {
                const result = await api.fetch({ _action: 'send_mailing', recipients: isTest ? [App.state.mailingRecipients[0]] : App.state.mailingRecipients, subject, message, testMode: isTest, testEmail: 'halfhide@gmail.com' });
                if (result.status === "success") { alert(`Gelukt! ${result.sentCount} mail(s) verzonden.`); if (!isTest) App.dom.mailingModal.classList.add('hidden'); } else { alert("Fout: " + result.message); }
            } catch (e) { alert("Verzenden mislukt."); } finally { toggleButtonLoading(btn, false, orig); }
        },
        openPhotoModal() {
            App.dom.photoModal.classList.remove('hidden'); App.dom.photoStep1.classList.remove('hidden'); App.dom.photoStep2.classList.add('hidden'); App.dom.photoModalFooter.classList.add('hidden'); App.dom.driveFolderUrl.value = ''; App.dom.photoMatchesBody.innerHTML = ''; App.state.scannedMatches = []; lucide.createIcons();
        },
        async scanFolder() {
            const url = App.dom.driveFolderUrl.value; if(!url) { alert("Plak eerst een link!"); return; }
            const btn = App.dom.btnScanFolder; const orig = btn.innerHTML; toggleButtonLoading(btn, true);
            try {
                const result = await api.fetch({ _action: 'scan_folder', folderUrl: url });
                if (result.status === "success") { App.state.scannedMatches = result.matches; ui.renderMatches(App.state.scannedMatches, App.dom); App.dom.photoStep1.classList.add('hidden'); App.dom.photoStep2.classList.remove('hidden'); App.dom.photoModalFooter.classList.remove('hidden'); } else { alert("Fout: " + result.message); }
            } catch (e) { alert("Scan mislukt."); } finally { toggleButtonLoading(btn, false, orig); }
        },
        resolveMultipleMatch(index, selectElement) {
            let cb = getEl(`match-cb-${index}`); let row = getEl(`match-row-${index}`); let val = selectElement.value;
            if (val === "") { cb.checked = false; cb.disabled = true; row.classList.add('bg-orange-50/30'); App.state.scannedMatches[index].selected = false; } else {
                let chosen = App.state.scannedMatches[index].candidates[val]; App.state.scannedMatches[index].artistName = chosen.artistName; App.state.scannedMatches[index].email = chosen.email;
                if (chosen.email && chosen.email !== '-') { cb.disabled = false; cb.checked = true; App.state.scannedMatches[index].selected = true; selectElement.classList.replace('border-orange-300', 'border-green-300'); selectElement.classList.replace('bg-orange-50', 'bg-green-50'); row.classList.remove('bg-orange-50/30'); } 
                else { cb.checked = false; cb.disabled = true; App.state.scannedMatches[index].selected = false; alert("Geen geldig e-mailadres."); }
            }
        },
        async sendPhotos() {
            App.state.scannedMatches.forEach((m, idx) => { const cb = getEl(`match-cb-${idx}`); m.selected = cb ? cb.checked : false; });
            const toSend = App.state.scannedMatches.filter(m => m.selected); if(toSend.length === 0) { alert("Geen vinkjes gezet!"); return; }
            if(!confirm(`Stuur e-mail naar ${toSend.length} artiest(en)?`)) return;
            const btn = App.dom.btnSendPhotos; const orig = btn.innerHTML; toggleButtonLoading(btn, true);
            try {
                const result = await api.fetch({ _action: 'send_emails', matches: App.state.scannedMatches });
                if (result.status === "success") { alert(`Gelukt! ${result.sentCount} e-mails verstuurd.`); App.dom.photoModal.classList.add('hidden'); } else { alert("Fout: " + result.message); }
            } catch (e) { alert("Verzenden mislukt."); } finally { toggleButtonLoading(btn, false, orig); }
        }
    },
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            // Inject heavy modals dynamically to keep index.html clean
            document.body.insertAdjacentHTML('beforeend', photoModalTemplate);
            document.body.insertAdjacentHTML('beforeend', contactModalTemplate);

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
            ids.forEach(id => App.dom[id.replace(/-./g, x=>x[1].toUpperCase())] = getEl(id));

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
                    getEl(modalId).classList.add('hidden');
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
                if (noteToggle) ui.toggleNote(noteToggle);
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