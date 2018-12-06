var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
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

var map;
var player;
var cursors;
var groundLayer, decorationLayer, keyLayer, coinObjects, coinObjectsGroup;
var text;
var score = 0;

function preload() {
    // map made with Tiled in JSON format
    this.load.tilemapTiledJSON('map', 'assets/map.json');
    // tiles in spritesheet 
    this.load.spritesheet('cave', 'assets/cave.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    this.load.spritesheet('coin', 'assets/coin.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('key', 'assets/key.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    // player animations
    this.load.atlas('player', 'assets/player.png', 'assets/player.json');
}

function loadMap(prevThis) {
    // load the map 
    map = prevThis.make.tilemap({
        key: 'map'
    });

    // tiles for the ground layer
    var groundTiles = map.addTilesetImage('cave');
    var coinTiles = map.addTilesetImage('coin');

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
    player.body.setSize(player.width, player.height - 9);
    player.y = 10*64;
    // player will collide with the level tiles 
    prevThis.physics.add.collider(groundLayer, player);
}

function createPlayerAnims(prevThis) {
    prevThis.anims.create({
        key: 'walk',
        frames: prevThis.anims.generateFrameNames('player', {
            prefix: 'p1_walk',
            start: 1,
            end: 8,
            zeroPad: 2
        }),
        frameRate: 8,
        repeat: -1
    });

    prevThis.anims.create({
        key: 'idle',
        frames: [{
            key: 'player',
            frame: 'p1_stand'
        }],
        frameRate: 8,
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
            end: 3
        }),
        frameRate: 4,
        repeat: -1
    });


    coinLayer = map.createFromObjects('CoinsObj', 101, {
        key: 'coin'
    });

    coinObjectsGroup = prevThis.physics.add.staticGroup({});

    coinLayer.forEach(coin => {
        let obj = coinObjectsGroup.create(coin.x, coin.y, 'coin');
        obj.body.width = coin.width;
        obj.body.height = coin.height;
        obj.visible = true;
        coin.visible = false;
        prevThis.anims.play('spin', obj);

    });
    coinObjectsGroup.refresh(); //physics body needs to refresh
    console.log(coinObjectsGroup);

    prevThis.physics.add.overlap(player, coinObjectsGroup, collectCoin, null, prevThis);

}

function createKeys(prevThis) {
    keyTiles = map.addTilesetImage('key');
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

function createScoreText(prevThis) {
    // this text will show the score
    text = prevThis.add.text(20, 20, 'Score: 0', {
        fontSize: '20px',
        fill: '#ffffff'
    });
    
    // fix the text to the camera
    text.setScrollFactor(0);
}

function create() {
    loadMap(this);
    createPlayer(this);
    createPlayerAnims(this);
    createCoins(this);
    createKeys(this);
    createScoreText(this);



    cursors = this.input.keyboard.createCursorKeys();

    // set bounds so the camera won't go outside the game world
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    // make the camera follow the player
    this.cameras.main.startFollow(player);

    // set background color, so the sky is not black    
    this.cameras.main.setBackgroundColor('#140C1C');


}

// this function will be called when the player touches a coin
function collectCoin(player, coin) {
    console.log(coinLayer);
    console.log(coin);

    coin.destroy();

    score++;
    updateScore();
}

// this function will be called when the player touches a coin
function collectKey(sprite, tile) {
    keyLayer.removeTileAt(tile.x, tile.y); // remove the tile/coin
    score++;
    updateScore();
    return false;
}

function updateScore()
{
    text.setText('Score: ' + score); // set the text to show the current score
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

    if (cursors.up.isDown && player.body.onFloor()) {
        player.body.setVelocityY(-700);
    }
}