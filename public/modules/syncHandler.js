import { state } from './state.js';
import { apiRequest } from './api.js';
import { getEl, toggleButtonLoading } from './utils.js';
import { loadArtists, toggleGlobalLoading } from './uiHandler.js';
import { showToast } from './notifications.js';

export function renderSyncContacts(contacts, elements) {
    const { syncContactsBody, btnImportContacts } = elements;
    syncContactsBody.innerHTML = '';
    if(contacts.length === 0) {
        syncContactsBody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">Je bent helemaal up-to-date! Er zijn geen nieuwe contacten gevonden in je adresboek.</td></tr>`;
        btnImportContacts.style.display = 'none'; return;
    }
    btnImportContacts.style.display = 'flex';
    contacts.forEach((contact, index) => {
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
}

export function openSyncModal() {
    getEl('sync-modal').classList.remove('hidden'); getEl('sync-step-1').classList.remove('hidden'); getEl('sync-step-2').classList.add('hidden'); getEl('sync-modal-footer').classList.add('hidden'); getEl('sync-contacts-body').innerHTML = ''; state.fetchedSyncContacts = []; lucide.createIcons();
}

export function closeSyncModal(modalId) {
    getEl(modalId).classList.add('hidden');
}

export async function fetchGoogleContacts() {
    const btn = getEl('btn-sync-start'); const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    try {
        const result = await apiRequest({ _action: 'fetch_google_contacts' });
        if (result.status === "success") {
            state.fetchedSyncContacts = result.contacts; renderSyncContacts(state.fetchedSyncContacts, { syncContactsBody: getEl('sync-contacts-body'), btnImportContacts: getEl('btn-import-contacts') });
            getEl('sync-step-1').classList.add('hidden'); getEl('sync-step-2').classList.remove('hidden'); getEl('sync-modal-footer').classList.remove('hidden');
        } else { showToast("Fout bij ophalen: " + result.message, "error"); }
    } catch (e) { showToast("Kon contacten niet ophalen.", "error"); } finally { toggleButtonLoading(btn, false, orig); }
}

export function toggleAllSyncCheckboxes(source) {
    document.querySelectorAll('.sync-checkbox').forEach(cb => cb.checked = source.checked);
}

export async function importSelectedContacts() {
    const toImport = []; state.fetchedSyncContacts.forEach((c, idx) => { if(getEl(`sync-cb-${idx}`).checked) { toImport.push(c); } });
    if(toImport.length === 0) { showToast("Selecteer minstens één contact.", "error"); return; }
    const btn = getEl('btn-import-contacts'); const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    try {
        const result = await apiRequest({ _action: 'import_contacts', contacts: toImport });
        if (result.status === "success") { showToast(`Succes! ${result.importedCount} toegevoegd.`, "success"); getEl('sync-modal').classList.add('hidden'); toggleGlobalLoading(getEl('loading-state'), true); loadArtists(); } else { showToast("Fout: " + result.message, "error"); }
    } catch (e) { showToast("Importeren mislukt.", "error"); } finally { toggleButtonLoading(btn, false, orig); }
}