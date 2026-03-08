import { state } from './state.js';
import { apiRequest } from './api.js';
import { getEl, toggleButtonLoading } from './utils.js';
import { showToast, showConfirm } from './notifications.js';

export function openMailingModal() {
    state.mailingRecipients = state.currentFilteredData
        .filter(a => a.email && a.email !== '-' && !a.unsubscribed && !a.blacklist && a.mailingSelection)
        .map(a => ({ email: a.email, name: a.artistName !== '-' ? a.artistName : a.firstName }));
    
    getEl('mailing-count').innerText = state.mailingRecipients.length;
    const hasRecipients = state.mailingRecipients.length > 0;
    
    const btnTest = getEl('btn-mailing-test');
    const btnSend = getEl('btn-mailing-send');
    
    btnTest.disabled = !hasRecipients; btnSend.disabled = !hasRecipients;
    btnSend.classList.toggle('opacity-50', !hasRecipients); btnSend.classList.toggle('cursor-not-allowed', !hasRecipients);
    getEl('mailing-subject').value = ''; getEl('mailing-body').value = ''; getEl('mailing-modal').classList.remove('hidden'); lucide.createIcons();
}

export function closeMailingModal(modalId) {
    getEl(modalId).classList.add('hidden');
}

export async function sendMailing(isTest) {
    const subject = getEl('mailing-subject').value.trim(); const message = getEl('mailing-body').value.trim();
    if (!subject || !message) { showToast("Vul onderwerp en bericht in.", "error"); return; }
    if (state.mailingRecipients.length === 0) return;
    if (!await showConfirm(isTest ? "TEST: Stuur 1 mail naar halfhide@gmail.com?" : `Weet je zeker dat je ${state.mailingRecipients.length} mails wilt sturen?`)) return;
    const btn = isTest ? getEl('btn-mailing-test') : getEl('btn-mailing-send'); const orig = btn.innerHTML; toggleButtonLoading(btn, true);
    try {
        const result = await apiRequest({ _action: 'send_mailing', recipients: isTest ? [state.mailingRecipients[0]] : state.mailingRecipients, subject, message, testMode: isTest, testEmail: 'halfhide@gmail.com' });
        if (result.status === "success") { showToast(`Gelukt! ${result.sentCount} mail(s) verzonden.`, "success"); if (!isTest) getEl('mailing-modal').classList.add('hidden'); } else { showToast("Fout: " + result.message, "error"); }
    } catch (e) { showToast("Verzenden mislukt.", "error"); } finally { toggleButtonLoading(btn, false, orig); }
}