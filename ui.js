

window.addEventListener('load', () => {

    const loader = document.getElementById('loading-screen');
    setTimeout(() => {
        loader.classList.add('hidden');
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }, 300);


    const creditsTrigger = document.getElementById('copyright-trigger');
    const creditsOverlay = document.getElementById('credits-overlay');
    const closeCredits = document.getElementById('close-credits');
    const creditsContent = document.querySelector('.credits-content');
    
    let currentAnimation = null;

    function hideCredits() {
        if (currentAnimation) {
            currentAnimation.cancel();
            currentAnimation = null;
        }
        creditsOverlay.style.opacity = '0';
        setTimeout(() => { creditsOverlay.style.display = 'none'; }, 500);
    }


    creditsTrigger.addEventListener('click', () => {
        creditsOverlay.style.display = 'flex';
        
  
        setTimeout(() => { creditsOverlay.style.opacity = '1'; }, 10);


        const keyframes = [

            { transform: 'translateY(0) scale(0.9)', opacity: 0, offset: 0 },
            

            { opacity: 1, offset: 0.05 }, 
            

            { transform: 'translateY(-250%) scale(1)', opacity: 1, offset: 1 }
        ];

        const options = {
            duration: 55000,
            fill: 'forwards',
            easing: 'linear'
        };


        currentAnimation = creditsContent.animate(keyframes, options);


        currentAnimation.onfinish = () => {
            hideCredits();
        };
    });


    const speedUp = () => {
        if (currentAnimation && currentAnimation.playState === 'running') {
            currentAnimation.updatePlaybackRate(8);
            document.getElementById('speed-hint').style.color = '#44ff44';
            document.getElementById('speed-hint').innerText = ">>> TURBO SPEED >>>";
        }
    };

    const slowDown = () => {
        if (currentAnimation) {
            currentAnimation.updatePlaybackRate(1);
            document.getElementById('speed-hint').style.color = 'rgba(255,255,255,0.2)';
            document.getElementById('speed-hint').innerText = "Przytrzymaj ekran, aby przyspieszyć";
        }
    };


    window.addEventListener('mousedown', speedUp);
    window.addEventListener('mouseup', slowDown);
    window.addEventListener('touchstart', speedUp, {passive: true});
    window.addEventListener('touchend', slowDown);


    closeCredits.addEventListener('click', (e) => {
        e.stopPropagation();
        hideCredits();
    });


    creditsOverlay.addEventListener('click', (e) => {
        if (e.target === creditsOverlay) hideCredits();
    });
});