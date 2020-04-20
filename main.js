
// -------------------------------------------------
//             MAIN PROCESS ENTRY POINT
// -------------------------------------------------

// Electron Dependencies
const { app, BrowserWindow, Menu, ipcMain } = require('electron')

// 3rd Party Dependencies
var fs = require("fs-extra");
var path = require("path");

// Local Dependencies
var getAsset = require('./lib/getAsset.js')

// Current working directory of the process
var cwd = process.cwd();

// Global reference to main editor window
var mainWindow = null;

function createMainWindow() {
    // Create the main browser window
    const window = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        },
        title: "Super Pixelbox"
    });

    // Store global reference to main editor window
    mainWindow = window;

    // Load editor web contents
    window.loadFile('editor.html');
}

function createAuxiliaryWindow(w, h, indexHtml) {
    // Create an auxiliary browser window
    const auxiliaryWindow = new BrowserWindow({
        width: w,
        height: h,
        webPreferences: {
            nodeIntegration: true
        }
    });

    // and load the index.html of the app
    auxiliaryWindow.loadFile(indexHtml);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createMainWindow)
app.allowRendererProcessReuse = false;

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if(process.platform !== 'darwin') {
        app.quit();
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if(BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
})

// -------------------------------------------------
//             PROCESS COMMUNICATIONS
// -------------------------------------------------

ipcMain.on('openDevTools', function(e, data){
    // Open development tools for the editor
    if(mainWindow) mainWindow.webContents.toggleDevTools();
});

ipcMain.on('getPixelboxSettings', function(e, data){
    // Retrieve pixelbox settings for the editor
    
    var pixelboxSettings = pixelboxGetSettings();

    var TILE_WIDTH  = pixelboxSettings.tileSize[0];
    var TILE_HEIGHT = pixelboxSettings.tileSize[1];
    pixelboxSettings.PIXEL_SIZE = Math.max(TILE_WIDTH, TILE_HEIGHT) >= 20 ? 1 : Math.max(TILE_WIDTH, TILE_HEIGHT) >= 10 ? 2 : 3;
    pixelboxSettings.SOLID_LINE_GRID = false;

    if(mainWindow){
        // Return result of fetching pixelbox settings
        mainWindow.webContents.send('getPixelboxSettingsReturn', JSON.stringify(pixelboxSettings));
    }
});

ipcMain.on('getPixelboxStaticAssetList', function(e, data){
    // Retrieve pixelbox static asset list for the editor

    if(mainWindow){
        // Return result of fetching static asset list
        mainWindow.webContents.send('getPixelboxStaticAssetListReturn', pixelboxGetStaticAssetList());
    }
});

ipcMain.on('saveMap', function(e, request){
    // Save pixelbox maps for the editor

    // FORMAT: request = {command: 'map.save', file: this.file, mapId: this.mapId, data: data };

    // Construct object for pixelbox's maps file format
    var mapsData = getMapsData(request.file);
    mapsData.maps[request.mapId] = request.data;

    // Write maps file
    fs.writeFileSync(path.join(cwd, 'assets', request.file + '.json'), JSON.stringify(mapsData, null, '\t'));

    // Tell the editor that we saved the map
    if(mainWindow) mainWindow.webContents.send('mapSaved', null);

    // Update global project data information
    fs.writeFileSync(path.join(cwd, 'build/data.json'), pixelboxGetStaticAssetList());


    //pixelbox.emit('tools/saveMaps', str);
});

ipcMain.on('run', function(e, data){
    // Run our project for the editor
    createAuxiliaryWindow(640, 640, 'index.html');
});

// -------------------------------------------------
//             MISC PIXELBOX FUNCTIONS
// -------------------------------------------------

function pixelboxGetSettings() {
    // Loads settings for pixelbox

    var settings = JSON.parse(fs.readFileSync(path.join(cwd, 'settings.json'), 'utf8'));
    var template = JSON.parse(fs.readFileSync(path.join(__dirname, 'init/settings.json'), 'utf8'));
    settings.components = settings.components || {};
    mergeObjects(settings.components, template.components);
    return settings;
}

function pixelboxGetStaticAssetList() {
    // Loads static assets for pixelbox

	var staticAssetList = getAsset('assets', [
		{ ext: ['png', 'jpg', 'jpeg'], id: 'img' },
		{ ext: ['mp3', 'wav'],         id: 'snd' },
		{ ext: ['txt']                           },
		{ ext: ['json'], parser: JSON.parse      }
	]);
	return JSON.stringify(staticAssetList);
}

function getMapsData(file) {
    // Takes a maps collection file such as 'maps.json' and returns it as an object
    // NOTE: Also converts old pixelbox maps file format to new pixelbox maps format

    // Default filename is 'maps.json'
    file = file || 'maps';

    // Read JSON file into object
    var mapsData = JSON.parse(fs.readFileSync(path.join(cwd, 'assets', file + '.json'), 'utf8'));

    // Convert old map format to the new format if needed
    if(Array.isArray(mapsData)){
        mapsData = {_type: "maps", maps: mapsData};
    }

    return mapsData;
}

// -------------------------------------------------
//             MISC UTILITY FUNCTIONS
// -------------------------------------------------

function mergeObjects(obj, template) {
	for (var id in template) {
		if (obj[id] !== undefined) continue;
		obj[id] = template[id];
	}
}
