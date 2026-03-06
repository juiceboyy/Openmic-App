import { state, isTrue } from './modules/state.js';
import { apiRequest, fetchArtistsData } from './modules/api.js';
import { ui } from './modules/ui.js';
import { getEl, toggleButtonLoading } from './modules/utils.js';
import { photoModalTemplate, contactModalTemplate, syncModalTemplate, mailingModalTemplate } from './modules/templates.js';

// --- Application Logic ---

async function loadArtists() {
    const loadingState = getEl('loading-state');
    try {
        const data = await fetchArtistsData();
        state.allArtists = data.map(row => ({
            rowIndex: row.rowIndex, 
            firstName: String(row['Voornaam'] || '-'), 
            lastName: String(row['Achternaam'] || '-'), 
            artistName: String(row['Artiestennaam'] || '-'),
            email: String(row['E-mailadres'] || '-'), 
            phone: String(row['Telefoonnummer'] || '-'), 
            instagram: String(row['Instagram account'] || '-'),
            bookable: isTrue(row['Boekbaar (Ja/Nee)']), 
            favGijs: isTrue(row['Favoriet Gijs (Ja/Nee)']), 
            favRo: isTrue(row['Favoriet Ro (Ja/Nee)']),
            setLength: String(row['Speelduur'] || '-'), 
            regionDH: isTrue(row['Regio Den Haag']), 
            regionRdam: isTrue(row['Regio Rotterdam']),
            workshops: isTrue(row['Interesse in workshops (Ja/Nee)']), 
            workshop7Nov: isTrue(row['Workshop 7 nov (Ja/Nee)']),
            unsubscribed: isTrue(row['Unsubscribed (Ja/Nee)']), 
            type: String(row['Soort contact'] || '-').trim(),
            blacklist: isTrue(row['Blacklist (Ja/Nee)']), 
            notes: String(row['Notities'] || '-')
        }));
        
        ui.toggleGlobalLoading(loadingState, false);
        applyFilters();
    } catch (error) { 
        console.error(error);
        loadingState.innerHTML = `<p class="text-sm font-medium text-red-500">Er is een fout opgetreden bij het laden.</p>`; 
    }
}

function applyFilters() {
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

    // Construct elements object for UI
    const domElements = {
        artistTableBody: getEl('artist-table-body'),
        emptyState: getEl('empty-state'),
        contactCount: getEl('contact-count')
    };
    ui.renderTable(state.currentFilteredData, domElements);
}

// --- Modal & Form Handlers ---

function openContactModal(rowIndex = null) {
    const newContactForm = getEl('new-contact-form');
    const modalTitle = getEl('modal-title');
    const contactModal = getEl('contact-modal');
    
    newContactForm.reset(); 
    state.currentEditRowIndex = rowIndex;

    if (rowIndex !== null) {
        modalTitle.innerHTML = `<i data-lucide="edit-2" class="w-5 h-5 text-apple-blue mr-2"></i> Contact Bewerken`;
        const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
        if (artist) {
            newContactForm.elements['Voornaam'].value = artist.firstName; 
            newContactForm.elements['Achternaam'].value = artist.lastName; 
            newContactForm.elements['Artiestennaam'].value = artist.artistName !== '-' ? artist.artistName : ''; 
            newContactForm.elements['E-mailadres'].value = artist.email !== '-' ? artist.email : ''; 
            newContactForm.elements['Telefoonnummer'].value = artist.phone !== '-' ? artist.phone : ''; 
            newContactForm.elements['Instagram account'].value = artist.instagram !== '-' ? artist.instagram : ''; 
            newContactForm.elements['Soort contact'].value = artist.type !== '-' ? artist.type : 'Artiest'; 
            newContactForm.elements['Speelduur'].value = artist.setLength !== '-' ? artist.setLength : ''; 
            newContactForm.elements['Notities'].value = artist.notes !== '-' ? artist.notes : '';
            
            newContactForm.elements['Regio Den Haag'].checked = artist.regionDH; 
            newContactForm.elements['Regio Rotterdam'].checked = artist.regionRdam; 
            newContactForm.elements['Boekbaar (Ja/Nee)'].checked = artist.bookable; 
            newContactForm.elements['Favoriet Gijs (Ja/Nee)'].checked = artist.favGijs; 
            newContactForm.elements['Favoriet Ro (Ja/Nee)'].checked = artist.favRo; 
            newContactForm.elements['Interesse in workshops (Ja/Nee)'].checked = artist.workshops; 
            newContactForm.elements['Workshop 7 nov (Ja/Nee)'].checked = artist.workshop7Nov; 
            newContactForm.elements['Unsubscribed (Ja/Nee)'].checked = artist.unsubscribed; 
            newContactForm.elements['Blacklist (Ja/Nee)'].checked = artist.blacklist;
        }
    } else { 
        modalTitle.innerHTML = '<i data-lucide="user-plus" class="w-5 h-5 text-apple-blue mr-2"></i> Nieuw Contact Toevoegen'; 
    }
    
    contactModal.classList.remove('hidden'); 
    lucide.createIcons();
}

