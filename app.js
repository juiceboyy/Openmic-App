// VASTE WEB APP URL
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzk7SHUUOUEhgMAgKZ9XUUgna3oz_1XDa5Na8m4a5VV7TbTa0lpB7Ku_6SOgmaMIGxE/exec';

let allArtists = [];
let currentFilteredData = [];
let currentEditRowIndex = null;
let scannedMatches = [];
let fetchedSyncContacts = [];
let mailingRecipients = [];

// --- Helper Functions ---
const isTrue = (val) => String(val).toLowerCase() === 'ja' || val === true || val === 'TRUE';
const getEl = (id) => document.getElementById(id);

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Global Event Listeners
    getEl('search-input').addEventListener('input', applyFilters);
    getEl('filter-region').addEventListener('change', applyFilters);
    getEl('filter-type').addEventListener('change', applyFilters);
    getEl('filter-bookable').addEventListener('change', applyFilters);

    // Modal Open Buttons
    getEl('btn-open-sync').addEventListener('click', openSyncModal);
    getEl('btn-open-mailing').addEventListener('click', openMailingModal);
    getEl('btn-open-photo').addEventListener('click', openPhotoModal);
    getEl('btn-open-add').addEventListener('click', () => openModal());

    // Modal Actions
    getEl('btn-sync-start').addEventListener('click', fetchGoogleContacts);
    getEl('sync-select-all').addEventListener('change', (e) => toggleAllSyncCheckboxes(e.target));
    getEl('btn-import-contacts').addEventListener('click', importSelectedContacts);
    
    getEl('btn-mailing-test').addEventListener('click', () => sendMailing(true));
    getEl('btn-mailing-send').addEventListener('click', () => sendMailing(false));
    
    getEl('btn-scan-folder').addEventListener('click', scanFolder);
    getEl('btn-send-photos').addEventListener('click', sendPhotos);
    
    getEl('btn-save-contact').addEventListener('click', submitForm);

    // Close Modal Buttons (Generic)
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close');
            getEl(modalId).classList.add('hidden');
            if (modalId === 'contact-modal') currentEditRowIndex = null;
        });
    });

    // Event Delegation for Dynamic Content (Table & Lists)
    setupEventDelegation();

    // Initial Fetch
    lucide.createIcons();
    fetchArtists();
});

function setupEventDelegation() {
    // Main Table Actions (Edit/Delete/Notes)
    getEl('artist-table-body').addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');
        const noteToggle = e.target.closest('.note-toggle');

        if (btnEdit) openModal(parseInt(btnEdit.dataset.index));
        if (btnDelete) deleteContact(parseInt(btnDelete.dataset.index));
        if (noteToggle) toggleNote(noteToggle);
    });

    // Photo Match Resolver
    getEl('photo-matches-body').addEventListener('change', (e) => {
        if (e.target.classList.contains('match-resolver')) {
            resolveMultipleMatch(parseInt(e.target.dataset.index), e.target);
        }
    });
}

// --- UI Logic ---

function toggleNote(element) {
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
}

// --- Sync Logic ---
function openSyncModal() {
    getEl('sync-modal').classList.remove('hidden');
    getEl('sync-step-1').classList.remove('hidden');
    getEl('sync-step-2').classList.add('hidden');
    getEl('sync-modal-footer').classList.add('hidden');
    getEl('sync-contacts-body').innerHTML = '';
    fetchedSyncContacts = [];
    lucide.createIcons();
}

async function fetchGoogleContacts() {
    const btn = getEl('btn-sync-start');
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>';
    btn.disabled = true;

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ _action: 'fetch_google_contacts' })
        });
        const result = await response.json();
        if (result.status === "success") {
            fetchedSyncContacts = result.contacts; renderSyncContacts();
            getEl('sync-step-1').classList.add('hidden');
            getEl('sync-step-2').classList.remove('hidden');
            getEl('sync-modal-footer').classList.remove('hidden');
        } else { alert("Fout bij ophalen: " + result.message); }
    } catch (e) { alert("Kon contacten niet ophalen. Check de console (F12)."); } finally { btn.innerHTML = origHTML; btn.disabled = false; }
}

