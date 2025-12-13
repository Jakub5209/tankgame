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
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

// Zmienne globalne
let player1, player2;
let cursors, keys;
let bullets, missiles, walls, powerUps, coins;
let bulletEmitter, explosionEmitter, missileEmitter;
let musicVolume = 0.5;
let currentMusic = null;
let isGameOver = false;
let lastCheckedMapId = 1;
let isInputBlocked = false;

let gameSettings = { ricochet: false, mapId: 1 };
let stats = { p1Shots: 0, p2Shots: 0 };

// DANE SKLEPU I GRACZA
// Struktura zapisu w localStorage
let playerData = {
    volume: 0.5,
    red: {
        coins: 0,
        fireRateLvl: 0, // 0-5
        maxHp: 1,       // 1-3
        color: 0xff5555,
        ownedColors: [0xff5555] // Lista kupionych kolorów
    },
    blue: {
        coins: 0,
        fireRateLvl: 0,
        maxHp: 1,
        color: 0x5555ff,
        ownedColors: [0x5555ff]
    }
};

// Definicje kosztów i wartości
const UPGRADES = {
    rateCost: 50,
    hpCost: 100,
    colorCost: 200,
    maxRateLvl: 5,
    maxHp: 3,
    baseFireRate: 600, // ms (im mniej tym szybciej)
    rateStep: 80       // o ile szybciej na poziom
};

// Palety kolorów do kupienia
const PALETTES = {
    red: [0xff5555, 0xff0000, 0xff00ff, 0x800000, 0xffa500],
    blue: [0x5555ff, 0x0000ff, 0x00ffff, 0x000080, 0x008080]
};

// --- ŁADOWANIE I ZAPIS (LOCAL STORAGE) ---

window.onload = function() {
    loadData();
    initShopUI();
    updateShopUI();

    // Obsługa suwaka głośności
    const slider = document.getElementById('music-slider');
    if (slider) {
        slider.value = playerData.volume;
        slider.addEventListener('input', function(e) {
            musicVolume = parseFloat(e.target.value);
            playerData.volume = musicVolume;
            if (currentMusic && currentMusic.isPlaying) {
                currentMusic.setVolume(musicVolume);
            }
            saveData(); // Zapisz volume od razu
        });
    }

    setInterval(function checkMapSelectionAndUpdateGlobal() {
        // Sprawdzamy widoczność menu - używamy 'main-menu' (zgodnie z index.html)
        const menuElement = document.getElementById('main-menu');

        // Sprawdzamy, czy referencje są dostępne I czy menu jest widoczne (display: flex)
        if (menuElement.style.display == 'flex') {
            return;
        }

        // Pobieramy aktualny wybór mapy z listy
        const mapSelectElement = document.getElementById('map-select');
        if (!mapSelectElement) return;

        const currentSelection = parseInt(mapSelectElement.value);

        // Sprawdzamy, czy ID mapy się zmieniło
        if (currentSelection !== lastCheckedMapId) {
            // Zmiana! Aktualizujemy
            
            // 1. Zapisujemy nowy stan
            lastCheckedMapId = currentSelection;
            gameSettings.mapId = currentSelection;
            
            // 2. Czyścimy stare ściany
            walls.clear(true, true); 
            
            // 3. Rysujemy nową mapę (używając globalnych referencji)
            buildMapFromData(walls, this, gameSettings.mapId);
        }
    }, 1000); // Sprawdzamy co 1000 milisekund (1 sekunda)
};

function loadData() {
    const saved = localStorage.getItem('tank_duels_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Scalanie obiektów (żeby nowe pola nie popsuły starych zapisów)
        playerData = { ...playerData, ...parsed };
        
        // Upewnij się, że obiekty podrzędne też są scalone
        playerData.red = { ...playerData.red, ...parsed.red };
        playerData.blue = { ...playerData.blue, ...parsed.blue };
    }
    musicVolume = playerData.volume;
}

function saveData() {
    localStorage.setItem('tank_duels_data', JSON.stringify(playerData));
    updateShopUI();
}

// --- LOGIKA SKLEPU ---

