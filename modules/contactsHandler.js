import { state } from './state.js';
import { apiRequest } from './api.js';
import { getEl, toggleButtonLoading } from './utils.js';
import { loadArtists, toggleGlobalLoading } from './uiHandler.js';
import { showToast, showConfirm } from './notifications.js';

export function openModal(rowIndex = null) {
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

export function closeModal(modalId) {
    getEl(modalId).classList.add('hidden');
    state.currentEditRowIndex = null;
}

export async function submitForm() {
    const btn = getEl('btn-save-contact'); const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    const form = getEl('new-contact-form'); const payload = {}; 
    for (let [key, value] of new FormData(form).entries()) { payload[key] = value === 'on' ? true : (value || "-"); }
    const checkboxes = ["Regio Den Haag", "Regio Rotterdam", "Boekbaar (Ja/Nee)", "Favoriet Gijs (Ja/Nee)", "Favoriet Ro (Ja/Nee)", "Interesse in workshops (Ja/Nee)", "Workshop 7 nov (Ja/Nee)", "Unsubscribed (Ja/Nee)", "Blacklist (Ja/Nee)"];
    checkboxes.forEach(f => { if (!payload.hasOwnProperty(f)) payload[f] = false; });
    payload._action = state.currentEditRowIndex !== null ? 'edit' : 'add'; 
    if(state.currentEditRowIndex) payload._rowIndex = state.currentEditRowIndex;
    try {
        const data = await apiRequest(payload);
        if (data.status === "success") { getEl('contact-modal').classList.add('hidden'); toggleGlobalLoading(getEl('loading-state'), true); loadArtists(); showToast("Contact succesvol opgeslagen", "success"); } 
        else { showToast("Fout: " + data.message, "error"); }
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