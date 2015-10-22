// identify.js
console.log("Loading Module identify.js");

var extend = require("extend");
var fs = require("fs");
var _ = require("underscore");
var Logger = require("./logger");

var colors = require("irc").colors;
var clic = (function(){
	var c = require("cli-color");
	return {
		grey: c.white,
		gray: c.white,
		red: c.redBright,
		green: c.greenBright,
		yellow: c.yellowBright,
		blue: c.blueBright,
		purple: c.magentaBright,
		cyan: c.cyanBright,
		bold: c.bold,
	};
})();

var savetimer = 0;

module.exports = {
	setup : function() {
		bot.addListener("join#tppleague", joinCheck);
		bot.addListener("join##tppleague#id", opAuthorized);
		bot.addListener("message##tppleague#id", chatmessage);
		// bot.addListener("raw", debugRaw);
		
		setTimeout(function(){
			loadMemory();
			
			if (!state.logger) {
				state.logger = new Logger("IDENTIFY");
			}
		}, 1000);
		
		savetimer = setInterval(function(){
			saveMemory();
			rotateLogs();
		}, 60*60*1000);
	},
	
	teardown : function(){
		bot.removeListener("join#tppleague", joinCheck);
		bot.removeListener("join##tppleague#id", opAuthorized);
		bot.removeListener("message##tppleague#id", chatmessage);
		// bot.removeListener("raw", debugRaw);
		
		clearInterval(savetimer);
		saveMemory();
	},
	
	migrate : function(old) {
		extend(this.state, old.state);
	},
}

var state = module.exports.state = {
	lastPrefixes : { //Last messages by user
		
	},
	
	lastNamesListing : null,
	logger: null,
};

const INFOCHAN = "##tppleague#id";
var memory;
/////////////////////////////////////////////////////////////////////////////////////

String.prototype.hashCode = function(){
	var hash = 0;
	if (this.length == 0) return hash;
	for (var i = 0; i < this.length; i++) {
		var char = this.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash);
}

function opAuthorized(nick, msg) {
	bot.whois(nick, function(info){
		console.log(info);
		if (info.account == "tustin2121") {
			bot.send("MODE", INFOCHAN, "+v", nick);
		}
	});
}

function joinCheck(nick, msg){
	safely(function(){
		bot.say(INFOCHAN, "The user "+colors.wrap("dark_blue", nick)+" has entered the channel.");
		state.logger.log( "User: "+clic.blue(nick)+" : "+clic.blue(msg.prefix));
		
		var info = analizeUser(msg);
		var id = identifyUser(info);
		
		if (!id || !id._ided) {
			var hashtag = msg.host.hashCode().toString(36);
			
			bot.say(INFOCHAN, "User is not in my database. User hash is: "+hashtag);
			state.logger.log("User is not in my database. User hash is: "+clic.red(hashtag));
			
			storeUser(info, hashtag);
			//Don't call mark user when seen for the first time
		} else {
			reportUser(id);
			markUser(id);
		}
		bot.say(INFOCHAN, "------");
		state.logger.log("------");
	});
}


function userName(hashid) {
	var name = memory.users[hashid];
	if (!name) name = memory.ignores[hashid];
	if (_.isArray(name)) return name[0];
	if (_.isObject(name)) return name.name;
	return name;
}

function altNames(hashid) {
	var name = memory.users[hashid];
	if (!name) return memory.ignores[hashid];
	if (_.isArray(name) && name.length > 1) return name.slice(1);
	if (_.isObject(name) && name.alts) return name.alts;
	return null;
}

function userNotes(hashid) {
	var name = memory.users[hashid];
	if (!name) return memory.ignores[hashid];
	if (_.isObject(name) && name.notes) return name.notes;
	return null;
}

