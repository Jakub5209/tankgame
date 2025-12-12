// --- USTAWIENIA GRY ---

// KONFIGURACJA AUDIO
// Możesz podać pojedynczą ścieżkę: 'sounds/music.mp3'
// Lub listę ścieżek (gra wybierze losowo): ['sounds/bang1.mp3', 'sounds/bang2.mp3']
// Lub 'none', aby wyłączyć.

const audioPaths = {
    // Efekty dźwiękowe
    shoot:            ['audio/shoot.wav'], // Np. ['sfx/shoot1.mp3', 'sfx/shoot2.mp3']
    ricochet:         ['audio/ricochet.wav'],
    explosion:        ['audio/explosion.wav'],
    missileLaunch:    ['audio/missle-launch.wav'],
    missileExplosion: ['audio/missle-explosion.wav'],
    coin:             ['audio/coin.wav', 'audio/coin2.wav', 'audio/coin3.wav', 'audio/coin4.wav'],
    powerup:          ['audio/powerup.mp3', 'audio/powerup2.wav', 'audio/powerup3.wav', 'audio/powerup4.wav'],
    win:              ['audio/win.mp3'],
    
    // Muzyka
    menuMusic:        ['audio/menu.mp3'], // Muzyka w menu głównym
    gameMusic:        ['audio/game.mp3']  // Muzyka podczas walki
};

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#383838',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// --- ZMIENNE GLOBALNE ---
let player1, player2;
let cursors, keys;
let bullets, missiles, walls, powerUps, coins;
let bulletEmitter, explosionEmitter, missileEmitter;

// Zmienna dla głośności muzyki (domyślnie 0.5)
let musicVolume = 0.5;

// Zarządzanie muzyką
let currentMusic = null; 

let gameSettings = {
    ricochet: false,
    mapId: 1
};

let stats = {
    p1Shots: 0,
    p2Shots: 0
};

let coinBank = { red: 0, blue: 0 };
let isGameOver = false;
let isInputBlocked = false; // Blokada sterowania (np. podczas odliczania)

const BASE_MAX_AMMO = 5;
const FIRE_RATE = 150;

// --- STEROWANIE HTML & LOCAL STORAGE ---

window.onload = function() {
    loadCoins();
    updateCoinDisplay();


    // OBSŁUGA SUWAKA GŁOŚNOŚCI
    const slider = document.getElementById('music-slider');
    if (slider) {
        slider.addEventListener('input', function(e) {
            musicVolume = parseFloat(e.target.value);
            // Jeśli muzyka gra, zaktualizuj jej głośność natychmiast
            if (currentMusic && currentMusic.isPlaying) {
                currentMusic.setVolume(musicVolume);
            }
        });
    }
};

function loadCoins() {
    const r = localStorage.getItem('tank_coins_red');
    const b = localStorage.getItem('tank_coins_blue');
    if(r) coinBank.red = parseInt(r);
    if(b) coinBank.blue = parseInt(b);
}

function saveCoins() {
    localStorage.setItem('tank_coins_red', coinBank.red);
    localStorage.setItem('tank_coins_blue', coinBank.blue);
    updateCoinDisplay();
}

function updateCoinDisplay() {
    const rDisplay = document.getElementById('coin-display-red');
    const bDisplay = document.getElementById('coin-display-blue');
    if(rDisplay) rDisplay.innerText = coinBank.red;
    if(bDisplay) bDisplay.innerText = coinBank.blue;
}

function startGame() {
    gameSettings.ricochet = document.getElementById('ricochet-toggle').checked;
    gameSettings.mapId = parseInt(document.getElementById('map-select').value);

    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';

    const scene = game.scene.getScene('default');
    if(scene) {
        scene.scene.restart();
        // Restartowanie sceny wywoła create(), które obsłuży muzykę i odliczanie
    }
}

function showMenu() {
    updateCoinDisplay(); 
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    
    // Przełącz muzykę na menu
    const scene = game.scene.getScene('default');
    if(scene) playMusic(scene, 'menuMusic');
}

