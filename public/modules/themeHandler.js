import { getEl } from './utils.js';
import { STORAGE_KEYS } from './config.js';

export function initTheme() {
    // Check local storage of systeem voorkeur
    if (localStorage.getItem(STORAGE_KEYS.THEME) === 'dark' || 
        (!(STORAGE_KEYS.THEME in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcon();
}

export function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = getEl('theme-icon');
    if (!icon) return;

    const isDark = document.documentElement.classList.contains('dark');
    
    // We gebruiken Lucide attributen om het icoon te veranderen
    // Maar omdat lucide.createIcons() de SVG vervangt, moeten we kijken of we de SVG of de <i> hebben
    // De makkelijkste manier met Lucide in deze setup is de class/naam aanpassen en re-renderen
    // Echter, lucide.createIcons() vervangt de <i> tag. 
    // We kunnen beter de innerHTML van de button vervangen of de data-lucide attribuut updaten als de <i> er nog is.
    // Omdat lucide.createIcons() al gedraaid heeft, is de <i> weg en is het een <svg>.
    // We lossen dit op door de parent button te targeten in de HTML en het icoon opnieuw te zetten.
    // Voor nu simpel: we roepen createIcons aan na een attribuut wijziging als we de <i> terugplaatsen, 
    // of we manipuleren de SVG direct als we dat willen. 
    // Eenvoudigste robuuste methode hier:
    
    const btn = icon.closest('button');
    if (btn) {
        btn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" id="theme-icon" class="w-5 h-5"></i>`;
        lucide.createIcons();
    }
}