function reportUser(id) {
	var name2str = [];
	
	function _add2name(name, str) {
		if (!name2str[name]) {
			name2str[name] = "User's ";
		} else {
			name2str[name] += ", ";
		}
		name2str[name] += str;
	}
	
	if (id.ip) {
		_add2name( userName(id.ip), "IP address" );
		// bot.say(INFOCHAN, "User's IP address links to "+colors.wrap("dark_red", userName(id.ip))+".");
		state.logger.log("IP link: "+clic.yellow(userName(id.ip))+" ("+id.ip+")" );
	}
	if (id.cloak) {
		_add2name( userName(id.cloak), "cloak" );
		// bot.say(INFOCHAN, "User's cloak links to "+colors.wrap("dark_red", userName(id.cloak))+".");
		state.logger.log("Cloak link: "+clic.yellow(userName(id.cloak))+" ("+id.cloak+")" );
	}
	if (id.user) {
		_add2name( userName(id.user), "username" );
		// bot.say(INFOCHAN, "User's username links to "+colors.wrap("dark_red", userName(id.user))+".");
		state.logger.log("Username link: "+clic.yellow(userName(id.user))+" ("+id.user+")" );
	}
	if (id.host) {
		_add2name( userName(id.host), "host string" );
		// bot.say(INFOCHAN, "User's host string links to "+colors.wrap("dark_red", userName(id.host))+".");
		state.logger.log("Host link: "+clic.yellow(userName(id.host))+" ("+id.host+")" );
	}
	if (id.userhost) {
		_add2name( userName(id.userhost), "username/host string" );
		// bot.say(INFOCHAN, "User's username/host string links to "+colors.wrap("dark_red", userName(id.userhost))+".");
		state.logger.log("UserHost link: "+clic.yellow(userName(id.userhost))+" ("+id.userhost+")" );
	}
	
	for (var u in name2str) {
		bot.say(INFOCHAN, name2str[u]+" links to "+colors.wrap("dark_red", u)+".");
	}
	
	var alts  = altNames(id.name || id.cloak || id.userhost || id.ip || id.host);
	var notes = userNotes(id.name || id.cloak || id.userhost || id.ip || id.host);
	if (alts && !notes) {
		bot.say(INFOCHAN, "Notes/Alts: "+colors.wrap("dark_green", alts.join(", ")));
		state.logger.log("Nodes/Alts: "+clic.green(alts.join(", ")) );
	} else {
		if (alts && alts.length) {
			bot.say(INFOCHAN, "Known Alts: "+colors.wrap("dark_green", alts.join(", ")));
			state.logger.log("Alts: "+clic.green(alts.join(", ")) );
		}
		if (notes && notes.length) {
			bot.say(INFOCHAN, "Notes: "+colors.wrap("dark_green", notes.join(", ")));
			state.logger.log("Notes: "+clic.green(notes.join(", ")) );
		}
	}
	
	if (id.ip && id.ip_isRange) {
		bot.say(INFOCHAN, colors.wrap("gray", "(Note: User's IP address was matched to a range of IP addresses. False positives may occur.)"));
		state.logger.log(clic.gray("(IP Range was matched.)"));
	}
}

function markUser(id) {
	
	__markId(id.ip, id.ip_isRange);
	__markId(id.cloak);
	__markId(id.user);
	__markId(id.host);
	__markId(id.userhost);
	
	function __markId(hashid, rangeMatched) {
		if (!hashid) return;
		var user = memory.users[hashid];
		if (!user) return;
		
		if (typeof(user) == "string") {
			// Convert to object
			var nuser = {
				name: user,
			};
			memory.users[hashid] = nuser;
			user = nuser;
		}
		if (_.isArray(user)) {
			// Convert to object
			var nuser = {
				name: user[0],
				notes: user.slice(1),
			};
			memory.users[hashid] = nuser;
			user = nuser;
		}
		if (_.isObject(user)) {
			if (rangeMatched) {
				user.lastRangeMatched = new Date().toUTCString();
			} else {
				user.lastSeen = new Date().toUTCString();
			}
		}
	}
}

function storeUser(userinfo, hashname, givenName) {
	if (givenName)
		memory.users[hashname] = {
			name: givenName,
			firstSeen: new Date().toUTCString(),
		};
	else
		memory.users[hashname] = { 
			name: "Unknown User "+hashname+" ("+userinfo.nick+") ",
			firstSeen: new Date().toUTCString(),
		};
	
	if (userinfo.ip) {
		memory.ipkeys[userinfo.ip] = hashname;
	}
	
	if (userinfo.cloak) {
		memory.cloakkeys[userinfo.cloak] = hashname;
	}
	
	if (userinfo.user) {
		memory.namekeys[userinfo.user] = hashname;
	}
	
	if (userinfo.host) {
		memory.hostkeys[userinfo.host] = hashname;
	}
	
	if (userinfo.user && userinfo.host) {
		memory.userhostkeys["~"+userinfo.user+"@"+userinfo.host] = hashname;
	}
}