function restartMatch() {
    startGame();
}

// --- SILNIK PHASER ---

function preload() {
    // Ładowanie dźwięków (obsługa tablic i pojedynczych stringów)
    for (const [key, value] of Object.entries(audioPaths)) {
        if (value === 'none') continue;
        
        const paths = Array.isArray(value) ? value : [value];
        
        paths.forEach((path, index) => {
            // Rejestrujemy jako klucz_0, klucz_1 itd.
            if (path !== 'none') {
                this.load.audio(`${key}_${index}`, path);
            }
        });
    }
}

// Helper: Gra losowy dźwięk z listy
function playSound(scene, key) {
    const configValue = audioPaths[key];
    if (!configValue || configValue === 'none') return;
    
    const paths = Array.isArray(configValue) ? configValue : [configValue];
    // Filtrujemy 'none' jeśli ktoś wpisał ['plik.mp3', 'none']
    const validPaths = paths.filter(p => p !== 'none');
    
    if (validPaths.length > 0) {
        // Losujemy indeks z oryginalnej tablicy (bo tak ładowaliśmy w preload)
        // Musimy wylosować indeks, który faktycznie istnieje.
        const maxIndex = paths.length; 
        const randomIndex = Phaser.Math.Between(0, maxIndex - 1);
        
        // Sprawdź czy asset istnieje w cache Phasera (dla bezpieczeństwa)
        const assetKey = `${key}_${randomIndex}`;
        if (scene.sound.get(assetKey) || scene.cache.audio.exists(assetKey)) {
             scene.sound.play(assetKey);
        }
    }
}

// Helper: Obsługa muzyki (loop, stop previous)
function playMusic(scene, key) {
    // Zatrzymaj obecną muzykę
    if (currentMusic) {
        currentMusic.stop();
        currentMusic = null;
    }

    const configValue = audioPaths[key];
    if (!configValue || configValue === 'none') return;

    const paths = Array.isArray(configValue) ? configValue : [configValue];
    const validPaths = paths.filter(p => p !== 'none');

    if (validPaths.length > 0) {
        const randomIndex = Phaser.Math.Between(0, paths.length - 1);
        const assetKey = `${key}_${randomIndex}`;
        
        if (scene.cache.audio.exists(assetKey)) {
            // TU ZMIANA: volume: musicVolume
            currentMusic = scene.sound.add(assetKey, { loop: true, volume: musicVolume });
            currentMusic.play();
        }
    }
}

function create() {
    isGameOver = false;
    isInputBlocked = true; // Blokujemy ruch na start (czeka na odliczanie)
    
    stats.p1Shots = 0;
    stats.p2Shots = 0;

    createDetailedGraphics(this);
    createParticleSystems(this);

    walls = this.physics.add.staticGroup();
    buildMapFromData(walls, this, gameSettings.mapId);

    player1 = createTank(this, 60, 60, 'tankRed', 'red');
    player2 = createTank(this, 740, 540, 'tankBlue', 'blue');
    player2.setAngle(180);

    bullets = this.physics.add.group({ defaultKey: 'bulletRed', maxSize: 60, collideWorldBounds: true });
    missiles = this.physics.add.group({ defaultKey: 'missile', maxSize: 10, collideWorldBounds: true, bounceX: 1, bounceY: 1 });
    powerUps = this.physics.add.group();
    coins = this.physics.add.group(); 

    // Timery spawnu (startują, ale gracze są zablokowani, więc ok)
    this.time.addEvent({ delay: 10000, callback: spawnRandomPowerUp, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 4000, callback: spawnRandomCoin, callbackScope: this, loop: true });

    setupCollisions(this);
    setupInputs(this);

    // --- LOGIKA STARTU (MENU vs GRA) ---
    // Sprawdzamy czy div menu jest widoczny. Jeśli tak, to znaczy że to pierwsze załadowanie strony.
    // Jeśli nie, to znaczy że zrobiliśmy restart() z poziomu kodu (czyli zaczynamy grę).
    const menuVisible = document.getElementById('main-menu').style.display !== 'none';

    if (menuVisible) {
        // Jesteśmy w menu (pierwsze odpalenie)
        playMusic(this, 'menuMusic');
        isInputBlocked = true; 
    } else {
        // Właśnie kliknięto START lub RESTART
        playMusic(this, 'gameMusic');
        startCountdown(this);
    }
}

