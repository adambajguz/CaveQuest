var config = {
    type: Phaser.AUTO,
    width: 64*14 + 10,
    height: 64*11 + 10,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                y: 1000
            },
            debug: false
        }
    },
    scene: {
        key: 'main',
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

const LEVEL_COUNT = 3;

var map;
var player;
var cursors;
var groundLayer, decorationLayer, keyLayer, exitDoorLayer, stillLavaLayer, lavaObjects, lavaObjectsGroup, coinObjects, coinObjectsGroup;
var groundTiles;
var scoreValText, levelValText, deathsValText, keysValText;
var muteButton, muted = false;
var score = 0;
var keys = 0;
var deaths = 0;
var levelId;

function preloadTextures(prevThis) {
    // tiles in spritesheet 
    prevThis.load.spritesheet('cave', 'assets/cave.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    prevThis.load.spritesheet('coin', 'assets/coin.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    prevThis.load.spritesheet('key', 'assets/key.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    prevThis.load.spritesheet('lava', 'assets/lava.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    prevThis.load.spritesheet('door', 'assets/door.png', {
        frameWidth: 64,
        frameHeight: 64
    });
}

function preloadAudio(prevThis) {
    prevThis.load.audio('sfx:coin', 'audio/coin.wav', {
        instances: 1
    });

    prevThis.load.audio('sfx:jump', 'audio/jump.wav', {
        instances: 1
    });

    prevThis.load.audio('sfx:key', 'audio/key.wav', {
        instances: 1
    });

    prevThis.load.audio('sfx:death', 'audio/death.wav', {
        instances: 1
    });

    prevThis.load.audio('sfx:levelEnd', 'audio/level_end.wav', {
        instances: 1
    });
}

function preload() {
    // map made with Tiled in JSON format
    var levelCounter = getLevelNumberFromLocalStorage();

    var level = (levelCounter || 0) % LEVEL_COUNT
    levelId = pad(level, 2);

    this.load.tilemapTiledJSON('map' + levelId, 'assets/level' + levelId + ".json");

    preloadTextures(this);

    // player animations
    this.load.atlas('player', 'assets/player.png', 'assets/player.json');
    this.load.atlas('mute', 'assets/mute.png', 'assets/mute.json');

    preloadAudio(this);
}

function getLevelNumberFromLocalStorage() {
    var levelNumber = localStorage.getItem("levelNumber");

    if (levelNumber == null || (typeof (levelNumber) == "undefined") || levelNumber == "undefined") {
        localStorage.setItem("levelNumber", 0);
        return 0;
    }

    return parseInt(levelNumber);
}

function setLevelNumberToLocalStorage(levelNumber) {
    localStorage.setItem("levelNumber", (levelNumber || 0) % LEVEL_COUNT);
}

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

function loadMap(prevThis) {
    // load the map 
    map = prevThis.make.tilemap({
        key: 'map' + levelId
    });

    // tiles for the ground layer
    groundTiles = map.addTilesetImage('cave');
    // var coinTiles = map.addTilesetImage('coin');

    // create the ground layer
    groundLayer = map.createDynamicLayer('World', groundTiles, 0, 0);
    // the player will collide with this layer
    groundLayer.setCollisionByExclusion([-1]);

    decorationLayer = map.createDynamicLayer('Decorations', groundTiles, 0, 0);

    prevThis.physics.world.bounds.width = groundLayer.width;
    prevThis.physics.world.bounds.height = groundLayer.height;
}

function createPlayer(prevThis) {
    // create the player sprite
    player = prevThis.physics.add.sprite(64, 64, 'player');
    player.setBounce(0.2); // our player will bounce from items
    player.setCollideWorldBounds(true); // don't go out of the map    

    // small fix to our player images, we resize the physics body object slightly
    player.body.setSize(player.width-16, player.height - 16);
    player.y = 5*64;
    // player will collide with the level tiles 
    prevThis.physics.add.collider(groundLayer, player);
}

function createPlayerAnims(prevThis) {
    //https://www.leshylabs.com/apps/sstool/
    prevThis.anims.create({
        key: 'walk',
        frames: prevThis.anims.generateFrameNames('player', {
            prefix: 'p1_walk',
            start: 1,
            end: 6,
            zeroPad: 2
        }),
        frameRate: 10,
        repeat: -1
    });

    prevThis.anims.create({
        key: 'idle',
        frames: prevThis.anims.generateFrameNames('player', {
            prefix: 'p1_stand',
            start: 1,
            end: 2,
            zeroPad: 2
        }),
        frameRate: 4,
        repeat: -1
    });
}


function createMuteStates(prevThis) {
    //https://www.leshylabs.com/apps/sstool/
    prevThis.anims.create({
        key: 'muted',
        frames: [{key: 'mute', frame: 'muted'}],
        frameRate: 10,
    });
    prevThis.anims.create({
        key: 'unmuted',
        frames: [{key: 'mute', frame: 'unmuted'}],
        frameRate: 10,
    });

    prevThis.anims.create({
        key: 'mutedHover',
        frames: [{key: 'mute', frame: 'mutedHover'}],
        frameRate: 10,
    });
    prevThis.anims.create({
        key: 'unmutedHover',
        frames: [{key: 'mute', frame: 'unmutedHover'}],
        frameRate: 10,
    });
}


function createCoins(prevThis) {
    // coin image used as tileset
    // add coins as tiles
    //coinLayer = map.createDynamicLayer('Coins', coinTiles, 0, 0);
    prevThis.anims.create({
        key: 'spin',
        frames: prevThis.anims.generateFrameNumbers('coin', {
            start: 0,
            end: 2
        }),
        frameRate: 4,
        repeat: -1
    });


    coinObjects = map.createFromObjects('CoinsObj', 101, {
        key: 'coin'
    });

    coinObjectsGroup = prevThis.physics.add.staticGroup({});

    coinObjects.forEach(coin => {
        let obj = coinObjectsGroup.create(coin.x, coin.y, 'coin');
        obj.body.width = coin.width;
        obj.body.height = coin.height;
        obj.visible = true;
        coin.visible = false;
        prevThis.anims.play('spin', obj);

    });
    coinObjectsGroup.refresh(); //physics body needs to refresh

    prevThis.physics.add.overlap(player, coinObjectsGroup, collectCoin, null, prevThis);

}
function createLava(prevThis) {
    var lavaTiles = map.addTilesetImage('lava');
    stillLavaLayer = map.createDynamicLayer('Lava', lavaTiles, 0, 0);

    prevThis.anims.create({
        key: 'lavaAnim',
        frames: prevThis.anims.generateFrameNumbers('lava', {
            start: 0,
            end: 2
        }),
        frameRate: 3,
        repeat: -1
    });

    // console.log(map);

    lavaObjects = map.createFromObjects('LavaObj', 106, {
        key: 'lava'
    });

    lavaObjectsGroup = prevThis.physics.add.staticGroup({});

    lavaObjects.forEach(coin => {
        let obj = lavaObjectsGroup.create(coin.x, coin.y, 'lava');
        obj.body.width = coin.width;
        obj.body.height = coin.height;
        obj.visible = true;
        coin.visible = false;
        prevThis.anims.play('lavaAnim', obj);

    });
    lavaObjectsGroup.refresh(); //physics body needs to refresh

    prevThis.physics.add.overlap(player, lavaObjectsGroup, lavaDeath, null, prevThis);

}

function createKeys(prevThis) {
    var keyTiles = map.addTilesetImage('key');
    // add coins as tiles
    keyLayer = map.createDynamicLayer('Keys', keyTiles, 0, 0);

    // coinLayer.setTileIndexCallback(101, collectCoin, this);
    // when the player overlaps with a tile with index 101, collectCoin 
    // will be called
    // this.physics.add.overlap(player, coinLayer);

    keyLayer.setTileIndexCallback(105, collectKey, prevThis);
    // when the player overlaps with a tile with index 101, collectCoin 
    // will be called    
    prevThis.physics.add.overlap(player, keyLayer);
}

function createExitDoor(prevThis) {
    var doorTiles = map.addTilesetImage('door');
    exitDoorLayer = map.createDynamicLayer('ExitDoor', doorTiles, 0, 0);

    exitDoorLayer.setTileIndexCallback(110, exitLevel, prevThis);
}

function createScoreText(prevThis) {
    // Add Text to top of game.
    var textStyle_Key = { font: "bold 14px sans-serif", fill: "#46c0f9", align: "center" };
    var textStyle_Value = { font: "bold 18px sans-serif", fill: "#fff", align: "center" };

    var textStyleDeads_Key = { font: "bold 14px sans-serif", fill: "#B00020", align: "center" };
    var textStyleDeads_Value = { font: "bold 18px sans-serif", fill: "#B00020", align: "center" };

    var scoreText = prevThis.add.text(15, 38, "SCORE", textStyle_Key);
    scoreValText = prevThis.add.text(80, 36, score.toString(), textStyle_Value);

    var levelText = prevThis.add.text(21, 18, "LEVEL", textStyle_Key);
    levelValText = prevThis.add.text(80, 16, "#" + levelId, textStyle_Value);

    var deathsText = prevThis.add.text(370, 12, "DEATHS", textStyleDeads_Key);
    deathsValText = prevThis.add.text(435, 10, deaths.toString(), textStyleDeads_Value);

    var keysText = prevThis.add.text(690, 18, "KEYS", textStyle_Key);
    keysValText = prevThis.add.text(743, 16, keys.toString() + " / 3", textStyle_Value);

    // fix the text to the camera
    scoreText.setScrollFactor(0);
    levelText.setScrollFactor(0);
    deathsText.setScrollFactor(0);
    keysText.setScrollFactor(0);

    scoreValText.setScrollFactor(0);
    levelValText.setScrollFactor(0);
    deathsValText.setScrollFactor(0);
    keysValText.setScrollFactor(0);
}

function createAudio(prevThis) {
    prevThis.sound.add('sfx:coin');
    prevThis.sound.add('sfx:jump');
    prevThis.sound.add('sfx:key');
    prevThis.sound.add('sfx:levelEnd');
}

function createMuteButton(prevThis) {
    muteButton = prevThis.add.sprite(860, 40, 'mute').setInteractive();
    muteButton.setScrollFactor(0);
    setMuteButton();
    
    muteButton.on('pointerover', function (event) {
        if(muted == true)
            muteButton.anims.play('mutedHover', true);
        else
            muteButton.anims.play('unmutedHover', true);
    });

    muteButton.on('pointerout', function (event) { 
        setMuteButton();
    });

    muteButton.on('pointerdown', function (event) { 
        muted = !muted;
        setMuteButton();
    });
}

function setMuteButton()
{
    if(muted == true)
        muteButton.anims.play('muted', true);
    else 
        muteButton.anims.play('unmuted', true);
}

function create() {
    loadMap(this);

    createExitDoor(this);

    createPlayer(this);
    createPlayerAnims(this);

    this.physics.add.overlap(player, exitDoorLayer);

    createCoins(this);
    createKeys(this);
    createLava(this);
    createScoreText(this);
    createAudio(this);
    createMuteStates(this);
    createMuteButton(this);

    cursors = this.input.keyboard.createCursorKeys();

    // set bounds so the camera won't go outside the game world
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    // make the camera follow the player
    this.cameras.main.startFollow(player);

    this.cameras.main.setBackgroundColor('#1D1128');
}

// this function will be called when the player touches a coin
function collectCoin(player, coin) {
    if(muted == false)
        this.sound.play('sfx:coin');

    coin.destroy();

    score++;
    updateScore();
}

function lavaDeath(player, lava) {
    // adds 3 times not one -needs fixing 
    this.physics.world.colliders.destroy();

    if(muted == false)
        this.sound.play('sfx:death');

    score -= 20;
    keys = 0;
    deaths++;

    updateScore();
    updateKeys();
    updateDeads();

    this.scene.restart();
}

// this function will be called when the player touches a coin
function collectKey(sprite, tile) {
    if(muted == false)
        this.sound.play('sfx:key');

    keyLayer.removeTileAt(tile.x, tile.y); // remove the tile/coin

    score += 10;
    keys++;

    updateScore();
    updateKeys();

    return false;
}

function exitLevel(sprite, tile) {
    if(keys == 3) {
        if(muted == false)
            this.sound.play('sfx:levelEnd');

        score += 100;

        setLevelNumberToLocalStorage(getLevelNumberFromLocalStorage() + 1);

        this.scene.restart();
    }

    return false;
}

function updateScore()
{
    scoreValText.setText(score.toString());
}

function updateKeys()
{
    keysValText.setText(keys.toString() + " / 3");
}

function updateDeads()
{
    deathsValText.setText(deaths.toString());
}


function update(time, delta) {
    if (cursors.left.isDown) {
        player.body.setVelocityX(-200);
        player.anims.play('walk', true); // walk left
        player.flipX = true; // flip the sprite to the left

    } else if (cursors.right.isDown) {
        player.body.setVelocityX(200);
        player.anims.play('walk', true);
        player.flipX = false; // use the original sprite looking to the right

    } else {
        player.body.setVelocityX(0);
        player.anims.play('idle', true);
    }

    if (cursors.up.isDown && player.body.onFloor() && !player.body.touching.down) {
        if(muted == false)
            this.sound.play('sfx:jump');

        player.body.setVelocityY(-700);
    }
}