// pm-handler.js
console.log("Loading Module pm-handler.js");

var _	= require("underscore");
var util = require("util");

var Game = require("./game");
var identify = require("./identify");
var cmdline = require("./cmdline");

var cmds = [];

function authenticate(nick, permittedCallback) {
	bot.whois(nick, function(info){
		console.log(info);
		if (info.account == "tustin2121") 
			permittedCallback();
		else
			bot.say(nick, "You have insufficient permissions to command me to do that.");
	});
}

bot.on("module-reloaded", function(module){
	switch (module) {
		case "game": Game = require("./game"); break;
		case "identify": identify = require("./identify"); break;
		case "cmdline": cmdline = require("./cmdline"); break;
	}
});

function parse(nick, text) {
	try {
		if (text.indexOf("!") < 0 && currChans[nick]) {
			if (text.indexOf("?") == 0) text = text.substr(1);
			currChans[nick].parseMessage(nick, text);
			return;
		}
		
		if (/^\!quit/i.test(text) && currChans[nick]) {
			currChans[nick].forceQuit(nick, "quit");
			delete currChans[nick];
			return;
		}
		
		if (text.indexOf("!") == 0) {
			var res = null;
			var txt = text.substr(1);
			for (var i = 0; i < cmds.length; i++) {
				if (res = cmds[i].cmd.exec(txt)) {
					cmds[i].run(nick, text, res);
					return;
				}
			}
		}
		
		if (/^\??(begin|start|new) ?(game|pokemon)?/i.test(text)) {
			if (text.indexOf("?") == 0) text = text.substr(1);
			currChans[nick] = new Game(nick);
			currChans[nick].parseMessage(nick, text);
			return;
		}
		
		if (/\b(hello|hi)\b/i.test(text)) {
			bot.say(nick, "Hello. I am at your service.");
			return;
		}
		
		bot.say(nick, "I don't understand that command.");
	} catch (e) {
		bot.action(nick, "has suffered an error while processing that command.");
		error(e);
	}
}