function startCountdown(scene) {
    isInputBlocked = true;
    
    // Styl tekstu
    const style = {
        fontSize: '120px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 8,
        shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 4, stroke: true, fill: true }
    };

    let cx = scene.cameras.main.centerX;
    let cy = scene.cameras.main.centerY;

    // Lista kroków odliczania
    const events = [
        { text: '3', color: '#ff0000' },
        { text: '2', color: '#ff8800' },
        { text: '1', color: '#00ff00' },
        { text: 'FIGHT!', color: '#ffffff' }
    ];

    // Pętla tworząca zdarzenia co 1 sekundę
    events.forEach((item, index) => {
        
        // Używamy time.delayedCall zamiast timeline - to działa w każdej wersji
        scene.time.delayedCall(index * 1000, () => {
            
            // 1. Dźwięk
            if (index < 3) playSound(scene, 'ricochet'); 
            else playSound(scene, 'powerup');

            // 2. Wyświetl tekst
            let t = scene.add.text(cx, cy, item.text, style)
                .setOrigin(0.5)
                .setColor(item.color)
                .setScale(0); // Startujemy od zera, żeby powiększyć

            // 3. Animacja powiększania i znikania (Tween)
            scene.tweens.add({
                targets: t,
                scale: 1.5,
                alpha: 0,
                duration: 900,
                ease: 'Power2',
                onComplete: () => {
                    t.destroy(); // Posprzątaj tekst po animacji
                    
                    // Jeśli to był ostatni krok, odblokuj sterowanie
                    if (index === events.length - 1) {
                        isInputBlocked = false;
                    }
                }
            });

        }, [], scene);
    });
}

function update(time, delta) {
    if (isGameOver) return;

    // Jeśli odliczanie trwa, nie ruszaj czołgami
    if (isInputBlocked) return;

    moveTank(this, player1, keys.w, keys.s, keys.a, keys.d);
    if (keys.space.isDown) tryFire(this, player1, 'red', time);

    moveTank(this, player2, cursors.up, cursors.down, cursors.left, cursors.right);
    if (keys.shift.isDown) tryFire(this, player2, 'blue', time);

    updateShieldEffect(player1);
    updateShieldEffect(player2);

    missiles.getChildren().forEach(missile => {
        if(missile.active) updateMissileLogic(missile, time);
    });
}

function setupCollisions(scene) {
    scene.physics.add.collider(player1, walls);
    scene.physics.add.collider(player2, walls);
    scene.physics.add.collider(player1, player2);

    scene.physics.add.collider(bullets, walls, (bullet, wall) => {
        if (!bullet.active) return;
        if (!gameSettings.ricochet) {
            createSparks(bullet.x, bullet.y, bullet.getData('color'));
            recycleBullet(bullet);
        } else {
            playSound(scene, 'ricochet');
            createSparks(bullet.x, bullet.y, 0xffff00);
        }
    });

    scene.physics.add.collider(missiles, walls, (missile, wall) => {
        if(missile.active) createSparks(missile.x, missile.y, 0xffaa00);
    });

    scene.physics.world.on('worldbounds', (body) => {
        const obj = body.gameObject;
        if (obj && obj.getData && obj.getData('isBullet') && obj.active) {
            if (gameSettings.ricochet) {
                playSound(scene, 'ricochet');
                createSparks(body.x, body.y, 0xffff00);
            } else recycleBullet(obj);
        }
    });

    scene.physics.add.overlap(bullets, [player1, player2], handleHit, null, scene);
    
    scene.physics.add.overlap(missiles, [player1, player2], (player, missile) => {
        if(!missile.active || !player.active) return;
        
        const launchTime = missile.getData('spawnTime');
        const timeElapsed = scene.time.now - launchTime;
        const ownerId = missile.getData('owner');
        const playerId = player.getData('id');

        if (timeElapsed < 500 && ownerId === playerId) return; 
        
        playSound(scene, 'missileExplosion');
        createTankExplosion(missile.x, missile.y); 
        missile.destroy(); 
        handleHit(player, { active: true }); 

    }, null, scene);

    scene.physics.add.overlap([player1, player2], powerUps, collectPowerUp, null, scene);
    scene.physics.add.overlap([player1, player2], coins, collectCoin, null, scene);
}

