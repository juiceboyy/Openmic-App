import { state } from './state.js';
import { apiRequest } from './api.js';
import { getEl, toggleButtonLoading } from './utils.js';
import { showToast, showConfirm } from './notifications.js';

function getSecondTuesdayOfMonth(year, month) {
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay(); // 0=zo, 2=di
    const daysUntilFirstTuesday = (2 - dayOfWeek + 7) % 7;
    const firstTuesdayDate = 1 + daysUntilFirstTuesday;
    return new Date(year, month, firstTuesdayDate + 7);
}

export function getNextSecondTuesday(fromDate) {
    const today = new Date(fromDate);
    today.setHours(0, 0, 0, 0);

    const candidate = getSecondTuesdayOfMonth(today.getFullYear(), today.getMonth());

    if (candidate > today) return candidate;

    // Tweede dinsdag van deze maand is al voorbij — pak volgende maand
    const nextMonth = today.getMonth() === 11 ? 0 : today.getMonth() + 1;
    const nextYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    return getSecondTuesdayOfMonth(nextYear, nextMonth);
}

export async function generateMailingWithAI() {
    const btn = getEl('btn-generate-ai');
    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg> Bezig...';

    try {
        const eventDate = getNextSecondTuesday(new Date());
        const formattedDate = eventDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        const result = await fetch('/api/generate-mailing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-pin': localStorage.getItem('appPin') || ''
            },
            body: JSON.stringify({ eventDate: formattedDate })
        });

        const data = await result.json();

        if (data.status !== 'success') throw new Error(data.message || 'Onbekende fout');

        getEl('mailing-subject').value = data.subject;
        getEl('mailing-body').value = data.body;
        showToast('Tekst gegenereerd voor ' + formattedDate + '!', 'success');
    } catch (e) {
        showToast('AI generatie mislukt: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHTML;
        if (window.lucide) lucide.createIcons();
    }
}

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