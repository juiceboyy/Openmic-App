export const isTrue = (val) => String(val).toLowerCase() === 'ja' || val === true || val === 'TRUE';

export const getEl = (id) => document.getElementById(id);

export const toggleButtonLoading = (btn, isLoading, originalContent) => {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
        const isWhite = btn.classList.contains('text-white');
        const spinnerColor = isWhite ? 'border-white/30 border-t-white' : 'border-current border-t-transparent';
        btn.innerHTML = `<div class="w-4 h-4 border-2 ${spinnerColor} rounded-full animate-spin"></div>`;
    } else {
        btn.innerHTML = originalContent;
    }
};