function setupInputs(scene) {
    cursors = scene.input.keyboard.createCursorKeys();
    keys = scene.input.keyboard.addKeys({
        w: Phaser.Input.Keyboard.KeyCodes.W,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });
}

// --- CZOŁG I FIZYKA ---

function createTank(scene, x, y, texture, id) {
    let tank = scene.physics.add.sprite(x, y, texture);
    tank.setCollideWorldBounds(true);
    tank.setDrag(800); 
    tank.setDamping(false);
    tank.body.setSize(30, 30);
    
    tank.setData({ 
        id: id, 
        speed: 220,     
        rotSpeed: 220,
        activeAmmo: 0,
        maxAmmo: BASE_MAX_AMMO, 
        lastFired: 0,
        hasShield: false,
        shieldVisual: null,
        nextShotIsMissile: false 
    });
    return tank;
}

function moveTank(scene, player, up, down, left, right) {
    if(!player.active) return;
    
    player.setAngularVelocity(0);
    player.setAcceleration(0);

    if (left.isDown) player.setAngularVelocity(-player.getData('rotSpeed'));
    else if (right.isDown) player.setAngularVelocity(player.getData('rotSpeed'));

    player.setVelocity(0);
    if (up.isDown) scene.physics.velocityFromRotation(player.rotation, player.getData('speed'), player.body.velocity);
    else if (down.isDown) scene.physics.velocityFromRotation(player.rotation, -player.getData('speed'), player.body.velocity);
}

function tryFire(scene, player, colorId, time) {
    if (!player.active) return;
    if (time < player.getData('lastFired') + FIRE_RATE) return;

    if (player.getData('nextShotIsMissile')) {
        fireMissile(scene, player, colorId, time);
        return;
    }

    let currentAmmo = player.getData('activeAmmo');
    let maxAmmo = player.getData('maxAmmo');
    if (currentAmmo >= maxAmmo) return;

    const vec = scene.physics.velocityFromRotation(player.rotation, 35);
    const mx = player.x + vec.x;
    const my = player.y + vec.y;

    if (isMuzzleBlocked(mx, my)) return;

    player.setData('lastFired', time);
    playSound(scene, 'shoot');
    fireBulletActual(scene, player, colorId, mx, my);
}

function isMuzzleBlocked(mx, my) {
    const muzzleRect = new Phaser.Geom.Rectangle(mx - 2, my - 2, 4, 4);
    const allWalls = walls.getChildren();
    for (let wall of allWalls) {
        if (Phaser.Geom.Intersects.RectangleToRectangle(wall.getBounds(), muzzleRect)) return true;
    }
    return false;
}

