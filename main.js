// Pokemon 20 Questions
// Using SQLite Database from http://veekun.com/dex/downloads

global.IRCDEBUG = false;

var config = {
	channel: "#TPPTableTop", //"#TPPLeague",
	server: "irc.freenode.net",
	desiredNick: require("../password").nick,
	creator: "tustin2121",
};

var irc	= require("irc");
var util= require("util");
var _	= require("underscore");
var readline = require("readline");

// require("node-persist").init({
// 	dir: "~/data/persistence",
// 	logging: true,
// 	//interval: 5*60*1000, //persist changes every 5 minutes
// });

var bot = global.bot = new irc.Client(config.server, config.desiredNick, {
	autoRejoin: false,
	autoConnect: false,
	// channels: [config.channel],
	username: require("../password").nick,
	password: require("../password").password,
	realName: "Q20Node.js Bot",
	port: 8000,
	// secure: true,
	// debug: true,
	retryDelay: 10000, //10 seconds
	floodProtection: true,
	floodProtectionDelay: 500,
});


var debug = require("./debug");

//Reloadable modules:
var Game = require("./qmods/game");
var pm = require("./qmods/pm-handler");
var info = require("./qmods/dbinfo");
var friendly = require("./qmods/friendly");
var pkick = require("./qmods/pkick");
var identify = require("./qmods/identify");
var cmdline = require("./qmods/cmdline");
var monitor = require("./qmods/monitor");
var poketext = require("./qmods/poketext");

// Game.prototype.say = function(txt){
// 	bot.say(this.channel, txt);
// }

///////////////////////////////////
/*
const PING_TIMEOUT = 300 * 1000; //300 seconds
var pingTimeoutId = 0;
var lastPing = 0;

function __setupTimeout() {
	lastPing = new Date().getTime();
	clearTimeout(pingTimeoutId);
	pingTimeoutId = setTimeout(__pingTimeout, PING_TIMEOUT);
}
function __pingTimeout() {
	console.log("__pingTimeout");
	var currMillis = new Date().getTime();
	if (!pingTimeoutId || lastPing + PING_TIMEOUT > currMillis) {
		console.log("__pingTimeout : Not Timed Out Yet! ", lastPing);
		//Not timed out yet
		clearTimeout(pingTimeoutId);
		pingTimeoutId = setTimeout(__pingTimeout, (lastPing + PING_TIMEOUT) - currMillis);
		return;
		
	} else {
		console.log("DETECTED PING TIMEOUT! Disconnecting and reconnecting!");
		// We're timed out!
		lastPing = currMillis; //To avoid horrendous loops
		bot.disconnect();
		setTimeout(function(){
			console.log("__pingTimeout : Reconnecting! ", lastPing);
			bot.connect(__connectionComplete);
			// At this point, the irc library will take over attempting to reconnect over and over
		}, 2000);
	}
}
function __updatePing(){
	console.log("__updatePing");
	lastPing = new Date().getTime();
	clearTimeout(pingTimeoutId);
	pingTimeoutId = setTimeout(__pingTimeout, PING_TIMEOUT);
}
/*/
function __setupTimeout() {}
function __pingTimeout() {}
function __updatePing(){}
//*/
///////////////////////////////////

global.currChans = {};

global.log = function(str) {
	console.log(str);
}

global.sayLog = function(nick, str) {
	if (nick) bot.say(nick, str);
	console.log(str);
}

global.error = function(err) {
	console.log("ERROR");
	console.error(err.stack);
}

global.safely = function(callback, fail) {
	try {
		callback();
	} catch (e) {
		error(e);
		if (fail) try {
			fail();
		} catch (e) {
			log("Fail callback also errored:");
			error(e);
		}
	}
}

global.setTimeoutSafely = function(callback, fail, timeout) {
	if (timeout === undefined && typeof fail === "number") {
		timeout = fail; fail = undefined;
	}
	
	setTimeout(function(){
		try {
			callback();
		} catch (e) {
			error(e);
			if (fail) try {
				fail();
			} catch (e) {
				log("Fail callback also errored:");
				error(e);
			}
		}
	}, timeout);
};

////////////// IRC Listeners //////////////////

// bot.addListener("raw", function(msg){
// 	console.log(msg);
// });

bot.addListener("ping", function() {
	__updatePing();
	for (var c in currChans) {
		currChans[c].emit("ping");
	}
});

