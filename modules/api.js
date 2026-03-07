import { API_CONFIG } from './config.js';

export async function apiRequest(payload) {
    try {
        const response = await fetch(API_CONFIG.WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

export async function fetchArtistsData() {
    try {
        const response = await fetch(API_CONFIG.WEB_APP_URL);
        return await response.json();
    } catch (error) {
        console.error('Fetch Artists failed:', error);
        throw error;
    }
}