function fireBulletActual(scene, player, colorId, startX, startY) {
    const bullet = bullets.get(startX, startY);
    if (bullet) {
        player.setData('activeAmmo', player.getData('activeAmmo') + 1);
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.enableBody(true, startX, startY, true, true);
        bullet.setAlpha(1);
        bullet.setRotation(player.rotation);
        bullet.setTexture(colorId === 'red' ? 'bulletRed' : 'bulletBlue');
        bullet.setData('owner', colorId);
        bullet.setData('color', colorId === 'red' ? 0xff5555 : 0x5555ff);
        bullet.setData('isBullet', true);
        
        if (gameSettings.ricochet) {
            bullet.setBounce(1);
            bullet.setCollideWorldBounds(true);
            bullet.body.onWorldBounds = true;
            scene.tweens.killTweensOf(bullet);
            scene.tweens.add({
                targets: bullet, alpha: 0, duration: 500, delay: 1500, 
                onComplete: () => { if(bullet.active) recycleBullet(bullet); }
            });
        } else {
            bullet.setBounce(0);
            bullet.setCollideWorldBounds(true);
            bullet.body.onWorldBounds = true;
        }
        scene.physics.velocityFromRotation(player.rotation, 450, bullet.body.velocity);
        if(colorId === 'red') stats.p1Shots++; else stats.p2Shots++;
    }
}

// --- RAKIETY ---

function fireMissile(scene, player, colorId, time) {
    player.setData('nextShotIsMissile', false); 
    player.setData('lastFired', time + 500); 

    const vec = scene.physics.velocityFromRotation(player.rotation, 40);
    const mx = player.x + vec.x;
    const my = player.y + vec.y;

    const missile = missiles.get(mx, my);
    if(missile) {
        playSound(scene, 'missileLaunch');
        missile.setActive(true);
        missile.setVisible(true);
        missile.enableBody(true, mx, my, true, true);
        missile.setTexture('missile');
        missile.setRotation(player.rotation);
        
        missile.setData('owner', colorId);
        missile.setData('spawnTime', time);
        missile.setData('destroyTime', time + 6000); 

        missile.body.velocity.x = 0;
        missile.body.velocity.y = 0;
        
        scene.physics.velocityFromRotation(player.rotation, 225, missile.body.velocity);
    }
}

function updateMissileLogic(missile, time) {
    const spawnTime = missile.getData('spawnTime');
    const destroyTime = missile.getData('destroyTime');
    const age = time - spawnTime;
    const ownerId = missile.getData('owner');
    
    if (time > destroyTime) {
        if (missile.active) {
            playSound(missile.scene, 'missileExplosion');
            createTankExplosion(missile.x, missile.y);
            missile.destroy();
        }
        return;
    }
    
    const scene = missile.scene; 
    if(age % 5 < 1) missileEmitter.emitParticleAt(missile.x, missile.y);

    if (age > 500) {
        let potentialTargets = [];
        const enemy = ownerId === 'red' ? player2 : player1;
        if (enemy && enemy.active) potentialTargets.push(enemy);

        const owner = ownerId === 'red' ? player1 : player2;
        if (owner && owner.active && age > 1500) {
            potentialTargets.push(owner);
        }

        let bestTarget = null;
        let closestDist = Infinity;

        potentialTargets.forEach(target => {
            const dist = Phaser.Math.Distance.Between(missile.x, missile.y, target.x, target.y);
            if (dist < closestDist) {
                closestDist = dist;
                bestTarget = target;
            }
        });

        if (!bestTarget) {
             missileEmitter.setParticleTint(0xcccccc);
             return;
        }

        missileEmitter.setParticleTint(0xff0000);
        const targetAngle = Phaser.Math.Angle.Between(missile.x, missile.y, bestTarget.x, bestTarget.y);
        let currentRotation = missile.body.velocity.angle(); 
        const rotationSpeed = 0.03; 
        const newRotation = Phaser.Math.Angle.RotateTo(currentRotation, targetAngle, rotationSpeed);
        scene.physics.velocityFromRotation(newRotation, 230, missile.body.velocity);
        missile.rotation = newRotation;
    } else {
        missile.rotation = missile.body.velocity.angle();
        missileEmitter.setParticleTint(0xcccccc); 
    }
}

