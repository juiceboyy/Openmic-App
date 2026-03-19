// Smart Header Hide/Show on Scroll
document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const scrollTopBtn = document.getElementById('btn-scroll-top');
    let lastScrollY = main.scrollTop;

    const updatePadding = () => {
        const isDesktop = window.innerWidth >= 768;
        const basePadding = isDesktop ? 32 : 16; // Komt overeen met originele p-4 of md:p-8 padding
        main.style.paddingTop = `${header.offsetHeight + basePadding}px`;
    };
    
    setTimeout(updatePadding, 100);
    window.addEventListener('resize', updatePadding);

    const handleScroll = () => {
        const currentScrollY = Math.max(0, window.scrollY || main.scrollTop); // Ondersteunt nu mobile én desktop
        const isInputFocused = document.activeElement && header.contains(document.activeElement);
        
        if (currentScrollY <= 0) {
            header.style.transform = 'translateY(0)';
        } else if (!isInputFocused && currentScrollY > lastScrollY && currentScrollY > header.offsetHeight) {
            header.style.transform = 'translateY(-100%)'; // Omlaag scrollen -> verberg menu
        } else if (currentScrollY < lastScrollY) {
            header.style.transform = 'translateY(0)'; // Omhoog scrollen -> toon menu
        }
        
        // Toggle scroll-to-top button
        if (currentScrollY > 300) {
            scrollTopBtn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
            scrollTopBtn.classList.add('opacity-100', 'translate-y-0');
        } else {
            scrollTopBtn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
            scrollTopBtn.classList.remove('opacity-100', 'translate-y-0');
        }
        
        lastScrollY = currentScrollY;
    };

    main.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);

    // 1. Smooth Scroll-to-Top actie
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Mobile
        main.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 2. Pull-to-Refresh (PTR) Logica
    const ptrContainer = document.getElementById('ptr-container');
    const ptrArrow = document.getElementById('ptr-arrow');
    const ptrSpinner = document.getElementById('ptr-spinner');
    const ptrText = document.getElementById('ptr-text');
    
    let ptrStartY = 0;
    let ptrCurrentY = 0;
    let ptrIsPulling = false;
    let ptrRefreshing = false;
    let ptrThresholdReached = false;
    const PTR_THRESHOLD = 70;

    document.addEventListener('touchstart', (e) => {
        const currentScrollY = window.scrollY || main.scrollTop;
        // Alleen starten als we helemaal bovenaan zijn en we niet al refreshen
        if (currentScrollY <= 0 && !ptrRefreshing) {
            ptrStartY = e.touches[0].clientY;
            ptrIsPulling = true;
            ptrThresholdReached = false;
            ptrContainer.style.transition = 'none'; // Snappy reactie tijdens slepen
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!ptrIsPulling || ptrRefreshing) return;
        ptrCurrentY = e.touches[0].clientY;
        const pullDistance = ptrCurrentY - ptrStartY;
        const currentScrollY = window.scrollY || main.scrollTop;
        
        // Alleen pull-to-refresh activeren als we omlaag slepen
        if (pullDistance > 0 && currentScrollY <= 0) {
            const translateY = Math.min(pullDistance * 0.4, PTR_THRESHOLD + 20); // Geef een lichte weerstand (0.4)
            ptrContainer.style.transform = `translateY(calc(-100% + ${translateY}px))`;
            
            if (translateY >= PTR_THRESHOLD) {
                ptrArrow.style.transform = 'rotate(180deg)';
                ptrText.textContent = 'Laat los om te vernieuwen';
                if (!ptrThresholdReached) {
                    ptrThresholdReached = true;
                    if (navigator.vibrate) navigator.vibrate(15); // Subtiel tikje (ca. 15ms)
                }
            } else {
                ptrArrow.style.transform = 'rotate(0deg)';
                ptrText.textContent = 'Trek omlaag...';
                ptrThresholdReached = false;
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', async () => {
        if (!ptrIsPulling || ptrRefreshing) return;
        ptrIsPulling = false;
        
        const pullDistance = ptrCurrentY - ptrStartY;
        const translateY = pullDistance * 0.4;
        
        ptrContainer.style.transition = 'transform 0.3s ease-out';
        
        // Refresh actie uitvoeren als de drempel (PTR_THRESHOLD) is overschreden
        if (translateY >= PTR_THRESHOLD) {
            ptrRefreshing = true;
            ptrContainer.style.transform = `translateY(20px)`; // Houd in beeld tijdens het laden
            
            ptrArrow.classList.add('hidden');
            ptrSpinner.classList.remove('hidden');
            ptrText.textContent = 'Vernieuwen...';
            
            // Data daadwerkelijk ophalen op de achtergrond
            if (window.loadArtists) await window.loadArtists();
            
            ptrContainer.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                ptrArrow.classList.remove('hidden');
                ptrSpinner.classList.add('hidden');
                ptrArrow.style.transform = 'rotate(0deg)';
                ptrText.textContent = 'Trek omlaag...';
                ptrRefreshing = false;
            }, 300);
        } else {
            ptrContainer.style.transform = 'translateY(-100%)'; // Verberg terug als je niet ver genoeg trok
        }
        
        ptrCurrentY = 0;
        ptrStartY = 0;
    });
});