function closeModal(modalId) {
    if (!modalId) return;
    getEl(modalId).classList.add('hidden');
    if (modalId === 'contact-modal') state.currentEditRowIndex = null;
}

async function submitContactForm() {
    const btn = getEl('btn-save-contact'); 
    const orig = btn.innerHTML; 
    toggleButtonLoading(btn, true);
    
    const form = getEl('new-contact-form');
    const payload = {}; 
    
    for (let [key, value] of new FormData(form).entries()) { 
        payload[key] = value === 'on' ? true : (value || "-"); 
    }
    
    const checkboxes = ["Regio Den Haag", "Regio Rotterdam", "Boekbaar (Ja/Nee)", "Favoriet Gijs (Ja/Nee)", "Favoriet Ro (Ja/Nee)", "Interesse in workshops (Ja/Nee)", "Workshop 7 nov (Ja/Nee)", "Unsubscribed (Ja/Nee)", "Blacklist (Ja/Nee)"];
    checkboxes.forEach(f => { if (!payload.hasOwnProperty(f)) payload[f] = false; });
    
    payload._action = state.currentEditRowIndex !== null ? 'edit' : 'add'; 
    if(state.currentEditRowIndex) payload._rowIndex = state.currentEditRowIndex;
    
    try {
        const data = await apiRequest(payload);
        if (data.status === "success") { 
            getEl('contact-modal').classList.add('hidden'); 
            ui.toggleGlobalLoading(getEl('loading-state'), true); 
            loadArtists(); 
        } else { 
            alert("Fout: " + data.message); 
        }
    } catch (e) { 
        alert("Kon niet opslaan."); 
    } finally { 
        toggleButtonLoading(btn, false, orig); 
    }
}

async function deleteContact(rowIndex) {
    if (!confirm("Zeker weten?")) return;
    ui.toggleGlobalLoading(getEl('loading-state'), true);
    try {
        const res = await apiRequest({ _action: 'delete', _rowIndex: rowIndex });
        if (res.status === "success") loadArtists();
    } catch (e) { 
        alert("Fout bij verwijderen."); 
        ui.toggleGlobalLoading(getEl('loading-state'), false); 
    }
}

// --- Sync Logic ---

function openSyncModal() {
    getEl('sync-modal').classList.remove('hidden'); 
    getEl('sync-step-1').classList.remove('hidden'); 
    getEl('sync-step-2').classList.add('hidden'); 
    getEl('sync-modal-footer').classList.add('hidden'); 
    getEl('sync-contacts-body').innerHTML = ''; 
    state.fetchedSyncContacts = []; 
    lucide.createIcons();
}

async function fetchGoogleContacts() {
    const btn = getEl('btn-sync-start'); 
    const orig = btn.innerHTML; 
    toggleButtonLoading(btn, true);
    try {
        const result = await apiRequest({ _action: 'fetch_google_contacts' });
        if (result.status === "success") {
            state.fetchedSyncContacts = result.contacts; 
            ui.renderSyncContacts(state.fetchedSyncContacts, {
                syncContactsBody: getEl('sync-contacts-body'),
                btnImportContacts: getEl('btn-import-contacts')
            });
            getEl('sync-step-1').classList.add('hidden'); 
            getEl('sync-step-2').classList.remove('hidden'); 
            getEl('sync-modal-footer').classList.remove('hidden');
        } else { 
            alert("Fout bij ophalen: " + result.message); 
        }
    } catch (e) { 
        alert("Kon contacten niet ophalen."); 
    } finally { 
        toggleButtonLoading(btn, false, orig); 
    }
}

function toggleAllSyncCheckboxes(source) {
    document.querySelectorAll('.sync-checkbox').forEach(cb => cb.checked = source.checked);
}

async function importSelectedContacts() {
    const toImport = []; 
    state.fetchedSyncContacts.forEach((c, idx) => { 
        if(getEl(`sync-cb-${idx}`).checked) { toImport.push(c); } 
    });
    
    if(toImport.length === 0) { alert("Selecteer minstens één contact."); return; }
    
    const btn = getEl('btn-import-contacts'); 
    const orig = btn.innerHTML; 
    toggleButtonLoading(btn, true);
    
    try {
        const result = await apiRequest({ _action: 'import_contacts', contacts: toImport });
        if (result.status === "success") { 
            alert(`Succes! ${result.importedCount} toegevoegd.`); 
            getEl('sync-modal').classList.add('hidden'); 
            ui.toggleGlobalLoading(getEl('loading-state'), true); 
            loadArtists(); 
        } else { 
            alert("Fout: " + result.message); 
        }
    } catch (e) { 
        alert("Importeren mislukt."); 
    } finally { 
        toggleButtonLoading(btn, false, orig); 
    }
}

