
module.exports = {
	name: 'default brush',
	description: 'Draw the tile currently selected in tilesheet.\nright-click to delete tile.',
	select:   null,
	deselect: null,
	start:    null,
	end:      null,
	draw: function (startX, startY, toolbox, isStart) {
		var tilesheet = toolbox.tilesheet;
		var map = toolbox.mapEditor.map;
		var openList = [[startX, startY]];
		var closedList = [];

		var fromTile = map.get(startX, startY);
		var fromTileSprite = fromTile ? fromTile.sprite : null;
		
		while(openList.length > 0){
			var tileX = openList[0][0];
			var tileY = openList[0][1];
			
			testTile(fromTileSprite, openList, closedList, map, [tileX + 1, tileY]);
			testTile(fromTileSprite, openList, closedList, map, [tileX - 1, tileY]);
			testTile(fromTileSprite, openList, closedList, map, [tileX, tileY + 1]);
			testTile(fromTileSprite, openList, closedList, map, [tileX, tileY - 1]);
			closedList.push(openList[0]);
			openList.shift();
			
			toolbox.mapEditor.map.set(tileX, tileY, tilesheet.tile, tilesheet.flipH, tilesheet.flipV, tilesheet.flipR);
		}
	},
	erase: function (x, y, toolbox, isStart) {
		toolbox.mapEditor.map.remove(x, y);
	}
};

function testTile(fromTileSprite, openList, closedList, map, potential){
	if(potential[0] >= 0 && potential[0] < map.width && potential[1] >= 0 && potential[1] < map.height){
		if(!openList.some(pair => arraysEqual(pair, potential)) && !closedList.some(pair => arraysEqual(pair, potential))){
			var maybeFromTile = map.get(potential[0], potential[1]);
			var maybeFromTileSprite = maybeFromTile ? maybeFromTile.sprite : null;
			if(maybeFromTileSprite == fromTileSprite) openList.push(potential);
		}
	}
}

function arraysEqual(a, b){
	if (a === b)                return true;
	if (a == null || b == null) return false;
	if (a.length != b.length)   return false;
	for(var i = 0; i < a.length; ++i) if(a[i] !== b[i]) return false;
	return true;
}
