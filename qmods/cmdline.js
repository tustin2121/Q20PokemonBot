//cmdline.js
console.log("Loading Module cmdline.js");

var _	= require("underscore");
var util = require("util");
var clic = require("cli-color");

var cmds = [];

var identify = require("./identify");
var monitor = require("./monitor");

if (!Promise.prototype.isPending) {
	// Horrible workaround for the fact that there is no check of the internal state of a promise
	Promise.prototype.isPending = function(){
		return util.inspect(this).indexOf("<pending>")>-1; 
	}
}

bot.on("module-reloaded", function(module){
	switch (module) {
// 		case "game": Game = require("./game"); break;
		case "identify": identify = require("./identify"); break;
		case "monitor": monitor = require("./monitor"); break;
	}
});


function parse(cmd) {
    try {
    	process.stdout.write(clic.move(0, -1));
    	process.stdout.write(clic.erase.line);
    	console.log("> "+clic.white(cmd));
    	
        if (cmd.indexOf("!") == 0)
			cmd = cmd.substr(1);
		
		var res = null;
		for (var i = 0; i < cmds.length; i++) {
			if ((res = cmds[i].cmd.exec(cmd))) {
				cmds[i].run(cmd, res);
				return;
			}
		}
        
        console.log("Unrecognized command.");
    } catch (e) {
        console.log("Error parsing command.");
		error(e);
	}
}

parse.shutdownServer = function() {
	console.log("Saving and shutting down server!");
	identify.saveForShutdown();
	// require("node-persist").persistSync();
	try { require("./pkick").state.store.forceSave(); } catch(e) { console.log("ERROR saving:",e); }
    for (var id in currChans) {
		currChans[id].forceQuit(null, "shutdown");
	}
	
	console.log("Disconnecting bot... (10 seconds)");
	setTimeout(function(){ 
		process.exit(-1)
		console.log("Bot did not disconnect in 10 seconds. Forcing quit.");
	}, 10*1000 ); //wait ten seconds before forcing down
	
	bot.disconnect("Q20PokemonBot says goodbye! o/", function(){
		console.log("Bot disconnected.");
		process.exit(0);
	});
};

module.exports = parse;

///////////// Commands ///////////////

cmds.push({ //Command to shutdown the bot
	cmd: /^shutdown/i,
	run: function() {
		console.log("Bot saving and shutting down.");
		parse.shutdownServer();
	},
});

cmds.push({ //Command to reload modules
	cmd: /^reload ?(.*)/i,
	run: function(text, res) {
		bot.emit("pm_reload", null, res[1]);
	}
});

cmds.push({ //Attempts to restore the bot's nickname.
	cmd: /^(?:renick)/i,
	run: function(text) {
		bot.say("NickServ", "GHOST q20pokemonbot "+require("../../password").password);
		console.log("Sending a nick change request.");
		bot.emit("re-nick");
	}
});

