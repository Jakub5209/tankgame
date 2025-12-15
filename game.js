

const audioPaths = {
    shoot:            ['audio/shoot.wav'],
    ricochet:         ['audio/ricochet.wav'],
    explosion:        ['audio/explosion.wav'],
    missileLaunch:    ['audio/missle-launch.wav'],
    missileExplosion: ['audio/missle-explosion.wav'],
    coin:             ['audio/coin.wav', 'audio/coin2.wav', 'audio/coin3.wav', 'audio/coin4.wav'],
    powerup:          ['audio/powerup.mp3', 'audio/powerup2.wav', 'audio/powerup3.wav', 'audio/powerup4.wav'],
    win:              ['audio/win.mp3'],
    
    menuMusic:        ['audio/menu.mp3'],
    gameMusic:        ['audio/game.mp3', 'audio/game2.mp3']
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


let player1, player2;
let keys, keysP2;
let bullets, missiles, walls, powerUps, coins;
let bulletEmitter, explosionEmitter, missileEmitter;
let musicVolume = 0.5;
let currentMusic = null;
let isGameOver = false;
let lastCheckedMapId = 1;
let isInputBlocked = false;

let gameSettings = { ricochet: false, mapId: 1 };
const ENABLE_MAP_ANIMATION = true;
let stats = { p1Shots: 0, p2Shots: 0 };


let playerData = {
    volume: 0.5,
    red: {
        coins: 0,
        fireRateLvl: 0,
        maxHp: 1,
        color: 0xff5555,
        ownedColors: [0xff5555]
    },
    blue: {
        coins: 0,
        fireRateLvl: 0,
        maxHp: 1,
        color: 0x5555ff,
        ownedColors: [0x5555ff]
    }
};


const UPGRADES = {
    rateCost: 10,
    hpCost: 20,
    colorCost: 25,
    maxRateLvl: 5,
    maxHp: 3,
    baseFireRate: 600,
    rateStep: 80
};


const PALETTES = {
    red: [0xff5555, 0xff0000, 0xff00ff, 0x800000, 0xffa500],
    blue: [0x5555ff, 0x0000ff, 0x00ffff, 0x2abd84, 0x10e325]
};



window.onload = function() {
    loadData();
    initShopUI();
    updateShopUI();

    const slider = document.getElementById('music-slider');
    if (slider) {
        slider.value = playerData.volume;
        slider.addEventListener('input', function(e) {
            musicVolume = parseFloat(e.target.value);
            playerData.volume = musicVolume;
            if (currentMusic && currentMusic.isPlaying) {
                currentMusic.setVolume(musicVolume);
            }
            saveData();
        });
    }

    setInterval(function checkMapSelectionAndUpdateGlobal() {

        const menuElement = document.getElementById('main-menu');


        if (menuElement.style.display == 'flex') {
            return;
        }


        const mapSelectElement = document.getElementById('map-select');
        if (!mapSelectElement) return;

        const currentSelection = parseInt(mapSelectElement.value);


        if (currentSelection !== lastCheckedMapId) {

            

            lastCheckedMapId = currentSelection;
            gameSettings.mapId = currentSelection;
            

            walls.clear(true, true); 
            

            buildMapFromData(walls, this, gameSettings.mapId);
        }
    }, 1000);
};

function loadData() {
    const saved = localStorage.getItem('tank_duels_data');
    if (saved) {
        const parsed = JSON.parse(saved);

        playerData = { ...playerData, ...parsed };
        

        playerData.red = { ...playerData.red, ...parsed.red };
        playerData.blue = { ...playerData.blue, ...parsed.blue };
    }
    musicVolume = playerData.volume;
}

function saveData() {
    localStorage.setItem('tank_duels_data', JSON.stringify(playerData));
    updateShopUI();
}



function initShopUI() {

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
        

        box.onclick = () => tryBuyOrSelectColor(who, col);
        

        box.id = `col-${who}-${col}`;
        container.appendChild(box);
    });
}

