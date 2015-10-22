// debug
// For debugging info

if (global.window) {
	module.exports = require("./debug-webkit.js");
} else {
	module.exports = require("./debug-console.js");
}