cmds.push({
	man: null, //Directly parrots to a channel some phrase
	cmd: /^dc (\#\#?[a-zA-Z0-9]+) (.*)/i,
	run: function(nick, text, res) {
		authenticate(nick, function(){
			bot.say(res[1], res[2]);
		});
	}
});

cmds.push({
	man: null, //Directly parrots to a channel some phrase
	cmd: /^dcme (\#\#?[a-zA-Z0-9]+) (.*)/i,
	run: function(nick, text, res) {
		authenticate(nick, function(){
			bot.action(res[1], res[2]);
		});
	}
});

var rot13 = require('./caesar-cipher');
cmds.push({
	man: null,
	cmd: /^rot(\d{1,2}) (.*)/i,
	run: function(nick, text, res) {
		var rotnum = Number(res[1]) % 26;
		bot.say(nick, rot13(res[2], rotnum));
	}
});

// cmds.push({
// 	man: null, //Directly parrots to a channel some phrase
// 	cmd: /^friendly ?(true|false)?/i,
// 	run: function(nick, text, res){
// 		if (!res[1]) {
// 			bot.say("#tppleague", (state.friendly)?"true":"false");
// 		} else {
// 			authenticate(nick, function(){
// 				state.friendly = (res[1] == "true")? true : false;
// 			});
// 		}
// 	}
// });

cmds.push({
	man: "!join [#channel] : joins a channel",
	cmd: /^join (\#\#?\w+)/i,
	run: function(nick, text, res) {
		bot.say(nick, "I will join '"+res[1]+"' shortly.");
		bot.join(res[1]);
	}
});

cmds.push({
	man: "!part [#channel] : leaves a channel",
	cmd: /^(?:part|leave) (\#\#?\w+)/i,
	run: function(nick, text, res) {
		bot.say(nick, "I will leave '"+res[1]+"' shortly.");
		if (currChans[text] && currChans[text].forceQuit)
			currChans[text].forceQuit(nick, "leave");
		bot.part(res[1], "Told to leave the channel");
	},
});

cmds.push({
	man: null, //Command to shutdown the bot
	cmd: /^shutdown/i,
	run: function(nick) {
		authenticate(nick, function(){
			bot.say(nick, "Bot saving and shutting down.");
			cmdline.shutdownServer();
		});
	},
});

cmds.push({
	man: null, //Command to reload modules
	cmd: /^reload ?(.*)/i,
	run: function(nick, text, res) {
		authenticate(nick, function(){
			bot.emit("pm_reload", nick, res[1]);
		});
	}
});

cmds.push({
	man: null, //Command to command the bot to log to me.
	cmd: /^logme/i,
	run: function(nick, text, res) {
		bot.emit("pm_logto", nick);
	},
}); 

cmds.push({
	man: "!banlist: Displays currently banned players.",
	cmd: /^banlist/i,
	run: function(nick, text) {
		bot.say(nick, "The following users have been banned from participating:");
		for (var name in Game.fn.globalBanList) {
			bot.say(nick, name +" : "+util.inspect(Game.fn.globalBanList[name]));
		}
		bot.say(nick, "-------- End of List ---------");
	},
});

cmds.push({
	man: null,
	cmd: /^(?:unban|pardon) all/i,
	run: function(nick) {
		authenticate(nick, function(){
			bot.emit("pm_pardon", nick, null);
			bot.say(nick, "The ban list has been cleared.");
		});
	},
});

cmds.push({
	man: "!ban <name>: Pardon's a user from the global ban list.",
	cmd: /^(?:ban) ([a-zA-Z0-9_]+)/i,
	run: function(nick, text, res) {
		authenticate(nick, function(){
			var subject = res[1];
			bot.emit("pm_ban", nick, subject);
		});
	}
});

cmds.push({
	man: "!pardon <name>: Pardon's a user from the global ban list.",
	cmd: /^(?:unban|pardon) ([a-zA-Z0-9_]+)/i,
	run: function(nick, text, res) {
		authenticate(nick, function(){
			var subject = res[1];
			bot.emit("pm_pardon", nick, subject);
		});
	}
});

cmds.push({
	man: "!force [pokedex #] [#channel]: requests a pokemon in a given channel.",
	cmd: /^(?:force) ([0-9]+) (\#\#?\w+)/i,
	run: function(nick, text, res) {
		var game = currChans[res[2]];
		if (game) {
			game.emit("requestedPkmn", Number(res[1]));
			bot.say(nick, "The next game will be pokemon number "+res[1]+" for channel "+res[2]+".");
		} else {
			bot.say(nick, "I am not joined on the channel "+res[2]+".");
		}
	}
});

cmds.push({
	man: "!renick: Attempts to restore the bot's nickname.",
	cmd: /^(?:renick)/i,
	run: function(nick, text) {
		authenticate(nick, function(){
			bot.say(nick, "Sending a nick change request.");
			bot.emit("re-nick");
		});
	}
});

cmds.push({
	man: "!dumpprefixes",
	cmd: /^(?:dumpprefixes)/i,
	run: function(nick, text) {
		authenticate(nick, function(){
			identify.dumpPrefixes(nick);
		});
	}
});

cmds.push({
	man: "!loadmemory",
	cmd: /^(?:loadmemory)/i,
	run: function(nick, text) {
		authenticate(nick, function(){
			identify.loadMemory(nick);
		});
	}
});

cmds.push({
	man: "!savememory",
	cmd: /^(?:savememory)/i,
	run: function(nick, text) {
		authenticate(nick, function(){
			identify.saveMemory(nick);
		});
	}
});

cmds.push({
	man: "!whois ",
	cmd: /^(?:whois) ([a-zA-Z0-9_]+)/i,
	run: function(nick, text, res) {
		authenticate(nick, function(){
			bot.whois(res[1], function(info){
				console.log(info);
				bot.say(nick, "Done");
			});
		});
	}
});

cmds.push({
	man: "!msg (.*)",
	cmd: /^msg ([^ ]+) (.*)/i,
	run: function(nick, text, res) {
		authenticate(nick, function(){
			// var args = res[1].split(" ");
			// args.unshift("PRIVMSG");
			// console.log("SENDING: "+args);
			// bot.send.apply(bot, args);
			bot.send("PRIVMSG", res[1], res[2]);
		});
	}
});

module.exports.parse = parse;