function initShopUI() {
    // Generowanie przycisków kolorów
    generateColorGrid('red');
    generateColorGrid('blue');
}

function generateColorGrid(who) {
    const container = document.getElementById(`colors-${who}`);
    container.innerHTML = '';
    const palette = PALETTES[who];

    palette.forEach(col => {
        const box = document.createElement('div');
        box.className = 'color-box';
        box.style.backgroundColor = '#' + col.toString(16).padStart(6, '0');
        
        // Kliknięcie w kolor
        box.onclick = () => tryBuyOrSelectColor(who, col);
        
        // Oznaczanie (ID przypiszemy dynamicznie w updateShopUI)
        box.id = `col-${who}-${col}`;
        container.appendChild(box);
    });
}

function updateShopUI() {
    ['red', 'blue'].forEach(who => {
        const data = playerData[who];
        
        // Coins
        document.getElementById(`shop-coins-${who}`).innerText = data.coins;
        
        // Fire Rate
        document.getElementById(`lvl-rate-${who}`).innerText = data.fireRateLvl;
        const percent = (data.fireRateLvl / UPGRADES.maxRateLvl) * 100;
        document.getElementById(`bar-rate-${who}`).style.width = `${percent}%`;

        // HP
        document.getElementById(`val-hp-${who}`).innerText = data.maxHp;

        // Kolory (Style klas)
        PALETTES[who].forEach(col => {
            const box = document.getElementById(`col-${who}-${col}`);
            const isOwned = data.ownedColors.includes(col);
            const isSelected = data.color === col;

            box.className = 'color-box';
            if (isSelected) box.classList.add('selected');
            if (isOwned) box.classList.add('owned');
            else box.classList.add('locked');
            
            // Tooltip z ceną dla zablokowanych
            if(!isOwned) box.title = `Kup: ${UPGRADES.colorCost} coins`;
            else box.title = "Wybierz";
        });
    });
}

function buyUpgrade(who, type) {
    const data = playerData[who];
    
    if (type === 'rate') {
        if (data.fireRateLvl < UPGRADES.maxRateLvl && data.coins >= UPGRADES.rateCost) {
            data.coins -= UPGRADES.rateCost;
            data.fireRateLvl++;
            saveData();
        }
    } else if (type === 'hp') {
        if (data.maxHp < UPGRADES.maxHp && data.coins >= UPGRADES.hpCost) {
            data.coins -= UPGRADES.hpCost;
            data.maxHp++;
            saveData();
        }
    }
}

function tryBuyOrSelectColor(who, colorInt) {
    const data = playerData[who];
    
    // 1. Jeśli już mamy, wybieramy
    if (data.ownedColors.includes(colorInt)) {
        data.color = colorInt;
        saveData();
        return;
    }

    // 2. Jeśli nie mamy, próbujemy kupić
    if (data.coins >= UPGRADES.colorCost) {
        data.coins -= UPGRADES.colorCost;
        data.ownedColors.push(colorInt);
        data.color = colorInt;
        saveData();
    } else {
        alert("Za mało monet!");
    }
}


// --- START GRY ---

function startGame() {
    gameSettings.ricochet = document.getElementById('ricochet-toggle').checked;
    gameSettings.mapId = parseInt(document.getElementById('map-select').value);

    // Ukrywamy wrapper menu
    document.getElementById('menu-wrapper').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';

    const scene = game.scene.getScene('default');
    if(scene) scene.scene.restart();
}

function showMenu() {
    updateShopUI(); // Odśwież monety po grze
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('menu-wrapper').style.display = 'flex'; // Flex, bo wrapper
    
    const scene = game.scene.getScene('default');
    if(scene) playMusic(scene, 'menuMusic');
}

function restartMatch() {
    startGame();
}

// --- SILNIK PHASER ---

function preload() {
    for (const [key, value] of Object.entries(audioPaths)) {
        if (value === 'none') continue;
        const paths = Array.isArray(value) ? value : [value];
        paths.forEach((path, index) => {
            if (path !== 'none') this.load.audio(`${key}_${index}`, path);
        });
    }
}

