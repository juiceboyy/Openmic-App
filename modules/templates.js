export const photoModalTemplate = /*html*/`
<div id="photo-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-full overflow-hidden transition-colors">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50 rounded-t-2xl">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <i data-lucide="camera" class="w-5 h-5 text-apple-blue"></i> Foto's Distribueren (JCSFotografie)
            </h2>
            <button data-close="photo-modal" class="text-gray-400 hover:text-gray-600 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="p-6 overflow-y-auto modal-scroll bg-white dark:bg-gray-800 flex-1">
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

export const contactModalTemplate = /*html*/`
<div id="contact-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-full overflow-hidden transition-colors">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50 rounded-t-2xl">
            <h2 id="modal-title" class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <i data-lucide="user-plus" class="w-5 h-5 text-apple-blue"></i> Nieuw Contact Toevoegen
            </h2>
            <button data-close="contact-modal" class="text-gray-400 hover:text-gray-600 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="p-6 overflow-y-auto modal-scroll bg-white dark:bg-gray-800">
            <form id="new-contact-form" class="space-y-6">
                <div>
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persoonlijke Gegevens</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Voornaam</label><input type="text" name="Voornaam" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white"></div>
                        <div><label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Achternaam</label><input type="text" name="Achternaam" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white"></div>
                        <div class="col-span-2"><label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Artiestennaam / Act</label><input type="text" name="Artiestennaam" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white"></div>
                    </div>
                </div>
                <div>
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact Details</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">E-mailadres</label><input type="email" name="E-mailadres" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white"></div>
                        <div><label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Telefoonnummer</label><input type="text" name="Telefoonnummer" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white"></div>
                        <div><label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Instagram (URL of @naam)</label><input type="text" name="Instagram account" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white"></div>
                        <div><label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Soort Contact</label><select name="Soort contact" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white"><option value="Artiest">Artiest</option><option value="Bobo">Bobo</option><option value="Supplier">Supplier</option><option value="Publiek">Publiek</option></select></div>
                        <div><label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Speelduur (bijv. 30 min)</label><input type="text" name="Speelduur" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white"></div>
                    </div>
                </div>
                <div><h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Labels & Status</h3><div class="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700"><label class="flex items-center space-x-2 text-sm cursor-pointer dark:text-gray-300"><input type="checkbox" name="Regio Den Haag" class="rounded text-apple-blue focus:ring-apple-blue"><span>Regio Den Haag</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer dark:text-gray-300"><input type="checkbox" name="Regio Rotterdam" class="rounded text-apple-blue focus:ring-apple-blue"><span>Regio Rotterdam</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer dark:text-gray-300"><input type="checkbox" name="Boekbaar (Ja/Nee)" class="rounded text-apple-blue focus:ring-apple-blue"><span>Boekbaar</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer dark:text-gray-300"><input type="checkbox" name="Favoriet Gijs (Ja/Nee)" class="rounded text-apple-blue focus:ring-apple-blue"><span>Favoriet Gijs</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer dark:text-gray-300"><input type="checkbox" name="Favoriet Ro (Ja/Nee)" class="rounded text-apple-blue focus:ring-apple-blue"><span>Favoriet Ro</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer dark:text-gray-300"><input type="checkbox" name="Interesse in workshops (Ja/Nee)" class="rounded text-apple-blue focus:ring-apple-blue"><span>Wil Workshops</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer dark:text-gray-300"><input type="checkbox" name="Workshop 7 nov (Ja/Nee)" class="rounded text-apple-blue focus:ring-apple-blue"><span>Was bij 7 nov</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer dark:text-gray-300"><input type="checkbox" name="Unsubscribed (Ja/Nee)" class="rounded text-red-500 focus:ring-red-500"><span class="text-red-700 dark:text-red-400">Unsubscribed</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer dark:text-gray-300"><input type="checkbox" name="Blacklist (Ja/Nee)" class="rounded text-red-500 focus:ring-red-500"><span class="text-red-700 dark:text-red-400 font-medium">Blacklist</span></label></div></div>
                <div><h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notities</h3><textarea name="Notities" rows="3" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 placeholder-gray-400 bg-white dark:bg-gray-700 dark:text-white" placeholder="Schrijf hier eventuele extra notities of bijzonderheden..."></textarea></div>
            </form>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex justify-end gap-3 rounded-b-2xl"><button data-close="contact-modal" class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Annuleren</button><button id="btn-save-contact" class="bg-apple-blue hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center min-w-[120px]">Opslaan</button></div>
    </div>
