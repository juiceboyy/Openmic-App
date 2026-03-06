export const photoModalTemplate = `
<div id="photo-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-full overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
            <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <i data-lucide="camera" class="w-5 h-5 text-apple-blue"></i> Foto's Distribueren (JCSFotografie)
            </h2>
            <button data-close="photo-modal" class="text-gray-400 hover:text-gray-600 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="p-6 overflow-y-auto modal-scroll bg-white flex-1">
            <div id="photo-step-1">
                <p class="text-sm text-gray-600 mb-4">Plak hier de algemene link naar de Google Drive map van de specifieke Open Mic.</p>
                <label class="block text-xs text-gray-500 mb-1 font-semibold">Google Drive Map URL</label>
                <input type="text" id="drive-folder-url" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 mb-4" placeholder="https://drive.google.com/drive/folders/1aBcD2...">
                <button id="btn-scan-folder" class="bg-apple-blue hover:bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center w-full">
                    <i data-lucide="folder-search" class="w-4 h-4 mr-2"></i> Map Scannen
                </button>
            </div>
            <div id="photo-step-2" class="hidden">
                <h3 class="text-sm font-semibold text-gray-800 mb-3">Gevonden Mappen & Matches</h3>
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                    <table class="w-full text-left">
                        <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr>
                                <th class="px-4 py-2 font-semibold">Stuur?</th>
                                <th class="px-4 py-2 font-semibold">Mapnaam in Drive</th>
                                <th class="px-4 py-2 font-semibold">Gevonden Artiest(en)</th>
                            </tr>
                        </thead>
                        <tbody id="photo-matches-body" class="text-sm divide-y divide-gray-100"></tbody>
                    </table>
                </div>
            </div>
        </div>
        <div id="photo-modal-footer" class="hidden px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-2xl">
            <button data-close="photo-modal" class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors mr-auto">Annuleren</button>
            <button id="btn-send-photos" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center">
                <i data-lucide="send" class="w-4 h-4 mr-2"></i> Verstuur E-mails
            </button>
        </div>
    </div>
</div>`;

export const contactModalTemplate = `
<div id="contact-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-full overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
            <h2 id="modal-title" class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <i data-lucide="user-plus" class="w-5 h-5 text-apple-blue"></i> Nieuw Contact Toevoegen
            </h2>
            <button data-close="contact-modal" class="text-gray-400 hover:text-gray-600 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="p-6 overflow-y-auto modal-scroll bg-white">
            <form id="new-contact-form" class="space-y-6">
                <div>
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persoonlijke Gegevens</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="block text-xs text-gray-500 mb-1">Voornaam</label><input type="text" name="Voornaam" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Achternaam</label><input type="text" name="Achternaam" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50"></div>
                        <div class="col-span-2"><label class="block text-xs text-gray-500 mb-1">Artiestennaam / Act</label><input type="text" name="Artiestennaam" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50"></div>
                    </div>
                </div>
                <div>
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact Details</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="block text-xs text-gray-500 mb-1">E-mailadres</label><input type="email" name="E-mailadres" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Telefoonnummer</label><input type="text" name="Telefoonnummer" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Instagram (URL of @naam)</label><input type="text" name="Instagram account" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Soort Contact</label><select name="Soort contact" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white"><option value="Artiest">Artiest</option><option value="Bobo">Bobo</option><option value="Supplier">Supplier</option><option value="Publiek">Publiek</option></select></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Speelduur (bijv. 30 min)</label><input type="text" name="Speelduur" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50"></div>
                    </div>
                </div>
                <div><h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Labels & Status</h3><div class="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100"><label class="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" name="Regio Den Haag" class="rounded text-apple-blue focus:ring-apple-blue"><span>Regio Den Haag</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" name="Regio Rotterdam" class="rounded text-apple-blue focus:ring-apple-blue"><span>Regio Rotterdam</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" name="Boekbaar (Ja/Nee)" class="rounded text-apple-blue focus:ring-apple-blue"><span>Boekbaar</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" name="Favoriet Gijs (Ja/Nee)" class="rounded text-apple-blue focus:ring-apple-blue"><span>Favoriet Gijs</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" name="Favoriet Ro (Ja/Nee)" class="rounded text-apple-blue focus:ring-apple-blue"><span>Favoriet Ro</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" name="Interesse in workshops (Ja/Nee)" class="rounded text-apple-blue focus:ring-apple-blue"><span>Wil Workshops</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" name="Workshop 7 nov (Ja/Nee)" class="rounded text-apple-blue focus:ring-apple-blue"><span>Was bij 7 nov</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" name="Unsubscribed (Ja/Nee)" class="rounded text-red-500 focus:ring-red-500"><span class="text-red-700">Unsubscribed</span></label><label class="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" name="Blacklist (Ja/Nee)" class="rounded text-red-500 focus:ring-red-500"><span class="text-red-700 font-medium">Blacklist</span></label></div></div>
                <div><h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notities</h3><textarea name="Notities" rows="3" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 placeholder-gray-400" placeholder="Schrijf hier eventuele extra notities of bijzonderheden..."></textarea></div>
            </form>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-2xl"><button data-close="contact-modal" class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Annuleren</button><button id="btn-save-contact" class="bg-apple-blue hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center min-w-[120px]">Opslaan</button></div>
    </div>
</div>`;