function recycleBullet(bullet) {
    if (!bullet.active) return;
    const ownerId = bullet.getData('owner');
    let owner = (ownerId === 'red') ? player1 : player2;

    if (owner && owner.active) {
        let currentAmmo = owner.getData('activeAmmo');
        if (currentAmmo > 0) owner.setData('activeAmmo', currentAmmo - 1);
    }
    bullet.disableBody(true, true);
    bullet.setActive(false);
    bullet.setVisible(false);
}

function handleHit(player, bullet) {
    if (!player.active) return;

    if (player.getData('hasShield')) {
        if (bullet.body) {
            playSound(player.scene, 'ricochet');
            createSparks(bullet.x, bullet.y, 0x00ffff); 
            bullet.body.velocity.x *= -1.2; 
            bullet.body.velocity.y *= -1.2;
            let newOwner = player.getData('id');
            bullet.setData('owner', newOwner);
            bullet.setTexture(newOwner === 'red' ? 'bulletRed' : 'bulletBlue');
            return; 
        } else {
            createSparks(player.x, player.y, 0x00ffff);
            return;
        }
    }
    if (bullet.active && bullet.disableBody) recycleBullet(bullet);

    playSound(player.scene, 'explosion');
    createTankExplosion(player.x, player.y);
    player.body.enable = false; 
    
    if(player.getData('shieldVisual')) player.getData('shieldVisual').destroy();

    player.scene.tweens.add({
        targets: player, alpha: 0, scale: 1.2, duration: 300,
        onComplete: () => {
             player.setVisible(false);
             player.setActive(false);
             finishGame(player.getData('id') === 'red' ? 'blue' : 'red');
        }
    });
}

function updateShieldEffect(player) {
    if (!player.active) return;
    const shield = player.getData('shieldVisual');
    if (player.getData('hasShield')) {
        if (!shield || !shield.active) {
            const s = player.scene.add.image(player.x, player.y, 'shieldIcon');
            s.setAlpha(0.4);
            s.setScale(1.5);
            s.setBlendMode('ADD');
            player.setData('shieldVisual', s);
        } else {
            shield.x = player.x;
            shield.y = player.y;
            shield.rotation += 0.05; 
        }
    } else {
        if (shield) {
            shield.destroy();
            player.setData('shieldVisual', null);
        }
    }
}

// --- ZBIERANIE ---

function spawnRandomPowerUp() {
    if(isGameOver) return;
    const pos = getValidSpawnPoint();
    if(pos) {
        const typeId = Phaser.Math.Between(0, 2);
        let textureKey = typeId === 0 ? 'pu_double' : (typeId === 1 ? 'pu_shield' : 'pu_missile');
        let typeStr = typeId === 0 ? 'double' : (typeId === 1 ? 'shield' : 'missile');

        const pu = powerUps.create(pos.x, pos.y, textureKey);
        pu.setData('type', typeStr);
        pu.setScale(0);
        game.scene.scenes[0].tweens.add({ targets: pu, scale: 1, duration: 500, ease: 'Back.out' });
    }
}

function spawnRandomCoin() {
    if(isGameOver) return;
    const pos = getValidSpawnPoint();
    if(pos) {
        const coin = coins.create(pos.x, pos.y, 'coin');
        game.scene.scenes[0].tweens.add({
            targets: coin, scaleX: 0.1, duration: 500, yoyo: true, repeat: -1
        });
    }
}

function getValidSpawnPoint() {
    let x, y, valid = false;
    let attempts = 0;
    while(!valid && attempts < 20) {
        let gx = Phaser.Math.Between(2, 17);
        let gy = Phaser.Math.Between(2, 12);
        const layout = mapLayouts[gameSettings.mapId] || mapLayouts[1];
        if (layout[gy][gx] === 0) {
            x = gx * 40 + 20;
            y = gy * 40 + 20;
            valid = true;
        }
        attempts++;
    }
    return valid ? {x, y} : null;
}