// Helpersy Audio
function playSound(scene, key) {
    const configValue = audioPaths[key];
    if (!configValue || configValue === 'none') return;
    const paths = Array.isArray(configValue) ? configValue : [configValue];
    const validPaths = paths.filter(p => p !== 'none');
    if (validPaths.length > 0) {
        const randomIndex = Phaser.Math.Between(0, validPaths.length - 1);
        const assetKey = `${key}_${randomIndex}`;
        if (scene.sound.get(assetKey) || scene.cache.audio.exists(assetKey)) {
             scene.sound.play(assetKey, { volume: 0.8 }); // SFX głośność
        }
    }
}

function playMusic(scene, key) {
    if (currentMusic) {
        currentMusic.stop();
        currentMusic = null;
    }
    const configValue = audioPaths[key];
    if (!configValue || configValue === 'none') return;
    const paths = Array.isArray(configValue) ? configValue : [configValue];
    const validPaths = paths.filter(p => p !== 'none');
    if (validPaths.length > 0) {
        const randomIndex = Phaser.Math.Between(0, validPaths.length - 1);
        const assetKey = `${key}_${randomIndex}`;
        if (scene.cache.audio.exists(assetKey)) {
            currentMusic = scene.sound.add(assetKey, { loop: true, volume: musicVolume });
            currentMusic.play();
        }
    }
}

function create() {
    isGameOver = false;
    isInputBlocked = true; 
    stats.p1Shots = 0;
    stats.p2Shots = 0;

    createDetailedGraphics(this);
    createParticleSystems(this);

    walls = this.physics.add.staticGroup();
    buildMapFromData(walls, this, gameSettings.mapId);

    // TWORZENIE CZOŁGÓW Z DANYMI ZE SKLEPU
    // Obliczamy szybkość strzału na podstawie levelu (bazowo np. 600ms - level*80ms)
    // Minimalny delay to np. 150ms
    const p1Delay = Math.max(150, UPGRADES.baseFireRate - (playerData.red.fireRateLvl * UPGRADES.rateStep));
    const p2Delay = Math.max(150, UPGRADES.baseFireRate - (playerData.blue.fireRateLvl * UPGRADES.rateStep));

    player1 = createTank(this, 60, 60, 'tankBase', 'red', playerData.red.color, playerData.red.maxHp, p1Delay);
    player2 = createTank(this, 740, 540, 'tankBase', 'blue', playerData.blue.color, playerData.blue.maxHp, p2Delay);
    player2.setAngle(180);

    bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 60, collideWorldBounds: true });
    missiles = this.physics.add.group({ defaultKey: 'missile', maxSize: 10, collideWorldBounds: true, bounceX: 1, bounceY: 1 });
    powerUps = this.physics.add.group();
    coins = this.physics.add.group(); 

    this.time.addEvent({ delay: 8000, callback: spawnRandomPowerUp, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 3000, callback: spawnRandomCoin, callbackScope: this, loop: true });

    setupCollisions(this);
    setupInputs(this);

    const menuVisible = document.getElementById('menu-wrapper').style.display !== 'none';
    if (menuVisible) {
        playMusic(this, 'menuMusic');
        isInputBlocked = true; 
    } else {
        playMusic(this, 'gameMusic');
        startCountdown(this);
    }
}

function startCountdown(scene) {
    isInputBlocked = true;
    const style = { fontSize: '100px', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 };
    const events = [
        { text: '3', color: '#ff0000' },
        { text: '2', color: '#ff8800' },
        { text: '1', color: '#00ff00' },
        { text: 'FIGHT!', color: '#ffffff' }
    ];
    
    events.forEach((item, index) => {
        scene.time.delayedCall(index * 1000, () => {
            if (index < 3) playSound(scene, 'ricochet'); else playSound(scene, 'powerup');
            let t = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, item.text, style)
                .setOrigin(0.5).setColor(item.color).setScale(0);
            
            scene.tweens.add({
                targets: t, scale: 1.5, alpha: 0, duration: 900, ease: 'Power2',
                onComplete: () => {
                    t.destroy();
                    if (index === events.length - 1) isInputBlocked = false;
                }
            });
        });
    });
}

