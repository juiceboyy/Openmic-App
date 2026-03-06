import { getEl } from './modules/utils.js';
import { photoModalTemplate, contactModalTemplate, syncModalTemplate, mailingModalTemplate, lineupModalTemplate } from './modules/templates.js';
import * as UI from './modules/uiHandler.js';
import * as Contact from './modules/contactsHandler.js';
import * as Sync from './modules/syncHandler.js';
import * as Mailing from './modules/mailingHandler.js';
import * as Photo from './modules/photoHandler.js';
import * as Lineup from './modules/lineupHandler.js';

// --- Initialization ---

async function initApp() {
    // Inject Templates
    document.body.insertAdjacentHTML('beforeend', photoModalTemplate);
    document.body.insertAdjacentHTML('beforeend', contactModalTemplate);
    document.body.insertAdjacentHTML('beforeend', syncModalTemplate);
    document.body.insertAdjacentHTML('beforeend', mailingModalTemplate);
    document.body.insertAdjacentHTML('beforeend', lineupModalTemplate);

    // Attach listeners to elements from the templates now that they exist
    getEl('btn-sync-start').addEventListener('click', Sync.fetchGoogleContacts);
    getEl('sync-select-all').addEventListener('change', (e) => Sync.toggleAllSyncCheckboxes(e.target));
    getEl('btn-import-contacts').addEventListener('click', Sync.importSelectedContacts);
    
    getEl('btn-mailing-test').addEventListener('click', () => Mailing.sendMailing(true));
    getEl('btn-mailing-send').addEventListener('click', () => Mailing.sendMailing(false));
    
    getEl('btn-scan-folder').addEventListener('click', Photo.scanFolder);
    getEl('btn-send-photos').addEventListener('click', Photo.sendPhotos);
    
    getEl('btn-save-contact').addEventListener('click', Contact.submitForm);

    // Generic Close Buttons for modals
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-close');
            if(id === 'contact-modal') Contact.closeModal('contact-modal');
            if(id === 'sync-modal') Sync.closeSyncModal('sync-modal');
            if(id === 'mailing-modal') Mailing.closeMailingModal('mailing-modal');
            if(id === 'photo-modal') Photo.closePhotoModal('photo-modal');
        });
    });

    // Delegated Events for Photo Matches (inside a modal)
    getEl('photo-matches-body').addEventListener('change', (e) => {
        if (e.target.classList.contains('match-resolver')) {
            Photo.resolveMultipleMatch(parseInt(e.target.dataset.index), e.target);
        }
    });

    lucide.createIcons();
    await UI.loadArtists();
}

document.addEventListener('DOMContentLoaded', () => {
    // Attach listeners to static elements (always present in index.html)
    getEl('search-input').addEventListener('input', UI.applyFilters);
    getEl('filter-region').addEventListener('change', UI.applyFilters);
    getEl('filter-type').addEventListener('change', UI.applyFilters);
    getEl('filter-bookable').addEventListener('change', UI.applyFilters);

    getEl('btn-open-sync').addEventListener('click', Sync.openSyncModal);
    getEl('btn-open-mailing').addEventListener('click', Mailing.openMailingModal);
    getEl('btn-open-photo').addEventListener('click', Photo.openPhotoModal);
    getEl('btn-open-add').addEventListener('click', () => Contact.openModal());

    // Delegated Events for Table (static container)
    getEl('artist-table-body').addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');
        const noteToggle = e.target.closest('.note-toggle');

        if (btnEdit) Contact.openModal(parseInt(btnEdit.dataset.index));
        if (btnDelete) Contact.deleteContact(parseInt(btnDelete.dataset.index));
        if (noteToggle) UI.toggleNote(noteToggle);
    });

    // Start the app initialization process
    initApp();
});

// --- Window Expose (For inline handlers if needed) ---
window.openModal = Contact.openModal;
window.closeModal = (id) => {
    if(id === 'contact-modal') Contact.closeModal('contact-modal');
    if(id === 'sync-modal') Sync.closeSyncModal('sync-modal');
    if(id === 'mailing-modal') Mailing.closeMailingModal('mailing-modal');
    if(id === 'photo-modal') Photo.closePhotoModal('photo-modal');
};
window.submitForm = Contact.submitForm;
window.deleteContact = Contact.deleteContact;
window.toggleNote = UI.toggleNote; 

window.openSyncModal = Sync.openSyncModal;
window.fetchGoogleContacts = Sync.fetchGoogleContacts;
window.importSelectedContacts = Sync.importSelectedContacts;

window.openMailingModal = Mailing.openMailingModal;
window.sendMailing = Mailing.sendMailing;

window.openPhotoModal = Photo.openPhotoModal;
window.scanFolder = Photo.scanFolder;
window.sendPhotos = Photo.sendPhotos;
window.resolveMultipleMatch = Photo.resolveMultipleMatch;

window.openLineupModal = Lineup.openLineupModal;
window.closeLineupModal = Lineup.closeLineupModal;
window.addArtistToLineup = Lineup.addArtistToLineup;
window.removeArtistFromLineup = Lineup.removeArtistFromLineup;
window.moveArtistUp = Lineup.moveArtistUp;
window.moveArtistDown = Lineup.moveArtistDown;
window.saveLineupToDatabase = Lineup.saveLineupToDatabase;