</div>`;

export const syncModalTemplate = /*html*/`
<div id="sync-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-full overflow-hidden transition-colors">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50 rounded-t-2xl">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <i data-lucide="refresh-cw" class="w-5 h-5 text-apple-blue"></i> Synchroniseer Google Contacts
            </h2>
            <button data-close="sync-modal" class="text-gray-400 hover:text-gray-600 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
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
                                <th class="px-4 py-2 font-semibold w-10 text-center"><input type="checkbox" id="sync-select-all" checked class="rounded text-apple-blue focus:ring-apple-blue w-4 h-4 cursor-pointer"></th>
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

export const mailingModalTemplate = /*html*/`
<div id="mailing-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-full overflow-hidden transition-colors">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50 rounded-t-2xl">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <i data-lucide="mail" class="w-5 h-5 text-apple-blue"></i> Nieuwe E-mailing Sturen
            </h2>
            <button data-close="mailing-modal" class="text-gray-400 hover:text-gray-600 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="p-6 overflow-y-auto modal-scroll bg-white dark:bg-gray-800 flex-1">
            <div class="mb-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex gap-3">
                <i data-lucide="info" class="w-5 h-5 text-apple-blue shrink-0 mt-0.5"></i>
                <div>
                    <p class="text-sm text-gray-700 dark:text-gray-200 font-medium">Je gaat e-mailen naar je huidige gefilterde lijst.</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Geldige ontvangers: <strong id="mailing-count" class="text-apple-blue">0</strong> artiesten.<br>Mensen zonder e-mailadres, unsubscribes en blacklists worden automatisch overgeslagen door het systeem.</p>
                </div>
            </div>
            <div class="space-y-4">
                <div><label class="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold">Onderwerp</label><input type="text" id="mailing-subject" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white" placeholder="Bijv: Haagse Open Mic op dinsdag a.s. in Amare!"></div>
                <div><label class="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold flex justify-between"><span>Jouw Bericht</span><span class="text-gray-400 font-normal">Aanhef ("Hoi [Naam],") wordt automatisch toegevoegd!</span></label><textarea id="mailing-body" rows="8" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 placeholder-gray-400 bg-white dark:bg-gray-700 dark:text-white" placeholder="Typ hier het bericht dat je aan iedereen wilt sturen..."></textarea></div>
            </div>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex justify-end gap-3 rounded-b-2xl">
            <button data-close="mailing-modal" class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors mr-auto">Annuleren</button>
            <button id="btn-mailing-test" class="bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center"><i data-lucide="flask-conical" class="w-4 h-4 mr-2"></i> Stuur Test (halfhide@...)</button>
            <button id="btn-mailing-send" class="bg-apple-blue hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center"><i data-lucide="send" class="w-4 h-4 mr-2"></i> Verstuur Definitief</button>
        </div>
    </div>
</div>`;

export const lineupModalTemplate = /*html*/`
<div id="lineup-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden transition-colors">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50 rounded-t-2xl">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <i data-lucide="list-ordered" class="w-5 h-5 text-apple-blue"></i> Speelschema (Max 12)
            </h2>
            <button onclick="closeLineupModal()" class="text-gray-400 hover:text-gray-600 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        
        <div class="p-6 overflow-y-auto modal-scroll bg-white dark:bg-gray-800 flex-1">

            <div id="lineup-list-container" class="space-y-2">
                <!-- Lineup items injected here -->
            </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex flex-col rounded-b-2xl">
            <input type="text" id="lineup-sheet-name" placeholder="Naam tabblad (bijv. 10 maart 2026)" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 mb-3 bg-white dark:bg-gray-700 dark:text-white">
            <div class="flex justify-end gap-3 w-full">
                <div class="mr-auto flex gap-2">
                    <button onclick="clearLineup()" class="px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center" title="Alles wissen"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    <button onclick="exportLineupToClipboard()" class="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center"><i data-lucide="copy" class="w-4 h-4 mr-2"></i> Kopieer lijst</button>
                </div>
                <button onclick="closeLineupModal()" class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Annuleren</button>
                <button id="btn-save-lineup" onclick="saveLineupToDatabase()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center">
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
            <input type="text" id="slot-search-input" oninput="handleLineupSearch(event)" placeholder="Zoek artiest of naam..." class="flex-1 text-lg outline-none bg-transparent dark:text-white dark:placeholder-gray-500" autocomplete="off">
            <button onclick="closeSlotSearch()" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div id="slot-search-results" class="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700"></div>
    </div>
</div>`;