function update(time, delta) {
    if (isGameOver || isInputBlocked) return;

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

// --- FIZYKA I LOGIKA HP ---

function setupCollisions(scene) {
    scene.physics.add.collider([player1, player2], walls);
    scene.physics.add.collider(player1, player2);

    scene.physics.add.collider(bullets, walls, (bullet) => {
        if (!bullet.active) return;
        if (gameSettings.ricochet) {
            playSound(scene, 'ricochet');
            createSparks(bullet.x, bullet.y, 0xffff00);
        } else {
            createSparks(bullet.x, bullet.y, bullet.getData('color'));
            recycleBullet(bullet);
        }
    });

    scene.physics.add.collider(missiles, walls, (m) => { if(m.active) createSparks(m.x, m.y, 0xffaa00); });
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
        // Ochrona przed własną rakietą zaraz po wystrzale
        if (scene.time.now - missile.getData('spawnTime') < 500 && missile.getData('owner') === player.getData('id')) return;
        
        playSound(scene, 'missileExplosion');
        createTankExplosion(missile.x, missile.y); 
        missile.destroy(); 
        handleHit(player, { active: true }); // Symulujemy trafienie
    }, null, scene);

    scene.physics.add.overlap([player1, player2], powerUps, collectPowerUp, null, scene);
    scene.physics.add.overlap([player1, player2], coins, collectCoin, null, scene);
}

// Zmodyfikowana funkcja tworzenia czołgu o parametry ze sklepu
function createTank(scene, x, y, texture, id, color, hp, fireRate) {
    let tank = scene.physics.add.sprite(x, y, texture);
    tank.setCollideWorldBounds(true);
    tank.setDrag(800); 
    tank.setDamping(false);
    tank.body.setSize(30, 30);
    tank.setTint(color); // Aplikujemy kolor ze sklepu
    
    tank.setData({ 
        id: id, 
        colorHex: color, // Zapamiętujemy kolor do pocisków
        speed: 220,     
        rotSpeed: 220,
        activeAmmo: 0,
        maxAmmo: 5,
        fireDelay: fireRate, // Szybkość strzelania ze sklepu
        lastFired: 0,
        hp: hp,           // HP ze sklepu
        hasShield: false,
        shieldVisual: null,
        nextShotIsMissile: false 
    });
    return tank;
}

function handleHit(player, bullet) {
    if (!player.active) return;
    const scene = player.scene;

    // Tarcza
    if (player.getData('hasShield')) {
        playSound(scene, 'ricochet');
        createSparks(player.x, player.y, 0x00ffff);
        if (bullet.body) { // Odbicie pocisku
            bullet.body.velocity.x *= -1.5; bullet.body.velocity.y *= -1.5;
        }
        return;
    }

    // Usuń pocisk
    if (bullet.active && bullet.disableBody) recycleBullet(bullet);

    // LOGIKA ŻYCIA (HP)
    let hp = player.getData('hp');
    hp--;
    player.setData('hp', hp);

    playSound(scene, 'explosion');

    if (hp <= 0) {
        // Śmierć
        createTankExplosion(player.x, player.y);
        player.body.enable = false; 
        if(player.getData('shieldVisual')) player.getData('shieldVisual').destroy();
        
        scene.tweens.add({
            targets: player, alpha: 0, scale: 1.2, duration: 300,
            onComplete: () => {
                 player.setVisible(false);
                 player.setActive(false);
                 finishGame(player.getData('id') === 'red' ? 'blue' : 'red');
            }
        });
    } else {
        // Obrażenia (przeżył)
        createSparks(player.x, player.y, 0xff0000);
        showHearts(scene, player, hp);
        // Efekt migania (invulnerable na chwilę)
        scene.tweens.add({
            targets: player, alpha: 0.2, duration: 100, yoyo: true, repeat: 3
        });
    }
}

