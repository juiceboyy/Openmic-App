import { state } from './state.js';
import { apiRequest } from './api.js';
import { getEl, toggleButtonLoading } from './utils.js';
import { loadArtists, toggleGlobalLoading, applyFilters } from './uiHandler.js';
import { showToast, showConfirm } from './notifications.js';

const FIELD_MAP = {
    'Voornaam': 'firstName', 'Achternaam': 'lastName', 'Artiestennaam': 'artistName',
    'E-mailadres': 'email', 'Telefoonnummer': 'phone', 'Instagram account': 'instagram',
    'Soort contact': 'type', 'Speelduur': 'setLength', 'Notities': 'notes', 'Profielfoto': 'profilePic',
    'Gender': 'gender', 'Omschrijving': 'omschrijving', 'Live Link': 'liveLink', 'Bandfoto Link': 'bandfotoLink'
};

const BOOL_MAP = {
    'Regio Den Haag': 'regionDH', 'Regio Rotterdam': 'regionRdam', 'Boekbaar (Ja/Nee)': 'bookable',
    'Favoriet Gijs (Ja/Nee)': 'favGijs', 'Favoriet Ro (Ja/Nee)': 'favRo', 'Interesse in workshops (Ja/Nee)': 'workshops',
    'Workshop 7 nov (Ja/Nee)': 'workshop7Nov', 'Unsubscribed (Ja/Nee)': 'unsubscribed', 'Blacklist (Ja/Nee)': 'blacklist',
    'Mailing Selectie': 'mailingSelection', 'Vrijwilliger': 'vrijwilliger'
};

export function openModal(rowIndex = null) {
    const form = getEl('new-contact-form');
    getEl('modal-title').innerHTML = rowIndex !== null 
        ? `<i data-lucide="edit-2" class="w-5 h-5 text-apple-blue mr-2"></i> Contact Bewerken`
        : `<i data-lucide="user-plus" class="w-5 h-5 text-apple-blue mr-2"></i> Nieuw Contact Toevoegen`;
    
    form.reset(); 
    state.currentEditRowIndex = rowIndex;

    if (rowIndex !== null) {
        const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
        if (artist) {
            Object.entries(FIELD_MAP).forEach(([key, prop]) => {
                if (form.elements[key]) form.elements[key].value = (artist[prop] && artist[prop] !== '-') ? artist[prop] : (key === 'Soort contact' ? 'Artiest' : '');
            });
            Object.entries(BOOL_MAP).forEach(([key, prop]) => {
                if (form.elements[key]) form.elements[key].checked = !!artist[prop];
            });
        }
    }
    
    getEl('contact-modal').classList.remove('hidden'); 
    lucide.createIcons();
}

export const closeModal = (modalId) => { getEl(modalId).classList.add('hidden'); state.currentEditRowIndex = null; };

export async function submitForm() {
    const btn = getEl('btn-save-contact'); const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    const form = getEl('new-contact-form'); const payload = {}; 
    for (let [key, value] of new FormData(form).entries()) payload[key] = value === 'on' ? true : (value || "-");
    
    // Zorg dat ongecheckte formulier-checkboxes meegestuurd worden als 'false'
    Object.keys(BOOL_MAP).filter(k => k !== 'Mailing Selectie').forEach(f => { if (!payload.hasOwnProperty(f)) payload[f] = false; });
    
    payload._action = state.currentEditRowIndex !== null ? 'edit' : 'add'; 
    if(state.currentEditRowIndex) payload._rowIndex = state.currentEditRowIndex;
    
    try {
        const data = await apiRequest(payload);
        if (data.status === "success") { getEl('contact-modal').classList.add('hidden'); toggleGlobalLoading(getEl('loading-state'), true); loadArtists(); showToast("Opgeslagen", "success"); } 
        else showToast("Fout: " + data.message, "error");
    } catch (e) { showToast("Kon niet opslaan.", "error"); } finally { toggleButtonLoading(btn, false, orig); }
}

export async function deleteContact(rowIndex) {
    if (!await showConfirm("Weet je zeker dat je dit contact wilt verwijderen?")) return;
    toggleGlobalLoading(getEl('loading-state'), true);
    try {
        const res = await apiRequest({ _action: 'delete', _rowIndex: rowIndex });
        if (res.status === "success") { loadArtists(); showToast("Contact verwijderd", "success"); }
    } catch (e) { showToast("Fout bij verwijderen.", "error"); toggleGlobalLoading(getEl('loading-state'), false); }
}

