
const  { ipcRenderer } = require('electron');

var Texture = require('../lib/Texture');
var domUtils = require('../lib/domUtils');
var gridImages = require('../lib/grid.js');
var assetLoader = require('../lib/assetLoader');
var TileMap = require('../lib/TileMap');
var keyboard = require('../lib/keyboard.js')
var helper       = require('../lib/helper.js');

var TILE_WIDTH   = settings.tileSize[0];
var TILE_HEIGHT  = settings.tileSize[1];
var PIXEL_SIZE   = settings.PIXEL_SIZE;
var MAP_MAX_UNDO = 5;

function MapEditor(emptyDiv){
    this.bank  = null; // reference of the map bank in the asset object
    this.file  = null; // name of the json file of the map bank
    this.mapId = 0;
    this.history = [];
    this.map = new TileMap(16, 16);

    this.viewW = TILE_WIDTH  * 16;
    this.viewH = TILE_HEIGHT * 16;

    this._clipSurface = domUtils.createDiv('mapClipSurface', emptyDiv);
    this.className = "mapClipSurface";
    var canvasContainer = domUtils.createDiv('mapCanvas', this._clipSurface);
    this.resizeViewport();

    var grid = domUtils.createDiv('mapCanvas mapGrid', canvasContainer);
    grid.style.width  = this.map.width  * TILE_WIDTH  * PIXEL_SIZE + 1 + 'px';
    grid.style.height = this.map.height * TILE_HEIGHT * PIXEL_SIZE + 1 + 'px';
    grid.style.backgroundImage = gridImages.grid;

    this.background = new Texture();
    this.foreground = new Texture();
    var background = this.background.canvas;
    var foreground = this.foreground.canvas;
    var canvas = this.map.texture.canvas;

    var canvasTexture = this.map.texture;

    foreground.className = background.className = canvas.className = 'mapCanvas';
    canvasContainer.appendChild(background);
    canvasContainer.appendChild(canvas);
    canvasContainer.appendChild(foreground);

    this._grid   = grid;
    this._canvas = canvas;
    this._canvasContainer = canvasContainer;

    var gridEnabled = true;
    keyboard.on('space', function (isPressed) {
        if (!isPressed) return;
        gridEnabled = !gridEnabled;
        grid.style.display = gridEnabled ? '' : 'none';
    });

    this.toolbox = require('../lib/toolbox.js');
    var mapEditor = this;
    
    //▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
	// draw sprite in the map (using selected brush)
	function startDraw(e) {
		var mouseButton = e.button; // 0 == left, 1 == middle, 2 == right

		var prevX = null;
		var prevY = null;

		var brush = mapEditor.toolbox.currentTool;

		function mouseMove(e, isStart) {
			e.preventDefault();
			var x = ~~(e.offsetX / TILE_WIDTH  / PIXEL_SIZE);
			var y = ~~(e.offsetY  / TILE_HEIGHT / PIXEL_SIZE);
			if (x === prevX && y === prevY) return;
			prevX = x;
			prevY = y;
			isStart && brush.start && brush.start(x, y, mapEditor.toolbox, e);
			if(mouseButton === 2) {
				brush.erase && brush.erase(x, y, mapEditor.toolbox, isStart, e);
			} else if(mouseButton == 0) {
				brush.draw && brush.draw(x, y, mapEditor.toolbox, isStart, e);
			}
		}

		function mouseEnd(e) {
			e.preventDefault();
			document.removeEventListener('mouseup', mouseEnd);
			document.removeEventListener('mousemove', mouseMove);
			brush.end && brush.end(prevX, prevY, mapEditor.toolbox, e);
		}

		document.addEventListener('mousemove', mouseMove, false);
		document.addEventListener('mouseup', mouseEnd, false);

		//this.addHistory();

		mouseMove(e, true);

		if (mapEditor._saved) {
			mapEditor._saved = false;
			mapEditor._updateSaveButton();
		}
    }
    
    domUtils.makeButton(canvasContainer, function (e) {
		startDraw(e);
	});

    this.resizeMap(16, 16);
}

