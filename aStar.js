// User variables:
var cols = 50;
var rows = 50;
var tileSize = ~~(Math.min(window.innerWidth, window.innerHeight) / Math.max(cols, rows));
var sps = 10;
var start = {x: 15, y: 15};
var goal = {x: cols - 1, y: rows - 1};

// Global variables:
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var loop;
var tiles;
var open;
var current;
var path;
var mousemove;
var noSolution;
var blocks = [];

// Rainbow tables:
var directions = [{x: 1, y: 0}, {x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 1, y: -1}, {x: -1, y: -1}, {x: -1, y: 1}, {x: 1, y: 1}]; // Right, up, left, down, NE, NW, SW, SE.
var mouse = {down: false, x: 0, y: 0};
var rootTwo = 1.4142135623730951;

// Listeners:
window.addEventListener("resize", function() {
	tileSize = ~~(Math.min(window.innerWidth, window.innerHeight) / Math.max(cols, rows));
	initCanvas();
	draw();
});
canvas.addEventListener("mousedown", function(event) {
	mouse.down = event.which;
	mouse.x = cols * tileSize * 2;
	mousemove(event);
});
window.addEventListener("mouseup", function() {
	mouse.down = false;
});
canvas.addEventListener("mousemove", mousemove = function(event) {
	var x = ~~(event.clientX / tileSize);
	var y = ~~(event.clientY / tileSize);
	if (mouse.x != x || mouse.y != y) {
		mouse.x = x;
		mouse.y = y;
		if (mouse.down && mouse.down != 2) { // middle click.
			if (mouse.down == 1) { // left click.
				blocks.push({x: x, y: y});
			} else if (mouse.down == 3) { // right click.
				blocks.splice(blocks.indexOfPointObj(mouse), 1);
			}
			aStar();
			draw();
		}
	}
});

