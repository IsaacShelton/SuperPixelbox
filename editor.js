
// -------------------------------------------------
//         EDITOR WEB CONTENTS ENTRY POINT
// -------------------------------------------------

// Super Pixelbox compile-time settings
var SCROLL_MULTIPLIER = 10.0;

// Isaac's overrides for compile-time super pixelbox settings
if(require('os').hostname() == "Isaacs-Mac-mini"){
    SCROLL_MULTIPLIER = 1.0; // Scrolling with smooth scrolling software enabled
}

// Electron requirements
const { ipcRenderer } = require('electron');

// Global editor state
var settings = null;
var staticAssetList = null;
var tilesheetEditor;
var mapEditor;

// -------------------------------------------------
// Loading chain that requests pixelbox settings
// and pixelbox static asset list from main process
// -------------------------------------------------
ipcRenderer.on('getPixelboxSettingsReturn', function(e, returnValue){
    // Handle response that contains pixelbox settings
    settings = JSON.parse(returnValue);
    ipcRenderer.send('getPixelboxStaticAssetList');
});

ipcRenderer.on('getPixelboxStaticAssetListReturn', function(e, returnValue){
    // Handle response the contains static asset list
    staticAssetList = returnValue;
    main();
});
// -------------------------------------------------

// Kick start chain reaction
ipcRenderer.send('getPixelboxSettings');

// After 'settings' and 'staticAssetList' have been acquired
function main(){
    var assetLoader = require('./lib/assetLoader');
    var TileMap = require('./lib/TileMap');
    var toolbox = require('./lib/toolbox.js');

    var leftPane = document.getElementById('left-pane');
    var rightPane = document.getElementById('right-pane');
    var paneSepatator = document.getElementById('panes-separator');
    
    // Boundry limits for pane separator (in percent)
    var separatorLeftLimit = 10;
    var separatorRightLimit = 90;
    
    paneSepatator.sdrag(function (el, pageX, startX, pageY, startY, fix) {
        // NOTE: This dragging is a little wonky, but it feels more natural than the "correct" version
        
        // Don't modify pane sepatator
        fix.skipX = true;
    
        // Bound percentage to left limit
        if (pageX < window.innerWidth * separatorLeftLimit / 100) {
            pageX = window.innerWidth * separatorLeftLimit / 100;
            fix.pageX = pageX;
        }
        
        // Bound percentage to right limit
        if (pageX > window.innerWidth * separatorRightLimit / 100) {
            pageX = window.innerWidth * separatorRightLimit / 100;
            fix.pageX = pageX;
        }
    
        // Calculate new left panel percentage
        var halfSeperatorMiddleOffsetPercentage = 4 / window.innerWidth * 100;
        var leftPanelPercentage = pageX / window.innerWidth * 100 - halfSeperatorMiddleOffsetPercentage;
    
        // Clamp left panel percentage to window pixels? (This shouldn't be here probably)
        clamp(leftPanelPercentage, 0, window.innerWidth);
        
        // Calculate right panel percentage
        var rightPanelPercentage = 100 - leftPanelPercentage;
    
        // Change panel widths
        leftPane.style.width  = leftPanelPercentage  + '%';
        rightPane.style.width = rightPanelPercentage + '%';
    }, null, 'horizontal');
    
    // Handle separator 
    var currentSeparatorPercentage = clamp(50 - 8 / window.innerWidth * 100, 0, window.innerWidth);
    var right = (100 - currentSeparatorPercentage - 1);

    // Divide panes
    leftPane.style.width  = currentSeparatorPercentage + '%';
    rightPane.style.width = right + '%';
    
    // Create specific editors
    tilesheetEditor = require('./scripts/TilesheetEditor.js');
    mapEditor = require('./scripts/MapEditor.js');
    
    var addTilesheetEditorHere = document.getElementById('addTilesheetEditorHere');
    var addMapEditorHere = document.getElementById('addMapEditorHere');
    
    allowZoomingForEditorDiv(addTilesheetEditorHere);
    allowZoomingForEditorDiv(addMapEditorHere);

    allowPanningForEditorDiv(addTilesheetEditorHere);
    allowPanningForEditorDiv(addMapEditorHere);

    //▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    // load assets and initialise panels
    assetLoader.preloadStaticAssets(function onAssetsLoaded(error, result) {
    	if(error) return console.error(error);

    	window.assets = result;

    	// DEPRECATED: Check if mapBank is in the old format
    	assets.maps = TileMap._checkBankFormat(assets.maps);

    	if (!assets.tilesheet) {
    		// create a default tilesheet
    		console.warn('Could not find default tilesheet. Creating a new tilesheet texture.');
    		assets.tilesheet = new Texture(16 * TILE_WIDTH, 16 * TILE_HEIGHT);
    	}
    	toolbox.tilesheet.updateTilesheet(assets.tilesheet);
    	//toolbox.palette.create(settings.palette);
    	//toolbox.assetList.refreshAssetList();

    	toolbox.mapEditor.loadMap({
    		file: 'maps',
    		bank: assets.maps,
    		index: 0
    	});

    	//assetLoader.loadJson('project/tools/settings.json', function onToolSettingsLoaded(error, toolSettings) {
    	//	if (error) toolSettings = {};
    	//	var disposition = toolSettings.disposition || {};
    	//	//setDisposition(disposition);
        //});
    });
}

function saveMap(){
    mapEditor.save();
    alert("Saved!");
}