// --- Mailing Logic ---

function openMailingModal() {
    state.mailingRecipients = state.currentFilteredData
        .filter(a => a.email && a.email !== '-' && !a.unsubscribed && !a.blacklist)
        .map(a => ({ email: a.email, name: a.artistName !== '-' ? a.artistName : a.firstName }));
    
    getEl('mailing-count').innerText = state.mailingRecipients.length;
    const hasRecipients = state.mailingRecipients.length > 0;
    
    const btnTest = getEl('btn-mailing-test');
    const btnSend = getEl('btn-mailing-send');
    
    btnTest.disabled = !hasRecipients; 
    btnSend.disabled = !hasRecipients;
    btnSend.classList.toggle('opacity-50', !hasRecipients); 
    btnSend.classList.toggle('cursor-not-allowed', !hasRecipients);
    
    getEl('mailing-subject').value = ''; 
    getEl('mailing-body').value = ''; 
    getEl('mailing-modal').classList.remove('hidden'); 
    lucide.createIcons();
}

async function sendMailing(isTest) {
    const subject = getEl('mailing-subject').value.trim(); 
    const message = getEl('mailing-body').value.trim();
    
    if (!subject || !message) { alert("Vul onderwerp en bericht in."); return; }
    if (state.mailingRecipients.length === 0) return;
    if (!confirm(isTest ? "TEST: Stuur 1 mail naar halfhide@gmail.com?" : `Weet je zeker dat je ${state.mailingRecipients.length} mails wilt sturen?`)) return;
    
    const btn = isTest ? getEl('btn-mailing-test') : getEl('btn-mailing-send'); 
    const orig = btn.innerHTML; 
    toggleButtonLoading(btn, true);
    
    try {
        const result = await apiRequest({ 
            _action: 'send_mailing', 
            recipients: isTest ? [state.mailingRecipients[0]] : state.mailingRecipients, 
            subject, 
            message, 
            testMode: isTest, 
            testEmail: 'halfhide@gmail.com' 
        });
        if (result.status === "success") { 
            alert(`Gelukt! ${result.sentCount} mail(s) verzonden.`); 
            if (!isTest) getEl('mailing-modal').classList.add('hidden'); 
        } else { 
            alert("Fout: " + result.message); 
        }
    } catch (e) { 
        alert("Verzenden mislukt."); 
    } finally { 
        toggleButtonLoading(btn, false, orig); 
    }
}

// --- Photo Logic ---

function openPhotoModal() {
    getEl('photo-modal').classList.remove('hidden'); 
    getEl('photo-step-1').classList.remove('hidden'); 
    getEl('photo-step-2').classList.add('hidden'); 
    getEl('photo-modal-footer').classList.add('hidden'); 
    getEl('drive-folder-url').value = ''; 
    getEl('photo-matches-body').innerHTML = ''; 
    state.scannedMatches = []; 
    lucide.createIcons();
}

async function scanFolder() {
    const url = getEl('drive-folder-url').value; 
    if(!url) { alert("Plak eerst een link!"); return; }
    
    const btn = getEl('btn-scan-folder'); 
    const orig = btn.innerHTML; 
    toggleButtonLoading(btn, true);
    
    try {
        const result = await apiRequest({ _action: 'scan_folder', folderUrl: url });
        if (result.status === "success") { 
            state.scannedMatches = result.matches; 
            ui.renderMatches(state.scannedMatches, { photoMatchesBody: getEl('photo-matches-body') }); 
            getEl('photo-step-1').classList.add('hidden'); 
            getEl('photo-step-2').classList.remove('hidden'); 
            getEl('photo-modal-footer').classList.remove('hidden'); 
        } else { 
            alert("Fout: " + result.message); 
        }
    } catch (e) { 
        alert("Scan mislukt."); 
    } finally { 
        toggleButtonLoading(btn, false, orig); 
    }
}

function resolveMultipleMatch(index, selectElement) {
    let cb = getEl(`match-cb-${index}`); 
    let row = getEl(`match-row-${index}`); 
    let val = selectElement.value;
    
    if (val === "") { 
        cb.checked = false; 
        cb.disabled = true; 
        row.classList.add('bg-orange-50/30'); 
        state.scannedMatches[index].selected = false; 
    } else {
        let chosen = state.scannedMatches[index].candidates[val]; 
        state.scannedMatches[index].artistName = chosen.artistName; 
        state.scannedMatches[index].email = chosen.email;
        
        if (chosen.email && chosen.email !== '-') { 
            cb.disabled = false; 
            cb.checked = true; 
            state.scannedMatches[index].selected = true; 
            selectElement.classList.replace('border-orange-300', 'border-green-300'); 
            selectElement.classList.replace('bg-orange-50', 'bg-green-50'); 
            row.classList.remove('bg-orange-50/30'); 
        } else { 
            cb.checked = false; 
            cb.disabled = true; 
            state.scannedMatches[index].selected = false; 
            alert("Geen geldig e-mailadres."); 
        }
    }
}

