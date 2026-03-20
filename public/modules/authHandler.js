import { apiRequest } from './api.js';
import { toggleButtonLoading } from './utils.js';

export async function initAuth(onSuccessCallback) {
    const savedPin = localStorage.getItem('appPin');

    if (savedPin) {
        if (onSuccessCallback) onSuccessCallback();
        return;
    }

    // Maak de overlay HTML dynamisch aan
    const overlay = document.createElement('div');
    overlay.id = 'pin-overlay';
    overlay.className = 'fixed inset-0 bg-gray-900/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-opacity duration-300';
    
    overlay.innerHTML = `
        <style>
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-6px); }
                50% { transform: translateX(6px); }
                75% { transform: translateX(-6px); }
            }
            .animate-shake { animation: shake 0.4s ease-in-out; }
        </style>
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center border border-gray-200 dark:border-gray-700 transition-transform duration-300 scale-100" id="pin-modal-content">
            <div class="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <i data-lucide="lock" class="w-8 h-8 text-apple-blue dark:text-blue-400"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Toegang Beveiligd</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Voer de pincode in om toegang te krijgen tot de app.</p>
            
            <form id="pin-form" class="space-y-4">
                <div>
                    <input type="password" id="pin-input" placeholder="••••" required inputmode="numeric"
                        class="w-full text-center text-2xl tracking-[0.5em] px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-apple-blue focus:border-apple-blue dark:text-white transition-colors">
                    <p id="pin-error" class="text-red-500 text-sm mt-2 hidden font-medium">Onjuiste pincode. Probeer het opnieuw.</p>
                </div>
                <button type="submit" id="btn-unlock" class="w-full py-3 px-4 bg-apple-blue hover:bg-blue-600 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center min-h-[48px]">
                    Ontgrendel
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const form = document.getElementById('pin-form');
    const input = document.getElementById('pin-input');
    const errorMsg = document.getElementById('pin-error');
    const btn = document.getElementById('btn-unlock');
    const content = document.getElementById('pin-modal-content');

    setTimeout(() => input.focus(), 100);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = input.value.trim();
        if (!pin) return;

        const origContent = btn.innerHTML;
        toggleButtonLoading(btn, true);
        errorMsg.classList.add('hidden');
        input.classList.remove('border-red-500', 'ring-red-500');

        try {
            const response = await apiRequest({ _action: 'verify_pin', pin });
            if (response.success || response.status === 'success') {
                localStorage.setItem('appPin', pin);
                localStorage.removeItem('appUnlocked'); // Ruim oude legacy state op
                overlay.classList.add('opacity-0');
                setTimeout(() => { overlay.remove(); onSuccessCallback(); }, 300);
            } else { throw new Error('Onjuist'); }
        } catch (err) {
            errorMsg.classList.remove('hidden');
            input.classList.add('border-red-500', 'ring-red-500');
            input.value = ''; input.focus();
            content.classList.add('animate-shake');
            setTimeout(() => content.classList.remove('animate-shake'), 400);
        } finally { toggleButtonLoading(btn, false, origContent); }
    });
}