// Wyświetla serduszka pod czołgiem
function showHearts(scene, player, hpCount) {
    const startX = player.x - ((hpCount-1) * 10);
    const hearts = [];
    
    for(let i=0; i<hpCount; i++) {
        let h = scene.add.text(startX + (i*20), player.y + 30, '❤️', { fontSize: '20px' }).setOrigin(0.5);
        hearts.push(h);
    }

    // Znikają po 1.5 sekundy
    scene.time.delayedCall(1500, () => {
        hearts.forEach(h => h.destroy());
    });
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
    const rate = player.getData('fireDelay'); // Pobieramy ulepszony fireRate
    if (time < player.getData('lastFired') + rate) return;

    if (player.getData('nextShotIsMissile')) {
        fireMissile(scene, player, colorId, time);
        return;
    }

    if (player.getData('activeAmmo') >= player.getData('maxAmmo')) return;

    const vec = scene.physics.velocityFromRotation(player.rotation, 35);
    const mx = player.x + vec.x;
    const my = player.y + vec.y;
    
    // Sprawdź czy lufa w ścianie
    const muzzleRect = new Phaser.Geom.Rectangle(mx-2, my-2, 4, 4);
    let blocked = false;
    walls.getChildren().forEach(w => { if(Phaser.Geom.Intersects.RectangleToRectangle(w.getBounds(), muzzleRect)) blocked = true; });
    if(blocked) return;

    player.setData('lastFired', time);
    playSound(scene, 'shoot');
    
    // Strzał
    const bullet = bullets.get(mx, my);
    if (bullet) {
        player.setData('activeAmmo', player.getData('activeAmmo') + 1);
        bullet.setActive(true).setVisible(true);
        bullet.enableBody(true, mx, my, true, true);
        bullet.setAlpha(1).setRotation(player.rotation);
        
        // Kolor pocisku taki jak czołgu
        bullet.setTexture('bullet');
        bullet.setTint(player.getData('colorHex'));
        
        bullet.setData('owner', colorId);
        bullet.setData('color', player.getData('colorHex'));
        bullet.setData('isBullet', true);
        
        if (gameSettings.ricochet) {
            bullet.setBounce(1).setCollideWorldBounds(true);
            bullet.body.onWorldBounds = true;
            scene.tweens.add({ targets: bullet, alpha: 0, duration: 500, delay: 1500, onComplete: () => recycleBullet(bullet)});
        } else {
            bullet.setBounce(0).setCollideWorldBounds(true);
            bullet.body.onWorldBounds = true;
        }
        scene.physics.velocityFromRotation(player.rotation, 450, bullet.body.velocity);
        if(colorId === 'red') stats.p1Shots++; else stats.p2Shots++;
    }
}

// ... Funkcje Rakiety bez zmian, poza zmianą textury w createDetailedGraphics ...
// Kopiuj fireMissile i updateMissileLogic ze starego kodu (są bez zmian logicznych)

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
        scene.physics.velocityFromRotation(newRotation, 225, missile.body.velocity);
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

function updateShieldEffect(player) {
    if (!player.active) return;
    const shield = player.getData('shieldVisual');
    if (player.getData('hasShield')) {
        if (!shield || !shield.active) {
            const s = player.scene.add.image(player.x, player.y, 'shieldIcon');
            s.setAlpha(0.4).setScale(1.5).setBlendMode('ADD');
            player.setData('shieldVisual', s);
        } else {
            shield.x = player.x; shield.y = player.y; shield.rotation += 0.05; 
        }
    } else {
        if (shield) { shield.destroy(); player.setData('shieldVisual', null); }
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
        pu.setData('type', typeStr).setScale(0);
        game.scene.scenes[0].tweens.add({ targets: pu, scale: 1, duration: 500, ease: 'Back.out' });
    }
}

