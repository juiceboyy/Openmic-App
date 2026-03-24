import { state } from './state.js';
import { apiRequest } from './api.js';
import { getEl, toggleButtonLoading } from './utils.js';
import { loadArtists, toggleGlobalLoading, renderTable, applyFilters } from './uiHandler.js';
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

export async function toggleMailingSelection(rowIndex, isChecked) {
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (artist) {
        artist.mailingSelection = isChecked;
        
        try {
            await apiRequest({ _action: 'edit', _rowIndex: rowIndex, ...getArtistPayload(artist) });
        } catch (e) {
            showToast("Kon selectie niet opslaan.", "error");
        }
    }
}
window.toggleMailingSelection = toggleMailingSelection;

export async function handleFieldBlur(event) {
    const el = event.target;
    const rowIndex = parseInt(el.getAttribute('data-row'));
    const field = el.getAttribute('data-field');
    
    // Haal de nieuwe waarde op. Bij reguliere velden (zoals Voornaam) halen we per ongeluk getypte enters/newlines eruit om breuk te voorkomen.
    const newValue = field === 'Notities' ? el.innerText.trim() : el.innerText.replace(/\n/g, ' ').trim();
    
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (!artist) return;
    
    const propMap = {
        'Voornaam': 'firstName', 'Achternaam': 'lastName', 'Artiestennaam': 'artistName',
        'E-mailadres': 'email', 'Telefoonnummer': 'phone', 'Instagram account': 'instagram',
        'Speelduur': 'setLength', 'Notities': 'notes'
    };
    
    const prop = propMap[field];
    const oldValue = artist[prop] === '-' ? '' : artist[prop];
    
    // Bespaar een netwerk request als er niets daadwerkelijk is veranderd.
    if (newValue === oldValue) return;
    
    artist[prop] = newValue || '-';
    await saveArtistUpdate(rowIndex, artist, el);
}
window.handleFieldBlur = handleFieldBlur;

export async function updateArtistField(event) {
    const el = event.target;
    const rowIndex = parseInt(el.getAttribute('data-row'));
    const field = el.getAttribute('data-field');
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (!artist) return;

    if (el.type === 'checkbox') {
        const propMap = {
            'Regio Den Haag': 'regionDH', 'Regio Rotterdam': 'regionRdam', 'Boekbaar (Ja/Nee)': 'bookable',
            'Favoriet Gijs (Ja/Nee)': 'favGijs', 'Favoriet Ro (Ja/Nee)': 'favRo', 'Interesse in workshops (Ja/Nee)': 'workshops',
            'Workshop 7 nov (Ja/Nee)': 'workshop7Nov', 'Unsubscribed (Ja/Nee)': 'unsubscribed', 'Blacklist (Ja/Nee)': 'blacklist'
        };
        artist[propMap[field]] = el.checked;
    } else if (el.tagName === 'SELECT') {
        if (field === 'Soort contact') artist.type = el.value;
    }
    
    await saveArtistUpdate(rowIndex, artist, el.closest('td') || el.closest('label'));
}
window.updateArtistField = updateArtistField;

export async function promptCustomPhoto(rowIndex, currentUrl) {
    const newUrl = prompt('Plak hier de directe link naar de foto (URL):', currentUrl || '');
    if (newUrl === null) return; // Gebruiker heeft geannuleerd
    
    const artist = state.allArtists.find(a => a.rowIndex === rowIndex);
    if (!artist) return;
    
    artist.profilePic = newUrl.trim() || '-';
    
    applyFilters(); // Herteken de tabel direct zodat de foto lokaal meteen wijzigt
    
    await saveArtistUpdate(rowIndex, artist, null); // Stuur het stil naar de backend
}
window.promptCustomPhoto = promptCustomPhoto;

async function saveArtistUpdate(rowIndex, artist, visualElement) {
    try {
        const payload = { _action: 'edit', _rowIndex: rowIndex, ...getArtistPayload(artist) };
        const response = await apiRequest(payload);
        
        if (response.status === 'success') {
            // Subtiele visuele feedback (even kort oplichten)
            if (visualElement) {
                const origBg = visualElement.style.backgroundColor;
                visualElement.style.transition = 'background-color 0.4s ease';
                visualElement.style.backgroundColor = document.documentElement.classList.contains('dark') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(220, 252, 231, 1)'; // Lichtgroen
                
                setTimeout(() => {
                    visualElement.style.backgroundColor = origBg;
                    visualElement.style.transition = 'background-color 0.8s ease';
                }, 600);
            }
        } else {
            showToast('Opslaan mislukt: ' + response.message, 'error');
        }
    } catch (e) {
        showToast('Er ging iets mis bij het opslaan.', 'error');
    }
}

function getArtistPayload(artist) {
    return {
        'Voornaam': artist.firstName,
        'Achternaam': artist.lastName,
        'Artiestennaam': artist.artistName,
        'E-mailadres': artist.email,
        'Telefoonnummer': artist.phone,
        'Instagram account': artist.instagram,
        'Soort contact': artist.type,
        'Speelduur': artist.setLength,
        'Notities': artist.notes,
        'Profielfoto': artist.profilePic,
        'Regio Den Haag': artist.regionDH,
        'Regio Rotterdam': artist.regionRdam,
        'Boekbaar (Ja/Nee)': artist.bookable,
        'Favoriet Gijs (Ja/Nee)': artist.favGijs,
        'Favoriet Ro (Ja/Nee)': artist.favRo,
        'Interesse in workshops (Ja/Nee)': artist.workshops,
        'Workshop 7 nov (Ja/Nee)': artist.workshop7Nov,
        'Unsubscribed (Ja/Nee)': artist.unsubscribed,
        'Blacklist (Ja/Nee)': artist.blacklist,
        'Mailing Selectie': artist.mailingSelection
    };
}