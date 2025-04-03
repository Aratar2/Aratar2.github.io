const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const TEXT = {
    drop: '💣 DROP BOMB',
    retry: '🔁 RETRY',
    intro: isMobile ? 'Tap 💣 to play' : 'Press SPACE to play'
};

const SETTINGS = {
    gooseScale: isMobile ? 0.35 : 0.3,
    cloudScaleSmall: isMobile ? 0.4 : 0.3,
    cloudScaleBig: isMobile ? 0.7 : 0.6,
    crocWidth: isMobile ? 190 : 180,
    crocHeight: isMobile ? 90 : 80,
    crocSpeedMin: isMobile ? 130 : 120,
    crocSpeedMax: isMobile ? 250 : 240,
    bombSpeed: isMobile ? 800 : 700,
    fontSize: isMobile ? 42 : 32,
    gameOverFontSize: isMobile ? 58 : 48
};

const gameHeight = isMobile ? window.innerHeight * 0.5 : window.innerHeight;

const config = {
    parent: 'gameContainer',
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: gameHeight,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
    },
    backgroundColor: '#87CEEB',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload,
        create,
        update
    }
};

window.onload = () => {
    window.game = new Phaser.Game(config);
};

let goose, bombs, crocs, clouds, scoreText, missesText, gameOverText;
let score = 0;
let misses = 0;
let gameOver = false;

function preload() {
    this.load.audio('bgm', 'music.mp3');
    this.load.image('mute', 'mute.png');
    this.load.image('unmute', 'unmute.png');
    this.load.image('goose', 'goose_sprite.png');
    this.load.image('cloud', 'cloud_sprite.png');
    this.load.image('bomb', 'bomb_sprite.png');
    this.load.image('croc', 'crocodile_sprite.png');
}

function dropBomb() {
    if (!goose || !bombs) return;
    const bomb = bombs.create(goose.x, goose.y + 40, 'bomb').setScale(0.08);
    bomb.setVelocityY(SETTINGS.bombSpeed);
}

function setupDropButton(scene) {
    const dropBtn = document.getElementById('dropButton');
    dropBtn.style.display = 'block';
    dropBtn.textContent = gameOver ? TEXT.retry : TEXT.drop;
    dropBtn.onclick = () => {
        if (gameOver) return restart.call(scene);
        dropBomb.call(scene);
    };
}

function create() {
    const introText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, TEXT.intro, {
        font: `${SETTINGS.fontSize}px Arial`,
        fill: '#000',
        backgroundColor: '#fff',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => introText.destroy());

    this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
    this.bgm.play();

    this.isMuted = false;
    this.muteButton = this.add.image(this.scale.width - 30, 30, 'unmute').setInteractive().setScale(0.5).setScrollFactor(0);
    this.muteButton.on('pointerdown', () => {
        this.isMuted = !this.isMuted;
        this.bgm.setMute(this.isMuted);
        this.muteButton.setTexture(this.isMuted ? 'mute' : 'unmute');
    });

    this.add.rectangle(this.cameras.main.centerX, this.scale.height - 20, this.scale.width, 200, 0x3fa9f5).setDepth(-1);

    clouds = this.add.group();
    crocs = this.physics.add.group();
    bombs = this.physics.add.group();

    goose = this.physics.add.sprite(this.cameras.main.centerX, 140, 'goose').setScale(SETTINGS.gooseScale).setImmovable(true);

    scoreText = this.add.text(10, 10, 'Score: 0', { font: `${SETTINGS.fontSize}px Arial`, fill: '#000' });
    missesText = this.add.text(10, 35, '\nMisses: 0', { font: '20px Arial', fill: '#000' });
    gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2, '', {
        font: `${SETTINGS.gameOverFontSize}px Arial`,
        fill: '#f00'
    });

    this.input.keyboard.on('keydown-SPACE', () => {
        if (gameOver) return restart.call(this);
        dropBomb.call(this);
    });

    if (isMobile) setupDropButton(this);

    this.time.addEvent({ delay: 1500, callback: spawnCloud, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 1000, callback: spawnCroc, callbackScope: this, loop: true });

    this.physics.add.overlap(bombs, crocs, hitCroc, null, this);
    this.physics.world.setBoundsCollision(true, true, true, false);
}

function update() {
    clouds.children.iterate(cloud => {
        if (!cloud) return;
        cloud.x -= cloud.speed;
        if (cloud.x < -cloud.displayWidth) cloud.destroy();
    });

    crocs.getChildren().forEach(croc => {
        if (croc.active && croc.x + croc.displayWidth < 0) {
            croc.destroy();
            misses++;
            missesText.setText('\nMisses: ' + misses);
            if (misses >= 3) endGame();
        }
    });

    bombs.children.iterate(bomb => {
        if (!bomb) return;
        if (bomb.y > this.scale.height) {
            bomb.destroy();
            misses++;
            missesText.setText('\nMisses: ' + misses);
            if (misses >= 3) endGame();
        }
    });
}

function spawnCloud() {
    const y = 30 + Math.random() * 150;
    const scale = Math.random() < 0.2 ? SETTINGS.cloudScaleBig : SETTINGS.cloudScaleSmall;
    const cloud = this.add.image(this.scale.width + Math.random() * 100, y, 'cloud').setScale(scale).setDepth(-1);
    cloud.speed = 1 + Math.random() * 1.5;
    clouds.add(cloud);
}

function spawnCroc() {
    const existing = crocs.getChildren().filter(c => c.active);
    const toSpawn = 5 - existing.length;
    if (toSpawn <= 0) return;

    let spawned = 0;
    for (let i = 0; i < 50 && spawned < toSpawn; i++) {
        const x = this.scale.width + Phaser.Math.Between(0, 200);
        const overlapped = crocs.getChildren().some(existing => Math.abs(existing.x - x) < 130);
        if (!overlapped) {
            const crocY = this.scale.height - 60;
            const croc = crocs.create(x, crocY, 'croc');
            croc.setImmovable(true);
            croc.body.allowGravity = false;
            croc.setDisplaySize(SETTINGS.crocWidth, SETTINGS.crocHeight);
            croc.setSize(SETTINGS.crocWidth, SETTINGS.crocHeight);
            croc.setVelocityX(-Phaser.Math.Between(SETTINGS.crocSpeedMin, SETTINGS.crocSpeedMax));
            spawned++;
        }
    }
}

function hitCroc(bomb, croc) {
    bomb.destroy();
    croc.destroy();
    score++;
    scoreText.setText('Score: ' + score);
}

function endGame() {
    endGameModal(misses); // Предполагается, что это внешняя функция
    gameOver = true;
    gameOverText.setText(`Game Over!\nFinal Score: ${score}\nPress SPACE or RETRY to restart`);
    gameOverText.setAlign('center');
    gameOverText.setOrigin(0.5);
    gameOverText.setWordWrapWidth(400);

    if (isMobile) setupDropButton(window.game.scene.keys.default);
}

function restart() {
    if (!this.bgm) {
        this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
    }
    this.bgm.play();
    this.bgm.setMute(this.isMuted);

    gameOver = false;
    score = 0;
    misses = 0;
    scoreText.setText('Score: 0');
    missesText.setText('\nMisses: 0');
    gameOverText.setText('');

    crocs.clear(true, true);
    bombs.clear(true, true);

    if (isMobile) setupDropButton(this);
}
