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
        } else if (payload._action === 'delete') {
            url = '/api/artists/delete';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'add') {
            url = '/api/artists/add';
            options.headers = { 'Content-Type': 'application/json' };
        } else if (payload._action === 'send_mailing') {
            url = '/api/mailing';
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
        } else if (payload._action === 'verify_pin') {
            url = '/api/verify-pin';
            options.headers = { 'Content-Type': 'application/json' };
        }

        // Voeg de PIN altijd stateless toe aan de headers
        options.headers['x-app-pin'] = localStorage.getItem('appPin') || '';

        const response = await fetch(url, options);
        
        if (response.status === 401 && payload._action !== 'verify_pin') {
            localStorage.removeItem('appPin');
            window.location.reload();
            throw new Error('Sessie verlopen of PIN onjuist');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

export async function fetchArtistsData() {
    try {
        // Taak 2: Data ophalen van lokale backend
        const response = await fetch('/api/artists', {
            headers: { 'x-app-pin': localStorage.getItem('appPin') || '' }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('appPin');
            window.location.reload();
            return [];
        }
        
        return await response.json();
    } catch (error) {
        console.error('Fetch Artists failed:', error);
        throw error;
    }
}