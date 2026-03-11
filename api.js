import { API_CONFIG } from './config.js';

export async function apiRequest(payload) {
    try {
        let url = API_CONFIG.WEB_APP_URL;
        let options = {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        };

        // Taak 3: Routeren van edits naar lokale Node.js backend
        if (payload._action === 'edit') {
            url = '/api/artists/edit';
            options.headers = { 'Content-Type': 'application/json' };
            // Payload is al JSON stringified in options.body
        } else if (payload._action === 'add') {
            url = '/api/artists/add';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'scan_folder') {
            url = '/api/photos/scan';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'send_emails') {
            url = '/api/photos/send';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'get_sheet_names') {
            url = '/api/speelschema/sheets';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'get_previous_lineup') {
            url = '/api/speelschema/previous';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'get_current_lineup') {
            url = '/api/speelschema/current';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'save_lineup') {
            url = '/api/speelschema/save';
            options.headers = { 'Content-Type': 'application/json' };
        }

        const response = await fetch(url, options);
        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

export async function fetchArtistsData() {
    try {
        // Taak 2: Data ophalen van lokale backend
        const response = await fetch('/api/artists');
        return await response.json();
    } catch (error) {
        console.error('Fetch Artists failed:', error);
        throw error;
    }
}