// Functions:
function initCanvas() {
	canvas.width = cols * tileSize;
	canvas.height = rows * tileSize;
}
function initTiles() {
	tiles = new Array(cols);
	for (var x = 0; x < cols; x++) {
		tiles[x] = new Array(rows);
		for (var y = 0; y < rows; y++) {
			tiles[x][y] = {};
		}
	}
	updBlocks();
}
Array.prototype.indexOfPointObj = function(point) {
	for (var n = 0; n < this.length; n++) {
		if (this[n].x == point.x && this[n].y == point.y) {
			return n;
		}
	}
	return -1;
};
function updBlocks() {
	for (var y = 0; y < rows; y++) {
		for (var x = 0; x < cols; x++) {
			tiles[x][y].blocked = false;
		}
	}
	for (var n = 0; n < blocks.length; n++) {
		tiles[blocks[n].x][blocks[n].y].blocked = true;
	}
}
function cityDist(pointA, pointB) {
	return Math.abs(pointA.x - pointB.x) + Math.abs(pointA.y - pointB.y);
}
function diagonalCityDist(pointA, pointB) {
	var difX = (pointA.x < pointB.x) ? (pointB.x - pointA.x) : (pointA.x - pointB.x);
	var difY = (pointA.y < pointB.y) ? (pointB.y - pointA.y) : (pointA.y - pointB.y);
	if (difX < difY) {
		var rootCoefficient = difX;
		var integer = difY - difX;
	} else {
		var rootCoefficient = difY;
		var integer = difX - difY;
	}
	return (integer + (rootCoefficient * rootTwo));
}
function euclideanDist(pointA, pointB) {
	if (pointA.x > pointB.x) {
		if (pointA.y > pointB.y) {
			return Math.sqrt((pointA.x - pointB.x) * (pointA.x - pointB.x) + (pointA.y - pointB.y) * (pointA.y - pointB.y));
		} else {
			return Math.sqrt((pointA.x - pointB.x) * (pointA.x - pointB.x) + (pointB.y - pointA.y) * (pointB.y - pointA.y));
		}
	} else {
		if (pointA.y > pointB.y) {
			return Math.sqrt((pointB.x - pointA.x) * (pointB.x - pointA.x) + (pointA.y - pointB.y) * (pointA.y - pointB.y));
		} else {
			return Math.sqrt((pointB.x - pointA.x) * (pointB.x - pointA.x) + (pointB.y - pointA.y) * (pointB.y - pointA.y));
		}
	}
}
function heuristic(point) {
	//return euclideanDist(point, goal);
	return diagonalCityDist(point, goal);
}
function aStar() { // Attempt 2.
	//var startTime = (new Date()).getTime();
	// Initialise variables:
	initTiles();
	tiles[start.x][start.y].g = 0;
	open = [{x: start.x, y: start.y}];
	current = {x: start.x, y: start.y};
	// While there still is hope for a solution, and we haven't reached it yet:
	while(open.length > 0 && !(current.x == goal.x && current.y == goal.y)) {
			
		// Loop through each direction:
		for (var n = 0; n < directions.length; n++) {
			// Set the neighbor currently being evaluated:
			var nei = {x: current.x + directions[n].x, y: current.y + directions[n].y}; // nei is short for neighbor.
			// If nei is current, or if nei is outside the window bounds, or if nei is closed, or if nei has already been evaluated, or if nei is untraversable:
			if ((nei.x == current.x && nei.y == current.y) || nei.x < 0 || nei.x > cols - 1 || nei.y < 0 || nei.y > rows - 1 || tiles[nei.x][nei.y].closed || tiles[nei.x][nei.y].blocked) {
				// Skip this node and continue evaluating the rest:
				continue;
			}
			// If neighbor never calculated it's heuristic:
			if (tiles[nei.x][nei.y].h == undefined) {
				// Calculate and set the neighbor's heuristic:
				tiles[nei.x][nei.y].h = heuristic(nei);
			}
			// Calculate the distance to this neighbor from the start, following the path that is currently being evaluated:
			var tentativeG = tiles[current.x][current.y].g + euclideanDist(current, nei);
			// If neighbor never got a g-cost, or this path to the neighbor is shorter than what was previously set:
			if (tiles[nei.x][nei.y].g == undefined || tentativeG < tiles[nei.x][nei.y].g) {
				// Set the g-cost to this newly calculated g-cost.
				tiles[nei.x][nei.y].g = tentativeG;
				// Set the neighbor's parent to the current node:
				tiles[nei.x][nei.y].parent = current;
			}
			// Evaluate and set this neighbor's f-cost:
			tiles[nei.x][nei.y].f = tiles[nei.x][nei.y].g + tiles[nei.x][nei.y].h;
			// If this neighbor isn't in the open set:
			if (open.indexOfPointObj(nei) == - 1) {
				// Add it to the open set:
				open.push(nei);
			}
		}
		// Remove current from the open set:
		open.splice(open.indexOfPointObj(current), 1);
		// Mark current node as 'closed', (already calculated):
		tiles[current.x][current.y].closed = true;
		if (open.length == 0) {
			if (current.x != goal.x || current.y != goal.y) {
				noSolution = true;
			} else {
				noSolution = false;
			}
			return;
		}
		
		// Set the record for the lowest f-cost to be positive infinity:
		var least = Number.POSITIVE_INFINITY;
		var index = null;
		// Loop through all nodes in the open set:
		for (var n = 0; n < open.length; n++) {
			// If this node's f-cost if less than the record lowest:
			if (tiles[open[n].x][open[n].y].f < least) {
				// Update the record to be 'accurate':
				least = tiles[open[n].x][open[n].y].f;
				// Save the position of this node for later:
				index = n;
			}
		}
		// Set current to the node in the open set with the lowest f-cost:
		current = {x: open[index].x, y: open[index].y};
	}
	if (current.x != goal.x || current.y != goal.y) {
		noSolution = true;
	} else {
		noSolution = false;
	}
	//console.log("milliseconds from start to finish: ", (new Date()).getTime() - startTime);
}
function draw() {
	ctx.fillStyle = "#888888"; // Draw background.
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	ctx.beginPath(); // Draw closed.
	ctx.fillStyle = "#0074D9";
	for (var y = 0; y < rows; y++) {
		for (var x = 0; x < cols; x++) {
			if (tiles[x][y].closed) {
				ctx.rect(x * tileSize, y * tileSize, tileSize, tileSize);
			}
		}
	}
	ctx.fill();
	
	ctx.beginPath(); // Draw open.
	ctx.fillStyle = "#011b72";
	for (var n = 0; n < open.length; n++) {
		ctx.rect(open[n].x * tileSize, open[n].y * tileSize, tileSize, tileSize);
	}
	ctx.fill();
	
	if (current.x != undefined) {
		path = [{x: current.x, y: current.y}];
		var famMem = {x: current.x, y: current.y};
		while (tiles[famMem.x][famMem.y].parent) {
			path.push({x: tiles[famMem.x][famMem.y].parent.x, y: tiles[famMem.x][famMem.y].parent.y});
			famMem = {x: tiles[famMem.x][famMem.y].parent.x, y: tiles[famMem.x][famMem.y].parent.y};
		}
	}
	if (path != undefined) {
		ctx.beginPath(); // Draw path.
		ctx.fillStyle = "#ca0a25";
		for (var n = 0; n < path.length; n++) {
			ctx.rect(path[n].x * tileSize, path[n].y * tileSize, tileSize, tileSize);
		}
		ctx.fill();
	}
	
	ctx.beginPath(); // Draw start and goal
	ctx.fillStyle = "purple";
	ctx.rect(start.x * tileSize, start.y * tileSize, tileSize, tileSize);
	ctx.rect(goal.x * tileSize, goal.y * tileSize, tileSize, tileSize);
	ctx.fill();
	
	ctx.beginPath(); // Draw blocked.
	ctx.fillStyle = "black";
	for (var y = 0; y < rows; y++) {
		for (var x = 0; x < cols; x++) {
			if (tiles[x][y].blocked) {
				ctx.rect(x * tileSize, y * tileSize, tileSize, tileSize);
			}
		}
	}
	ctx.fill();
	
	ctx.beginPath(); // Draw grid.
	ctx.strokeStyle = "black";
	for (var x = 0; x <= cols; x++) {
		ctx.moveTo(x * tileSize, 0);
		ctx.lineTo(x * tileSize, canvas.height);
	}
	for (var y = 0; y <= cols; y++) {
		ctx.moveTo(0, y * tileSize);
		ctx.lineTo(canvas.width, y * tileSize);
	}
	ctx.stroke();
	
	if (noSolution) { // Draw no solution.
		ctx.fillStyle = "red";
		ctx.font = "40px Arial";
		ctx.fillText("No Solution :c", 10, canvas.height - 10);
	}
}

// Main:
initCanvas();
aStar();
draw();