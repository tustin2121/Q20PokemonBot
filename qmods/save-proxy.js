var Proxy = require('harmony-proxy');
var fs = require("fs");

module.exports = function(filename){
	var dirty = false;
	var backing = JSON.parse(fs.readFileSync(filename));
	var handlers = {
		get : function(target, key) {
			return target[key] || 0;
		},
		set : function(target, key, val) {
			target[key] = val;
			//state[`_${key}`] = val;
			dirty = true;
		},
	};
	var proxy = new Proxy(backing, handlers);
	
	function forceSave() {
		try {
			fs.writeFileSync(filename, JSON.stringify(backing));
			dirty = false;
			return true;
		} catch (e) {
			console.error(`Failed to flush ${filename} to disk!`, e);
			return false;
		}
	}
	var _int_ = setInterval(function(){
		if (!dirty) return;
		forceSave();
	}, 5*60*1000);
	
	function dispose() {
	    clearInterval(_int_);
	}
	
	Object.defineProperties(proxy, {
	    "forceSave": {
    	    value: forceSave,
    	    enumerable: false,
    	    writable: false,
    	},
    	"dispose": {
    	    value: dispose,
    	    enumerable: false,
    	    writable: false,
    	},
	});
	return proxy;
};