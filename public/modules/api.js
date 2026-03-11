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
            url = 'http://localhost:3000/api/artists/edit';
            options.headers = { 'Content-Type': 'application/json' };
            // Payload is al JSON stringified in options.body
        } else if (payload._action === 'delete') {
            url = 'http://localhost:3000/api/artists/delete';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'add') {
            url = 'http://localhost:3000/api/artists/add';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'mailing') {
            url = 'http://localhost:3000/api/mailing';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'get_sheet_names') {
            url = 'http://localhost:3000/api/speelschema/sheets';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'get_previous_lineup') {
            url = 'http://localhost:3000/api/speelschema/previous';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'get_current_lineup') {
            url = 'http://localhost:3000/api/speelschema/current';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'save_lineup') {
            url = 'http://localhost:3000/api/speelschema/save';
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
        const response = await fetch('http://localhost:3000/api/artists');
        return await response.json();
    } catch (error) {
        console.error('Fetch Artists failed:', error);
        throw error;
    }
}