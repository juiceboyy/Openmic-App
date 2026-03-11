export const API_CONFIG = {
    // WEB_APP_URL was the old Google Apps Script URL. 
    // Now it points to our local Node.js server!
    WEB_APP_URL: 'http://localhost:3000',
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