async function sendPhotos() {
    state.scannedMatches.forEach((m, idx) => { 
        const cb = getEl(`match-cb-${idx}`); 
        m.selected = cb ? cb.checked : false; 
    });
    
    const toSend = state.scannedMatches.filter(m => m.selected); 
    if(toSend.length === 0) { alert("Geen vinkjes gezet!"); return; }
    if(!confirm(`Stuur e-mail naar ${toSend.length} artiest(en)?`)) return;
    
    const btn = getEl('btn-send-photos'); 
    const orig = btn.innerHTML; 
    toggleButtonLoading(btn, true);
    
    try {
        const result = await apiRequest({ _action: 'send_emails', matches: state.scannedMatches });
        if (result.status === "success") { 
            alert(`Gelukt! ${result.sentCount} e-mails verstuurd.`); 
            getEl('photo-modal').classList.add('hidden'); 
        } else { 
            alert("Fout: " + result.message); 
        }
    } catch (e) { 
        alert("Verzenden mislukt."); 
    } finally { 
        toggleButtonLoading(btn, false, orig); 
    }
}

// --- Window Expose (For inline handlers if needed) ---

window.openModal = openContactModal;
window.closeModal = closeModal;
window.submitForm = submitContactForm;
window.deleteContact = deleteContact;
window.toggleNote = ui.toggleNote; // Using UI module directly

window.openSyncModal = openSyncModal;
window.fetchGoogleContacts = fetchGoogleContacts;
window.importSelectedContacts = importSelectedContacts;

window.openMailingModal = openMailingModal;
window.sendMailing = sendMailing;

window.openPhotoModal = openPhotoModal;
window.scanFolder = scanFolder;
window.sendPhotos = sendPhotos;
window.resolveMultipleMatch = resolveMultipleMatch;

// --- Initialization ---

async function initApp() {
    // Inject Templates
    document.body.insertAdjacentHTML('beforeend', photoModalTemplate);
    document.body.insertAdjacentHTML('beforeend', contactModalTemplate);
    document.body.insertAdjacentHTML('beforeend', syncModalTemplate);
    document.body.insertAdjacentHTML('beforeend', mailingModalTemplate);

    // Attach listeners to elements from the templates now that they exist
    getEl('btn-sync-start').addEventListener('click', fetchGoogleContacts);
    getEl('sync-select-all').addEventListener('change', (e) => toggleAllSyncCheckboxes(e.target));
    getEl('btn-import-contacts').addEventListener('click', importSelectedContacts);
    
    getEl('btn-mailing-test').addEventListener('click', () => sendMailing(true));
    getEl('btn-mailing-send').addEventListener('click', () => sendMailing(false));
    
    getEl('btn-scan-folder').addEventListener('click', scanFolder);
    getEl('btn-send-photos').addEventListener('click', sendPhotos);
    
    getEl('btn-save-contact').addEventListener('click', submitContactForm);

    // Generic Close Buttons for modals
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close')));
    });

    // Delegated Events for Photo Matches (inside a modal)
    getEl('photo-matches-body').addEventListener('change', (e) => {
        if (e.target.classList.contains('match-resolver')) {
            resolveMultipleMatch(parseInt(e.target.dataset.index), e.target);
        }
    });

    lucide.createIcons();
    await loadArtists();
}

document.addEventListener('DOMContentLoaded', () => {
    // Attach listeners to static elements (always present in index.html)
    getEl('search-input').addEventListener('input', applyFilters);
    getEl('filter-region').addEventListener('change', applyFilters);
    getEl('filter-type').addEventListener('change', applyFilters);
    getEl('filter-bookable').addEventListener('change', applyFilters);

    getEl('btn-open-sync').addEventListener('click', openSyncModal);
    getEl('btn-open-mailing').addEventListener('click', openMailingModal);
    getEl('btn-open-photo').addEventListener('click', openPhotoModal);
    getEl('btn-open-add').addEventListener('click', () => openContactModal());

    // Delegated Events for Table (static container)
    getEl('artist-table-body').addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');
        const noteToggle = e.target.closest('.note-toggle');

        if (btnEdit) openContactModal(parseInt(btnEdit.dataset.index));
        if (btnDelete) deleteContact(parseInt(btnDelete.dataset.index));
        if (noteToggle) ui.toggleNote(noteToggle);
    });

    // Start the app initialization process
    initApp();
});
