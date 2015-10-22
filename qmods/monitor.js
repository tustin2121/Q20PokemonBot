//monitor.js
console.log("Loading Module monitor.js");

var extend = require("extend");
var fs = require("fs");
var net = require("net");
var clic = require("cli-color");

var friendly = require("./friendly");

const SOCKET_FILE = "q20-monitor.sock";

module.exports = {
	setup : function() {
		bot.addListener("mon_update", updateMontior);
		bot.addListener("ping", pingUpdate);
		bot.addListener("module-reloaded", moduleReload);
		
		setTimeout(function(){
			if (!state.server) establishSocket();
		}, 1000);
	},
	
	teardown : function(){
		bot.removeListener("mon_update", updateMontior)
		bot.removeListener("ping", pingUpdate);
		bot.removeListener("module-reloaded", moduleReload);
	},
	
	migrate : function(old) {
		extend(this.state, old.state);
		updateMontior();
	},
	
	shutdown : function() {
		for (var i = 0; i < state.connlist.length; i++) {
			state.connlist[i].end("Q20 is Shutting Down.");
		}
		
		state.server.close(function(){
			console.log("Monitor socket shut down.");
			fs.unlink(SOCKET_FILE);
		});
	},
}

var state = module.exports.state = {
	server: null,
	connlist: [],
	currMonitor: "",
	
	lastPing: 0,
};

////////////////////////////////////////////////////////////////////////////////

function moduleReload(module){
	switch (module) {
// 		case "game": Game = require("./game"); break;
		case "friendly": friendly = require("./friendly"); break;
	}
}

function pingUpdate() {
	state.lastPing = new Date().getTime();
	updateMontior();
}

////////////////////////////////////////////////////////////////////////////////

function pushMonitorUpdate() {
	try {
		for (var i = 0; i < state.connlist.length; i++) {
			state.connlist[i].write(state.currMonitor);
		}
	} catch (e) {
		console.error("ERROR pushing update to monitors!");
		console.error(e.stack);
	}
}


function establishSocket() {
	try {
		if (fs.existsSync(SOCKET_FILE))
			fs.unlinkSync(SOCKET_FILE);
		
		state.server = net.createServer(function(conn){
			console.log("Monitor connected.");
			state.connlist.push(conn);
			
			conn.on("end", function(){
				console.log("Monitor disconnected.");
				var i = state.connlist.indexOf(this);
				state.connlist.splice(i, 1);
			});
			
			bot.emit("mon_update"); 
			//Because calling the function directly causes odd caching issues
		}).listen(SOCKET_FILE, function(){
			console.log("Opened monitor socket");
		});
	} catch (e) {
		console.error("ERROR establishing a UNIX socket!");
		console.error(e.stack);
	}
}



function updateMontior() {
	try {
		
		state.currMonitor = clic.move.to(0,0) + clic.erase.screen +
"=============================="+ clic.bold.bgGreen.white(" Q20 Heart Monitor ")+"==============================\n" +
" C      " + printCDI( 0,  9) + "      C\n" +
" D      " + printCDI(10, 19) + "      D\n" +
" I      " + printCDI(20, 29) + "      I\n" +
"-------------------------------------------------------------------------------\n" +
clic.white(" Last Ping: ") + printPingTimeStamp() + "\n" +
clic.white(" Channels: ") + printJoinedList() +"\n" +
"";
		
		pushMonitorUpdate();
		return;
		
		function printCDI(from, to) {
			var str = "";
			for (var i = from; i < to; i++) {
				if (i < friendly.state.cdi_lastAvgs.length) {
					var s = "       "+friendly.state.cdi_lastAvgs[i].toFixed(2);
					s = s.substr(s.length-7, 7);
					if (friendly.state.cdi_lastAvgs[i] == 0) {
						s = clic.blackBright(s);
					}
					str += s;
				} else {
					str += "       ";
				}
			}
			return str;
		}
		
		function printPingTimeStamp() {
			var str = new Date(state.lastPing).toString();
			
			var now = new Date().getTime();
			if (state.lastPing + (1000*260) < now) {
				str = clic.bgRed.whiteBright(str);
			}
			
			str += " (~"+Math.round((now - state.lastPing)/(60*1000))+" min ago)";
			
			return str;
		}
		
		function printJoinedList() {
			var str = "";
			for (var c in currChans) {
				var a = clic.whiteBright;
				if (currChans[c].pokemon) {
					a = clic.blueBright;
				}
				str += a(c)+" ";
			}
			return str;
		}
		
	} catch (e) {
		console.error("ERROR while attempting to update the HEART MONITOR!");
		console.error(e.stack);
	}
}