cmds.push({
	cmd: /^join (\#\#?[\w#]+)/i,
	run: function(text, res) {
		console.log("Joining '"+res[1]+"'.");
		bot.join(res[1]);
	}
});

cmds.push({
	cmd: /^(?:part|leave) (\#\#?[\w#]+)/i,
	run: function(text, res) {
		console.log("Parting '"+res[1]+"'.");
		if (currChans[text] && currChans[text].forceQuit)
			currChans[text].forceQuit("central command", "leave");
		bot.part(res[1], "Told to leave the channel");
	},
});

cmds.push({
	cmd: /^(?:dumpprefixes)/i,
	run: function(text) {
		identify.dumpPrefixes();
	}
});

cmds.push({
	cmd: /^(?:loadmemory|id load)/i,
	run: function(text) {
		identify.loadMemory();
	}
});

cmds.push({
	cmd: /^(?:savememory|id save)/i,
	run: function(text) {
		identify.saveMemory();
	}
});

cmds.push({
	cmd: /^(?:pkick load|load pkick)/i,
	run: function(text) {
		require("./pkick").loadFile();
		console.log("File loaded from disk.");
	}
});

cmds.push({
	cmd: /^(?:friendly load|load friendly)/i,
	run: function(text) {
		require("./friendly").loadFile();
		console.log("File loaded from disk.");
	}
});

cmds.push({
	cmd: /^refresh(mon(itor)?)?/i,
	run: function(text) {
		bot.emit("mon_update");
	}
});

cmds.push({
	cmd: /^(ping|send ping)/i,
	run: function(text, res) {
		bot.send("PING", "Q20Hi-"+Date.now());
	}
});

cmds.push({
	cmd: /^(send|dc) ([\w\d]+) ([\w\d]+) ([\w\d]+) (.*)/i,
	run: function(text, res) {
		bot.send(res[2], res[3], res[4], res[5]);
	}
});

cmds.push({
	cmd: /^(send|dc) ([\w\d]+) ([\w\d]+) ([\w\d]+)/i,
	run: function(text, res) {
		bot.send(res[2], res[3], res[4]);
	}
});

cmds.push({
	cmd: /^(send|dc) ([\w\d]+) ([\w\d]+)/i,
	run: function(text, res) {
		bot.send(res[2], res[3]);
	}
});

cmds.push({
	cmd: /^sayto ([\w\d]+) (.*)/i,
	run: function(text, res) {
		bot.say(res[1], res[2]);
	}
});

cmds.push({
	cmd: /^sayl (.*)/i,
	run: function(text, res) {
		bot.say("#tppleague", res[1]);
	}
});

cmds.push({
	cmd: /^stateof ?(.*)/i,
	run: function(text, res) {
		switch (res[1]) {
			case "monitor":
				console.log(util.inspect(require("./monitor").state));
				break;
			case "friendly":
				console.log(util.inspect(require("./friendly").state));
				break;
			case "pkick":
				console.log(util.inspect(require("./pkick").state));
				break;
			case "identify":
				console.log(util.inspect(require("./identify").state));
				break;
		}
	}
});

cmds.push({
	cmd: /^commandlist (.*)/i,
    run: function(text, res) {
		switch (res[1]) {
			case "friendly":
				cmds = require("./friendly").getCmdList()
				for (var i = 0; i < cmds.length; i++) {
					if (cmds[i].hidden) continue;
					console.log(cmds[i].cmd);
				}
				break;
		}
	}
})

cmds.push({
	cmd: /^resetTVTropes/i,
	run: function(text, res) {
		require("./friendly").state.tv_tropes_timeout = null;
		bot.action("#tppleague", "is forcefully fished out of the bowels of TV Tropes by Tustin!");
		console.log("forcefully fished out of the bowels of TV Tropes by Tustin!");
	}
})

cmds.push({
	cmd: /^(?:hi|hello|status|stat)/,
	run: function() {
		//Trim off clear screen, cursor move before printing to main terminal
		var s = monitor.state.currMonitor;
		var i = s.indexOf("=");
		s = s.substr(i);
		console.log(s);
	},
});

cmds.push({
	cmd : /^friendly ?(true|false)?/i,
	run : function(text, res){
		if (!res[1]) {
			console.log((require("./friendly").state.friendly)?"true":"false");
		} else {
			require("./friendly").state.friendly = (res[1] == "true")? true : false;
			console.log("State set to", require("./friendly").state.friendly);
		}
	},
});

cmds.push({
	cmd: /^reconnect/i,
	run: function(text) {
		//Force an END event on the connection to try and make the irc lib retry
		bot.conn.requestedDisconnect = false;
		bot.conn.end();
	}
});

cmds.push({
	cmd: /^uptime/i,
	run: function(text) {
		var ut = process.uptime();
		
		var sec = ut % 60;
		var min = Math.floor(ut / 60) % 60
		var hrs = Math.floor(ut / (60*60)) % 24;
		var day = Math.floor(ut / (60*60*24));
		
		console.log("Uptime: ", day,"days,", hrs,"hours,", min,"minutes,", sec,"seconds");
	}
});

cmds.push({
	cmd: /^ping/i,
	run: function(text) {
		//Force an END event on the connection to try and make the irc lib retry
		bot.send("PING");
	}
});

cmds.push({
	cmd: /^ircdebug (0|1|true|on|false|off)/i,
	run: function(text, res) {
		global.IRCDEBUG = /true|1|on/.test(res[1]);
	},
});


///////////////////////////// Identify Cleaner /////////////////////////////////

var idselection = null;

function normalizeUser(user) {
	if (!_.isObject(user)) {
		var nu = {};
		if (_.isArray(user)) {
			nu.name = user[0];
			nu.notes = [];
			for (var i = 1; i < user.length; i++) {
				nu.notes.push(user[i]);
			}
		} else {
			nu.name = user;
			nu.notes = [];
		}
		return nu;
	}
	return user;
}

function inspectUser(user) {
	if (_.isArray(user) || typeof user == "string") return util.inspect(user);
	if (!_.isObject(user)) return util.inspect(user);
	if (!user.name) return util.inspect(user);
	
	var str = "{ name: '"+user.name+"',";
	if (user.alts)
		str += "\n\talts: "+util.inspect(user.alts)+",";
	if (user.notes)
		str += "\n\tnotes: "+util.inspect(user.notes)+",";
	if (user.lastSeen)
		str += "\n\tlastSeen: '"+user.lastSeen+"',";
	if (user.lastRangeMatched)
		str += "\n\tlastRangeMatched: '"+user.lastRangeMatched+"',";
	str += " }";
	return str;
}

cmds.push({
	cmd: /^id (?:disable ?save)/i,
	run: function(text, res) {
		identify._saveEnabled = false;
		console.log(clic.bgRed.white("Disabled saving memory to disk."));
	}
});

cmds.push({
	cmd: /^id (?:enable ?save)/i,
	run: function(text, res) {
		identify._saveEnabled = true;
		console.log(clic.bgGreen.white("Enabled saving memory to disk."));
	}
});

cmds.push({
	cmd: /^id (?:(?:list|ls) (?:unkonwn|unknown|unown|uk|\?)|ls\?)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		console.log("=== Number of users: "+ Object.keys(users).length +" ===");
		var pi = 0;
		for (var u in users) {
			var user = users[u];
			if (typeof user == "string") {
				if (user.indexOf("Unknown User") >= 0) {
					console.log(u+" ==> "+util.inspect(users[u]));
					pi++;
				}
				continue;
			}
			if (_.isArray(user)) {
				if (user[0].indexOf("Unknown User") >= 0) {
					console.log(u+" ==> "+util.inspect(users[u]));
					pi++;
				}
				continue;
			}
			if (_.isObject(user)) {
				if (user.name.indexOf("Unknown User") >= 0) {
					console.log(u+" ==> "+util.inspect(users[u]));
					pi++;
				}
				continue;
			}
		}
		console.log("=== Number of users: "+pi+"/"+ Object.keys(users).length +" ===");
	}
});

cmds.push({
	cmd: /^id (?:list|ls)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		console.log("=== Number of users: "+ Object.keys(users).length +" ===");
		for (var u in users) {
			console.log(u+" ==> "+util.inspect(users[u]));
		}
		console.log("=== Number of users: "+ Object.keys(users).length +" ===");
	}
});