function renderSyncContacts() {
    const tbody = getEl('sync-contacts-body');
    tbody.innerHTML = '';
    if(fetchedSyncContacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">Je bent helemaal up-to-date! Er zijn geen nieuwe contacten gevonden in je adresboek.</td></tr>`;
        getEl('btn-import-contacts').style.display = 'none'; return;
    }
    getEl('btn-import-contacts').style.display = 'flex';
    fetchedSyncContacts.forEach((contact, index) => {
        let nameStr = `${contact.firstName} ${contact.lastName}`.trim() || '<span class="text-gray-400 italic">Geen naam</span>';
        let contactStr = '';
        if(contact.email) contactStr += `<div><i data-lucide="mail" class="w-3.5 h-3.5 inline mr-1 text-gray-400"></i> ${contact.email}</div>`;
        if(contact.phone) contactStr += `<div><i data-lucide="phone" class="w-3.5 h-3.5 inline mr-1 text-gray-400"></i> ${contact.phone}</div>`;
        
        tbody.innerHTML += `
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
}

function toggleAllSyncCheckboxes(source) {
    document.querySelectorAll('.sync-checkbox').forEach(cb => cb.checked = source.checked);
}

async function importSelectedContacts() {
    const toImport = [];
    fetchedSyncContacts.forEach((c, idx) => { if(getEl(`sync-cb-${idx}`).checked) { toImport.push(c); } });
    if(toImport.length === 0) { alert("Selecteer minstens één contact om te importeren."); return; }

    const btn = getEl('btn-import-contacts');
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>';
    btn.disabled = true;

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ _action: 'import_contacts', contacts: toImport })
        });
        const result = await response.json();
        if (result.status === "success") {
            alert(`Succes! ${result.importedCount} contact(en) toegevoegd.`);
            getEl('sync-modal').classList.add('hidden'); getEl('loading-state').style.display = 'flex'; fetchArtists(); 
        } else { alert("Fout bij importeren: " + result.message); }
    } catch (e) { alert("Importeren mislukt."); } finally { btn.innerHTML = origHTML; btn.disabled = false; }
}

// --- Mailing Logic ---
function openMailingModal() {
    mailingRecipients = currentFilteredData.filter(a => a.email && a.email !== '-' && !a.unsubscribed && !a.blacklist)
        .map(a => ({ email: a.email, name: a.artistName !== '-' ? a.artistName : a.firstName }));
    
    getEl('mailing-count').innerText = mailingRecipients.length;
    const hasRecipients = mailingRecipients.length > 0;
    getEl('btn-mailing-test').disabled = !hasRecipients;
    getEl('btn-mailing-send').disabled = !hasRecipients;
    getEl('btn-mailing-send').classList.toggle('opacity-50', !hasRecipients);
    getEl('btn-mailing-send').classList.toggle('cursor-not-allowed', !hasRecipients);

    getEl('mailing-subject').value = ''; getEl('mailing-body').value = '';
    getEl('mailing-modal').classList.remove('hidden'); lucide.createIcons();
}

async function sendMailing(isTest) {
    const subject = getEl('mailing-subject').value.trim();
    const message = getEl('mailing-body').value.trim();
    if (!subject || !message) { alert("Vul onderwerp en bericht in."); return; }
    if (mailingRecipients.length === 0) return;

    if (!confirm(isTest ? "TEST: Stuur 1 mail naar halfhide@gmail.com?" : `Weet je zeker dat je ${mailingRecipients.length} mails wilt sturen?`)) return;

    const btn = getEl(isTest ? 'btn-mailing-test' : 'btn-mailing-send');
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>'; btn.disabled = true;

    try {
        const response = await fetch(WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ _action: 'send_mailing', recipients: isTest ? [mailingRecipients[0]] : mailingRecipients, subject, message, testMode: isTest, testEmail: 'halfhide@gmail.com' }) });
        const result = await response.json();
        if (result.status === "success") { alert(`Gelukt! ${result.sentCount} mail(s) verzonden.`); if (!isTest) getEl('mailing-modal').classList.add('hidden'); } else { alert("Fout: " + result.message); }
    } catch (e) { alert("Verzenden mislukt."); } finally { btn.innerHTML = origHTML; btn.disabled = false; }
}

// --- Photo Logic ---
function openPhotoModal() {
    getEl('photo-modal').classList.remove('hidden'); getEl('photo-step-1').classList.remove('hidden'); getEl('photo-step-2').classList.add('hidden'); getEl('photo-modal-footer').classList.add('hidden'); getEl('drive-folder-url').value = ''; getEl('photo-matches-body').innerHTML = ''; scannedMatches = []; lucide.createIcons();
}

async function scanFolder() {
    const url = getEl('drive-folder-url').value; if(!url) { alert("Plak eerst een link!"); return; }
    const btn = getEl('btn-scan-folder'); const origHTML = btn.innerHTML; btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>'; btn.disabled = true;
    try {
        const response = await fetch(WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ _action: 'scan_folder', folderUrl: url }) });
        const result = await response.json();
        if (result.status === "success") { scannedMatches = result.matches; renderMatches(); getEl('photo-step-1').classList.add('hidden'); getEl('photo-step-2').classList.remove('hidden'); getEl('photo-modal-footer').classList.remove('hidden'); } else { alert("Fout: " + result.message); }
    } catch (e) { alert("Scan mislukt."); } finally { btn.innerHTML = origHTML; btn.disabled = false; }
}

function renderMatches() {
    const tbody = getEl('photo-matches-body'); tbody.innerHTML = '';
    if(scannedMatches.length === 0) { tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-gray-500">Geen submappen gevonden.</td></tr>`; return; }
    scannedMatches.forEach((match, index) => {
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
        tbody.innerHTML += `<tr class="${rowClass} transition-colors" id="match-row-${index}"><td class="px-4 py-3 align-top pt-3.5">${checkbox}</td><td class="px-4 py-3 font-medium text-gray-800 align-top pt-3.5"><a href="${match.folderLink}" target="_blank" class="hover:text-apple-blue hover:underline flex items-start"><i data-lucide="folder" class="w-4 h-4 mr-2 text-gray-400 shrink-0 mt-0.5"></i> <span class="break-all">${match.folderName}</span></a></td><td class="px-4 py-3 align-top pt-3">${matchText}</td></tr>`;
    });
    lucide.createIcons();
}

function resolveMultipleMatch(index, selectElement) {
    let cb = getEl(`match-cb-${index}`); let row = getEl(`match-row-${index}`); let val = selectElement.value;
    if (val === "") { cb.checked = false; cb.disabled = true; row.classList.add('bg-orange-50/30'); scannedMatches[index].selected = false; } else {
        let chosen = scannedMatches[index].candidates[val]; scannedMatches[index].artistName = chosen.artistName; scannedMatches[index].email = chosen.email;
        if (chosen.email && chosen.email !== '-') { cb.disabled = false; cb.checked = true; scannedMatches[index].selected = true; selectElement.classList.replace('border-orange-300', 'border-green-300'); selectElement.classList.replace('bg-orange-50', 'bg-green-50'); row.classList.remove('bg-orange-50/30'); } 
        else { cb.checked = false; cb.disabled = true; scannedMatches[index].selected = false; alert("Geen geldig e-mailadres."); }
    }
}

async function sendPhotos() {
    scannedMatches.forEach((m, idx) => { const cb = getEl(`match-cb-${idx}`); m.selected = cb ? cb.checked : false; });
    const toSend = scannedMatches.filter(m => m.selected); if(toSend.length === 0) { alert("Geen vinkjes gezet!"); return; }
    if(!confirm(`Stuur e-mail naar ${toSend.length} artiest(en)?`)) return;
    const btn = getEl('btn-send-photos'); const origHTML = btn.innerHTML; btn.innerHTML = '<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>'; btn.disabled = true;
    try {
        const response = await fetch(WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ _action: 'send_emails', matches: scannedMatches }) });
        const result = await response.json(); if (result.status === "success") { alert(`Gelukt! ${result.sentCount} e-mails verstuurd.`); getEl('photo-modal').classList.add('hidden'); } else { alert("Fout: " + result.message); }
    } catch (e) { alert("Verzenden mislukt."); } finally { btn.innerHTML = origHTML; btn.disabled = false; }
}

