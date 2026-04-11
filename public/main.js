import { getEl } from './modules/utils.js';
import { photoModalTemplate, contactModalTemplate, syncModalTemplate, mailingModalTemplate, lineupModalTemplate, lineupSearchModalTemplate, settingsModalTemplate } from './modules/templates.js';
import * as UI from './modules/uiHandler.js';
import * as Contact from './modules/contactsHandler.js';
import * as Sync from './modules/syncHandler.js';
import * as Mailing from './modules/mailingHandler.js';
import * as Photo from './modules/photoHandler.js';
import * as Lineup from './modules/lineupHandler.js';
import * as Theme from './modules/themeHandler.js';
import * as Settings from './modules/settingsHandler.js';
import { initAuth } from './modules/authHandler.js';

const App = {
    init() {
        // Initialiseer Mobile Drag & Drop Polyfill met auto-scroll
        MobileDragDrop.polyfill({
            dragImageTranslateOverride: MobileDragDrop.scrollBehaviourDragImageTranslateOverride
        });
        window.addEventListener('touchmove', function() {}, {passive: false});

        document.addEventListener('DOMContentLoaded', async () => {
            const host = window.location.hostname;
            if (host === 'localhost' || host.includes('development')) {
                getEl('dev-banner').classList.remove('hidden');
            }

            Theme.initTheme();
            
            // Inject Templates
            const templates = [photoModalTemplate, contactModalTemplate, syncModalTemplate, mailingModalTemplate, lineupModalTemplate, lineupSearchModalTemplate, settingsModalTemplate];
            templates.forEach(t => document.body.insertAdjacentHTML('beforeend', t));

            // Bind Static Events
            this.bindEvents();

            // Initial Load
            lucide.createIcons();
            initAuth(async () => {
                await UI.loadArtists();
            });
        });
    },

    bindEvents() {
        // Filter Events
        ['search-input', 'filter-region', 'filter-type', 'filter-bookable', 'filter-favs'].forEach(id => {
            const el = getEl(id);
            if (el) el.addEventListener(id === 'search-input' ? 'input' : 'change', UI.applyFilters);
        });

        // Select All mailing checkboxes (only visible/filtered rows)
        const selectAllEl = getEl('selectAllArtists');
        if (selectAllEl) {
            selectAllEl.addEventListener('change', (e) => {
                const checked = e.target.checked;
                document.querySelectorAll('#artist-table-body tr td:first-child input[type="checkbox"]').forEach(cb => {
                    if (cb.checked !== checked) {
                        cb.checked = checked;
                        cb.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            });
        }

        // Global Action Handler (Delegation for Navigation & Tools)
        document.body.addEventListener('click', (e) => {
            const actionElement = e.target.closest('[data-action]');
            if (!actionElement) return;
            
            const action = actionElement.dataset.action;
            if (action === 'toggleTheme') Theme.toggleTheme();
            else if (action === 'openSettings') Settings.openSettingsModal();
            else if (action === 'openSync') Sync.openSyncModal();
            else if (action === 'openMailing') Mailing.openMailingModal();
            else if (action === 'openLineup') {
                document.body.classList.add('speelschema-view');
                Lineup.openLineupModal();
            }
            else if (action === 'openPhoto') Photo.openPhotoModal();
            else if (action === 'openAddContact') Contact.openModal();
        });

        // Feature Specific Actions
        getEl('btn-sync-start').addEventListener('click', Sync.fetchGoogleContacts);
        getEl('sync-select-all').addEventListener('change', (e) => Sync.toggleAllSyncCheckboxes(e.target));
        getEl('btn-import-contacts').addEventListener('click', Sync.importSelectedContacts);
        
        getEl('btn-mailing-test').addEventListener('click', () => Mailing.sendMailing(true));
        getEl('btn-mailing-send').addEventListener('click', () => Mailing.sendMailing(false));
        getEl('btn-generate-ai').addEventListener('click', () => Mailing.generateMailingWithAI());
        
        getEl('btn-scan-folder').addEventListener('click', Photo.scanFolder);
        getEl('btn-send-photos').addEventListener('click', Photo.sendPhotos);
        
        getEl('btn-save-contact').addEventListener('click', Contact.submitForm);
        
        getEl('btn-save-settings').addEventListener('click', Settings.saveSettings);

        // Lineup Modal Actions
        getEl('btn-load-session').addEventListener('click', Lineup.loadCurrentSession);
        getEl('btn-check-history').addEventListener('click', Lineup.loadPreviousLineup);
        getEl('btn-clear-lineup').addEventListener('click', Lineup.clearLineup);
        getEl('btn-copy-lineup').addEventListener('click', Lineup.exportLineupToClipboard);
        getEl('btn-save-lineup').addEventListener('click', Lineup.saveLineupToDatabase);
        
        // Lineup Search Actions
        getEl('slot-search-input').addEventListener('input', Lineup.handleLineupSearch);
        getEl('btn-close-slot-search').addEventListener('click', Lineup.closeSlotSearch);

        const reserveContainer = getEl('reserve-list-container');
        if (reserveContainer) {
            reserveContainer.addEventListener('dragover', Lineup.handleDragOver);
            reserveContainer.addEventListener('dragenter', Lineup.handleDragEnter);
            reserveContainer.addEventListener('dragleave', Lineup.handleDragLeave);
            reserveContainer.addEventListener('drop', Lineup.handleDropOnReserve);
        }

        // Delegated Events (Table & Modals)
        getEl('artist-table-body').addEventListener('click', this.handleTableClick);
        getEl('photo-matches-body').addEventListener('change', this.handlePhotoMatchChange);
        
        // Close Buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(btn.getAttribute('data-close')));
        });

        // Handle Resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                Lineup.renderLineupUI();
            }, 250);
        });

        // Expose to Window for HTML inline calls (legacy support)
        this.exposeToWindow();
    },

    handleTableClick(e) {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');
        const noteToggle = e.target.closest('.note-toggle');

        if (btnEdit) Contact.openModal(parseInt(btnEdit.dataset.index));
        if (btnDelete) Contact.deleteContact(parseInt(btnDelete.dataset.index));
        if (noteToggle) UI.toggleNote(noteToggle);
    },

    handlePhotoMatchChange(e) {
        if (e.target.classList.contains('match-resolver')) {
            Photo.resolveMultipleMatch(parseInt(e.target.dataset.index), e.target);
        }
    },

    closeModal(id) {
        if(id === 'contact-modal') Contact.closeModal('contact-modal');
        if(id === 'sync-modal') Sync.closeSyncModal('sync-modal');
        if(id === 'mailing-modal') Mailing.closeMailingModal('mailing-modal');
        if(id === 'photo-modal') Photo.closePhotoModal('photo-modal');
        if(id === 'lineup-modal') {
            Lineup.closeLineupModal();
            document.body.classList.remove('speelschema-view');
        }
        if(id === 'settings-modal') Settings.closeSettingsModal();
    },

    exposeToWindow() {
        window.closeLineupModal = Lineup.closeLineupModal;
        window.loadCurrentSession = Lineup.loadCurrentSession;
        window.loadPreviousLineup = Lineup.loadPreviousLineup;
        window.selectLineupArtist = Lineup.selectLineupArtist;
        window.openSlotSearch = Lineup.openSlotSearch;
        window.addArtistToLineup = Lineup.addArtistToLineup;
        window.removeArtistFromLineup = Lineup.removeArtistFromLineup;
        window.removeArtistFromReserve = Lineup.removeArtistFromReserve;
        window.saveLineupToDatabase = Lineup.saveLineupToDatabase;
        window.clearLineup = Lineup.clearLineup;
        window.resizeLineup = Lineup.resizeLineup;
        window.exportLineupToClipboard = Lineup.exportLineupToClipboard;
        window.handleDragStart = Lineup.handleDragStart;
        window.handleDragOver = Lineup.handleDragOver;
        window.handleDragEnter = Lineup.handleDragEnter;
        window.handleDragLeave = Lineup.handleDragLeave;
        window.handleDropOnMain = Lineup.handleDropOnMain;
        window.handleDropOnReserve = Lineup.handleDropOnReserve;
        window.handleDragEnd = Lineup.handleDragEnd;
        window.toggleTheme = Theme.toggleTheme;
        window.loadArtists = UI.loadArtists;
    }
};

App.init();
