export default class TilemapAnimator {

    // constructs a TMA instance
    // note: must be called in create and not preload
    //
    // parameters:
    // time:         game time object (game.time)
    // tilemap:      loaded tilemap
    // tilemapLayer: map layer containing the animated tiles (only one supported)
    constructor(time, tilemap, tilemapLayer) {
        this.time = time;
        this.tilemap = tilemap;
        this.tilemapLayer = tilemapLayer;
        this.timer = null;
        this.tileAnimations = [];
        this.game = time.game;
    }
    
    // add an animated tile from a manual definition
    //
    // parameters:
    // tiles: an array of tile indices from a tileset (e.g. [20, 21, 22, 23])
    // frameInterval: duration between frames in milliseconds (e.g. 1000 = 1s)
    // tileset: tileset containing the animated tiles
    addAnimation(tiles, frameInterval, tileset) {
        const tileAnimation = {
            tiles,
            frameInterval,
            tileset,
            tileLocations: _getTileLocations.bind(this)(tileset, tiles),
            currentFrame: 0,
        };        
        this.tileAnimations.push(tileAnimation);
    }

    // add animations from a loaded tilemap JSON object
    //
    // parameters:
    // tilemapKey: cache key of a tilemap loaded using game.load.json(...)
    addAnimationsFromTilemap(tilemapKey) {
        const tiledJson = this.game.cache.getJSON(tilemapKey);
        for (const tilesetJson of tiledJson.tilesets) {
            if (tilesetJson.tiles) {
                _addAnimationsFromTileset.bind(this)(tilesetJson);
            }
        }
    }

    // starts the animation as a background thread
    start() {
        if (this.timer == null) {
            this.timer = this.time.events.loop(20, () => _animate.bind(this)());
        }
    }

    // stops the animation
    stop() {
        if (this.timer != null) {
            this.time.events.remove(this.timer);
            this.timer = null;
        }
    }
}

//-- private methods ---------------------------------------------------------------------

function _addAnimationsFromTileset(tilesetJson) {
    for (const tileJson of Object.values(tilesetJson.tiles)) {
        const animationJson = tileJson.animation;
        if (animationJson && animationJson.length > 0) {
            _addAnimationsFromAnimatedTile.bind(this)(tilesetJson, animationJson);
        }
    }
}

function _addAnimationsFromAnimatedTile(tilesetJson, animationJson) {
    const tiles = animationJson.map(animationJson => animationJson.tileid);
    const frameInterval = animationJson.find(() => true).duration;
    const tileset = this.tilemap.tilesets.find(t => t.name === tilesetJson.name);
    
    const tileAnimation = {
        tiles,
        frameInterval,
        tileset,
        tileLocations: _getTileLocations.bind(this)(tilesetJson, tiles),
        currentFrame: 0,
    };        

    this.tileAnimations.push(tileAnimation);
}

function _animate() {
    const currentTime = this.time.now;
    for (const tileAnimation of this.tileAnimations) {
        const tiles = tileAnimation.tiles;
        const frameInterval = tileAnimation.frameInterval;
        const tileset = tileAnimation.tileset;
        const tileLocations = tileAnimation.tileLocations;
        const currentFrame = tileAnimation.currentFrame;
        
        const newFrame = Math.floor(currentTime / frameInterval) % tiles.length;
        if (newFrame != currentFrame) {
            const newFrameIndex =tileset.firstgid + tiles[newFrame];
            for (const tileLocation of tileLocations) {
                const tile = this.tilemap.getTile(tileLocation.x, tileLocation.y, this.tilemapLayer, true);
                tile.index = newFrameIndex;
            }
            tileAnimation.currentFrame = newFrame;

            this.tilemapLayer.dirty = true;                
        }
    }

    if (this.tilemap.dirty) {
        this.tilemap.calculateFaces(this.tilemapLayer.index);
    }
}

function _getTileLocations(tileset, tiles) {
    const tileLocations = [];
    for (let y = 0; y < this.tilemap.height; y++) {
        for (let x = 0; x < this.tilemap.width; x++) {
            for (const tile of tiles) {
                if (this.tilemap.getTile(x, y, this.tilemapLayer, true).index === tileset.firstgid + tile) {
                    tileLocations.push({x, y});
                }
            }
        }
    }
    return tileLocations;
}