function updateShopUI() {
    ['red', 'blue'].forEach(who => {
        const data = playerData[who];
        

        document.getElementById(`shop-coins-${who}`).innerText = data.coins;
        

        const rateBtn = document.getElementById(`buy-rate-${who}`);
        document.getElementById(`lvl-rate-${who}`).innerText = data.fireRateLvl;
        const percent = (data.fireRateLvl / UPGRADES.maxRateLvl) * 100;
        document.getElementById(`bar-rate-${who}`).style.width = `${percent}%`;

        if (data.fireRateLvl >= UPGRADES.maxRateLvl) {
            rateBtn.innerText = "MAX POZIOM";
            rateBtn.disabled = true;
        } else {
            rateBtn.innerText = `UPGRADE (${UPGRADES.rateCost}$)`;
            rateBtn.disabled = false;
        }


        const hpBtn = document.getElementById(`buy-hp-${who}`);
        document.getElementById(`val-hp-${who}`).innerText = data.maxHp;

        if (data.maxHp >= UPGRADES.maxHp) {
            hpBtn.innerText = "MAX HP";
            hpBtn.disabled = true;
        } else {
            hpBtn.innerText = `UPGRADE (${UPGRADES.hpCost}$)`;
            hpBtn.disabled = false;
        }


        PALETTES[who].forEach(col => {
            const box = document.getElementById(`col-${who}-${col}`);
            const isOwned = data.ownedColors.includes(col);
            const isSelected = data.color === col;

            box.className = 'color-box';
            if (isSelected) box.classList.add('selected');
            if (isOwned) box.classList.add('owned');
            else box.classList.add('locked');
            
            if(!isOwned) box.title = `Kup: ${UPGRADES.colorCost} coins`;
            else box.title = "Wybierz";
        });
    });
}

function buyUpgrade(who, type) {
    const data = playerData[who];

    const btn = window.event.currentTarget; 
    
    if (type === 'rate') {
        if (data.fireRateLvl < UPGRADES.maxRateLvl && data.coins >= UPGRADES.rateCost) {
            data.coins -= UPGRADES.rateCost;
            data.fireRateLvl++;
            saveData();
            triggerShopConfetti(btn, '#00e676');
        }
    } else if (type === 'hp') {
        if (data.maxHp < UPGRADES.maxHp && data.coins >= UPGRADES.hpCost) {
            data.coins -= UPGRADES.hpCost;
            data.maxHp++;
            saveData();
            triggerShopConfetti(btn, '#ff5555');
        }
    }
}

function tryBuyOrSelectColor(who, colorInt) {
    const data = playerData[who];
    const box = window.event.currentTarget;

    if (data.ownedColors.includes(colorInt)) {
        data.color = colorInt;
        saveData();
        return;
    }

    if (data.coins >= UPGRADES.colorCost) {
        data.coins -= UPGRADES.colorCost;
        data.ownedColors.push(colorInt);
        data.color = colorInt;
        saveData();

        triggerShopConfetti(box, '#' + colorInt.toString(16).padStart(6, '0')); 
    } else {
        alert("Za mało monet!");
    }
}


function triggerShopConfetti(element, color = 'gold') {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'shop-particle';
        p.style.left = centerX + 'px';
        p.style.top = centerY + 'px';
        p.style.backgroundColor = color;
        

        const angle = Math.random() * Math.PI * 2;
        const velocity = 30 + Math.random() * 50;
        const tx = Math.cos(angle) * velocity + 'px';
        const ty = Math.sin(angle) * velocity + 'px';
        
        p.style.setProperty('--tx', tx);
        p.style.setProperty('--ty', ty);

        document.body.appendChild(p);
        setTimeout(() => p.remove(), 800);
    }
}




