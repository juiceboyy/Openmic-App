export function showToast(message, type = 'success') {
    // Verwijder eventuele bestaande toasts om stapeling te voorkomen (optioneel, maar houdt het rustig)
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) existingToast.remove();

    const isSuccess = type === 'success';
    const iconName = isSuccess ? 'check-circle' : 'alert-circle';
    const iconColor = isSuccess ? 'text-green-500' : 'text-red-500';
    const borderColor = isSuccess ? 'border-green-100' : 'border-red-100';
    const bgColor = isSuccess ? 'bg-green-50' : 'bg-red-50';

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `fixed bottom-5 right-5 z-[60] flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-lg border ${borderColor} transform transition-all duration-300 translate-y-10 opacity-0`;
    
    toast.innerHTML = `
        <div class="p-2 rounded-full ${bgColor} shrink-0">
            <i data-lucide="${iconName}" class="w-5 h-5 ${iconColor}"></i>
        </div>
        <p class="text-sm font-medium text-gray-700 pr-2">${message}</p>
    `;

    document.body.appendChild(toast);
    lucide.createIcons();

    // Animatie in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    // Auto dismiss
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 opacity-0 transition-opacity duration-200';
        
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform scale-95 transition-transform duration-200">
                <div class="flex flex-col items-center text-center">
                    <div class="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                        <i data-lucide="help-circle" class="w-6 h-6 text-orange-500"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Bevestiging</h3>
                    <p class="text-sm text-gray-500 mb-6">${message}</p>
                    <div class="flex gap-3 w-full">
                        <button id="confirm-cancel" class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Annuleren
                        </button>
                        <button id="confirm-ok" class="flex-1 px-4 py-2 text-sm font-medium text-white bg-apple-blue rounded-lg hover:bg-blue-600 transition-colors shadow-sm">
                            Bevestigen
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        lucide.createIcons();

        // Animatie in
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('scale-95');
        });

        const cleanup = (result) => {
            modal.classList.add('opacity-0');
            setTimeout(() => modal.remove(), 200);
            resolve(result);
        };

        modal.querySelector('#confirm-cancel').onclick = () => cleanup(false);
        modal.querySelector('#confirm-ok').onclick = () => cleanup(true);
    });
}