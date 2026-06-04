export const lineupModalTemplate = /*html*/`
<div id="lineup-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl flex flex-col max-h-[85dvh] overflow-hidden transition-colors">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50 rounded-t-2xl">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <i data-lucide="list-ordered" class="w-5 h-5 text-apple-blue"></i> Speelschema (Max 12)
            </h2>
            <button data-close="lineup-modal" class="text-gray-400 hover:text-gray-600 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        
        <div class="p-6 flex-1 min-h-0 overflow-y-auto modal-scroll bg-white dark:bg-gray-800">

            <div class="flex gap-2 mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                <select id="current-session-name" class="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white">
                    <option value="" disabled selected>Kies de huidige sessie...</option>
                </select>
                <button id="btn-load-session" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                    <i data-lucide="download-cloud" class="w-4 h-4"></i> Sessie Laden
                </button>
            </div>

            <div id="lineup-editor-container" class="hidden">
                <div class="flex gap-2 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-200 dark:bg-gray-700/30 dark:border-gray-700">
                    <select id="prev-sheet-name" class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="" disabled selected>Kies de vorige sessie...</option>
                    </select>
                    <button id="btn-check-history" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white flex items-center gap-2">
                        <i data-lucide="history" class="w-4 h-4"></i> Check Historie
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <!-- Linker kolom: Speelschema -->
                    <div class="space-y-3">
                        <h3 class="font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                            <i data-lucide="calendar" class="w-4 h-4 mr-1.5 text-apple-blue"></i> Speelschema
                        </h3>
                        <div id="lineup-list-container" class="space-y-2">
                            <!-- Lineup items injected here -->
                        </div>
                    </div>

                    <!-- Rechter kolom: Reserves & Aanmeldingen -->
                    <div class="space-y-6">
                        <!-- Reservelijst -->
                        <div id="reserve-list-container" class="p-4 border-2 border-dashed border-orange-200 bg-orange-50/30 rounded-xl dark:border-orange-900/50 dark:bg-orange-900/10 min-h-[100px] transition-colors">
                            <h3 class="font-bold text-orange-800 dark:text-orange-400 mb-3 flex items-center justify-between">
                                <span class="flex items-center"><i data-lucide="clipboard-list" class="w-4 h-4 inline mr-2"></i> Reservelijst</span>
                                <button id="btn-add-to-reserve" class="text-orange-600 hover:text-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-md px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors" title="Artiest direct toevoegen aan reservelijst">
                                    <i data-lucide="plus" class="w-3 h-3"></i> Toevoegen
                                </button>
                            </h3>
                            <div id="reserve-list-content" class="space-y-2">
                                <!-- Reserve items injected here -->
                            </div>
                        </div>

                        <!-- Aanmeldingslijst -->
                        <div id="candidate-list-container" class="p-4 border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-xl dark:border-blue-900/50 dark:bg-blue-900/10 min-h-[180px] transition-colors">
                            <h3 class="font-bold text-blue-800 dark:text-blue-400 mb-3 flex items-center justify-between">
                                <span class="flex items-center"><i data-lucide="users" class="w-4 h-4 inline mr-2"></i> Aanmeldingslijst (Pool)</span>
                                <button id="btn-add-to-candidates" class="text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors" title="Artiest toevoegen aan aanmeldlijst">
                                    <i data-lucide="plus" class="w-3 h-3"></i> Artiest aanmelden
                                </button>
                            </h3>
                            <div id="candidate-list-content" class="space-y-2">
                                <!-- Candidate items injected here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex flex-col rounded-b-2xl">
            <div class="flex justify-end gap-3 w-full">
                <div class="mr-auto flex gap-2">
                    <button id="btn-clear-lineup" class="px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center" title="Alles wissen">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                    <button id="btn-copy-lineup" class="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center">
                        <i data-lucide="copy" class="w-4 h-4 mr-2"></i> Kopieer lijst
                    </button>
                </div>
                <button data-close="lineup-modal" class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Annuleren</button>
                <button id="btn-save-lineup" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center">
                    <i data-lucide="save" class="w-4 h-4 mr-2"></i> Opslaan in Aanmeldlijst
                </button>
            </div>
        </div>
    </div>
</div>`;

export const lineupSearchModalTemplate = /*html*/`
<div id="lineup-search-modal" class="hidden fixed inset-0 z-[60] flex items-start justify-center pt-20 bg-gray-900/40 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors">
        <div class="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <i data-lucide="search" class="w-5 h-5 text-gray-400"></i>
            <input type="text" id="slot-search-input" placeholder="Zoek artiest of naam..." class="flex-1 text-lg outline-none bg-transparent dark:text-white dark:placeholder-gray-500" autocomplete="off">
            <button id="btn-close-slot-search" class="text-gray-400 hover:text-gray-600">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <div id="slot-search-results" class="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700"></div>
        <div id="quick-add-new-artist" class="hidden border-t border-gray-100 dark:border-gray-700">
            <div class="px-4 py-4 bg-green-50/50 dark:bg-green-900/10">
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                    <i data-lucide="user-plus" class="w-4 h-4 text-green-600 dark:text-green-400 shrink-0"></i>
                    Artiest niet gevonden. Vul e-mail in om direct toe te voegen.
                </p>
                <div class="flex gap-2">
                    <input type="email" id="new-artist-email" placeholder="E-mailadres (optioneel)..."
                        class="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-500">
                    <button onclick="addNewArtistFromSearch()"
                        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 shrink-0">
                        <i data-lucide="plus" class="w-4 h-4"></i> Toevoegen
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>`;