function startGame() {

    gameSettings.ricochet = document.getElementById('ricochet-toggle').checked;
    gameSettings.speedMode = document.getElementById('speed-toggle').checked;
    gameSettings.mapId = parseInt(document.getElementById('map-select').value);


    const menuWrapper = document.getElementById('menu-wrapper');
    menuWrapper.classList.add('fade-out');
    document.getElementById('game-over-screen').style.display = 'none';


    const scene = game.scene.scenes[0];
    if (scene) {

        if (walls && walls.getChildren) {
            scene.tweens.add({
                targets: walls.getChildren(),
                scale: 0,
                duration: 600,
                ease: 'Back.in'
            });
        }

        if (player1 && player1.active) scene.tweens.add({ targets: player1, scale: 0, duration: 400 });
        if (player2 && player2.active) scene.tweens.add({ targets: player2, scale: 0, duration: 400 });
    }


    setTimeout(() => {

        menuWrapper.style.display = 'none';
        menuWrapper.classList.remove('fade-out');
        
        if(scene) scene.scene.restart();
    }, 800);
}

function showMenu() {
    updateShopUI();
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('menu-wrapper').style.display = 'flex';
    
    const scene = game.scene.getScene('default');
    if(scene) playMusic(scene, 'menuMusic');
}

function restartMatch() {
    startGame();
}



function preload() {
    for (const [key, value] of Object.entries(audioPaths)) {
        if (value === 'none') continue;
        const paths = Array.isArray(value) ? value : [value];
        paths.forEach((path, index) => {
            if (path !== 'none') this.load.audio(`${key}_${index}`, path);
        });
    }
}


