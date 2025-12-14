// ui.js - Szybki Loading + Epickie Creditsy z Turbo Mode

window.addEventListener('load', () => {
    // --- 1. OBSŁUGA EKRANU ŁADOWANIA ---
    const loader = document.getElementById('loading-screen');
    setTimeout(() => {
        loader.classList.add('hidden');
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }, 300);

    // --- 2. DOWALONE NAPISY KOŃCOWE (WAAPI) ---
    const creditsTrigger = document.getElementById('copyright-trigger');
    const creditsOverlay = document.getElementById('credits-overlay');
    const closeCredits = document.getElementById('close-credits');
    const creditsContent = document.querySelector('.credits-content');
    
    let currentAnimation = null; // Przechowuje obiekt animacji

    // Funkcja zamykająca
    function hideCredits() {
        if (currentAnimation) {
            currentAnimation.cancel(); // Zatrzymaj animację
            currentAnimation = null;
        }
        creditsOverlay.style.opacity = '0';
        setTimeout(() => { creditsOverlay.style.display = 'none'; }, 500);
    }

    // Otwieranie i start animacji
    creditsTrigger.addEventListener('click', () => {
        creditsOverlay.style.display = 'flex';
        
        // Pokaż overlay
        setTimeout(() => { creditsOverlay.style.opacity = '1'; }, 10);

        // --- DEFINICJA ANIMACJI W JS ---
        // Startuje z dołu (100vh), leci wysoko do góry (-150%), z zachowaniem kąta 3D
        // --- DEFINICJA ANIMACJI W JS (Wersja PŁASKA) ---
        // Startuje z dołu, leci prosto do góry
        const keyframes = [
            // Start: lekko mniejszy, przezroczysty, na dole
            { transform: 'translateY(0) scale(0.9)', opacity: 0, offset: 0 },
            
            // Wejście: pełna widoczność chwilę po starcie
            { opacity: 1, offset: 0.05 }, 
            
            // Koniec: wyjazd wysoko w górę (poza ekran), normalna skala
            // Zwiększyłem wartość translateY, żeby na pewno wyjechało całe
            { transform: 'translateY(-250%) scale(1)', opacity: 1, offset: 1 }
        ];

        const options = {
            duration: 55000, // 35 sekund
            fill: 'forwards',
            easing: 'linear'
        };

        // Uruchomienie animacji
        currentAnimation = creditsContent.animate(keyframes, options);

        // Co robić po zakończeniu
        currentAnimation.onfinish = () => {
            hideCredits();
        };
    });

    // --- LOGIKA TURBO (PRZYSPIESZANIE) ---
    const speedUp = () => {
        if (currentAnimation && currentAnimation.playState === 'running') {
            currentAnimation.updatePlaybackRate(8); // 8x szybciej!
            document.getElementById('speed-hint').style.color = '#44ff44';
            document.getElementById('speed-hint').innerText = ">>> TURBO SPEED >>>";
        }
    };

    const slowDown = () => {
        if (currentAnimation) {
            currentAnimation.updatePlaybackRate(1); // Powrót do normy
            document.getElementById('speed-hint').style.color = 'rgba(255,255,255,0.2)';
            document.getElementById('speed-hint').innerText = "Przytrzymaj ekran, aby przyspieszyć";
        }
    };

    // Obsługa myszki i dotyku
    window.addEventListener('mousedown', speedUp);
    window.addEventListener('mouseup', slowDown);
    window.addEventListener('touchstart', speedUp, {passive: true});
    window.addEventListener('touchend', slowDown);

    // Zamykanie X
    closeCredits.addEventListener('click', (e) => {
        e.stopPropagation(); // Żeby nie odpaliło kliknięcia w tło
        hideCredits();
    });

    // Zamykanie tłem
    creditsOverlay.addEventListener('click', (e) => {
        if (e.target === creditsOverlay) hideCredits();
    });
});