export const syncModalTemplate = /*html*/`
<div id="sync-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-full overflow-hidden transition-colors">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50 rounded-t-2xl">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <i data-lucide="refresh-cw" class="w-5 h-5 text-apple-blue"></i> Synchroniseer Google Contacts
            </h2>
            <button data-close="sync-modal" class="text-gray-400 hover:text-gray-600 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <div class="p-6 overflow-y-auto modal-scroll bg-white dark:bg-gray-800 flex-1">
            <div id="sync-step-1" class="text-center py-6">
                <i data-lucide="contact" class="w-12 h-12 text-gray-300 mx-auto mb-4"></i>
                <h3 class="text-lg font-medium text-gray-800 dark:text-white mb-2">Zoek naar nieuwe contacten</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">De app kijkt in jouw adresboek (Google Contacts) en vergelijkt dit met de huidige database. We laten je zien wie er nieuw is, en jij bepaalt wie er geïmporteerd wordt.</p>
                <button id="btn-sync-start" class="bg-apple-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm inline-flex items-center">
                    <i data-lucide="search" class="w-4 h-4 mr-2"></i> Adresboek Scannen
                </button>
            </div>
            <div id="sync-step-2" class="hidden">
                <h3 class="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center justify-between">
                    <span>Nieuwe contacten gevonden</span>
                    <span class="text-xs text-gray-500 font-normal">Vink uit wie je <span class="underline">niet</span> wilt toevoegen</span>
                </h3>
                <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table class="w-full text-left">
                        <thead class="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th class="px-4 py-2 font-semibold w-10 text-center">
                                    <input type="checkbox" id="sync-select-all" checked class="rounded text-apple-blue focus:ring-apple-blue w-4 h-4 cursor-pointer">
                                </th>
                                <th class="px-4 py-2 font-semibold">Naam</th>
                                <th class="px-4 py-2 font-semibold">Contactgegevens</th>
                                <th class="px-4 py-2 font-semibold">Notities</th>
                            </tr>
                        </thead>
                        <tbody id="sync-contacts-body" class="text-sm divide-y divide-gray-100 dark:divide-gray-700"></tbody>
                    </table>
                </div>
            </div>
        </div>
        <div id="sync-modal-footer" class="hidden px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex justify-end gap-3 rounded-b-2xl">
            <button data-close="sync-modal" class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors mr-auto">Annuleren</button>
            <button id="btn-import-contacts" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center">
                <i data-lucide="download" class="w-4 h-4 mr-2"></i> Importeer Geselecteerde
            </button>
        </div>
    </div>
</div>`;