cmds.push({
	cmd: /^id (?:selection|sel) ?(?:clear|cls|cl)/i,
	run: function(text, res) {
		idselection = null;
		console.log("Selection cleared.");
	}
});

cmds.push({
	cmd: /^id (?:selection|sel) ?(?:add|append) ([a-zA-Z0-9]+)/i,
	run: function(text, res) {
		var len = idselection.length;
		if (!identify.memory.users[res[1]]) {
			console.log("No such user id: "+res[1]);
			return;
		}
		if (!idselection) idselection = [];
		idselection.push(res[1]);
		
		console.log("Selection has "+(idselection.length-len)+" more entry.");
	}
});

cmds.push({
	cmd: /^id (?:(?:selection|sel) ?(?:rem|rm|remove)|deselect|desel) ([a-zA-Z0-9]+)/i,
	run: function(text, res) {
		if (!idselection || !idselection.length) {
			console.log("No selection.");
			return;
		}
		
		var len = idselection.length;
		idselection = _.without(idselection, res[1]);
		
		if (idselection.length)
			console.log("Selection has "+(len-idselection.length)+" less entry.");
		else {
			console.log("Selection is now empty.");
			idselection = null;
		}
	}
});

//Must be after other selection commands, so it doesn't override
cmds.push({
	cmd: /^id (?:selection|selection list|sel|sel list|sel ls|lssel|lss)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		var sel = idselection;
		if (!sel || !sel.length) {
			console.log("No selection.");
			return;
		}
		console.log("=== Number of selected users: "+ sel.length +" ===");
		for (var i = 0; i < sel.length; i++) {
			console.log(sel[i]+" ==> "+users[sel[i]]);
		}
	}
});