// On receiving notice (usually from server)
bot.addListener("notice", function(nick, to, txt, msg){
	if (!nick) { //from server
		log("[SRV] "+txt);
	} else if (nick == "NickServ") {
		//[Notice from NickServ]: Q20PokemonBot1!~nodebot@davinci.pittmanfamily.info has just authenticated as you (Q20PokemonBot)
		var res = /([A-Za-z0-9_~]+)\![^@]+@[^ ]+ has just authenticated as you/.exec(txt);
		if (res) {
			
		}
	} else {
		log("[Notice from "+nick+"]: "+txt);
	}
});

// On log into server
bot.addListener("registered", function(msg){
	log("  ----- Registered -----  ");
});

var klineTimeout = 0;
// On Error
bot.addListener("error", function(msg){
	log("[SRV] Received Error from Server!");
	debug.ircError(msg);
	
	if (msg.command == "err_yourebannedcreep") {
		console.log("I have been K-Lined again. ;_;");
		bot.removeListener("registered", __klineReconnect);
		bot.disconnect("(;_;)/ K-Lined, bye...");
		
		if (!klineTimeout) klineTimeout = 1 * 60 * 60 * 1000; //1 hour
		else klineTimeout *= 2; //multiply by 2 every time we're klined
		
		setTimeoutSafely(function __klineReconnect(){
			console.log("Attempting K-Line Timeout Reconnection.");
			
			bot.connect(__klineReconnect); //Adds the listener we're removing above
		}, klineTimeout);
	}
});
function __klineReconnect(){
	console.log("Connection Attempt Successful! (?!)");
	__connectionComplete();
	klineTimeout = 0;
}

// On Nickname Change
bot.addListener("nick", function(oldnick, newnick, channels, msg){
	if (oldnick == bot.nick) {
		//bot.nick = newnick;
		log("[NICK] My nickname has been changed to "+bot.nick);
	} else {
		_.each(channels, function(chan){
			if (!currChans[chan]) return;
			safely(function(){
				currChans[chan].emit("nick", oldnick, newnick);
			});
		});
	}
});

bot.addListener("re-nick", function(){
	bot.send("NICK", config.desiredNick);
	//bot.nick = config.desiredNick;
	log("Forcing my nick to "+config.desiredNick);
});

// On Invite to a channel
bot.addListener("invite", function(channel, from, msg){
	log("[Invite] I was invited to "+channel+" by "+from+"!");
	bot.join(channel);
});

bot.addListener("join", function(channel, nick) {
	safely(function(){
		if (nick == bot.nick) {
			currChans[channel] = new Game(channel);
		} else {
			currChans[channel].emit("join", nick);
		}
	}, function(){
		bot.action(channel, "bangs its head on the way in and knocks itself unconscious.");
		bot.part(channel, "Error: concussion.");
	});
});
bot.addListener("part", function(channel, nick, reason){
	if (nick == bot.nick) {
		delete currChans[channel];
	} else {
		safely(function(){
			currChans[channel].emit("part", nick, reason);
		}, function(){
			bot.action(channel, "is immensely startled at "+nick+"'s departure.");
		});
	}
});
bot.addListener("kick", function(channel, nick, by, reason){
	if (nick == bot.nick) {
		delete currChans[channel];
	} else {
		safely(function(){
			currChans[channel].emit("part", nick, reason);
		}, function(){
			bot.action(channel, "is immensely disturbed by "+nick+"'s sudden removal.");
		});
	}
});

bot.addListener("quit", function(nick, reason, channels){
	if (currChans[nick]) { //cleanup private games
		delete currChans[nick];
	} 
	_.each(channels, function(chan){
		if (!currChans[chan]) return;
		safely(function(){
			currChans[chan].emit("quit", nick, reason);
		}, function(){
			bot.action(chan, "is startled by "+nick+"'s vanishing.");
		});
		
	});
});
bot.addListener("kill", function(nick, reason, channels){
	if (currChans[nick]) { //cleanup private games
		delete currChans[nick];
	} 
	_.each(channels, function(chan){
		if (!currChans[chan]) return;
		safely(function(){
			currChans[chan].emit("quit", nick, reason);
		}, function(){
			bot.action(chan, "is shaken by "+nick+"'s murder at the hands of services.");
		});
	});
});


