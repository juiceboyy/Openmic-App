import { getEl } from './utils.js';
import { STORAGE_KEYS, LINEUP_CONFIG } from './config.js';
import { resizeLineup } from './lineupHandler.js';
import { showToast } from './notifications.js';

export function openSettingsModal() {
    getEl('settings-modal').classList.remove('hidden');
    getEl('setting-max-slots').value = LINEUP_CONFIG.MAX_SLOTS;
    getEl('setting-pause-index').value = LINEUP_CONFIG.PAUSE_INDEX;
}

export function closeSettingsModal() {
    getEl('settings-modal').classList.add('hidden');
}

export function saveSettings() {
    const maxSlots = parseInt(getEl('setting-max-slots').value) || 12;
    const pauseIndex = parseInt(getEl('setting-pause-index').value) || 6;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ maxSlots, pauseIndex }));
    resizeLineup(maxSlots);
    closeSettingsModal();
    showToast("Instellingen opgeslagen.", "success");
}