// --- CRUD Logic ---
function openModal(rowIndex = null) {
    const form = getEl('new-contact-form'); const title = getEl('modal-title'); form.reset(); currentEditRowIndex = rowIndex;
    if (rowIndex !== null) {
        title.innerHTML = `<i data-lucide="edit-2" class="w-5 h-5 text-apple-blue mr-2"></i> Contact Bewerken`;
        const artist = allArtists.find(a => a.rowIndex === rowIndex);
        if (artist) {
            form.elements['Voornaam'].value = artist.firstName; form.elements['Achternaam'].value = artist.lastName; form.elements['Artiestennaam'].value = artist.artistName !== '-' ? artist.artistName : ''; form.elements['E-mailadres'].value = artist.email !== '-' ? artist.email : ''; form.elements['Telefoonnummer'].value = artist.phone !== '-' ? artist.phone : ''; form.elements['Instagram account'].value = artist.instagram !== '-' ? artist.instagram : ''; form.elements['Soort contact'].value = artist.type !== '-' ? artist.type : 'Artiest'; form.elements['Speelduur'].value = artist.setLength !== '-' ? artist.setLength : ''; form.elements['Notities'].value = artist.notes !== '-' ? artist.notes : '';
            form.elements['Regio Den Haag'].checked = artist.regionDH; form.elements['Regio Rotterdam'].checked = artist.regionRdam; form.elements['Boekbaar (Ja/Nee)'].checked = artist.bookable; form.elements['Favoriet Gijs (Ja/Nee)'].checked = artist.favGijs; form.elements['Favoriet Ro (Ja/Nee)'].checked = artist.favRo; form.elements['Interesse in workshops (Ja/Nee)'].checked = artist.workshops; form.elements['Workshop 7 nov (Ja/Nee)'].checked = artist.workshop7Nov; form.elements['Unsubscribed (Ja/Nee)'].checked = artist.unsubscribed; form.elements['Blacklist (Ja/Nee)'].checked = artist.blacklist;
        }
    } else { title.innerHTML = '<i data-lucide="user-plus" class="w-5 h-5 text-apple-blue mr-2"></i> Nieuw Contact Toevoegen'; }
    getEl('contact-modal').classList.remove('hidden'); lucide.createIcons();
}