bot.addListener("+mode", function(channel, by, mode, arg){
	if (!currChans[channel]) return;
	safely(function(){
		currChans[channel].emit("+mode", by, mode, arg);
	}, function(){
		bot.action(channel, "cannot comprehend the mode introduction.");
	});
});
bot.addListener("-mode", function(channel, by, mode, arg){
	if (!currChans[channel]) return;
	safely(function(){
		currChans[channel].emit("-mode", by, mode, arg);
	}, function(){
		bot.action(channel, "cannot comprehend the mode dissolution.");
	});
});

// bot.addListener("whois", function(info){
// 	console.log(info);
// });


// On getting a PM
bot.addListener("pm", function(nick, txt, msg){
	if (!nick) {
		log("[SRV-PM] "+txt);
	} else {
		log("[PM]["+nick+"] "+txt);
		safely(function(){
			pm.parse(nick, txt);
		}, function(){
			bot.action(nick, "is utterly baffled by what you said.");
		});
	}
});

bot.addListener("message#", parseChannelMessage);

////////////// PM Function Listeners //////////////////

bot.addListener("pm_logto", function(nick){
	bot.say(nick, "This functionalty has been removed. Please log into the Cloud.");
});

bot.addListener("pm_pardon", function(requester, subject){
	if (!subject) {
		log("Clearing global ban list at behest of "+requester);
		Game.fn.globalBanList = {};
	} else {
		log("Pardoning "+subject+" at behest of "+requester);
		var file = Game.fn.globalBanList[subject];
		if (file) {
			file.count = 0;
			bot.say(requester, "I will pardon "+subject+", if you insist.");
			bot.say(subject, "You have been pardoned from your question ban by "+requester+".");
		} else {
			bot.say(requester, "The given user is not on my ban list.");
		}
	}
});

bot.addListener("pm_ban", function(requester, subject){
	if (!subject) {
		bot.say(requester, "Please provide a nick to ban.");
	} else {
		log("Banning "+subject+" at behest of "+requester);
		Game.fn.globalBanList[subject] = { count:5, by:requester };
		bot.say(requester, "I have banned "+subject+" at your behest.");
	}
});

bot.addListener("pm_reload", function(nick, modulename){
	reloadModule(nick, modulename);
});


/////////// Friendly Listeners //////////////
friendly.setup();
identify.setup();
monitor.setup();
pkick.setup();
if (poketext) poketext.setup();

///////// Functions ///////////

