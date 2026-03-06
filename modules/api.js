const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzk7SHUUOUEhgMAgKZ9XUUgna3oz_1XDa5Na8m4a5VV7TbTa0lpB7Ku_6SOgmaMIGxE/exec';

export async function apiRequest(payload) {
    try {
        const response = await fetch(WEB_APP_URL, {
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
        const response = await fetch(WEB_APP_URL);
        return await response.json();
    } catch (error) {
        console.error('Fetch Artists failed:', error);
        throw error;
    }
}