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
        ['search-input', 'filter-region', 'filter-type', 'filter-bookable'].forEach(id => {
            const el = getEl(id);
            if (el) el.addEventListener(id === 'search-input' ? 'input' : 'change', UI.applyFilters);
        });

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
        
        const reserveContainer = getEl('reserve-list-container');
        reserveContainer.addEventListener('dragover', Lineup.handleDragOver);
        reserveContainer.addEventListener('drop', Lineup.handleDropOnReserve);

        // Delegated Events (Table & Modals)
        getEl('artist-table-body').addEventListener('click', this.handleTableClick);
        getEl('photo-matches-body').addEventListener('change', this.handlePhotoMatchChange);
        
        // Close Buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(btn.getAttribute('data-close')));
        });

        // Body Scroll Lock (Fixed Body hack): werkt ook op iOS Safari, waar
        // 'overflow: hidden' op de body genegeerd wordt.
        // Slaat de scrollpositie op, fixeert de body, en herstelt alles bij sluiten.
        let scrollPosition = 0;
        document.querySelectorAll('[id$="-modal"]').forEach(modal => {
            new MutationObserver(() => {
                const anyOpen = [...document.querySelectorAll('[id$="-modal"]')]
                    .some(m => !m.classList.contains('hidden'));
                if (anyOpen) {
                    scrollPosition = window.scrollY;
                    document.body.style.position = 'fixed';
                    document.body.style.top = `-${scrollPosition}px`;
                    document.body.style.width = '100%';
                } else {
                    document.body.style.removeProperty('position');
                    document.body.style.removeProperty('top');
                    document.body.style.removeProperty('width');
                    window.scrollTo(0, scrollPosition);
                }
            }).observe(modal, { attributes: true, attributeFilter: ['class'] });
        });

        // iOS Safari Touch-interceptie: blokkeer rubber-banding op de donkere overlay
        // en alle andere niet-scrollbare modal-onderdelen (header, footer).
        // { passive: false } is verplicht, anders mag preventDefault() niet aangeroepen worden.
        document.querySelectorAll('[id$="-modal"]').forEach(modal => {
            modal.addEventListener('touchmove', (e) => {
                if (!e.target.closest('.modal-scroll')) {
                    e.preventDefault();
                }
            }, { passive: false });
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
        window.handleLineupSearch = Lineup.handleLineupSearch;
        window.selectLineupArtist = Lineup.selectLineupArtist;
        window.openSlotSearch = Lineup.openSlotSearch;
        window.closeSlotSearch = Lineup.closeSlotSearch;
        window.addArtistToLineup = Lineup.addArtistToLineup;
        window.removeArtistFromLineup = Lineup.removeArtistFromLineup;
        window.removeArtistFromReserve = Lineup.removeArtistFromReserve;
        window.saveLineupToDatabase = Lineup.saveLineupToDatabase;
        window.clearLineup = Lineup.clearLineup;
        window.exportLineupToClipboard = Lineup.exportLineupToClipboard;
        window.handleDragStart = Lineup.handleDragStart;
        window.handleDragOver = Lineup.handleDragOver;
        window.handleDragEnter = Lineup.handleDragEnter;
        window.handleDragLeave = Lineup.handleDragLeave;
        window.handleDropOnMain = Lineup.handleDropOnMain;
        window.handleDropOnReserve = Lineup.handleDropOnReserve;
        window.handleDragEnd = Lineup.handleDragEnd;
    }
};

App.init();