function playSound(scene, key) {
    const configValue = audioPaths[key];
    if (!configValue || configValue === 'none') return;
    const paths = Array.isArray(configValue) ? configValue : [configValue];
    const validPaths = paths.filter(p => p !== 'none');
    if (validPaths.length > 0) {
        const randomIndex = Phaser.Math.Between(0, validPaths.length - 1);
        const assetKey = `${key}_${randomIndex}`;
        if (scene.sound.get(assetKey) || scene.cache.audio.exists(assetKey)) {
             scene.sound.play(assetKey, { volume: 0.8 });
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
    

    const shouldUseAnimation = ENABLE_MAP_ANIMATION && !document.getElementById('menu-wrapper').style.display.includes('flex');


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


    const isGameplay = document.getElementById('menu-wrapper').style.display === 'none';

    if (!isGameplay) {

        buildMapFromData(walls, this, gameSettings.mapId);
        playMusic(this, 'menuMusic');
        isInputBlocked = true; 
    } else {

        playMusic(this, 'gameMusic');
        
        if (shouldUseAnimation) {

            buildMapWithAnimation(walls, this, gameSettings.mapId, () => startCountdown(this));
        } else {

            buildMapFromData(walls, this, gameSettings.mapId);
            startCountdown(this);
        }
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


    moveTank(this, player2, keysP2.up, keysP2.down, keysP2.left, keysP2.right);
    

    if (this.input.activePointer.isDown) tryFire(this, player2, 'blue', time);

    updateShieldEffect(player1);
    updateShieldEffect(player2);

    missiles.getChildren().forEach(missile => {
        if(missile.active) updateMissileLogic(missile, time);
    });

    [player1, player2].forEach(p => {
        if (p.active) {
            const hearts = p.getData('activeHearts');
            if (hearts && hearts.length > 0) {
                const count = hearts.length;
                const spacing = 20;
                const totalWidth = (count - 1) * spacing;
                const startX = p.x - (totalWidth / 2);
                
                hearts.forEach((h, index) => {
                    h.x = startX + (index * spacing);
                    h.y = p.y - 40;
                });
            }
        }
    });
}



function setupCollisions(scene) {
    scene.physics.add.collider([player1, player2], walls);
    scene.physics.add.collider(player1, player2);


    scene.physics.add.collider(bullets, walls, (bullet, wall) => {
        if (!bullet.active) return;
        

        if (bullet.getData('isBreaker')) {
            playSound(scene, 'explosion');
            createSparks(wall.x, wall.y, 0xaaaaaa);
            wall.destroy();
            recycleBullet(bullet);
            return;
        }


        if (gameSettings.ricochet) {
            playSound(scene, 'ricochet');
            createSparks(bullet.x, bullet.y, 0xffff00);
        } else {

            createSparks(bullet.x, bullet.y, 0xffff00);
            recycleBullet(bullet);
        }
    });

    scene.physics.add.collider(missiles, walls, (m) => { if(m.active) createSparks(m.x, m.y, 0xffaa00); });
    

    scene.physics.world.on('worldbounds', (body) => {
        const obj = body.gameObject;
        if (obj && obj.getData && obj.getData('isBullet') && obj.active) {

            if (obj.getData('isBreaker')) {
                recycleBullet(obj);
                return;
            }

            if (gameSettings.ricochet) {
                playSound(scene, 'ricochet');
                createSparks(body.x, body.y, 0xffff00);
            } else recycleBullet(obj);
        }
    });

    scene.physics.add.overlap(bullets, [player1, player2], handleHit, null, scene);
    
    scene.physics.add.overlap(missiles, [player1, player2], (player, missile) => {
        if(!missile.active || !player.active) return;
        if (scene.time.now - missile.getData('spawnTime') < 500 && missile.getData('owner') === player.getData('id')) return;
        
        playSound(scene, 'missileExplosion');
        createTankExplosion(missile.x, missile.y); 
        missile.destroy(); 
        handleHit(player, { active: true }); 
    }, null, scene);

    scene.physics.add.overlap([player1, player2], powerUps, collectPowerUp, null, scene);
    scene.physics.add.overlap([player1, player2], coins, collectCoin, null, scene);
}

function createTank(scene, x, y, texture, id, color, hp, fireRate) {
    let tank = scene.physics.add.sprite(x, y, texture);
    tank.setCollideWorldBounds(true);
    tank.setDrag(800); 
    tank.setDamping(false);
    tank.body.setSize(30, 30);
    tank.setTint(color); 
    

    const baseSpeed = gameSettings.speedMode ? 400 : 220;
    const rotSpeed = gameSettings.speedMode ? 350 : 320;

    tank.setData({ 
        id: id, 
        colorHex: color, 
        speed: baseSpeed,     
        rotSpeed: rotSpeed,
        activeAmmo: 0,
        maxAmmo: 3,
        fireDelay: fireRate, 
        lastFired: 0,
        hp: hp,           
        hasShield: false,
        hasBreaker: 0,
        shieldVisual: null,
        nextShotIsMissile: false 
    });
    return tank;
}

function handleHit(player, bullet) {
    if (!player.active) return;
    

    if (bullet.getData && bullet.getData('owner') === player.getData('id')) {
        const currentTime = player.scene.time.now;
        const spawnTime = bullet.getData('spawnTime') || 0;
        if (currentTime - spawnTime < 150) return;
        recycleBullet(bullet); 
        return;
    }

    const scene = player.scene;


    if (player.getData('hasShield')) {
        playSound(scene, 'ricochet');
        createSparks(player.x, player.y, 0x00ffff);
        if (bullet.body) { 
            bullet.body.velocity.x *= -1.5; bullet.body.velocity.y *= -1.5;
        }
        return;
    }

    if (bullet.active && bullet.disableBody) recycleBullet(bullet);


    scene.tweens.killTweensOf(player);

    player.setAlpha(1); 
    player.setScale(1);


    let hp = player.getData('hp');
    hp--;
    player.setData('hp', hp);

    playSound(scene, 'explosion');

    const oldHearts = player.getData('activeHearts');
    if (oldHearts) {
        oldHearts.forEach(h => h.destroy());
        player.setData('activeHearts', null);
    }

    if (hp <= 0) {
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
        createSparks(player.x, player.y, 0xff0000);
        showHearts(scene, player, hp); 
        

        scene.tweens.add({
            targets: player, 
            alpha: 0.2, 
            duration: 100, 
            yoyo: true, 
            repeat: 3,
            onComplete: () => {
                if(player.active) player.setAlpha(1);
            }
        });
    }
}

function showHearts(scene, player, hpCount) {
    const hearts = [];
    

    for(let i=0; i<hpCount; i++) {
        let h = scene.add.text(0, 0, '❤️', { fontSize: '20px', resolution: 2 }).setOrigin(0.5);
        hearts.push(h);
    }


    player.setData('activeHearts', hearts);


    scene.time.delayedCall(1500, () => {

        const currentHearts = player.getData('activeHearts');
        if (currentHearts === hearts) { 
            hearts.forEach(h => h.destroy());
            player.setData('activeHearts', null);
        }
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
    const rate = player.getData('fireDelay'); 
    if (time < player.getData('lastFired') + rate) return;

    if (player.getData('nextShotIsMissile')) {
        fireMissile(scene, player, colorId, time);
        return;
    }

    if (player.getData('activeAmmo') >= player.getData('maxAmmo')) return;

    const vec = scene.physics.velocityFromRotation(player.rotation, 35);
    const mx = player.x + vec.x;
    const my = player.y + vec.y;
    
    const muzzleRect = new Phaser.Geom.Rectangle(mx-2, my-2, 4, 4);
    let blocked = false;
    walls.getChildren().forEach(w => { if(Phaser.Geom.Intersects.RectangleToRectangle(w.getBounds(), muzzleRect)) blocked = true; });
    if(blocked) return;

    player.setData('lastFired', time);
    playSound(scene, 'shoot');
    
    const bullet = bullets.get(mx, my);
    if (bullet) {

        scene.tweens.killTweensOf(bullet);

        player.setData('activeAmmo', player.getData('activeAmmo') + 1);
        bullet.setActive(true).setVisible(true);
        bullet.enableBody(true, mx, my, true, true);
        

        bullet.setAlpha(1);
        bullet.setRotation(player.rotation);
        
        bullet.setData('owner', colorId);
        bullet.setData('isBullet', true);
        bullet.setData('spawnTime', time);
        

        let currentBreakerAmmo = player.getData('breakerAmmo');
        const isBreaker = currentBreakerAmmo > 0;
        
        bullet.setData('isBreaker', isBreaker);

        if (isBreaker) {
            player.setData('breakerAmmo', currentBreakerAmmo - 1);
            if (player.getData('breakerAmmo') === 0) {
                 showFloatingText(scene, player.x, player.y - 40, "BREAKER ENDED", 0xaaaaaa);
            }

            bullet.setTexture('bullet'); 
            bullet.setTint(0xff00ff); 
            bullet.setScale(1.3);     
            bullet.setBounce(0);      
            bullet.setCollideWorldBounds(true);
            bullet.body.onWorldBounds = true;
        } else {

            bullet.setTexture('bullet');
            bullet.setTint(player.getData('colorHex'));
            bullet.setScale(1);
            
            if (gameSettings.ricochet) {
                bullet.setBounce(1).setCollideWorldBounds(true);
                bullet.body.onWorldBounds = true;
                

                scene.tweens.add({ 
                    targets: bullet, 
                    alpha: 0, 
                    duration: 500, 
                    delay: 1500, 
                    onComplete: () => recycleBullet(bullet)
                });
            } else {
                bullet.setBounce(0).setCollideWorldBounds(true);
                bullet.body.onWorldBounds = true;
            }
        }
        
        const bulletSpeed = gameSettings.speedMode ? 650 : 450;
        scene.physics.velocityFromRotation(player.rotation, bulletSpeed, bullet.body.velocity);
        
        if(colorId === 'red') stats.p1Shots++; else stats.p2Shots++;
    }
}


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
        missile.setData('destroyTime', time + 5000); 

        missile.body.velocity.x = 0;
        missile.body.velocity.y = 0;
        
        const missileSpeed = gameSettings.speedMode ? 400 : 215;
        scene.physics.velocityFromRotation(player.rotation, missileSpeed, missile.body.velocity);
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
    
    const scene = bullet.scene;

    scene.tweens.killTweensOf(bullet);

    const ownerId = bullet.getData('owner');
    let owner = (ownerId === 'red') ? player1 : player2;
    

    if (owner && owner.active) {
        let currentAmmo = owner.getData('activeAmmo');
        if (currentAmmo > 0) owner.setData('activeAmmo', currentAmmo - 1);
    }

    bullet.disableBody(true, true);
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.setAlpha(1);
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



function spawnRandomPowerUp() {
    if(isGameOver) return;
    const pos = getValidSpawnPoint();
    if(pos) {
        const typeId = Phaser.Math.Between(0, 3);
        
        let textureKey, typeStr;
        if (typeId === 0) { textureKey = 'pu_double'; typeStr = 'double'; }
        else if (typeId === 1) { textureKey = 'pu_shield'; typeStr = 'shield'; }
        else if (typeId === 2) { textureKey = 'pu_missile'; typeStr = 'missile'; }
        else if (typeId === 3) { textureKey = 'pu_health'; typeStr = 'health'; }
        else { textureKey = 'pu_breaker'; typeStr = 'breaker'; }

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
        player.setData('maxAmmo', 6);
        if(player.getData('timerDouble')) player.getData('timerDouble').remove();
        const timer = scene.time.delayedCall(5000, () => {
            if(player.active) player.setData('maxAmmo', 3);
        });
        player.setData('timerDouble', timer);
        showFloatingText(scene, player.x, player.y - 40, "DOUBLE AMMO!", 0xffff00);
        
    } else if (type === 'shield') {
        player.setData('hasShield', true);
        if(player.getData('timerShield')) player.getData('timerShield').remove();
        const timer = scene.time.delayedCall(6000, () => {
            if(player.active) player.setData('hasShield', false);
        });
        player.setData('timerShield', timer);
        showFloatingText(scene, player.x, player.y - 40, "SHIELD!", 0x00ffff);
        
    } else if (type === 'missile') {
        player.setData('nextShotIsMissile', true);
        showFloatingText(scene, player.x, player.y - 40, "MISSILE READY!", 0xff5500);
        
    } else if (type === 'breaker') { 

        player.setData('breakerAmmo', 3);

        if(player.getData('timerBreaker')) player.getData('timerBreaker').remove();
        
        showFloatingText(scene, player.x, player.y - 40, "BREAKER: 3 SHOTS!", 0xaa00aa);

    } else if (type === 'health') {
        let currentHp = player.getData('hp');

        const maxHp = playerData[player.getData('id')].maxHp;

        if (currentHp < maxHp) {

            player.setData('hp', currentHp + 1);
            

            showFloatingText(scene, player.x, player.y - 40, "+1 HP!", 0x00ff00);
            
            showHearts(scene, player, currentHp + 1);
        } else {
            showFloatingText(scene, player.x, player.y - 40, "MAX HP!", 0xcccccc);
        }
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


    drawTankModel(g, 0x888888, 0xffffff); 
    g.generateTexture('tankBase', 40, 40);


    g.clear(); g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 40, 40); g.fillStyle(0xdddddd, 1); g.fillRect(2, 2, 36, 36); g.fillStyle(0xeeeeee, 1); g.fillCircle(20, 20, 4); 
    g.generateTexture('wall', 40, 40);


    g.clear(); g.fillStyle(0xffffff, 1); g.fillCircle(5, 5, 5); 
    g.generateTexture('bullet', 10, 10); 
    g.generateTexture('particle', 10, 10);

    function drawBox(color, symbolFn) {
        g.clear(); g.lineStyle(2, 0xffffff, 1); g.fillStyle(color, 0.8); g.fillRect(0, 0, 30, 30); g.strokeRect(0, 0, 30, 30); symbolFn();
    }
    
    drawBox(0x00cc00, () => { 
        g.fillStyle(0xffffff, 1); 
        g.fillRect(13, 8, 4, 14);
        g.fillRect(8, 13, 14, 4);
    }); 
    g.generateTexture('pu_health', 30, 30);

    // Double Ammo
    drawBox(0xaaaa00, () => { g.fillStyle(0xffffff, 1); g.fillCircle(10, 15, 4); g.fillCircle(20, 15, 4); }); g.generateTexture('pu_double', 30, 30);
    // Shield
    drawBox(0x00aaaa, () => { g.lineStyle(2, 0xffffff, 1); g.strokeCircle(15, 15, 8); }); g.generateTexture('pu_shield', 30, 30);
    // Missile
    drawBox(0xaa4400, () => { g.fillStyle(0xffffff, 1); g.fillTriangle(15, 5, 25, 25, 5, 25); }); g.generateTexture('pu_missile', 30, 30);
    
    drawBox(0x800080, () => { g.fillStyle(0xffffff, 1); g.fillRect(8, 8, 14, 14); }); g.generateTexture('pu_breaker', 30, 30);


    g.clear(); g.lineStyle(4, 0x00ffff, 1); g.strokeCircle(25, 25, 20); g.generateTexture('shieldIcon', 50, 50);
    

    g.clear(); g.fillStyle(0xffaa00, 1); g.fillRect(0, 0, 16, 6); g.fillStyle(0xff0000, 1); g.fillRect(0, 0, 4, 6); g.fillStyle(0xffffff, 1); g.fillTriangle(16, 0, 16, 6, 22, 3); g.generateTexture('missile', 22, 6);

    // Coin
    g.clear(); g.lineStyle(2, 0xcc9900, 1); g.fillStyle(0xffd700, 1); g.fillCircle(10, 10, 10); g.strokeCircle(10, 10, 10); g.fillStyle(0xfff0a0, 1); g.fillCircle(7, 7, 3); g.generateTexture('coin', 20, 20);
}

function drawTankModel(g, darkColor, lightColor) {
    g.clear(); 

    g.fillStyle(0x111111, 1); g.fillRect(0, 0, 40, 8); g.fillRect(0, 32, 40, 8); 

    g.fillStyle(darkColor, 1); g.fillRect(4, 8, 32, 24); 

    g.fillStyle(lightColor, 1); g.fillCircle(20, 20, 9); 

    g.fillStyle(0x222222, 1); g.fillRect(24, 16, 16, 8);
}

function setupInputs(scene) {

    keys = scene.input.keyboard.addKeys({
        w: Phaser.Input.Keyboard.KeyCodes.W,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });


    keysP2 = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT
    });
    

    cursors = scene.input.keyboard.createCursorKeys();
}

function buildMapWithAnimation(wallsGroup, scene, mapId, onCompleteCallback) {
    const layout = mapLayouts[mapId] || mapLayouts[1];
    let createdWalls = [];


    for (let y = 0; y < layout.length; y++) {
        for (let x = 0; x < layout[y].length; x++) {
            const cell = layout[y][x];
            if (cell !== 0) {
                const wall = wallsGroup.create(x * 40 + 20, y * 40 + 20, 'wall');
                if (cell > 1) wall.setTint(cell);
                wall.setScale(0);
                

                createdWalls.push({ sprite: wall, gridX: x, gridY: y });
            }
        }
    }


    if (createdWalls.length === 0) {
        if(onCompleteCallback) onCompleteCallback();
        return;
    }


    
    scene.tweens.add({
        targets: createdWalls.map(w => w.sprite),
        scale: 1,
        duration: 300,
        ease: 'Back.out',
        delay: (target, targetKey, value, targetIndex, totalTargets, tween) => {

            const gridX = (target.x - 20) / 40;
            return gridX * 50;
        },
        onStart: (tween, targets) => {
             playSound(scene, 'coin');
        },
        onComplete: () => {
            if(onCompleteCallback) onCompleteCallback();
        }
    });
}