cmds.push({
	cmd: /^id (?:find) (.+)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		var sel = [];
		res[1] = res[1].toLowerCase();
		for (var u in users) {
			if (_.isArray(users[u])) {
				for (var i = 0; i < users[u].length; i++) {
					if (users[u][i].toLowerCase().indexOf(res[1]) > -1) {
						sel.push(u);
						break;
					}
				}
			} else if (_.isObject(users[u])) {
				if (users[u].name.toLowerCase().indexOf(res[1]) > -1) {
					sel.push(u);
				} else if (users[u].alts && users[u].alts.length > 0) {
					for (var i = 0; i < users[u].alts.length; i++) {
						if (users[u].alts[i].toLowerCase().indexOf(res[1]) > -1) {
							sel.push(u);
							break;
						}
					}
				}
			} else {
				if (users[u].toLowerCase().indexOf(res[1]) > -1) {
					sel.push(u);
				}
			}
			
		}
		
		console.log("=== Users with '"+res[1]+"': "+ sel.length +" ===");
		for (var i = 0; i < sel.length; i++) {
			console.log(sel[i]+" ==> "+util.inspect(users[sel[i]]));
		}
		
		if (sel.length) {
			idselection = sel;
			console.log("=== Changed to selection ===");
		}
	}
});

cmds.push({
	cmd: /^id (?:show|status|view) (.+)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		if (!users[res[1]]) {
			console.log("No such user id: "+res[1]);
			return;
		}
		
		console.log(util.inspect(users[res[1]]));
	}
});

cmds.push({
	cmd: /^id (?:addnote|add note) ([a-zA-Z0-9]+) (.+)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		if (!users[res[1]]) {
			console.log("No such user id: "+res[1]);
			return;
		}
		
		var user = normalizeUser(users[res[1]]);
		if (!user.notes) user.notes = [];
		user.notes.push(res[2]);
		
		users[res[1]] = user;
		console.log("Added.");
	}
});

cmds.push({
	cmd: /^id (?:addalt|add alt) ([a-zA-Z0-9]+) (.+)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		if (!users[res[1]]) {
			console.log("No such user id: "+res[1]);
			return;
		}
		
		var user = normalizeUser(users[res[1]]);
		if (!user.alts) user.alts = [];
		user.alts.push(res[2]);
		
		users[res[1]] = user;
		console.log("Added.");
	}
});

cmds.push({
	cmd: /^id (?:change|set) name ([a-zA-Z0-9]+) (.+)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		if (!users[res[1]]) {
			console.log("No such user id: "+res[1]);
			return;
		}
		
		var user = normalizeUser(users[res[1]]);
		user.name = res[2];
		
		users[res[1]] = user;
		console.log("Name changed.");
	}
});

cmds.push({
	cmd: /^id (?:date|mark|touch|datemark|datestamp) (.+)/i,
	run: function(text, res) {
		var hashid = res[1];
		var user = identify.memory.users[hashid];
		if (!user) {
			console.log("No such user id: "+hashid);
			return;
		}
		
		if (typeof(user) == "string") {
			// Convert to object
			var nuser = {
				name: user,
			};
			user = identify.memory.users[hashid] = nuser;
		}
		if (_.isArray(user)) {
			// Convert to object
			var nuser = {
				name: user[0],
				notes: user.slice(1),
			};
			user = identify.memory.users[hashid] = nuser;
		}
		if (_.isObject(user)) {
			if (user.lastSeen === undefined) //define with 1970 first
				user.lastSeen = new Date(0).toUTCString();
			else
				user.lastSeen = new Date().toUTCString();
		}
		
		console.log(util.inspect(user));
	}
});