function spawnRandomCoin() {
    if(isGameOver) return;
    const pos = getValidSpawnPoint();
    if(pos) {
        const coin = coins.create(pos.x, pos.y, 'coin');
        game.scene.scenes[0].tweens.add({ targets: coin, scaleX: 0.1, duration: 500, yoyo: true, repeat: -1 });
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
            x = gx * 40 + 20; y = gy * 40 + 20; valid = true;
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

    // Dodawanie monet do odpowiedniego portfela
    const id = player.getData('id');
    playerData[id].coins += 1;
    saveData();
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
        player.setData('maxAmmo', 10);
        if(player.getData('timerDouble')) player.getData('timerDouble').remove();
        const timer = scene.time.delayedCall(5000, () => {
            if(player.active) player.setData('maxAmmo', 5);
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
    scene.tweens.add({ targets: txt, y: y - 30, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
}

// --- GRAFIKA I EFEKTY ---

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

    if (currentMusic) { currentMusic.stop(); currentMusic = null; }
    playSound(game.scene.scenes[0], 'win');
    
    game.scene.scenes[0].time.removeAllEvents();
    
    // Dodaj bonusowe monety za wygraną
    if(winnerId === 'red') playerData.red.coins += 5; 
    else playerData.blue.coins += 5;
    saveData();

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

    // ZMIANA: Czołg "Base" jest szary/biały, aby można było go kolorować (tint) dynamicznie
    drawTankModel(g, 0x888888, 0xffffff); 
    g.generateTexture('tankBase', 40, 40);

    // Ściana
    g.clear(); g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 40, 40); g.fillStyle(0xdddddd, 1); g.fillRect(2, 2, 36, 36); g.fillStyle(0xeeeeee, 1); g.fillCircle(20, 20, 4); 
    g.generateTexture('wall', 40, 40);

    // Pocisk i cząsteczka (biała, kolorowana dynamicznie)
    g.clear(); g.fillStyle(0xffffff, 1); g.fillCircle(5, 5, 5); 
    g.generateTexture('bullet', 10, 10); 
    g.generateTexture('particle', 10, 10);

    function drawBox(color, symbolFn) {
        g.clear(); g.lineStyle(2, 0xffffff, 1); g.fillStyle(color, 0.8); g.fillRect(0, 0, 30, 30); g.strokeRect(0, 0, 30, 30); symbolFn();
    }
    // Powerupy
    drawBox(0xaaaa00, () => { g.fillStyle(0xffffff, 1); g.fillCircle(10, 15, 4); g.fillCircle(20, 15, 4); }); g.generateTexture('pu_double', 30, 30);
    drawBox(0x00aaaa, () => { g.lineStyle(2, 0xffffff, 1); g.strokeCircle(15, 15, 8); }); g.generateTexture('pu_shield', 30, 30);
    g.clear(); g.lineStyle(4, 0x00ffff, 1); g.strokeCircle(25, 25, 20); g.generateTexture('shieldIcon', 50, 50);
    drawBox(0xaa4400, () => { g.fillStyle(0xffffff, 1); g.fillTriangle(15, 5, 25, 25, 5, 25); }); g.generateTexture('pu_missile', 30, 30);
    
    // Rakieta
    g.clear(); g.fillStyle(0xffaa00, 1); g.fillRect(0, 0, 16, 6); g.fillStyle(0xff0000, 1); g.fillRect(0, 0, 4, 6); g.fillStyle(0xffffff, 1); g.fillTriangle(16, 0, 16, 6, 22, 3); g.generateTexture('missile', 22, 6);

    // Coin
    g.clear(); g.lineStyle(2, 0xcc9900, 1); g.fillStyle(0xffd700, 1); g.fillCircle(10, 10, 10); g.strokeCircle(10, 10, 10); g.fillStyle(0xfff0a0, 1); g.fillCircle(7, 7, 3); g.generateTexture('coin', 20, 20);
}

function drawTankModel(g, darkColor, lightColor) {
    g.clear(); 
    // Gąsienice
    g.fillStyle(0x111111, 1); g.fillRect(0, 0, 40, 8); g.fillRect(0, 32, 40, 8); 
    // Kadłub (teraz neutralny)
    g.fillStyle(darkColor, 1); g.fillRect(4, 8, 32, 24); 
    // Wieżyczka (teraz neutralna)
    g.fillStyle(lightColor, 1); g.fillCircle(20, 20, 9); 
    // Lufa
    g.fillStyle(0x222222, 1); g.fillRect(24, 16, 16, 8);
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