function analizeUser(msg) {
	var nick, ip, username, cloak;
	var webclient = false;
	var res;
	nick = msg.nick;

	if (msg.user) {
		if (msg.user.indexOf("~") == 0) username = msg.user.substr(1);
		if (username == "quassel") username = undefined; //IGNORE FUCKING quassel!! >_<
	}
	
	if (msg.host) {
		res = /((?:[0-9]{1,3})\.(?:[0-9]{1,3})\.(?:[0-9]{1,3})\.(?:[0-9]{1,3}))/i.exec(msg.host);
		if (res && res[1]) ip = res[1];
		
		res = /^gateway\/web\/freenode\//i.test(msg.host);
		if (res) webclient = true;
		
		var res = /^unaffiliated\/(.+)/i.exec(msg.host);
		if (res && res[1]) cloak = res[1];
	}
	
	// console.log("User ana:", nick, ip, username, cloak, "web="+webclient, ":", msg.prefix);
	
	state.lastPrefixes[nick.toLowerCase()] = msg.prefix;
	
	return {
		nick : nick,
		ip : ip,
		user : username,
		cloak : cloak,
		host : msg.host,
	};
}

function identifyUser(userinfo) {
	if (!userinfo) return null;
	var id = { _ided : false };
	
	var name;
	if (userinfo.ip) {
		name = memory.ipkeys[userinfo.ip];
		if (name) { id.ip = name; id._ided = !memory.ignores[name]; }
		else { 
			id.ip = _checkIPRanges(userinfo.ip); 
			id.ip_isRange = !!id.ip;
			id._ided |= !!id.ip; 
		}
	}
	
	if (userinfo.cloak) {
		name = memory.cloakkeys[userinfo.cloak];
		if (name) { id.cloak = name; id._ided |= !memory.ignores[name]; }
	}
	
	if (userinfo.user) {
		name = memory.namekeys[userinfo.user];
		if (name) { id.user = name; id._ided |= !memory.ignores[name]; }
	}
	
	if (userinfo.host) {
		name = memory.hostkeys[userinfo.host];
		if (name) { id.host = name; id._ided |= !memory.ignores[name]; }
		else {
			id.host = _checkHostRegex(userinfo.host); 
			id.host_regexed = !!id.ip;
			id._ided |= !!id.ip; 
		}
	}
	
	if (userinfo.user && userinfo.host) {
		name = memory.userhostkeys["~"+userinfo.user+"@"+userinfo.host];
		if (name) { id.userhost = name; id._ided |= !memory.ignores[name]; }
	}
	
	return id;
	
	function _checkIPRanges(ip) {
		if (!memory.ipranges) return null;
		var octels = ip.split(".");
		// if (octels[0] == 119 && octels[1] == 56 && octels[2] >= 120 && octels[2] <= 129)
		// 	return "colew";
		return __c(octels[3], __c(octels[2], __c(octels[1], __c(octels[0], memory.ipranges))));
		
		function __c(octel, obj) {
			if (!obj) return null;
			if (typeof obj == "string") return obj;
			return obj[octel];
		}
	}
	
	function _checkHostRegex(host) {
		if (/\.upenn\.edu$/.test(host)) return "pikalax";
		if (/^gateway\/web\/irccloud.com\/x\-/.test(host)) return "cyander";
		return null;
	}
}




////////////////////////////////////////////////////////////////////////////////

function createBlankMemory() {
	console.log("createBlankMemory()");
	memory = module.exports.memory = {
		users: {},
		
		ignores: {},
		ipranges: {},
		
		namekeys : {},
		ipkeys : {},
		cloakkeys : {},
		hostkeys : {},
		userhostkeys: {},
	};
}

module.exports._saveEnabled = true;

function loadMemory(pmname) {
	safely(function(){
		sayLog(pmname, "Clearing memory for load.");
		memory = module.exports.memory = null;
		
		fs.readFile("data/memory.json", { encoding: "utf8" }, function(err, data){
			safely(function(){
				if (err) {
					createBlankMemory();
					sayLog(pmname, "Error loading memory! Blank memory is loaded!");
					console.error(err);
					return;
				}
				memory = module.exports.memory = JSON.parse(data);
				sayLog(pmname, "Memory has been loaded. Users = "+Object.keys(memory.users).length);
			});
		});
	});
}
module.exports.loadMemory = loadMemory;