// cmds.push({
// 	cmd: /^id (?:iprange|ip range|ipr) add ([a-zA-Z0-9]+) ([0-9]{1,3})\.?([0-9]{1,3})?\.?([0-9]{1,3})?/i,
// 	run: function(text, res) {
// 		var users = identify.memory.users;
// 		if (!users[res[1]]) {
// 			console.log("No such user id: "+res[1]);
// 			return;
// 		}
		
// 		var ipr = identify.memory.ipranges;
// 		var ip1 = res[2];
// 		var ip2 = res[3];
// 		var ip3 = res[4];
		
// 		if (ip1 < 0 || ip1 > 255) { console.log("Invalid IP Octet (1)."); return; }
// 		if (ip2 !== undefined && (ip2 < 0 || ip2 > 255)) { console.log("Invalid IP Octet (2)."); return; }
// 		if (ip3 !== undefined && (ip3 < 0 || ip3 > 255)) { console.log("Invalid IP Octet (3)."); return; }
		
// 		if (ip1) {
// 			var ipr1 = ipr[ip1];
// 			if (!ipr1) ipr1 = ipr[ip1] = {};
// 			if (ip2) {
				
// 			} else {
				
// 			}
// 		}
// 	}
// });

cmds.push({
	cmd: /^id (?:clean)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		var uc = 0, uu = 0, ic = 0, cc = 0, nc = 0, hc = 0, pc = 0;
		
		for (var u in users) {
			if (!users[u]) {
				delete users[u]; uc++;
				continue;
			}
			
			var user = users[u];
			
			if (typeof(user) == "string") {
				// Convert to object
				var nuser = {
					name: user,
				};
				user = users[u] = nuser;
				uu++;
			}
			if (_.isArray(user)) {
				// Convert to object
				var nuser = {
					name: user[0],
					notes: user.slice(1),
				};
				user = users[u] = nuser;
				uu++;
			}
			if (_.isObject(user)) {
				if (user.lastSeen === undefined) //define with 1970 first
					user.lastSeen = new Date(0).toUTCString();
			}
		}
		
		for (var k in identify.memory.ipkeys) {
			if (!identify.memory.ipkeys[k] || !users[identify.memory.ipkeys[k]])
			{
				delete identify.memory.ipkeys[k]; ic++;
				continue;
			}
		}
		
		for (var k in identify.memory.cloakkeys) {
			if (!identify.memory.cloakkeys[k] || !users[identify.memory.cloakkeys[k]])
			{
				delete identify.memory.cloakkeys[k]; cc++;
				continue;
			}
		}
		
		for (var k in identify.memory.namekeys) {
			if (!identify.memory.namekeys[k] || !users[identify.memory.namekeys[k]])
			{
				delete identify.memory.namekeys[k]; nc++;
				continue;
			}
		}
		
		for (var k in identify.memory.hostkeys) {
			if (!identify.memory.hostkeys[k] || !users[identify.memory.hostkeys[k]])
			{
				delete identify.memory.hostkeys[k]; hc++;
				continue;
			}
		}
		
		for (var k in identify.memory.userhostkeys) {
			if (!identify.memory.userhostkeys[k] || !users[identify.memory.userhostkeys[k]])
			{
				delete identify.memory.userhostkeys[k]; pc++;
				continue;
			}
		}
		
		console.log("Cleaned up:");
		console.log("  "+uc+" errant user entries");
		console.log("  "+ic+" ownerless ipkeys");
		console.log("  "+cc+" ownerless cloakkey");
		console.log("  "+nc+" ownerless namekey");
		console.log("  "+hc+" ownerless hostkey");
		console.log("  "+pc+" ownerless userhostkey");
		console.log("Made "+uu+" user entries into proper objects");
	}
});