function collectCoin(player, coin) {
    if (!coin.active) return;
    playSound(player.scene, 'coin');
    createSparks(coin.x, coin.y, 0xffd700);
    showFloatingText(player.scene, coin.x, coin.y - 20, "+1 COIN", 0xffd700);
    coin.destroy();

    if (player.getData('id') === 'red') coinBank.red++; else coinBank.blue++;
    saveCoins();
}

function collectPowerUp(player, powerUp) {
    if (!powerUp.active) return;
    const type = powerUp.getData('type');
    const scene = player.scene;
    
    playSound(scene, 'powerup');
    createSparks(powerUp.x, powerUp.y, 0xffffff);
    powerUp.destroy();

    if (type === 'double') {
        player.setData('activeAmmo', 0); 
        player.setData('maxAmmo', BASE_MAX_AMMO * 2);
        if(player.getData('timerDouble')) player.getData('timerDouble').remove();
        const timer = scene.time.delayedCall(5000, () => {
            if(player.active) player.setData('maxAmmo', BASE_MAX_AMMO);
        });
        player.setData('timerDouble', timer);
        showFloatingText(scene, player.x, player.y - 40, "DOUBLE AMMO!", 0xffff00);
    } else if (type === 'shield') {
        player.setData('hasShield', true);
        if(player.getData('timerShield')) player.getData('timerShield').remove();
        const timer = scene.time.delayedCall(10000, () => {
            if(player.active) player.setData('hasShield', false);
        });
        player.setData('timerShield', timer);
        showFloatingText(scene, player.x, player.y - 40, "SHIELD!", 0x00ffff);
    } else if (type === 'missile') {
        player.setData('nextShotIsMissile', true);
        showFloatingText(scene, player.x, player.y - 40, "MISSILE READY!", 0xff5500);
    }
}