MapEditor.prototype.resizeViewport = function () {
	this.viewW = ~~Math.max(this.viewW, TILE_WIDTH * 16);
	this.viewH = ~~Math.max(this.viewH, TILE_WIDTH * 4);
	this._clipSurface.style.width  = this.viewW * PIXEL_SIZE + 1 + 'px';
	this._clipSurface.style.height = this.viewH * PIXEL_SIZE + 1 + 'px';
};

MapEditor.prototype.resizeMap = function (w, h) {
	this.map.resize(w, h);
	this.background.resize(w * TILE_WIDTH, h * TILE_HEIGHT);
	this.foreground.resize(w * TILE_WIDTH, h * TILE_HEIGHT);

	this._posX = helper.clip(this._posX, -(w * TILE_WIDTH  - this.viewW) * PIXEL_SIZE, 0);
	this._posY = helper.clip(this._posY, -(h * TILE_HEIGHT - this.viewH) * PIXEL_SIZE, 0);
	this._grid.style.width  = w * TILE_WIDTH  * PIXEL_SIZE + 1 + 'px';
	this._grid.style.height = h * TILE_HEIGHT * PIXEL_SIZE + 1 + 'px';
	this._canvasContainer.style.left = this._posX + 'px';
	this._canvasContainer.style.top  = this._posY + 'px';

	var background = this.background.canvas.style;
	var tileground = this._canvas.style;
	var foreground = this.foreground.canvas.style;

	background.width  = foreground.width  = tileground.width  = w * TILE_WIDTH  * PIXEL_SIZE + 'px';
	background.height = foreground.height = tileground.height = h * TILE_HEIGHT * PIXEL_SIZE + 'px';

	// TODO redraw background and foreground if needed

	this.inputWidthValue  = w;
	this.inputWidthValue = h;
	this._saved = false;
	//this._updateInfos();
	this._updateSaveButton();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {Object} params
 *        {string} params.file  - json file name of the bank
 *        {Object} params.bank  - reference to the map bank in the window.assets object
 *        {number} params.index - index of the map in the bank
 */
MapEditor.prototype.loadMap = function (params) {
	this.file  = params.file;
	this.bank  = params.bank;
	this.mapId = params.index;

	var map = this.bank.maps[this.mapId];
	if (!map) return;

	this.resizeMap(map.w, map.h);
	this.map.load(map);
	this._saved = true;
	this._updateSaveButton();
	//this._updateInfos();
	this.history = [];

	// if map has a tilesheet, update tilesheet panel
	if (this.map._tilesheetPath) {
		this.toolbox.tilesheet.updateTilesheet(this.map.texture.tilesheet.canvas, true);
	}
};

MapEditor.prototype._updateSaveButton = function () {
	console.log(this._saved ? "map should have been saved!" : "map not saved!");
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEditor.prototype.save = function () {
    if (this._saved) return;
	var t = this;
    var assetList = this.toolbox.assetList;
    
    var file = this.file || 'maps';
    
	var request = {
        command: 'map.save',
		file: file,
		mapId: this.mapId,
		data: this.map.save()
    };
    
	// NOTE: Custom way to save file
	// Tell the main process to save our maps
    ipcRenderer.send('saveMap', request);
    
	// send data to the server
	//assetLoader.sendRequest(request, function (error) {
	//	if (error) return alert(error);
	//	// copy data in maps bank
	//	// TODO refactor with nicer reference
	//	if (!t.bank.maps[t.mapId]) {
	//		t.bank.maps[t.mapId] = {};
	//		assetList.addMap('maps', t.bank.maps[t.mapId]);
	//	}
	//	helper.copyObject(data, t.bank.maps[t.mapId]);
	//
	//	t._saved = true;
	//	t._updateSaveButton();
	//	assetList.refreshAssetList();
    //});
};

module.exports = new MapEditor(document.getElementById("addMapEditorHere"));
