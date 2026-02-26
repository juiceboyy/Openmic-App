import { CONFIG } from './utils.js';

export const api = {
    async fetch(body = null) {
        const options = body ? {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(body)
        } : {};
        const res = await fetch(CONFIG.WEB_APP_URL, options);
        return await res.json();
    }
};