function showFloatingText(scene, x, y, msg, color) {
    let txt = scene.add.text(x, y, msg, {
        fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);
    txt.setTint(color);
    scene.tweens.add({
        targets: txt, y: y - 30, alpha: 0, duration: 1500,
        onComplete: () => txt.destroy()
    });
}

// --- EFEKTY ---

function createParticleSystems(scene) {
    bulletEmitter = scene.add.particles(0, 0, 'particle', {
        lifespan: 200, speed: { min: 50, max: 150 }, scale: { start: 0.6, end: 0 }, blendMode: 'ADD', emitting: false
    });
    explosionEmitter = scene.add.particles(0, 0, 'particle', {
        lifespan: 800, speed: { min: 20, max: 100 }, angle: { min: 0, max: 360 }, scale: { start: 4, end: 0 }, blendMode: 'ADD', emitting: false
    });
    missileEmitter = scene.add.particles(0, 0, 'particle', {
        lifespan: 400, speed: 10, scale: { start: 0.5, end: 0 }, alpha: { start: 0.5, end: 0 }, blendMode: 'NORMAL', emitting: false
    });
}

function createSparks(x, y, color) {
    bulletEmitter.setParticleTint(color);
    bulletEmitter.emitParticleAt(x, y, 8);
}

function createTankExplosion(x, y) {
    explosionEmitter.setParticleTint(0xff6600);
    explosionEmitter.emitParticleAt(x, y, 40);
}

function finishGame(winnerId) {
    if(isGameOver) return;
    isGameOver = true;

    // TU ZMIANA: Zatrzymaj muzykę tła (gameMusic)
    if (currentMusic) {
        currentMusic.stop();
        currentMusic = null;
    }

    // Odtwórz dźwięk zwycięstwa (win)
    // Upewnij się, że w audioPaths masz ustawioną ścieżkę do 'win', a nie 'none'!
    playSound(game.scene.scenes[0], 'win');
    
    game.scene.scenes[0].time.removeAllEvents();
    
    saveCoins();

    const screen = document.getElementById('game-over-screen');
    const winnerText = document.getElementById('winner-display');
    let winnerName = (winnerId === 'red') ? "CZERWONY" : "NIEBIESKI";
    let color = (winnerId === 'red') ? "#ff5555" : "#5555ff";
    
    winnerText.innerText = `WYGRAŁ: ${winnerName}!`;
    winnerText.style.color = color;
    document.getElementById('red-stats').innerText = stats.p1Shots;
    document.getElementById('blue-stats').innerText = stats.p2Shots;
    screen.style.display = 'block';
}

function buildMapFromData(wallsGroup, scene, mapId) {
    const layout = mapLayouts[mapId] || mapLayouts[1];
    for (let y = 0; y < layout.length; y++) {
        for (let x = 0; x < layout[y].length; x++) {
            const cell = layout[y][x];
            if (cell !== 0) {
                const wall = wallsGroup.create(x * 40 + 20, y * 40 + 20, 'wall');
                if (cell > 1) wall.setTint(cell);
            }
        }
    }
}

function createDetailedGraphics(scene) {
    const g = scene.make.graphics({x: 0, y: 0, add: false});

    drawTankModel(g, 0xcc0000, 0xff5555);
    g.generateTexture('tankRed', 40, 40);
    drawTankModel(g, 0x0000cc, 0x5555ff);
    g.generateTexture('tankBlue', 40, 40);

    g.clear(); g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 40, 40); g.fillStyle(0xdddddd, 1); g.fillRect(2, 2, 36, 36); g.fillStyle(0xeeeeee, 1); g.fillCircle(20, 20, 4); g.generateTexture('wall', 40, 40);

    g.clear(); g.fillStyle(0xffffff, 1); g.fillCircle(5, 5, 5); g.generateTexture('bulletRed', 10, 10); g.generateTexture('bulletBlue', 10, 10); g.generateTexture('particle', 10, 10);

    function drawBox(color, symbolFn) {
        g.clear(); g.lineStyle(2, 0xffffff, 1); g.fillStyle(color, 0.8); g.fillRect(0, 0, 30, 30); g.strokeRect(0, 0, 30, 30); symbolFn();
    }
    drawBox(0xaaaa00, () => { g.fillStyle(0xffffff, 1); g.fillCircle(10, 15, 4); g.fillCircle(20, 15, 4); }); g.generateTexture('pu_double', 30, 30);
    drawBox(0x00aaaa, () => { g.lineStyle(2, 0xffffff, 1); g.strokeCircle(15, 15, 8); }); g.generateTexture('pu_shield', 30, 30);
    g.clear(); g.lineStyle(4, 0x00ffff, 1); g.strokeCircle(25, 25, 20); g.generateTexture('shieldIcon', 50, 50);
    drawBox(0xaa4400, () => { g.fillStyle(0xffffff, 1); g.fillTriangle(15, 5, 25, 25, 5, 25); }); g.generateTexture('pu_missile', 30, 30);
    g.clear(); g.fillStyle(0xffaa00, 1); g.fillRect(0, 0, 16, 6); g.fillStyle(0xff0000, 1); g.fillRect(0, 0, 4, 6); g.fillStyle(0xffffff, 1); g.fillTriangle(16, 0, 16, 6, 22, 3); g.generateTexture('missile', 22, 6);

    g.clear(); g.lineStyle(2, 0xcc9900, 1); g.fillStyle(0xffd700, 1); g.fillCircle(10, 10, 10); g.strokeCircle(10, 10, 10); g.fillStyle(0xfff0a0, 1); g.fillCircle(7, 7, 3); g.generateTexture('coin', 20, 20);
}

function drawTankModel(g, darkColor, lightColor) {
    g.clear(); g.fillStyle(0x111111, 1); g.fillRect(0, 0, 40, 8); g.fillRect(0, 32, 40, 8); g.fillStyle(darkColor, 1); g.fillRect(4, 8, 32, 24); g.fillStyle(lightColor, 1); g.fillCircle(20, 20, 9); g.fillStyle(0x222222, 1); g.fillRect(24, 16, 16, 8);
}