function swapNodes(n1, n2) {
    // NOTE: Swaps nodes 'n1' and 'n2' in the DOM regardless of their position

    var p1 = n1.parentNode;
    var p2 = n2.parentNode;
    var i1, i2;

    if(!p1 || !p2 || p1.isEqualNode(n2) || p2.isEqualNode(n1)) return;

    for (var i = 0; i < p1.children.length; i++){
        if(p1.children[i].isEqualNode(n1)){
            i1 = i;
        }
    }

    for(var i = 0; i < p2.children.length; i++){
        if(p2.children[i].isEqualNode(n2)){
            i2 = i;
        }
    }

    if(p1.isEqualNode(p2) && i1 < i2){
        i2++;
    }
    
    p1.insertBefore(n2, p1.children[i1]);
    p2.insertBefore(n1, p2.children[i2]);
}

function swapPaneView(paneID, targetEditorContainerID){
    // Swap two 'div' panes in the DOM
    var paneEditorContainer = document.getElementById(paneID).getElementsByClassName('editorContainer')[0];
    var targetEditorContainer = document.getElementById(targetEditorContainerID);
    if(paneEditorContainer == null) console.error('swapPaneView(paneID, targetEditorContainerID) failed to find paneEditorContainer via paneID');
    if(targetEditorContainer == null) console.error('swapPaneView(paneID, targetEditorContainerID) failed to find targetEditorContainer via targetEditorContainerID');
    swapNodes(paneEditorContainer, targetEditorContainer);
}

function closeDropdowns(){
    // Dismiss menu by disabling each dropdown menu in UI
    for(var elem of document.getElementsByClassName('dropdown-content')){
        elem.style.display = 'none';
    }
}

function allowOpenDropdowns(){
    // Re-enable menu by enabling each dropdown menu in UI
    for(var elem of document.getElementsByClassName('dropdown-content')){
        elem.style.display = '';
    }
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function allowZoomingForEditorDiv(editorDiv){
    // Add common attributes required for transformation
    addCommonAttributesForEditorDiv(editorDiv);
    
    // Allow zooming
    editorDiv.addEventListener('wheel', function(e) {   
        // Zoom editor according to scroll direction and custom multipiler
        editorDiv.myScale = clamp(editorDiv.myScale + SCROLL_MULTIPLIER * 0.025 * (event.deltaY < 0 ? 1 : -1), 0.5, 10.0)

        // Update editor transformation
        editorDiv.style.transform = "translate(" + editorDiv.myTranslateX + "px, " + editorDiv.myTranslateY + "px) scale3d(" + editorDiv.myScale + ", " + editorDiv.myScale + ", 1)";
        e.preventDefault();
    }, false);
}

function addCommonAttributesForEditorDiv(editorDiv){
    // Add common attributes required for transformation
    editorDiv.myScale = 1.0;
    editorDiv.myTranslateX = 0.0;
    editorDiv.myTranslateY = 0.0;
}

function allowPanningForEditorDiv(editorDiv){
    // Add common attributes required for transformation
    addCommonAttributesForEditorDiv(editorDiv);
    
    // Initialize 'myTranslateX' and 'myTranslateY' variables used for panning in editor
    editorDiv.myPanningFocusX = null;
    editorDiv.myPanningFocusY = null;
    
    // Allow panning
    // Capture initial mouse down position    
    editorDiv.addEventListener('mousedown', function(e) {
        var mouseButton = e.button; // 0 == left, 1 == middle, 2 == right

        // Start panning if middle or forward mouse button pressed and not already panning
        if((mouseButton == 1 || mouseButton == 4) && (editorDiv.myPanningFocusX == null && editorDiv.myPanningFocusY == null)){
            // Store initial mouse position
            editorDiv.myPanningFocusX = e.offsetX;
            editorDiv.myPanningFocusY = e.offsetY;
        }
        return e;
    }, false);
    
    // Pan editor if previous mouse position defined for panning
    editorDiv.addEventListener('mousemove', function(e) {
        if(editorDiv.myPanningFocusX != null && editorDiv.myPanningFocusY != null){
            // Calculate change in mouse x and mouse y
            var dx = e.offsetX - editorDiv.myPanningFocusX;
            var dy = e.offsetY - editorDiv.myPanningFocusY;

            // Pan editor
            editorDiv.myTranslateX += dx;
            editorDiv.myTranslateY += dy;

            // Update editor transformation
            editorDiv.style.transform = "translate(" + editorDiv.myTranslateX + "px, " + editorDiv.myTranslateY + "px) scale3d(" + editorDiv.myScale + ", " + editorDiv.myScale + ", 1)";
        }
        return e;
    }, false);

    // Remove previous panning position information if middle button is released
    editorDiv.addEventListener('mouseup', function(e) {
        var mouseButton = e.button; // 0 == left, 1 == middle, 2 == right
        if(mouseButton == 1 || mouseButton == 4){
            editorDiv.myPanningFocusX = null;
            editorDiv.myPanningFocusY = null;
        }
        return e;
    }, false);

    // Remove previous panning position information if mouse left area
    editorDiv.addEventListener('mouseleave', function(e) {
        editorDiv.myPanningFocusX = null;
        editorDiv.myPanningFocusY = null;
        return e;
    }, false);
}

function run(){
    // Tell main process to run our project
    ipcRenderer.send("run", null);
}

function useBrush(){
    // Switch to brush tool
    toolbox.currentTool = toolbox.tools.brush;
}

function useBucket(){
    // Switch to bucket tool
    toolbox.currentTool = toolbox.tools.bucket;
}
