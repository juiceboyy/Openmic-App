export const mailingModalTemplate = /*html*/`
<div id="mailing-modal" class="hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[85dvh] overflow-hidden transition-colors">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50 rounded-t-2xl">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <i data-lucide="mail" class="w-5 h-5 text-apple-blue"></i> Nieuwe E-mailing Sturen
            </h2>
            <button data-close="mailing-modal" class="text-gray-400 hover:text-gray-600 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <div class="p-6 flex-1 min-h-0 overflow-y-auto modal-scroll bg-white dark:bg-gray-800">
            <div class="mb-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex gap-3">
                <i data-lucide="info" class="w-5 h-5 text-apple-blue shrink-0 mt-0.5"></i>
                <div>
                    <p class="text-sm text-gray-700 dark:text-gray-200 font-medium">Je gaat e-mailen naar je huidige gefilterde lijst.</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Geldige ontvangers: <strong id="mailing-count" class="text-apple-blue">0</strong> artiesten.<br>Mensen zonder e-mailadres, unsubscribes en blacklists worden automatisch overgeslagen door het systeem.</p>
                </div>
            </div>
            <div class="space-y-4">
                <div class="flex justify-end">
                    <button id="btn-generate-ai" class="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/40 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
                        <i data-lucide="sparkles" class="w-4 h-4"></i> Genereer met AI
                    </button>
                </div>
                <div>
                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold">Onderwerp</label>
                    <input type="text" id="mailing-subject" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 bg-white dark:bg-gray-700 dark:text-white" placeholder="Bijv: Haagse Open Mic op dinsdag a.s. in Amare!">
                </div>
                <div>
                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold flex justify-between">
                        <span>Jouw Bericht</span>
                        <span class="text-gray-400 font-normal">Aanhef ("Hoi [Naam],") wordt automatisch toegevoegd!</span>
                    </label>
                    <textarea id="mailing-body" rows="8" class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 placeholder-gray-400 bg-white dark:bg-gray-700 dark:text-white" placeholder="Typ hier het bericht dat je aan iedereen wilt sturen..."></textarea>
                </div>
            </div>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex justify-end gap-3 rounded-b-2xl">
            <button data-close="mailing-modal" class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors mr-auto">Annuleren</button>
            <button id="btn-mailing-test" class="bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center">
                <i data-lucide="flask-conical" class="w-4 h-4 mr-2"></i> Stuur Test (halfhide@...)
            </button>
            <button id="btn-mailing-send" class="bg-apple-blue hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center">
                <i data-lucide="send" class="w-4 h-4 mr-2"></i> Verstuur Definitief
            </button>
        </div>
    </div>
</div>`;