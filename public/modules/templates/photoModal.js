export const photoModalTemplate = /*html*/`
<div id="photo-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-full overflow-hidden transition-colors">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50 rounded-t-2xl">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <i data-lucide="camera" class="w-5 h-5 text-apple-blue"></i> Foto's Distribueren (JCSFotografie)
            </h2>
            <button data-close="photo-modal" class="text-gray-400 hover:text-gray-600 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <div class="p-6 flex-1 min-h-0 overflow-y-auto modal-scroll bg-white dark:bg-gray-800">
            <div id="photo-step-1">
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Plak hier de algemene link naar de Google Drive map van de specifieke Open Mic.</p>
                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold">Google Drive Map URL</label>
                <input type="text" id="drive-folder-url" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 mb-4 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" placeholder="https://drive.google.com/drive/folders/1aBcD2...">
                <button id="btn-scan-folder" class="bg-apple-blue hover:bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center w-full">
                    <i data-lucide="folder-search" class="w-4 h-4 mr-2"></i> Map Scannen
                </button>
            </div>
            <div id="photo-step-2" class="hidden">
                <h3 class="text-sm font-semibold text-gray-800 dark:text-white mb-3">Gevonden Mappen & Matches</h3>
                <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table class="w-full text-left">
                        <thead class="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
                            <tr>
                                <th class="px-4 py-2 font-semibold">Stuur?</th>
                                <th class="px-4 py-2 font-semibold">Mapnaam in Drive</th>
                                <th class="px-4 py-2 font-semibold">Gevonden Artiest(en)</th>
                            </tr>
                        </thead>
                        <tbody id="photo-matches-body" class="text-sm divide-y divide-gray-100 dark:divide-gray-700"></tbody>
                    </table>
                </div>
            </div>
        </div>
        <div id="photo-modal-footer" class="hidden px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex justify-end gap-3 rounded-b-2xl">
            <button data-close="photo-modal" class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors mr-auto">Annuleren</button>
            <button id="btn-send-photos" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center">
                <i data-lucide="send" class="w-4 h-4 mr-2"></i> Verstuur E-mails
            </button>
        </div>
    </div>
</div>`;