function reloadModule(from, name){
	if (!name) {
		bot.say(from, "Please supply a valid module name");
	}
	
	switch (name) {
		case "game":
			sayLog(from, "Attempting to reload game module.");
			
			if (!__reloadFile(from, "./qmods/game")) return;
			
			Game = require("./qmods/game");
			for (var chan in currChans) {
				var g = currChans[chan];
				currChans[chan] = new Game(chan);
				currChans[chan].emit("migrate", g);
			}
			bot.emit("module-reloaded", "game");
			sayLog(from, "Reload completed successfully.");
			break;
			
		case "digigame":
			sayLog(from, "Attempting to reload digigame module.");
			
			if (!__reloadFile(from, "./qmods/digigame")) return;
			
			Game = require("./qmods/digigame");
			for (var chan in currChans) {
				var g = currChans[chan];
				currChans[chan] = new Game(chan);
				currChans[chan].emit("migrate", g);
			}
			bot.emit("module-reloaded", "game");
			sayLog(from, "Reload completed successfully.");
			sayLog(from, "Renicking...");
			bot.send("NICK", "Q20DigimonBot");
			break;
			
		case "pm":
			sayLog(from, "Attempting to reload pm module.");
			
			if (!__reloadFile(from, "./qmods/pm-handler")) return;
			
			pm = require("./qmods/pm-handler");
			
			bot.emit("module-reloaded", "pm");
			sayLog(from, "Reload completed successfully.");
			break;
		
		case "cmd":
		case "cmdline":
			sayLog(from, "Attempting to reload cmdline module.");
			
			if (!__reloadFile(from, "./qmods/cmdline")) return;
			
			cmdline = require("./qmods/cmdline");
			
			bot.emit("module-reloaded", "cmdline");
			sayLog(from, "Reload completed successfully.");
			break;
		
		case "db":
			sayLog(from, "Attempting to reload database and info module.");
			
			if (!__reloadFile(from, "./qmods/dbinfo")) return;
			
			info.closeDB();
			info = require("./qmods/dbinfo");
			info.initDB();
			
			bot.emit("module-reloaded", "db");
			sayLog(from, "Reload completed successfully.");
			break;
		
		case "friendly":
			sayLog(from, "Attempting to reload friendly module.");
			
			if (!__reloadFile(from, "./qmods/friendly")) return;
			
			var _old = friendly;
			friendly.teardown();
			friendly = require("./qmods/friendly");
			friendly.setup();
			friendly.migrate(_old);
			
			bot.emit("module-reloaded", "friendly");
			sayLog(from, "Reload completed successfully.");
			break;
		
		case "pkick":
			sayLog(from, "Attempting to reload pkick module.");
			
			if (!__reloadFile(from, "./qmods/pkick")) return;
			
			var _old = pkick;
			pkick.teardown();
			pkick = require("./qmods/pkick");
			pkick.setup();
			pkick.migrate(_old);
			
			bot.emit("module-reloaded", "pkick");
			sayLog(from, "Reload completed successfully.");
			break;
		
		case "identify":
			sayLog(from, "Attempting to reload identify module.");
			
			if (!__reloadFile(from, "./qmods/identify")) return;
			
			var _old = identify;
			identify.teardown();
			identify = require("./qmods/identify");
			identify.setup();
			identify.migrate(_old);
			
			bot.emit("module-reloaded", "identify");
			sayLog(from, "Reload completed successfully.");
			break;
		
		case "monitor":
			sayLog(from, "Attempting to reload monitor module.");
			
			if (!__reloadFile(from, "./qmods/monitor")) return;
			
			var _old = monitor;
			monitor.teardown();
			monitor = require("./qmods/monitor");
			monitor.setup();
			monitor.migrate(_old);
			
			bot.emit("module-reloaded", "monitor");
			sayLog(from, "Reload completed successfully.");
			break;
		
		case "poketext":
			if (poketext) {
				sayLog(from, "Attempting to reload poketext module.");
				
				if (!__reloadFile(from, "./qmods/poketext")) return;
				
				var _old = poketext;
				poketext.teardown();
				poketext = require("./qmods/poketext");
				poketext.setup();
				poketext.migrate(_old);
				
				bot.emit("module-reloaded", "poketext");
				sayLog(from, "Reload completed successfully.");
			}
			else { //poketext is not loaded
				sayLog(from, "Loading poketext module.");
				
				poketext = require("./qmods/poketext");
				poketext.setup();
				
				bot.emit("module-reloaded", "poketext");
				sayLog(from, "Load completed successfully.");
			}
			break;
			
		default: sayLog(from, "Module name invalid.")
	}
}

function __reloadFile(from, modulename) {
	var path = require.resolve(modulename);
	
	var _oldmodule = require.cache[path];
	delete require.cache[path];
	try {
		require(modulename);
	} catch (e) {
		error(e);
		sayLog(from, "Failed to reload module! Attempting to revert.");
		require.cache[path] = _oldmodule;
		return false;
	}
	return true;
}

function parseChannelMessage(from, to, text) {
	safely(function(){
		if (text.indexOf("?") != 0) return;
		
		var game = currChans[to];
		if (!game) return;
		game.parseMessage(from, text.substr(1));
	}, function(){
		bot.action("is flummoxed by a sudden error in his calculations.");
	});
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////

function __connectionComplete() {
	log("  ----- Connected ----- ");
	
	bot.say("NickServ", "IDENTIFY "+require("../password").nick+" "+require("../password").password);
	
	setTimeoutSafely(function(){
		bot.join(config.channel);
		bot.join("##tppleague#id"); //Q20Bot is owner of this channel
	}, 1000);
	
	setTimeoutSafely(function(){
		bot.join("#tppleague");
		bot.join("#playq20");
		bot.join("#poketext");
	}, 2000);
	
	__setupTimeout(); //sets up a new ping timeout responder
}

(function() {
	info.initDB();
	
	bot.connect(__connectionComplete);
})();

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.setPrompt("", 0);
rl.on("line", function(cmd){
	try {
		if (cmd) {
			cmdline(cmd);
		}
	} catch (e) { 
		error(e); 
	}
	rl.prompt();
});

rl.on('SIGINT', function() {
	try {
		cmdline.shutdownServer();
	} catch (e) {
		console.error("Error responding to SIGINT: ", e.stack);
	} finally {
		rl.close();
		process.exit(0);
	}
});

rl.prompt();