async function submitForm() {
    const btn = getEl('btn-save-contact'); const orig = btn.innerHTML; btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>'; btn.disabled = true;
    const payload = {}; for (let [key, value] of new FormData(getEl('new-contact-form')).entries()) { payload[key] = value === 'on' ? true : (value || "-"); }
    ["Regio Den Haag", "Regio Rotterdam", "Boekbaar (Ja/Nee)", "Favoriet Gijs (Ja/Nee)", "Favoriet Ro (Ja/Nee)", "Interesse in workshops (Ja/Nee)", "Workshop 7 nov (Ja/Nee)", "Unsubscribed (Ja/Nee)", "Blacklist (Ja/Nee)"].forEach(f => { if (!payload.hasOwnProperty(f)) payload[f] = false; });
    payload._action = currentEditRowIndex !== null ? 'edit' : 'add'; if(currentEditRowIndex) payload._rowIndex = currentEditRowIndex;
    try {
        const res = await fetch(WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const data = await res.json(); if (data.status === "success") { getEl('contact-modal').classList.add('hidden'); getEl('loading-state').style.display = 'flex'; fetchArtists(); } else { alert("Fout: " + data.message); }
    } catch (e) { alert("Kon niet opslaan."); } finally { btn.innerHTML = orig; btn.disabled = false; }
}

async function deleteContact(rowIndex) {
    if (!confirm("Zeker weten?")) return;
    getEl('loading-state').style.display = 'flex';
    try {
        const res = await fetch(WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ _action: 'delete', _rowIndex: rowIndex }) });
        if ((await res.json()).status === "success") fetchArtists();
    } catch (e) { alert("Fout bij verwijderen."); getEl('loading-state').style.display = 'none'; }
}

