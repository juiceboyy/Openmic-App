export const API_CONFIG = {
    WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzk7SHUUOUEhgMAgKZ9XUUgna3oz_1XDa5Na8m4a5VV7TbTa0lpB7Ku_6SOgmaMIGxE/exec',
};

export const STORAGE_KEYS = {
    THEME: 'openmic_theme',
    LINEUP_DRAFT: 'openmic_lineup_draft',
    SETTINGS: 'openmic_settings',
};

const getSettings = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || {}; } catch { return {}; } };

export const LINEUP_CONFIG = {
    get MAX_SLOTS() { return parseInt(getSettings().maxSlots) || 12; },
    get PAUSE_INDEX() { const s = getSettings(); return s.pauseIndex !== undefined ? parseInt(s.pauseIndex) : 6; },
};