cmds.push({
	cmd: /^id (?:merge|mergeto) (.+)/i,
	run: function(text, res) {
		var sel = idselection;
		if (!sel || !sel.length) {
			console.log("No selection.");
			return;
		}
		
		var repid = res[1];
		var users = identify.memory.users;
		if (!users[repid]) {
			console.log("No such user id: "+repid);
			return;
		}
		
		var vc = 0; //values changed
		var ur = 0 ; //users removed
		var latestSeen = 0, latestRangeMatched = 0;
		for (var i = 0; i < sel.length; i++) {
			if (sel[i] == repid) continue;
			
			var predicate = function(val, key, obj) { return val == sel[i]; };
			
			for (var k in _.pick(identify.memory.ipkeys, predicate)) {
				console.log("    Changed ipkey: ", k);
				identify.memory.ipkeys[k] = repid; vc++;
			}
			
			for (var k in _.pick(identify.memory.cloakkeys, predicate)) {
				console.log("    Changed cloakkey: ", k);
				identify.memory.cloakkeys[k] = repid; vc++;
			}
			
			for (var k in _.pick(identify.memory.namekeys, predicate)) {
				console.log("    Changed namekey: ", k);
				identify.memory.namekeys[k] = repid; vc++;
			}
			
			for (var k in _.pick(identify.memory.hostkeys, predicate)) {
				console.log("    Changed hostkey: ", k);
				identify.memory.hostkeys[k] = repid; vc++;
			}
			
			for (var k in _.pick(identify.memory.userhostkeys, predicate)) {
				console.log("    Changed userhostkey: ", k);
				identify.memory.userhostkeys[k] = repid; vc++;
			}
			
			if (identify.memory.users[sel[i]].firstSeen) {
				var d = new Date(identify.memory.users[sel[i]].firstSeen).getTime();
				latestSeen = Math.max(latestSeen, d);
			}
			if (identify.memory.users[sel[i]].lastSeen) {
				var d = new Date(identify.memory.users[sel[i]].lastSeen).getTime();
				latestSeen = Math.max(latestSeen, d);
			}
			if (identify.memory.users[sel[i]].lastRangeMatched) {
				var d = new Date(identify.memory.users[sel[i]].lastRangeMatched).getTime();
				latestRangeMatched = Math.max(latestRangeMatched, d);
			}
			
			delete identify.memory.users[sel[i]]; ur++;
		}
		
		if (latestSeen > 0) {
			var date = new Date(users[repid].lastSeen).getTime();
			users[repid].lastSeen = new Date( Math.max(date, latestSeen) ).toUTCString();
		}
		if (latestRangeMatched > 0) {
			var date = new Date(users[repid].lastRangeMatched).getTime();
			users[repid].lastRangeMatched = new Date( Math.max(date, latestRangeMatched) ).toUTCString();
		}
		
		console.log("Consolidated "+ur+" users into "+repid+". "+vc+" keys changed.");
		idselection = null; //clear selection
	}
});

cmds.push({
	cmd: /^id (?:change|set) (?:id|uid) ([a-zA-Z0-9]+) ([a-zA-Z0-9]+)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		
		var origid = res[1];
		if (!users[origid]) {
			console.log("No such user id: "+origid);
			return;
		}
		
		var newid = res[2];
		if (users[newid]) {
			console.log("Already a user with that id: "+newid);
			return;
		}
		
		var vc = 0; //values changed
			
		var predicate = function(val, key, obj) { return val == origid; };
		
		users[newid] = users[origid];
		delete users[origid];
		
		for (var k in _.pick(identify.memory.ipkeys, predicate)) {
			console.log("    Changed ipkey: ", k);
			identify.memory.ipkeys[k] = newid; vc++;
		}
		
		for (var k in _.pick(identify.memory.cloakkeys, predicate)) {
			console.log("    Changed cloakkey: ", k);
			identify.memory.cloakkeys[k] = newid; vc++;
		}
		
		for (var k in _.pick(identify.memory.namekeys, predicate)) {
			console.log("    Changed namekey: ", k);
			identify.memory.namekeys[k] = newid; vc++;
		}
		
		for (var k in _.pick(identify.memory.hostkeys, predicate)) {
			console.log("    Changed hostkey: ", k);
			identify.memory.hostkeys[k] = newid; vc++;
		}
		
		for (var k in _.pick(identify.memory.userhostkeys, predicate)) {
			console.log("    Changed userhostkey: ", k);
			identify.memory.userhostkeys[k] = newid; vc++;
		}
		
		console.log("Changed user id "+origid+" into "+newid+". "+vc+" keys changed.");
		idselection = null; //clear selection
	}
});