// --- Rendering ---
function renderBadges(artist) {
    let badges = '';
    if (artist.blacklist) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200 mb-1">Blacklist</span> `;
    else if (artist.bookable) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200 mb-1">Boekbaar</span> `;
    if (artist.favGijs) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 mb-1" title="Fav Gijs"><i data-lucide="star" class="w-3 h-3 mr-1"></i> Gijs</span> `;
    if (artist.favRo) badges += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 mb-1" title="Fav Ro"><i data-lucide="star" class="w-3 h-3 mr-1"></i> Ro</span> `;
    return badges;
}

function renderTable(dataToRender) {
    const tableBody = getEl('artist-table-body');
    const emptyState = getEl('empty-state');
    getEl('contact-count').innerText = dataToRender.length;
    tableBody.innerHTML = '';
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
            <td class="px-6 py-4"><div class="flex flex-wrap gap-1">${renderBadges(artist)} ${artist.unsubscribed ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 mb-1">Unsubscribed</span>` : ''}</div></td>
            <td class="px-6 py-4 max-w-[200px]">${notesHTML}</td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button data-index="${artist.rowIndex}" class="btn-edit text-apple-blue bg-blue-50 border border-blue-100 hover:bg-apple-blue hover:text-white transition-colors px-3 py-1.5 rounded-lg focus:outline-none flex items-center justify-center shadow-sm"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i><span class="text-xs font-medium ml-1">Bewerk</span></button>
                    <button data-index="${artist.rowIndex}" class="btn-delete text-red-500 bg-red-50 border border-red-100 hover:bg-red-500 hover:text-white transition-colors p-2 rounded-lg focus:outline-none flex items-center justify-center shadow-sm"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>`;
        tableBody.appendChild(tr);
    });
    lucide.createIcons();
}

function applyFilters() {
    const searchTerm = getEl('search-input').value.toLowerCase();
    const regionFilter = getEl('filter-region').value;
    const typeFilter = getEl('filter-type').value;
    const bookableFilter = getEl('filter-bookable').value;

    currentFilteredData = allArtists.filter(artist => {
        const matchesSearch = (artist.firstName + ' ' + artist.lastName + artist.artistName + artist.email).toLowerCase().includes(searchTerm);
        let matchesRegion = regionFilter === 'all' || (regionFilter === 'Den Haag' && artist.regionDH) || (regionFilter === 'Rotterdam' && artist.regionRdam);
        const matchesType = typeFilter === 'all' || artist.type === typeFilter;
        let matchesBookable = bookableFilter === 'all' || (bookableFilter === 'ja' && artist.bookable) || (bookableFilter === 'nee' && !artist.bookable);
        return matchesSearch && matchesRegion && matchesType && matchesBookable;
    });
    renderTable(currentFilteredData);
}

async function fetchArtists() {
    try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        allArtists = data.map(row => ({
            rowIndex: row.rowIndex, 
            firstName: String(row['Voornaam'] || '-'), lastName: String(row['Achternaam'] || '-'), artistName: String(row['Artiestennaam'] || '-'),
            email: String(row['E-mailadres'] || '-'), phone: String(row['Telefoonnummer'] || '-'), instagram: String(row['Instagram account'] || '-'),
            bookable: isTrue(row['Boekbaar (Ja/Nee)']), favGijs: isTrue(row['Favoriet Gijs (Ja/Nee)']), favRo: isTrue(row['Favoriet Ro (Ja/Nee)']),
            setLength: String(row['Speelduur'] || '-'), regionDH: isTrue(row['Regio Den Haag']), regionRdam: isTrue(row['Regio Rotterdam']),
            workshops: isTrue(row['Interesse in workshops (Ja/Nee)']), workshop7Nov: isTrue(row['Workshop 7 nov (Ja/Nee)']),
            unsubscribed: isTrue(row['Unsubscribed (Ja/Nee)']), type: String(row['Soort contact'] || '-').trim(),
            blacklist: isTrue(row['Blacklist (Ja/Nee)']), notes: String(row['Notities'] || '-')
        }));
        getEl('loading-state').style.display = 'none'; applyFilters();
    } catch (error) { getEl('loading-state').innerHTML = `<p class="text-sm font-medium text-red-500">Er is een fout opgetreden.</p>`; }
}