export async function toggleMailingSelection(rowIndex, isChecked) {
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (artist) {
        artist.mailingSelection = isChecked;
        try { await apiRequest({ _action: 'edit', _rowIndex: rowIndex, ...getArtistPayload(artist) }); } 
        catch (e) { showToast("Kon selectie niet opslaan.", "error"); }
    }
}
window.toggleMailingSelection = toggleMailingSelection;

export async function handleFieldBlur(event) {
    const el = event.target;
    const rowIndex = parseInt(el.getAttribute('data-row'));
    const field = el.getAttribute('data-field');
    const newValue = field === 'Notities' ? el.innerText.trim() : el.innerText.replace(/\n/g, ' ').trim();
    
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (!artist) return;
    
    const prop = FIELD_MAP[field];
    if (!prop) return;
    
    const oldValue = artist[prop] === '-' ? '' : artist[prop];
    if (newValue === oldValue) return;
    
    artist[prop] = newValue || '-';
    await saveArtistUpdate(rowIndex, artist, el);
    
    if (field === 'Instagram account') {
        applyFilters();
    }
}
window.handleFieldBlur = handleFieldBlur;

export async function updateArtistField(event) {
    const el = event.target;
    const rowIndex = parseInt(el.getAttribute('data-row'));
    const field = el.getAttribute('data-field');
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (!artist) return;

    if (el.type === 'checkbox' && BOOL_MAP[field]) {
        artist[BOOL_MAP[field]] = el.checked;
    } else if (el.tagName === 'SELECT' && field === 'Soort contact') {
        artist.type = el.value;
    } else if (el.tagName === 'SELECT' && field === 'Gender') {
        artist.gender = el.value;
    }

    await saveArtistUpdate(rowIndex, artist, el.closest('td') || el.closest('label'));
    if (field === 'Gender') applyFilters();
}
window.updateArtistField = updateArtistField;

let currentPhotoEditRow = null;

export function openPhotoEditModal(rowIndex, currentUrl, fallbackUrl) {
    currentPhotoEditRow = rowIndex;
    const modal = getEl('photo-edit-modal');
    const preview = getEl('photo-edit-preview');
    const input = getEl('photo-edit-url');
    
    input.value = currentUrl || '';
    input.dataset.fallback = fallbackUrl;
    preview.src = currentUrl || fallbackUrl;
    preview.onerror = () => { preview.src = fallbackUrl; }; // Als de geplakte url breekt

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}
window.openPhotoEditModal = openPhotoEditModal;

export const closePhotoEditModal = () => { getEl('photo-edit-modal').classList.add('hidden'); currentPhotoEditRow = null; };
window.closePhotoEditModal = closePhotoEditModal;

export async function savePhotoEdit() {
    if (currentPhotoEditRow === null) return;
    const artist = state.allArtists.find(a => a.rowIndex === currentPhotoEditRow);
    if (!artist) { closePhotoEditModal(); return; }
    
    let url = getEl('photo-edit-url').value.trim();
    
    // Converteer Google Drive share-links naar directe image-links
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
        url = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w500`;
    }
    
    artist.profilePic = url || '-';
    const btn = getEl('btn-save-photo'); const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    
    await saveArtistUpdate(currentPhotoEditRow, artist, null);
    
    toggleButtonLoading(btn, false, orig); closePhotoEditModal(); applyFilters();
}
window.savePhotoEdit = savePhotoEdit;

async function saveArtistUpdate(rowIndex, artist, visualElement) {
    try {
        const payload = { _action: 'edit', _rowIndex: rowIndex, ...getArtistPayload(artist) };
        const response = await apiRequest(payload);
        
        if (response.status === 'success' && visualElement) {
            const origBg = visualElement.style.backgroundColor;
            visualElement.style.transition = 'background-color 0.4s ease';
            visualElement.style.backgroundColor = document.documentElement.classList.contains('dark') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(220, 252, 231, 1)';
            setTimeout(() => { visualElement.style.backgroundColor = origBg; visualElement.style.transition = 'background-color 0.8s ease'; }, 600);
        } else if (response.status !== 'success') {
            showToast('Opslaan mislukt: ' + response.message, 'error');
        }
    } catch (e) { showToast('Er ging iets mis bij het opslaan.', 'error'); }
}

function getArtistPayload(artist) {
    const payload = {};
    Object.entries(FIELD_MAP).forEach(([k, v]) => payload[k] = artist[v]);
    Object.entries(BOOL_MAP).forEach(([k, v]) => payload[k] = artist[v]);
    return payload;
}