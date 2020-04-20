
var TileMap = require('./TileMap');

// create toolbox
var toolbox = {};
module.exports = toolbox;
window.toolbox = toolbox;

// set cross-references
//Panel.prototype.toolbox = toolbox;

// create clipboard
toolbox.mapClipboard = new TileMap();

// create panels
toolbox.keyboard    = require('./keyboard.js');
toolbox.mapEditor   = require('../scripts/MapEditor.js');
//toolbox.assetList   = require('./AssetListPanel.js');
toolbox.tilesheet   = require('../scripts/TilesheetEditor.js');
//toolbox.customTools = require('./CustomToolsPanel.js');
//toolbox.palette     = require('./PalettePanel.js');
//toolbox.menu        = require('./menuHeader.js');

toolbox.tools = {
    brush: require('./Brush'),
    bucket: require('./Bucket'),
};

toolbox.currentTool = toolbox.tools.brush;