function saveMemory(pmname) {
	safely(function(){
		if (!module.exports._saveEnabled) {
			sayLog(pmname, "Saving has been temporarily disabled!");
			return;
		}
		
		sayLog(pmname, "Saving memory...");
		if (!memory) createBlankMemory();
		var data = JSON.stringify(memory, undefined, '\t');
		
		fs.writeFile("data/memory.json", data, { encoding: "utf8" }, function(err){
			safely(function(){
				if (err) throw err;
				sayLog(pmname, "Memory has been saved!");
			});
		});
	});
}
module.exports.saveMemory = saveMemory;

function saveForShutdown() {
	if (!memory) createBlankMemory();
	var data = JSON.stringify(memory, undefined, '\t');
	
	fs.writeFileSync("data/memory.json", data, { encoding: "utf8" });
	
	if (state.logger) {
		state.logger.close();
	}
}
module.exports.saveForShutdown = saveForShutdown;



module.exports.dumpPrefixes = function(nick) {
	var str = "";
	
	for (var name in state.lastPrefixes) {
		str += "["+name+"] = "+state.lastPrefixes[name]+"\n";
	}
	fs.writeFile("data/name-prefixes.txt", str, function(){
		sayLog(nick, "Prefix file written.");
	});
}

////////////////////////////// Logging /////////////////////////////////

function rotateLogs() {
	safely(function(){
		var time = new Date().getHours();
		if (time >= 0 && time < 1) 
		{ //Swap logger during the midnight hour
			console.log("Rotating IDENTIFY logs.");
			if (state.logger)
				state.logger.close();
				
			state.logger = new Logger("IDENTIFY");
		}
	}, function(){
		console.log("ERROR while attempting to rotate IDENTIFY logs!!");
	});
}



/////////////////////////// Chat Commands /////////////////////////////
var cmds = [];
function chatmessage(nick, text, msg) {
	if (text.indexOf("!") != 0) return;
	
	safely(function(){
		var res = null;
		var txt = text.substr(1);
		for (var i = 0; i < cmds.length; i++) {
			if (res = cmds[i].cmd.exec(txt)) {
				cmds[i].run(nick, text, res, msg);
				return;
			}
		}
	});
}

cmds.push({
	cmd : /^learn ([^ ]+) (.*)/i,
	run : function(nick, text, res){
		//TODO: learn this nickname
	},
});

cmds.push({
	cmd : /^manual (([^\!]+)\!([^@]+)@([^ ]+)) (.*)/i,
	run : function(nick, text, res){
		var info = {
			prefix : res[1],
			nick : res[2],
			user : (res[3].indexOf("~") == 0)? res[3].substr(1) : res[3],
			host : res[4],
		};
		
		var id = identifyUser(info);
		if (id && id._ided) {
			bot.say(INFOCHAN, "This user is already recognized.");
			return;
		}
		
		var hashtag = info.host.hashCode().toString(36);
		storeUser(info, hashtag, res[5]);
		bot.say(INFOCHAN, "User stored in database: "+hashtag+" = "+res[5]);
		state.logger.log( "Manual addition: User stored in database: "+hashtag+" = "+res[5] );
		state.logger.log("------");
	},
});

cmds.push({
	cmd : /^whois ([^ ]+) (.*)/i,
	run : function(nick, text, res){
		bot.whois(res[1], function(info){
			safely(function(){
				info.prefix = info.nick+"!"+info.user+"@"+info.host;
				var id = identifyUser(info);
				if (id && id._ided) {
					bot.say(INFOCHAN, "This user is already recognized.");
					reportUser(id);
					return;
				}
				
				if (!info.host) {
					bot.say(INFOCHAN, "Host info undefined for the requested user.");
					console.log(require("util").inspect(info));
					return;
				}
				var hashtag = info.host.hashCode().toString(36);
				storeUser(info, hashtag, res[2]);
				bot.say(INFOCHAN, "User stored in database: "+hashtag+" = "+res[2]);
				state.logger.log( "Whois addition: User stored in database: "+hashtag+" = "+res[5] );
				state.logger.log("------");
			});
		});
	},
});
