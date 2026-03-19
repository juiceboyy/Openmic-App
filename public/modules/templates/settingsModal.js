export const settingsModalTemplate = /*html*/`
<div id="settings-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transition-colors border border-gray-100 dark:border-gray-700">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <i data-lucide="settings" class="w-5 h-5 text-gray-500"></i> Instellingen
            </h2>
            <button data-close="settings-modal" class="text-gray-400 hover:text-gray-600 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <div class="p-6 space-y-4">
            <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold">Aantal Slots</label>
                <input type="number" id="setting-max-slots" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white">
            </div>
            <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold">Pauze na slot #</label>
                <input type="number" id="setting-pause-index" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white">
            </div>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex justify-end gap-3">
            <button data-close="settings-modal" class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Annuleren</button>
            <button id="btn-save-settings" class="bg-apple-blue hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">Opslaan</button>
        </div>
    </div>
</div>`;