
var Texture = require('../lib/Texture');
var domUtils = require('../lib/domUtils');
var gridImages = require('../lib/grid.js');
var assetLoader = require('../lib/assetLoader');

var TILE_WIDTH  = settings.tileSize[0];
var TILE_HEIGHT = settings.tileSize[1];
var PIXEL_SIZE    = settings.PIXEL_SIZE;
var TILES_PER_LINE = 16; // (in a tilesheet)

// TODO: Fix grid being a bit off
// I looked at the CSS and I can't find any reason right now

function TilesheetEditor(emptyDiv){
    emptyDiv.classList.add("spritesheet");

    this.tile  = 0;
	this.flipH = false;
	this.flipV = false;
    this.flipR = false;
    this.toolbox = require('../lib/toolbox.js');

    var canvasTexture   = new Texture(TILE_WIDTH * TILES_PER_LINE, TILE_HEIGHT * TILES_PER_LINE);
    var canvas          = canvasTexture.canvas;
    canvas.className    = 'spritesheetInner';
    canvas.style.width  = canvas.width  * PIXEL_SIZE + 'px';
    canvas.style.height = canvas.height * PIXEL_SIZE + 'px';
    emptyDiv.appendChild(canvas);

    var cursor = domUtils.createDiv('spritesheetCursor', emptyDiv);
    
    var CURSOR_WIDTH  = TILE_WIDTH  * PIXEL_SIZE;
    var CURSOR_HEIGHT = TILE_HEIGHT * PIXEL_SIZE;
    cursor.style.width  = CURSOR_WIDTH  + 10 + 'px';
    cursor.style.height = CURSOR_HEIGHT + 10 + 'px';
    cursor.style.backgroundImage = gridImages.cursor;
    var cursorTexture = new Texture(TILE_WIDTH, TILE_HEIGHT);
    var cursorCanvas = cursorTexture.canvas;
    cursorCanvas.style.width  = CURSOR_WIDTH  + 'px';
    cursorCanvas.style.height = CURSOR_HEIGHT + 'px';
    cursorCanvas.style.top    = '2px';
    cursorCanvas.style.left   = '2px';
    cursorCanvas.style.position  = 'absolute';
    cursor.appendChild(cursorCanvas);

    this.canvasTexture = canvasTexture;
    this.cursorTexture = cursorTexture;

    var tilesheetEditor = this;
    tilesheetEditor.myScale = 1.0;

    domUtils.makeButton(emptyDiv, function (e) {
        var mouseButton = e.button; // 0 == left, 1 == middle, 2 == right
        if(e.button != 0) return;

        if (e.target !== grid) return;
        var sx = ~~(e.offsetX / CURSOR_WIDTH);
        var sy = ~~(e.offsetY / CURSOR_HEIGHT);
        cursor.style.left = (sx * CURSOR_WIDTH  - 5) + 'px';
        cursor.style.top  = (sy * CURSOR_HEIGHT - 5) + 'px';
        
        // ------------- t.updateInfos(sx, sy); -------------
        // some of the code from t.updateInfos(sx, sy)
        tilesheetEditor.tile = sy * TILES_PER_LINE + sx;
        tilesheetEditor.updateSprite();
    });
    
    var grid = domUtils.createDiv('spritesheetInner spritesheetGrid', emptyDiv);
    
    emptyDiv.style.width  = grid.style.width  = TILE_WIDTH  * PIXEL_SIZE * TILES_PER_LINE + 1 + 'px';
    emptyDiv.style.height = grid.style.height = TILE_HEIGHT * PIXEL_SIZE * TILES_PER_LINE + 1 + 'px';
    grid.style.backgroundImage = gridImages.grid;
    
    assetLoader.loadImage("assets/tilesheet.png", function(error, img){
        canvasTexture.clear();
        canvasTexture.draw(img, 0, 0);

        cursorTexture.setTilesheet(canvasTexture);
        tilesheetEditor.updateSprite();
    });
}

TilesheetEditor.prototype.updateTilesheet = function (img, noMapUpdate) {
	Texture.prototype.setTilesheet(img);
	this.canvasTexture.clear();
	this.canvasTexture.draw(img, 0, 0);
	this.updateSprite();
	// update map with new tilesheet
	if (noMapUpdate) return; // FIXME
	if (this.toolbox.mapEditor) this.toolbox.mapEditor.map.setTilesheet(img);
};

TilesheetEditor.prototype.updateSprite = function () {
	this.cursorTexture.clear().sprite(this.tile, 0, 0, this.flipH, this.flipV, this.flipR);
};

module.exports = new TilesheetEditor(document.getElementById("addTilesheetEditorHere"));