cmds.push({
	cmd: /^id (?:remove|rm) (?:user) ([a-zA-Z0-9]+)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		
		var origid = res[1];
		if (!users[origid]) {
			console.log("No such user id: "+origid);
			return;
		}
		
		var vc = 0; //values changed
		
		var predicate = function(val, key, obj) { return val == origid; };
		
		delete users[origid];
		
		for (var k in _.pick(identify.memory.ipkeys, predicate)) {
			console.log("    Removed ipkey: ", k);
			delete identify.memory.ipkeys[k]; vc++;
		}
		
		for (var k in _.pick(identify.memory.cloakkeys, predicate)) {
			console.log("    Removed cloakkey: ", k);
			delete identify.memory.cloakkeys[k]; vc++;
		}
		
		for (var k in _.pick(identify.memory.namekeys, predicate)) {
			console.log("    Removed namekey: ", k);
			delete identify.memory.namekeys[k]; vc++;
		}
		
		for (var k in _.pick(identify.memory.hostkeys, predicate)) {
			console.log("    Removed hostkey: ", k);
			delete identify.memory.hostkeys[k]; vc++;
		}
		
		for (var k in _.pick(identify.memory.userhostkeys, predicate)) {
			console.log("    Removed userhostkey: ", k);
			delete identify.memory.userhostkeys[k]; vc++;
		}
		
		console.log("Deleted user id "+origid+". "+vc+" keys deleted.");
		idselection = null; //clear selection
	}
});


cmds.push({
	cmd: /^id (?:keys) ([a-zA-Z0-9]+)/i,
	run: function(text, res) {
		var users = identify.memory.users;
		
		var origid = res[1];
		if (!users[origid]) {
			console.log("No such user id: "+origid);
			return;
		}
		
		console.log("Keys associated with user id "+origid+":");
		
		var vc = 0; //values changed
		var predicate = function(val, key, obj) { return val == origid; };
		
		for (var a in identify.memory.ipranges) {
			if (_.isObject(identify.memory.ipranges[a])) 
			{
				for (var b in identify.memory.ipranges[a]) {
					if (_.isObject(identify.memory.ipranges[a][b])) 
					{
						for (var c in identify.memory.ipranges[a][b]) {
							if (identify.memory.ipranges[a][b][c] == origid) {
								console.log("    iprange: ", a+"."+b+"."+c+".*"); vc++;
							}
						}
					} 
					else if (identify.memory.ipranges[a][b] == origid) {
						console.log("    iprange: ", a+"."+b+".*"); vc++;
					}
				}
			} 
			else if (identify.memory.ipranges[a] == origid) {
				console.log("    iprange: ", a+".*"); vc++;
			}
		}
		
		for (var k in _.pick(identify.memory.ipkeys, predicate)) {
			console.log("    ipkey: ", k); vc++;
		}
		
		for (var k in _.pick(identify.memory.cloakkeys, predicate)) {
			console.log("    cloakkey: ", k); vc++;
		}
		
		for (var k in _.pick(identify.memory.namekeys, predicate)) {
			console.log("    namekey: ", k); vc++;
		}
		
		for (var k in _.pick(identify.memory.hostkeys, predicate)) {
			console.log("    hostkey: ", k); vc++;
		}
		
		for (var k in _.pick(identify.memory.userhostkeys, predicate)) {
			console.log("    userhostkey: ", k); vc++;
		}
		console.log("Number of keys: "+vc);
	}
});