function initLucideIcons() {
    const renderIcons = () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    };

    if (typeof lucide !== 'undefined') {
        renderIcons();
    } else {
        const interval = setInterval(() => {
            if (typeof lucide !== 'undefined') {
                clearInterval(interval);
                renderIcons();
            }
        }, 100);
        setTimeout(() => clearInterval(interval), 10000);
    }
}

function initSongwritingCampForm() {
    initLucideIcons();

    const form = document.getElementById('camp-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('submit-btn');
        const errorMsg = document.getElementById('error-msg');
        const originalBtnText = 'Interesse versturen';

        const payload = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            artistName: document.getElementById('artistName').value.trim(),
            genre: document.getElementById('genre').value.trim(),
            instruments: document.getElementById('instruments').value.trim(),
            socialMedia: document.getElementById('socialMedia').value.trim(),
            liveLink: document.getElementById('liveLink').value.trim(),
            remarks: document.getElementById('remarks').value.trim()
        };

        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Bezig met versturen...';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        errorMsg.classList.add('hidden');

        try {
            const response = await fetch('/api/songwriting-camp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                document.getElementById('form-container').classList.add('hidden');
                document.getElementById('success-msg').classList.remove('hidden');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                throw new Error(result.message || 'Kon interesse niet versturen.');
            }
        } catch (err) {
            console.error('Fout bij verzenden van formulier:', err);
            errorMsg.textContent = err.message || 'Er ging iets mis. Probeer het later nog eens of mail naar info@haagseopenmic.nl.';
            errorMsg.classList.remove('hidden');

            btn.disabled = false;
            btn.textContent = originalBtnText;
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSongwritingCampForm);
} else {
    initSongwritingCampForm();
}
