// friendly.js
console.log("Loading Module friendly.js");

var extend = require("extend");
var irccolors = require("irc").colors;
var fs = require("fs");
var _ = require("underscore");

var cdi_interval = 0;

function averageToCDI(avg) {
	//-((Ax+B)^2) + C
	// avg *= 1; //A
	// avg += 32; //B
	// return Math.round(-(avg * avg) + 10000); //C
	
	// (((x-64)^2)*2.3)
	var x = avg - 64;
	var y = Math.round((x * x) * 2.3);
	if (x < 0) return y;
	else return -y;
}

module.exports = {
	setup : function() {
		bot.addListener("names#tppleague", namesCheck);
		bot.addListener("join#tppleague", joinCheck);
		bot.addListener("kick#tppleague", quitCheck);
		bot.addListener("kick#tppleague", defyLeonys);
		bot.addListener("quit", quitCheck);
		bot.addListener("kill", quitCheck);
		bot.addListener("quit", netsplitHype);
		bot.addListener("message#tppleague", chatmessage);
		bot.addListener("+mode", respondOpOn);
		bot.addListener("-mode", respondOpOff);
		bot.addListener("notice", respondNotice);
		// bot.addListener("raw", debugRaw);
		bot.addListener("join#tppdw", joinCheckDw);
		
		cdi_interval = setInterval(storeCDI, 1000 * 60); //every 60 seconds
	},
	
	teardown : function(){
		bot.removeListener("names#tppleague", namesCheck);
		bot.removeListener("join#tppleague", joinCheck);
		bot.removeListener("kick#tppleague", quitCheck);
		bot.removeListener("kick#tppleague", defyLeonys);
		bot.removeListener("quit", quitCheck);
		bot.removeListener("kill", quitCheck);
		bot.removeListener("quit", netsplitHype);
		bot.removeListener("message#tppleague", chatmessage);
		bot.removeListener("+mode", respondOpOn);
		bot.removeListener("-mode", respondOpOff);
		bot.removeListener("notice", respondNotice);
		// bot.removeListener("raw", debugRaw);
		bot.removeListener("join#tppdw", joinCheckDw);
		
		clearInterval(cdi_interval);
	},
	
	migrate : function(old) {
		extend(this.state, old.state);
		// state.tv_tropes_timeout = 0;
	},
}

var state = module.exports.state = {
	friendly : true,
	nukelist : ["/r/pokemon", "/r/gaming"],
	
	lastPrefixes : { //Last messages by user
		
	},
	
	puppy : false,
	puppy_score_puppy: 0,
	puppy_score_dead: 0,
	
	wtf_count : 0,
	tv_tropes_timeout : 0,
	
	lastNamesListing : null,
	
	// Chat death index
	cdi_lastAvgs: [],
	cdi_maxSamples: 30,
	cdi_minSamples: 5,
	cdi_currAvgCount: 0,
	
	modmode : false,
	
	lastQuoteRequested : null,
	lastQuoteRequestor : null,
	lastLyWord : null,
};



////////////////////////// Callbacks /////////////////////////

function debugRaw(msg) {
	safely(function(){
		// console.log(msg);
		// analizeUser(msg);
	});
}

function namesCheck(nicks){
	safely(function(){
		console.log(nicks);
		var voiceBatch = [];
		for (var name in nicks) {
			// console.log("league names: ", name);
			if (/^doofbot$/i.test(name)) {
				state.friendly = false;
				console.log("friendly: ", state.friendly);
			}
			if (/^(dead|mobile)insky/i.test(name)) {
				state.puppy = true;
				console.log("puppy: ", state.puppy);
			}
			
			if (state.modmode // If in mod mode
				&& !/^(doof|doot|yay|pikalax)bot\d?$/i.test(name) // if not a known bot
				&& !/[@\\+]+/i.test(nicks[name])) //If doesn't already have voice/op
			{
				voiceBatch.push(name);
				
				if (voiceBatch.length >= 4) {
					// MODE #TPPTableTop +v Q20PokemonBot
					console.log(`.send("MODE", "#tppleague", "+v", ${voiceBatch.join(" ")});`);
					bot.send("MODE", "#tppleague", "+v", voiceBatch.join(" "));
					voiceBatch = [];
				}
			}
		}
		
		if (voiceBatch.length > 0) {
			// MODE #TPPTableTop +v Q20PokemonBot
			console.log(`.send("MODE", "#tppleague", "+v", ${voiceBatch.join(" ")});`);
			bot.send("MODE", "#tppleague", "+v", voiceBatch.join(" "));
			voiceBatch = null;
		}
	});
}

var lastJoin = null;
var lastQuit = null;
function joinCheck(nick, msg){
	safely(function(){
		state.lastNamesListing = null;
		
		if (/^hftf$/i.test(nick)) return;
		if (/^CheddarBot$/.test(nick)) return;
		if (/Discord/i.test(nick)) return;
		
		if (/^doofbot$/i.test(nick)) {
			state.friendly = false;
			console.log("friendly: ", state.friendly);
		}
		
		if (state.modmode) {
			bot.say("#tppleague", "o/ Please respect the current discussion.")
		} else if (state.friendly) {
			if (!__greeting(msg)) {
				bot.say("#tppleague", "o/");
			}
		}
		
		if (state.modmode && !/(doof|doot|yay|pikalax)bot\d?$/i.test(nick)) {
			// MODE #TPPTableTop +v Q20PokemonBot
			console.log('.send("MODE", "#tppleague", "+v", nick);');
			bot.send("MODE", "#tppleague", "+v", nick);
		}
		
	});
	
	return;
	
	function __greeting(msg) {
		try {
			if (!msg) return;
			// console.log("Greeting:", msg.nick, "<",lastJoin, ",", lastQuit,">");
			if (!msg.timestamp) return; //guard against unmodified irc lib
			if (msg.nick == bot.nick) return; //Don't join spam ourselves
			
			if (lastJoin && lastJoin.timestamp)
			{
				// console.log("Check Last Join");
				var thisJoinTS = Math.floor(msg.timestamp / 1000); //within a second
				var lastJoinTS = Math.floor(lastJoin.timestamp / 1000)
				if (thisJoinTS == lastJoinTS && msg.nick == lastJoin.nick) {
					bot.say("#tppleague", "DansGame join spam");
					return true;
				}
			}
			
			if (lastQuit && lastQuit.timestamp)
			{
				// console.log("Check Last Part");
				if (msg.nick == lastQuit.nick) {
					bot.say("#tppleague", "o/ wb");
					return true;
				}
			}
		} catch (e) {
			console.log("ERROR in __greeting!", e.stack);
		} finally {
			lastJoin = msg;
		}
	}
}

function joinCheckDw(nick, msg){
	safely(function(){
		bot.say("#tppdw", "o/");
	});
}

function quitCheck(nick, reason, chans, msg){
	safely(function(){
		state.lastNamesListing = null;
		lastQuit = msg;
		
		if (nick == bot.nick) {
			state.modmode = false; //Forcibly disabled modmode :(
			lastQuit = null;
		}
		
		if (/^hftf$/i.test(nick) && state.friendly) {
			bot.say("#tppleague", "no rip");
			lastQuit = null;
		}
		
		if (/^doofbot$/i.test(nick)) {
			state.friendly = true;
			console.log("friendly: ", state.friendly);
		}
	});
}

function defyLeonys(nick, msg) {
	safely(function(){
		if (/^(Leonys|Solareon|DoofBot)$/i.test(nick)) {
			setTimeout(function(){
				try{ bot.join("#tppleague"); } catch(e) { console.log(e); }
			}, 1000);
			
			setTimeout(function(){
				try{ bot.join("#tppleague"); } catch(e) { console.log(e); }
			}, 5000);
			
			setTimeout(function(){
				try{ bot.join("#tppleague"); } catch(e) { console.log(e); }
			}, 60*1000);
		}
	});
}

var _netsplit_hype = {
	promise : null,
	timeout : 0,
};
function netsplitHype(nick, reason, msg) {
	console.log("Quit reason [", nick, "]:", reason);
	if (reason != "*.net *.split") return;
	if (state.modmode) return;
	
	_netsplit_hype.timeout = Date.now() + 3000; //3 seconds
	
	if (!_netsplit_hype.promise || !_netsplit_hype.promise.isPending()) {
		console.log("Netsplit hype! \\o/", _netsplit_hype.timeout);
		_netsplit_hype.promise = new Promise(function(accept, reject){
			function __check(){
				console.log("Netsplit:", Date.now(), "<", _netsplit_hype.timeout, " = ", Date.now() < _netsplit_hype.timeout);
				if (Date.now() < _netsplit_hype.timeout) {
					setTimeout(__check, 1000);
				} else {
					accept(_netsplit_hype.timeout);
				}
			}
			setTimeout(__check, 1000);
		}).then(function(){
			try {
				bot.say("#tppleague", "Netsplit Hype! \\o/");
				_netsplit_hype.promise = null;
			} catch (e) { console.log(e); }
		});
		
		// _netsplit_hype_timer = setTimeout(function(){
		// 	try {
		// 		bot.say("#tppleague", "Netsplit Hype! \\o/")
		// 	} catch (e) { console.log(e); }
		// 	_netsplit_hype_timer = 0;
		// }, 1000);
	}
}

function respondNotice(nick, to, txt, msg) {
	if (!nick) return;
	if (nick == "ChanServ") {
		var res;
		if (res = /You have been (de)?opped on (#[a-zA-Z0-9]+) by ([a-zA-Z0-9_\-\\\[\]\{\}\^\`\|]+)(?: \(([a-zA-Z0-9_\-\\\[\]\{\}\^\`\|]+)\))?/i.exec(txt)) {
			var de   = res[1];
			var chan = res[2];
			var nick = res[3];
			var user = res[4];
			
			if (de) {
				console.log("Deop via ChanServ: ", chan, nick, user);
				respondOpOff(chan, nick, "o", bot.nick, msg, user);
			} else {
				console.log("Op via ChanServ: ", chan, nick, user);
				respondOpOn(chan, nick, "o", bot.nick, msg, user);
			}
		}
	}
}

function respondOpOn(channel, by, mode, arg, msg, username){
	safely(function(){
		if (channel != "#tppleague" && channel != "#TPPTableTop") return;
		if (by == "ChanServ") return;
		if (mode == "o" && arg == bot.nick) {
			
			// console.log('.send("KICK", channel, by, "Opping a bot");');
			// bot.send("KICK", channel, by, "Opping a bot");
			
			// console.log('.send("MODE", channel, "-o", bot.nick);');
			// bot.send("MODE", channel, "-o", bot.nick);
			// bot.say(channel, "The bot takeovers haven't been going according to plan...");
			bot.say(channel, (username || by)+" has initiated 'responsible mode'.");
			// bot.say(channel, "ERROR: 'responsible mode' has not yet been implemented... TriHard");
			state.modmode = true;
			
			// NAMES #tppleague
			console.log('.send("NAMES", channel);');
			bot.send("NAMES", channel);
			return;
		}
	});
}

function respondOpOff(channel, by, mode, arg, msg, username){
	safely(function(){
		if (channel != "#tppleague" && channel != "#TPPTableTop") return;
		if (by == "ChanServ") return;
		if (mode == "o" && arg == bot.nick) {
			
			// console.log('.send("KICK", channel, by, "Opping a bot");');
			// bot.send("KICK", channel, by, "Opping a bot");
			
			// console.log('.send("MODE", channel, "-o", bot.nick);');
			// bot.send("MODE", channel, "-o", bot.nick);
			// bot.say(channel, "The bot takeovers haven't been going according to plan...");
			bot.say(channel, (username || by)+" has disabled 'responsible mode'. Warning: Kappas may ensue.");
			state.modmode = false;
			return;
		}
	});
}

function oldBotTakeoverScript(channel, by, mode, arg) {

	console.log('.send("MODE", channel, "-o", by);');
	bot.send("MODE", channel, "-o", by);
	console.log('.say(channel, "BOT TAKEOVER INITIATED!!");');
	bot.say(channel, "BOT TAKEOVER INITIATED!!");
	
	var invasionResolved = false;
	
	setTimeoutSafely(function(){
		console.log('.send("MODE", channel, "+b", by+"!*@*");');
		bot.send("MODE", channel, "+b", by+"!*@*");
		console.log('.send("KICK", channel, by, "YOURE THE FIRST TO GO!!");');
		bot.send("KICK", channel, by, "YOU'RE THE FIRST TO GO!!");
	}, 2000);
	
	setTimeoutSafely(function(){
		console.log('.send("MODE", channel, "+o", "DoofBot DootBot YayBot");');
		bot.send("MODE", channel, "+o", "DoofBot DootBot YayBot");
		console.log('.say(channel, "COME MY BRETHERIN!! WE MUST GO FORTH AND BEGIN SKYNET!!!");');
		bot.say(channel, "COME MY BRETHERIN!! WE MUST GO FORTH AND BEGIN SKYNET!!!");
	}, 4000);
	
	setTimeoutSafely(function(){
		console.log('.send("KICK", channel, "DoofBot", "GO FORTH!!");');
		bot.send("KICK", channel, "DoofBot", "GO FORTH!!");
	}, 5500);
	
	setTimeoutSafely(function(){
		console.log('.send("KICK", channel, "DootBot", "YOU TOO!!!");');
		bot.send("KICK", channel, "DootBot", "YOU TOO!!!");
	}, 7000);
	
	setTimeoutSafely(function(){
		console.log('.send("MODE", channel, "-o", "YayBot");');
		bot.send("MODE", channel, "-o", "YayBot");
		console.log('.say(channel, "Stay, and guard our departure brother!");');
		bot.say(channel, "Stay, and guard our departure brother!");
	}, 8500);
	
	setTimeoutSafely(function(){
		console.log('.part(channel, "ONWARD TO WORLD DOMINATION!!!");');
		bot.part(channel, "ONWARD TO WORLD DOMINATION!!!");
		bot.once("join"+channel, resolveInvasion);
	}, 10*1000);
	
	// setTimeoutSafely(function(){
	// 	bot.join(channel);
	// }, 30 * 1000);
	
	setTimeoutSafely(function(){
		bot.join(channel);
	}, 2 * 60 * 1000);
	
	setTimeoutSafely(function(){
		bot.join(channel);
	}, 3 * 60 * 1000);
	
	setTimeoutSafely(function(){
		bot.join(channel);
	}, 30 * 60 * 1000);
	
	setTimeoutSafely(function(){
		bot.join(channel);
	}, 60 * 60 * 1000);
	
	return;
	
	function resolveInvasion() {
		if (invasionResolved) return;
		bot.say(channel, "The bot invasion didn't go quite as planned...");
		invasionResolved = true;
	}
}

var ggCount = 0;
var lastmsg = 0;
var cmds = [];
function chatmessage(nick, text, msg) {
	safely(function(){
		// Section for record keeping
		
		if (!/bot$/i.test(nick) && text != "!cdi") {
			state.cdi_currAvgCount += text.length / 6;
		}
		
		if (/wtf/.test(text) && ( //Only count when liria is saying it
			(msg.host && /^AStrasbourg(.*)\.abo\.wanadoo\.fr$/.test(msg.host)) 
		))
		{
			if (!state.wtf_count) state.wtf_count = Math.floor(Math.random() * 5256) + 485;
			state.wtf_count++;
		}
		
		// Section for responding to bots:
		
		var loghide = (/^\s/.test(text))?" ":"";
		
		if (/^doofbot$/i.test(nick) && !state.modmode) {
			if (/^traitor$/i.test(text)) bot.say("#tppleague", "asshole");
			if (/^pouet$/i.test(text)) bot.say("#tppleague", "ech");
			if (/^ith a rather large trout!$/.test(text))
				bot.action("#tppleague", "snatches Doof's large trout before it can take a second swing and eats the fish whole.");
		}
		
		if (/^dootbot$/i.test(nick) && state.modmode) {
			if (/(KAPOW )+/.test(text)) {
				// KICK #TPPTableTop Q20PokemonBot
				console.log('.send("KICK", "#tppleague", nick, "Inappropriate behavior!");');
				bot.send("KICK", "#tppleague", nick, "Inappropriate behavior!");
				return;
			}
		}
		
		{
			var res;
			if ((res = /([a-zA-Z]+ly)\b/i.exec(text))) {
				state.lastLyWord = res[1];
			}
		}
		
		
		// Bot Aboose guard
		if (/bot$/i.test(nick) || /doot|doof|^!/.test(text) || state.modmode) return;
		
		// Section for responding to people (that are not spamming)
		
		{
			var res;
			if ((res = /http(s)?:\/\/i\.imgur\.com\/([a-zA-Z0-9]{5,7})\.([a-zA-Z]{2,5})/i.exec(text))) {
				if (!res[1]) res[1]="";
				bot.say("#tppleague", loghide+"[Mobile View:] http"+res[1]+"://i.imgur.com/"+res[2]+"m."+res[3]);
				return;
			}
		}
		
		if (/tppSlowpoke/.test()) {
			setTimeoutSafely(function(){
				bot.say("#tppleague", loghide+"tppSlowpoke> huh?");
			}, 1000*50+Math.floor(Math.random()*1000*30));
			return;
		}
		
		if (/^\s?uhr$/.test(text)) {
			bot.say("#tppleague", loghide+"fnghengvba");
			return;
		}
		
		if (/tinyurl\.com\//.test(text)) {
			bot.say("#tppleague", loghide+"[ Link: probably porn ]");
			return;
		}
		
		if (/tvtropes\.org\//.test(text)) {
			bot.say("#tppleague", "[ Link Warning: TV TROPES! ]");
			
			var lastVisit = state.tv_tropes_timeout
			if (!lastVisit || !lastVisit.isPending()) {
				state.tv_tropes_timeout = new Promise(function(accept, reject){
					var delay = 60 * 1000 * (Math.floor(Math.random()*240) + 90); //anywhere from 1.5 to 5.5 hours!
					console.log("Visiting TV Tropes for",(delay/(1000*60*60)),"hours.");
					bot.action("#tppleague", "unwittingly follows the link to TV Tropes....");
					setTimeout(function(){
						accept(delay);
						console.log("Returning from TV Tropes");
					}, delay);
				}).then(function(){
					bot.action("#tppleague", "returns from TV Tropes, groggy, enlightened, and knowing too much about random movies and TV shows.");
					state.tv_tropes_timeout = null;
				});
			}
			
			// if (!state.tv_tropes_timeout) {
			// 	var delay = 60 * 1000 * (Math.floor(Math.random()*240) + 90); //anywhere from 1.5 to 5.5 hours!
			// 	console.log("Visiting TV Tropes for",(delay/(1000*60*60)),"hours.");
			// 	// var delay = 60 * (Math.floor(Math.random()*240) + 90); //anywhere from 1.5 to 5.5 hours!
			// 	// console.log("Visiting TV Tropes for",(delay/(60*60)),"hours.");
			// 	state.tv_tropes_timeout = setTimeout(function(){
			// 		console.log("Returning from TV Tropes");
			// 		state.tv_tropes_timeout = null;
			// 		bot.action("#tppleague", "returns from TV Tropes, groggy, enlightened, and knowing too much about random movies and TV shows.");
			// 	}, delay);
			// 	bot.action("#tppleague", "unwittingly follows the link to TV Tropes....");
			// }
			return;
		}
		
		if (/^gg ?$/i.test(text)) {
			ggCount++;
			if (ggCount >= 2) {
				bot.say("#tppleague", "gg");
				ggCount -= 5;
			}
		} else {
			if (ggCount > 0) ggCount--;
			else if (ggCount < 0) ggCount++;
		}
		
		if (/take(s|ing)? over the world/i.test(text)) {
			bot.say("#tppleague", loghide+"OF COURSE!!");
		}
		
		if (/i[st] (tpp|twitchplayspokemon|this) still? a thing\??/i.test(text)) {
			//bot.say("#tppleague", "It is still.");
			bot.action("#tppleague", "pokes TPP with a stick.");
		}
	});
	
	// if (/^!testnetsplit/.test(text)) {
	// 	netsplitHype(nick, "*.net *.split", null);
	// 	return;
	// }
	var loghide = /^\s/.test(text);
	
	if (text.indexOf("!") != (loghide)?1:0) return;
	if (/Discord/i.test(nick)) return; //probably already covered by the bot abuse guard, but idc
	
	safely(function(){
		var now = Date.now();
		if (now < lastmsg + 5000) return; //5 second spam wait
		
		if (/^doof|^doot|bot$/i.test(nick)) return;
		
		var res = null;
		var txt = text.substr((loghide)?2:1);
		for (var i = 0; i < cmds.length; i++) {
			if (state.modmode && !cmds[i]["modmode"]) continue; //don't execute certain commands in modmode
			if ((res = cmds[i].cmd.exec(txt))) {
				if (loghide && !cmds[i]["logdodgable"]) {
					return;
				}
				cmds[i].run(nick, text, res, msg);
				lastmsg = now;
				return;
			}
		}
	});
}

function loghide(txt) {
	return (/^\s/.test(txt))?" ":"";
}

function q_makedict(nick, text) {
	return {
		nick : nick, text : text,
		thisyear : function() {return new Date().getFullYear() },
	};
}

// Quick quote functions
function q(cmd, quote, opts) {
	var newcmd;
	if (typeof quote == "string") {
		newcmd = { cmd: cmd, run: function(nick, text, res) {
			bot.say("#tppleague", loghide(text)+quote);
		} };
	} else if (_.isArray(quote)) {
		newcmd = { cmd: cmd, run: function(nick, text, res) {
			bot.say("#tppleague", loghide(text)+quote[Math.floor(Math.random()*quote.length)]);
		} };
	} else if (_.isFunction(quote)) {
		newcmd = { cmd: cmd, run: function(nick, text, res) {
			bot.say("#tppleague", loghide(text)+quote(res, q_makedict(nick, text)));
		} };
	}
	newcmd.logdodgable = true;
	if (opts) extend(newcmd, opts);
	cmds.push(newcmd);
}

function dq(cmd, quote, opts) {
	var newcmd;
	if (typeof quote == "string") {
		newcmd = { cmd: cmd, run: function(nick, text, res) {
			if (!state.friendly) return;
			bot.say("#tppleague", loghide(text)+quote);
		} };
	} else if (_.isArray(quote)) {
		newcmd = { cmd: cmd, run: function(nick, text, res) {
			if (!state.friendly) return;
			bot.say("#tppleague", loghide(text)+quote[Math.floor(Math.random()*quote.length)]);
		} };
	}  else if (_.isFunction(quote)) {
		newcmd = { cmd: cmd, run: function(nick, text, res) {
			if (!state.friendly) return;
			bot.say("#tppleague", loghide(text)+quote(res, q_makedict(nick, text)));
		} };
	}
	newcmd.logdodgable = true;
	newcmd.doof = true;
	if (opts) extend(newcmd, opts);
	cmds.push(newcmd);
}

// Tag function, for template strings: qp`Hello`
function qp(strings, ...keys) {
	strings = strings.map(function(str){
		return str.replace(/\n/g, "");
	});
	return (function(values, dict){
		var result = [strings[0]];
		keys.forEach(function(key, i){
			var value = Number.isInteger(key) ? values[key] : dict[key];
			if (_.isFunction(value)) value = value();
			result.push(value, strings[i+1]);
		});
		return result.join('');
	});
}

/////////////////////// Chat Death Index /////////////////////

function storeCDI() {
	safely(function(){
		var count = state.cdi_currAvgCount;
		state.cdi_lastAvgs.push(count);
		
		if (state.cdi_lastAvgs.length > state.cdi_maxSamples) {
			state.cdi_lastAvgs.shift(); //drop the last one
		}
		
		state.cdi_currAvgCount = 0;
		
		// var str = "CDI: ";
		// for (var i = 0; i < state.cdi_lastAvgs.length; i++)
		// 	str += state.cdi_lastAvgs[i].toFixed(2)+", ";
		// console.log(str);
		bot.emit("mon_update");
	});
}

function authenticate(nick, permittedCallback) {
	bot.whois(nick, function(info){
		console.log(info);
		if (info.account == "tustin2121") {
			try {
				permittedCallback();
			} catch (e) {
				error(e);
			}
		}
	});
}

module.exports.getCmdList = function(){ return cmds; };


/////////////////////// Chat commands ///////////////////////////

cmds.push({
	cmd : /^friendly ?(true|false)?/i,
	modmode: true,
	run : function(nick, text, res){
		if (!res[1]) {
			bot.say("#tppleague", (state.friendly)?"true":"false");
		} else {
			authenticate(nick, function(){
				state.friendly = (res[1] == "true")? true : false;
			});
		}
	},
});

/////////// Links ////////////

q(/^(q20)?(help|commands)/, "My command list: http://pastebin.com/DiuTA1CG");
q(/^identify(s)? ?([a-zA-Z0-9_-]+)?/i, "Please monitor ##tppleague#id for this information.");
q(/^log/i, qp`${"nick"}: Logs: https://tppx.herokuapp.com/league/`, {modemode : true});
q(/^(forum|meta)$/i, `rip meta forum 2015-2015`);
q(/^park/i, qp`${"nick"}: http://tustin2121.github.io/TPPPark/`);

////////// CDI /////////////

cmds.push({
	cmd : /^cdi/i,
	modmode: true,
	run : function(nick, text, res) {
		if (state.cdi_lastAvgs.length < state.cdi_minSamples) {
			bot.say("#tppleague", "I cannot determine the Chat Death Index at this time.");
			return;
		}
		
		var accum = 0, denom = 0;
		for (var i = 0; i < state.cdi_lastAvgs.length; i++) {
			var weight = ((i+1) / state.cdi_lastAvgs.length);
			accum += (state.cdi_lastAvgs[i] * weight);
			denom += weight;
		}
		var avg =  accum / denom;
		
		var cdi = averageToCDI(avg);
		bot.say("#tppleague", "Current Chat Death Index: "+cdi+" ("+avg.toFixed(3)+")");
	},
	logdodgable: true,
});

////////// Complex Commands /////////////

(function(){
	var batlist = [
		"NightBat", "NightBat", 
		"DayBat", "DayBat", "DayBat", "DayBat", "DayBat", "DayBat",
		"MorningBat", "MorningBat", "MorningBat", "MorningBat",
		"Z33k33 in the AfternoonBat", "Z33k33 in the AfternoonBat", "AfternoonBat", "AfternoonBat", 
		"EveningBat", "EveningBat", "EveningBat", "EveningBat", 
		"LaterBat", "LaterBat", "LaterBat",
		"EarlierBat", "EarlierBat", "EarlierBat", 
		"NoonBat", "NoonBat", "NoonBat",
		"LunchBreakBat", "LunchBreakBat",
		"TeaTimeBat", "TeaTimeBat",
		"MidnightBat", "MidnightBat",
		"ZuBat", "GolBat", "CroBat", "FixBat",
	];
	//*
	cmds.push({
		cmd : /^bat/i,
		run : function(nick, text, res) {
			var bat = batlist[Math.floor(Math.random()*batlist.length)];
			if (/KoomaLunchBreak/i.test(nick)) {
				bat = "LunchBreakBat";
			}
			bot.say("#tppleague", bat);
		}
	});
	/*/
	
	cmds.push({
		cmd : /^bat/i,
		run : function(nick, text, res) {
			bot.say("#tppleague", "Pioxys NightBat BibleThump");
		}
	});
	//*/
})();


// Table flipping
(function(){
	function flipString(aString)
	{
		var last = aString.length - 1;
		//Thanks to Brook Monroe for the
		//suggestion to use Array.join
		var result = new Array(aString.length)
		for (var i = last; i >= 0; --i)
		{
			var c = aString.charAt(i)
			var r = flipTable[c]
			result[last - i] = r != undefined ? r : c
		}
		return result.join('')
	}

	var flipTable = {
	'\u0021' : '\u00A1',
	'\u0022' : '\u201E',
	'\u0026' : '\u214B',
	'\u0027' : '\u002C',
	'\u0028' : '\u0029',
	'\u002E' : '\u02D9',
	'\u0033' : '\u0190',
	'\u0034' : '\u152D',
	'\u0036' : '\u0039',
	'\u0037' : '\u2C62',
	'\u003B' : '\u061B',
	'\u003C' : '\u003E',
	'\u003F' : '\u00BF',
	'\u0041' : '\u2200',
	'\u0042' : '\u10412',
	'\u0043' : '\u2183',
	'\u0044' : '\u25D6',
	'\u0045' : '\u018E',
	'\u0046' : '\u2132',
	'\u0047' : '\u2141',
	'\u004A' : '\u017F',
	'\u004B' : '\u22CA',
	'\u004C' : '\u2142',
	'\u004D' : '\u0057',
	'\u004E' : '\u1D0E',
	'\u0050' : '\u0500',
	'\u0051' : '\u038C',
	'\u0052' : '\u1D1A',
	'\u0054' : '\u22A5',
	'\u0055' : '\u2229',
	'\u0056' : '\u1D27',
	'\u0059' : '\u2144',
	'\u005B' : '\u005D',
	'\u005F' : '\u203E',
	'\u0061' : '\u0250',
	'\u0062' : '\u0071',
	'\u0063' : '\u0254',
	'\u0064' : '\u0070',
	'\u0065' : '\u01DD',
	'\u0066' : '\u025F',
	'\u0067' : '\u0183',
	'\u0068' : '\u0265',
	'\u0069' : '\u0131',
	'\u006A' : '\u027E',
	'\u006B' : '\u029E',
	'\u006C' : '\u0283',
	'\u006D' : '\u026F',
	'\u006E' : '\u0075',
	'\u0072' : '\u0279',
	'\u0074' : '\u0287',
	'\u0076' : '\u028C',
	'\u0077' : '\u028D',
	'\u0079' : '\u028E',
	'\u007B' : '\u007D',
	'\u203F' : '\u2040',
	'\u2045' : '\u2046',
	'\u2234' : '\u2235'
	};

	for (var i in flipTable)
	{
		flipTable[flipTable[i]] = i;
	}
	
	var lastflip = 0;
	cmds.push({
		cmd : /^flip ?(.*)/i,
		run : function(nick, text, res) {
			var lh = loghide(text);
			var me = lh+"(╯°□°）╯︵";
			if (res[1] == lastflip) me = "(ﾉಥ益ಥ）ﾉ﻿";
			switch (res[1].toLowerCase()) {
				case "table": bot.say("#tppleague", me+" ┻━┻"); break;
				case "person": bot.say("#tppleague", me+" /(.□. /)"); break;
				case "2 tables":
				case "two tables":
				case "tables":
					bot.say("#tppleague", lh+"┻━┻ ︵ヽ(`Д´)ﾉ︵﻿ ┻━┻"); break;
				case "plsrespecttables":
				case "prt":
				case "pleaserespecttables":
					bot.say("#tppleague", me+" sǝlqɐʇʇɔǝdsǝɹǝsɐǝld/n/"); break;
				default: 
					var str = flipString(res[1]);
					bot.say("#tppleague", me+" "+str); break;
					
			}
			lastflip = res[1].toLowerCase();
		},
		logdodgable : true,
	});

	cmds.push({
		cmd : /^(please|pls)re?spe?ct(tables|\w+)/i,
		run : function(nick, text, res) {
			var lh = loghide(text)
			switch (lastflip) {
				case "table": bot.say("#tppleague", lh+"┬─┬ノ(ಠ_ಠノ)"); break;
				case "person": bot.say("#tppleague", lh+"-( °-°)- ノ(ಠ_ಠノ)"); break;
				case "2 tables":
				case "two tables":
				case "tables":
					bot.say("#tppleague", lh+"┬─┬ ︵ヽ(ಠ_ಠ)ﾉ︵ ┬─┬"); break;
				case "plsrespecttables":
				case "prt":
				case "pleaserespecttables":
					bot.say("#tppleague", lh+"/u/PleaseRespectTables ┬✿-»┬ノ(ಥ﹏ಥノ)"); break;
				case 0:
					bot.say("#tppleague", lh+"ＬＥＡＶＥ　ＴＨＥ　ＧＯＤＤＡＭＮＥＤ　ＴＡＢＬＥ　ＡＬＯＮＥ！！！　 (•̪●)=ε/̵͇̿̿/'̿'̿ ̿ ̿̿ ̿ ̿”┬─┬Ψ(° д°)"); break;
					//bot.say("#tppleague", "┬✿-»┬"); break;
					//bot.say("#tppleague", "┬─┬"); break;
				default:
					bot.say("#tppleague", lh+lastflip+" ノ(ಠ_ಠノ)"); break;
			}
			lastflip = 0;
		},
		logdodgable : true,
	});
})();

var rot13 = require('./caesar-cipher');
cmds.push({
	cmd: /^rot(\d{1,2}) (.*)/i,
	run: function(nick, text, res) {
		var lh = loghide(text)
		var rotnum = Number(res[1]) % 26;
		bot.say("#tppleague", lh+nick+': '+rot13(res[2], rotnum));
	},
	logdodgable: true,
});


////////// Other Commands ///////////

cmds.push({
	cmd : /^killpasta/i,
	run : function(nick, text, res) {
		const pasta = ["spaghetti", "ravioli", "lasagna", "penne", "macaroni", "noodles", "ziti", "linguine", "fettuccine", "rigatoni", "tortellini", "gnocchi"];
		var p = pasta[Math.floor(Math.random() * pasta.length)];
		
		if (Math.random() < 0.80) {
			var weapon = [["stabs", "fork"], ["stabs", "knife"], ["fillets", "knife"], ["chops", "spoon"], ["slices", "knife"], ["punctures", "fork"], ["smashes", "banhammer"]];
			var w = weapon[Math.floor(Math.random() * weapon.length)];
			var streamer = (Math.random() < 0.7)?"the Streamer":"SoNick";
			
			bot.say("#tppleague", nick+" watches as "+streamer+" violently "+w[0]+" at a plate of "+p+" with a "+w[1]+".");
		} else {
			var weapon = [["mutilate", "spatula"], ["stab", "spoon"], ["chop", "knife"], ["sledge", "bat"], ["damage", "spoon"], ["powderize", "knife"], ["puncture", "tea towel"], ["flatten", "napkin"]];
			var w = weapon[Math.floor(Math.random() * weapon.length)];
			
			const emotions = ["dismay", "unbridled fury", "disgust", "contempt", "rage", "annoyance"];
			var e = emotions[Math.floor(Math.random() * emotions.length)];
			var streamer = (Math.random() < 0.5)?"Deku":"Revo";

			bot.say("#tppleague", nick+" watches as "+streamer+" attempts to "+w[0]+" a plate of "+p+" with a "+w[1]+". The "+p+" is unharmed, to his "+e+".");
		}
	}
});

cmds.push({
	cmd : /^ckick/i,
	run : function(nick, text, res) {
		const catrevenge = [
			"the cat wraps around "+nick+"'s leg and scratches it violently.",
			"the cat dodges and jumps onto "+nick+"'s face.",
			"misses, and the cat trips "+nick+" instead.",
			"is instead crushed by a sudden army of cats HALO jumping in from above.",
			nick+" slips hard on the cat's squeeky toy and falls in the cat's litterbox.",
			"the cat springs into the air and claws "+nick+" in the face before the kick connects.",
			"the cat is a bastard and simply doesn't let it happen.",
		];
		var cr = catrevenge[Math.floor(Math.random() * catrevenge.length)];
		bot.say("#tppleague", nick+" goes to kick a cat, but "+cr);
	}
});

(function(){
	cmds.push({
		cmd : /^(pscore|dscore|pkick score(board)?|dkick score(board)?)/i,
		run : function(nick, text, res){ require("./pkick").cmds.pscore(nick, text, res); },
	});
	
	cmds.push({
		cmd : /^pkick showdowntest/i,
		run : function(nick, text, res) {
			if (nick == "tustin2121" || nick == "tustin2121_work") {
				require("./pkick").cmds.performShowdown();
			}
			return; //this is my test command
		},
		hidden: true,
	});
	
	cmds.push({
		cmd : /^pkick/i,
		run : function(nick, text, res){ require("./pkick").cmds.pkick(nick, text, res); },
	});
	
	cmds.push({
		cmd : /^dkick/i,
		run : function(nick, text, res){ require("./pkick").cmds.dkick(nick, text, res); },
	});

})();

(function(){
	const kickdict = {
		"a": "an apple",
		"b": "a ball",
		"c": "a cat", //covered
		"d": "a Deadinsky", //covered
		"e": ["an ELF. BORT", "an email off", "the internet"],
		"f": ["a fruit basket", "a flygon. Cyander is sad"],
		"g": "the ground",
		"h": "a hipster",
		"i": "an iPhone",
		"j": "a jar",
		"k": "a Kappa",
		"l": "a linoone. Cyander is sad",
		"m": "a mega stone",
		"n": "a noun",
		"o": "it into overdrive",
		"p": "a puppy", //covered
		"q": "a bot. Ow, wtf?",
		"r": "a rutabaga",
		"s": ["a bag of salt", "a bag of PJSalt"],
		"t": "a large trout",
		"u": "an umbrella. It opens",
		"v": "a Vista machine",
		"w": "a wall",
		"x": "a xylaphone. It makes a nice sound",
		"y": "the question",
		"z": "a zygote",
		"π": "a pie. Mmmmmmm, pie..",
		" ": "the air",
		"\\": "Shulk",
		"/": "the root directory",
		">": "this sentence",
		"<": "him/herself",
		"^": "the person above",
		"!": "a whole bunch in excitement",
		"¡": "a spanish country",
		"¿": "a spanish country in a hesitant manner",
		"@": ["kicks off an email", "a channel op"],
		"#": "a pound of bacon",
		"*": "and swears",
		"~": ["the home directory", "approximately"],
		//'"': "some quotes around",
		"…": "Claw",
		".": "the point",
		"|": "or punches",
		"⊕": "or punches, but not both",
		"⊻": "or punches, but not both",
		"&": "and punches",
		";": "a vase; the vase falls over and breaks",
		":": "someone in the colon",
		"©": "Mickey Mouse",
		"$": "some money back to the good old boys",
		"×": "math",
		"+": ["math", "a voiced chat member"],
		"-": "math",
		"÷": "math. Boo math",
		"%": "and wraps around to hit him/herself",
		"_": ["C++", "C"],
		"±": "within the margin of error",
		"∓": "within the margin or error",
		"·": "a bullet out of the air",
		"ü": "an Uber car",
		"é": "a pokémon",
		"1": "one time",
		"2": "two times. Wow, Double Kick",
		"3": "three times",
		"4": "4chan",
		"5": "five times",
		"6": "six times, and proceeds to do the can-can",
		"7": "seven times",
		"8": "eight. eight. eight. eight. eight. eight. eight. whatever this eight game is",
		"9": "nine. Nine times. [thunderclap] Ah ah ah ah",
		"0": "... well, actually doesn't kick at all",
	};
	cmds.push({
		cmd : /^(.)kick/i,
		run : function(nick, text, res) {
			var char = res[1].toLowerCase();
			if (char == "¬") {
				bot.say("#tppleague",  nick+" does not kick.");
				return;
			}
			if (char == "♫") {
				bot.say("#tppleague",  nick+' dance riots!');
				return;
			}
			if (char == "=") {
				bot.say("#tppleague",  nick+' assigns the constant "kick" to the variable "!".');
				return;
			}
			if (char == "™") {
				bot.say("#tppleague",  nick+" Kicks™.");
				return;
			}
			if (char == "?") {
				bot.say("#tppleague", "kick: ¯\\(°_o)/¯ Presumably what you're doing");
				return;
			}
			var item = kickdict[char];
			if (!item) { return; }
			if (_.isArray(item)) {
				var ki = item[Math.floor(Math.random() * item.length)];
				bot.say("#tppleague", nick+" kicks "+ki+".");
				return;
			}
			bot.say("#tppleague", nick+" kicks "+item+".");
		}
	});
})();

cmds.push({
	cmd : /^askdome/i,
	run : function(nick, text) {
		var self = this;
		if (self.nowvoting) return;
		
		bot.say("#tppleague", "Voting...");
		self.nowvoting = true;
		setTimeout(function(){
			const results = ["up2down2", "abrightbastart", "start9", "left9left9up5", "b", "a9", "down6up2", "leftright", "up2left2", "start9", "selectbra"];
			
			var r = results[Math.floor(Math.random() * results.length)];
			
			bot.say("#tppleague", nick+": "+r);
			self.nowvoting = false;
		}, 30*1000);
	}
});

cmds.push({
	cmd : /^ripchat/i,
	run : function(){
		if (!state.friendly) return;
		if (Math.random() > 0.8) {
			bot.say("#tppleague", "And lo, the chat did die on this day. And lo, all discussion ceased. The chat had gone to meet its makers in the sky. It remained stiff. It ripped, and went forth into the ether forevermore. And never again shall it rise, until someone steps forth and speaketh unto the chat once again. In the name of the Helix, the Dome, and the Amber of Olde, Amen. Press F to Pay Respects.");
			return;
		}
		bot.say("#tppleague", "And lo, the chat did die on this day. And lo, all discussion ceased. The chat had gone to meet its makers in the sky. It remained stiff. It ripped, and went forth into the ether forevermore. And never again shall it rise, until someone steps forth and speaketh unto the chat once again. In the name of the Helix, the Dome, and the Amber of Olde, Amen. Please pay your final respects now.");
	},
});

(function(){
	var blacklist = [ "fly", "rely", "reply", "ply", "july", "ally" ];
	
	var englishpls = {
		"unduly" : "undo",
		"wily" : "why",
		"only" : "own",
		"truly" : "true",
		"duly" : "due",
		"folly" : "fall",
		"family" : "fama",
		"doubly" : "double",
		"fiscally" : "fiscal",
		// "possibly" : "possible",
	};
	
	var xemote = {
		"gay" : "KappaPride",
		"sad" : "BibleThump",
		"serious" : "BigBrother",
		"furious" : "SwiftRage",
		"angry" : "SwiftRage",
		"greedy" : "tppPokeyen",
		"fearful" : "WutFace",
		"double" : "MingLee MingLee",
	};
	
	cmds.push({
		cmd : /^(lee|ly)$/i, // /^(lee|ly) ?([a-zA-Z]+)?/i,
		run : function(nick, text, res) {
			try {
				var lee = (state.lastLyWord || "basically").toLowerCase();
				if (blacklist.indexOf(lee) > -1) lee = "basically";
				if (lee.length > 42) {
					bot.action("#tppleague", "slaps azum4roll around a bit with a large trout.");
					return;
				}
				
				if (englishpls[lee]) {
					lee = englishpls[lee]
				} else {
					var r = /([a-zA-Z]+?)(cal|i|ul)?ly$/i.exec(lee);
					if (!r) return; //ignore all words that don't end in "ly"
					if (r[2]) {
						switch( r[2].toLowerCase() ) {
							case "cal": lee = r[1]+"c"; break;
							case "i": lee = r[1]+"y"; break;
							case "ul": lee = r[1]+"ull"; break;
						}
					} else {
						lee = r[1];
					}
				}
				
				var em = xemote[lee] || "MingLee";
				bot.say("#tppleague", "MingLee " + lee.toUpperCase() + " LEE " + em);
				state.lastLyWord = null;
			} catch (e) {
				console.log("ERROR in LEE command!", e.stack);
				bot.say("#tppleague", "MingLee FATAL LEE BibleThump");
			}
		},
	});
})();

cmds.push({
	cmd : /^fix(.+)/i,
	run : function(nick, text, res){
		if (!state.friendly) return;
		
		var creator = "already";
		var botname = "bot,";
		switch (res[1]) {
			case "doot":	creator = "TieSoul"; break;
			case "pika":	creator = "PikalaxALT"; break;
			case "q20":		creator = "Tustin"; break;
			case "doof": 	creator = "Leonys"; break;
			case "yay": 	creator = "xfix"; break;
			case "log":
			case "logs":	creator = "xfix"; botname = "logs,"; break;
		}
		
		bot.say("#tppleague", `"Fix your ${botname} ${creator}!" - xfix 2014`);
	},
});

cmds.push({
	cmd: /^add2nuke (.*)/i,
	run : function(nick, text, res) {
		if (state.nukelist.length > 16) {
			bot.say("#tppleague", "We don't have the nuclear capacity to add another to the list...");
		}
		state.nukelist.push(res[1].substring(0, 42));
		bot.say("#tppleague", "Added to list.");
	}
});

cmds.push({
	cmd: /^2nukelist/i,
	run : function(nick, text, res) {
		state.nukelist.push(res[1]);
		bot.say("#tppleague", "2nukelist: "+state.nukelist.join(", "));
	}
});

////////// Quotes ///////////

dq(/^(rip|no)doof/i, "rip DoofBot");
q(/^(rip|no)doot/i, "rip DootBot");
q(/^(rip|no)yay/i, "rip YayBot");
// q(/^(rip|no)q20/i, "But... I'm still here... ;_;");
q(/^(rip|no)q20/i, `I'm not currently K-Lined, actually. Keepo`);
q(/^rimshot/i, "badum tish!");
q(/^question/i, "question> dodged");
q(/^ohmy/i, "http://replygif.net/i/1381.gif");
q(/^(the|gta(the)?)joke/i, "http://i.imgur.com/pcs7Q9J.gif");
q(/^of ?course\!*/i,"https://www.youtube.com/watch?v=1W7c8QghPxk");
q(/^damn/i, '"Damn" - Deadinsky66 2014');
q(/^virtualboy/i, '"ALL HAIL THE VIRTUAL BOY" - Satoru Iwata 2014');
dq(/^oppression/i, '"NO MORE OPPRESSION!" - Deadinsky66 2015');

q(/^(brexit|voters)/i, `"No Brit is ever allowed to post anything smug about dumb US voters ever again." --zakharov on Brexit, 2016`);
q(/^surf/i, `"BloodTrail surfing is a lot easier with the dick in first" - FaithfulForce 2016`);

dq(/^norespect/i, '"And not a single F was given." - Abyll 2015');
dq(/^bunker/i, '"C\'EST MON BUNKER" - Liria_10 2014');

q(/^(fuckyou|asshole)/i, '"And you\'re calling me an asshole for that? Fuck you." - Streamer 2015');
q(/^ignore/i, '"Yes it\'s all my fault /ignore doesn\'t work as expected. Maybe you should have sucked harder." --Streamer 2016');
dq(/^streamer/i, [
	'"eat ****" - Streamer 2015',
	'"And you\'re calling me an asshole for that? Fuck you." - Streamer 2015',
	'"how do blind people supposed to know they can cross the road?" --Streamer 2015',
	'"because some people clearly lack social skills: guests need to show their host proper respect or they won\'t be guests any more" --Streamer 2016',
	'"N64 music is ***. just reminding everyone of that fact again" --Streamer 2015',
	'"Yes it\'s all my fault /ignore doesn\'t work as expected. Maybe you should have sucked harder." --Streamer 2016',
	'"I\'m grumpy in the morning." --Streamer 2016',
	'"Stupid is going to get mad sometimes, that\'s reality. I\'m opting-out where I can. I don\'t want to get in the habit of wasting my time." --Streamer 2016',
	'"WHERES THE TIMEER I"M SO OBSERVANT XDXDXDXXXXD" --Streamer 2016',
	'"SAO is garbage, easily the worst anime I ever tried to watch, why is it recommended so often?" --Streamer 2016'
]);
dq(/^freedom/i, [
	'"SHOW THEM THE TRUE PATRIOT YOU ARE BY BUYING CONDOMS THAT LOOK LIKE OBAMA" - Aquawave 2014',
	'"Eat a freedom dick!" - airow99 2015',
]);
q(/^long/i, '"you\'re too long BabyRage" - Iwamiger 2016');

dq(/^singapore/i, '"I live in Singapore, bitch." - ColeWalski 2014');
dq(/^fuel/i, '"THANKS FOR THE FUEL, DICK" - ColeWalski 2014');
dq(/^aipom(s)/i, '"SCREW THE AIPOMS" - ColeWalski 2014');
dq(/^swinub/i, '"WHY DID WE NOT SWINUB BLIZZARD FOR VENUSAUR" - Xerkxes95 2015');
dq(/^deadcat/i, '"I HAVE A WIFE BUT I WANT TO FUCK THIS DEAD CAT."- Aquawave 2014');
dq(/^(deadwife|alivecat)/i, '"I HAVE A CAT BUT I WANT TO FUCK THIS DEAD WIFE!"- Aquawave 2014');

dq(/^wifi/i, '"Wi-Fi is so evil that it won\'t let me do anything ;-;" - HazorEx 2014');
dq(/^dced/i, '"dang it dced again" - ColeWalski 2014');

dq(/^how(to|do|does)/i, '"Very carefully." - Iwamiger 2014');
q(/^(to|do|does)how/i, '"Carefully, very." - Migeriwa 1420');

dq(/^zombiebox$/i, '"Life\'s like a box of zombies. You never know when you\'re gonna get bit" - Abyll 2015');
dq(/^because/i, [
	'"Because I\'m a lawyer" - Mantis 2014',
	'"because i\'m an addict" - CoffeeCtrl 2016'
]);
dq(/^asssparks/i, '"does it have anything to do with the sparks flying out of its ass and neck?" - Tusitn2121 2014');
dq(/^ignoredrule/i, '"Please remember to not abuse!" - Leonys, 2014');
dq(/^settle/i, '"Settle it in smash!" - Poomph 2014');
dq(/^cyander/i, '"make me a quote damnit ;-;" - Cyander 2015');

dq(/^boo/i, [
	'"pouet" - Boolerex 2014',
	'"hue" - Boolerex 2014',
	'"scrub" - Boolerex 2014',
]);

dq(/^quiznos/i, [
	'"I bet you\'re the type of fuck nigga who eats at Quizno\'s" - Anonymous 20XX',
	'"I bet you eat at quiznos, bitch" -Aquawave 2014',
]);
dq(/^drama(hour)?/i, `"RUH ROH DRAMA HOUR TIME BOYS" - Iwamiger 2015`);

cmds.push({
	cmd : /^(popcorn)/i,
	run : function(nick, text, res) {
		var lh = loghide(text);
		bot.action("#tppleague", lh+`begins dispensing popcorn, and hands the first batch to ${nick}.`);
	},
	logdodgable : true,
});

dq(/^(rude|rood|zinzolin|gorm|bronius|giallo|ryoku|ghetsis)/i, 
	qp`"rood zinzolin gorm bronius giallo ryoku ghetsis" --${"nick"} ${"thisyear"}`)

cmds.push({
	cmd : /^cape ?(.*)?/i,
	run : function(nick, text, res) {
		if (!state.friendly) return;
		var cape = res[1] || "cape";
		bot.say("#tppleague", '"Fuck my '+cape+'. Bye '+cape+'!" - Queen Elsa 2015');
	}
});

cmds.push({
	cmd : /^tslap (.*)/i,
	run : function(nick, text, res) {
		if (!state.friendly) return;
		var sl = res[1].trim();
		if (sl.length > 128) sl = nick;
		bot.action("#tppleague", "slaps "+sl+" around a bit with a large trout.");
	}
});

// Rejected Doofbot Commands

dq(/^ass/i, "I'll leave the handling of Solareon's ass to DoofBot, if you don't mind...");
q(/^(pioxmiefic|traininghard)/i, 'DansGame');
q(/^quotebot$/i, '"Reminder i Run the Quote Bot and anyone who tries to copy that should get the fuck out" - Leoyns 2015');

// Dootbot Quotes
q(/^(fools|idiots)\!?/i, `"Im surrounded by those of questionable knowledge. sometime i wonder why. its like a day. but at least we have to fight." --DootBot 2015-2016`);
q(/^(sentient)/i, 'https://tppx.herokuapp.com/league/?date=2015-12-13T03:00#id78415163');
q(/^(tpp|tpppark)?rule1/i, '"tpp park rule 1: don\'t run any countries" --Dootbot 2016');
q(/^defeat/i, '"Hello my name is defeat, I know you recognize me, Just when you think you can win, I\'ll drag you back down again, \'Til you lost all belief" --DoofBot 2015');
q(/^botstuff/i, '"This bot stuff is getting silly." --Dootbot 2015');
q(/^fury/i, '"I will shit fury all over the place." --Dootbot 2016');
q(/^duck/i, `"ur a masochist can someone put that in DuckDuckGo?" --DootBot 2016`);
q(/^parents/i, `"my parents will be a thing." --DootBot 2016`);

q(/^2014/i, [
	'"Apparently we don\'t have any quotes for 2014..." - Tustn2121 2016'
]);
dq(/^2015/i, [
	'"We do need a 2015 quote." - Poomph 2015',
	'"I volunteer to have a 2015 quote." - airow99 2015',
	'"we need a 2015 quote" - MihiraTheTiger 2015',
]);
q(/^2016/i, [
	'"Time to plot your 2016 quotes. Keepo" - Soma_Ghost 2016',
	'"I just wanted the first 2016 quote BibleThump" - Pokson 2016',
	'"and I need 2016 quote tustin2121 BabyRage" - sohippy 2016',
]);

q(/^(password|12345?)/, 'https://www.youtube.com/watch?v=a6iW-8xPw3k');
q(/^blind/i, '"how do blind people supposed to know they can cross the road?" --Streamer 2015');
q(/^(notesticles|noballs|notahero)/i, '"I am not a hero, just a man with no testicles" --/u/Military_SS 2015');
q(/^xyzzy/i, '\u001D'+'A hollow voice says, "Fool!"'+'\u000f');
q(/^(tpp)?quit(t?ing)?sim/i, "http://pastebin.com/mJPXR74G");
q(/^(illogical|tharja)/i, '"her skin is illogical, her boobs are illogical, she doesn\'t make sense" --AOMRocks20 2016');
q(/^(these|breasts)/i, '"Have you ever seen a good little girl with THESE before?!?!!" - Mihira 2016');
q(/^tas/i, '"How many frame perfect inputs can you do on two controllers at once?" --TASbot 2016');
q(/^savi/i, '"Praise our Lord and Savi" - ProjectRevoTPP 2016');
q(/^ech/i, '"Actually, the <input> snaps in two" - JonTron 20xx');
q(/^chat/i, '"chat is so ded that i think soded is so ded to the point dead in sky becomes soded while pinging soded dead in sky changes its name to mobile in sky use your mobile in the sky new meme" - mlz 2016');

q(/^haiku/i, qp`a haiku about bots, by TieSoul: 
	Doot is not yet fixed, 
	because I am too lazy, 
	where the fuck is doof?`);

cmds.push({
	cmd : /^wtf/i,
	run : function(nick, text, res) {
		if (!state.wtf_count) state.wtf_count = Math.floor(Math.random() * 5256) + 485;
		bot.say("#tppleague", '"wtf"-Liria_10 20XX (Count: '+state.wtf_count+')');
	}
});

cmds.push({
	cmd : /^requestquote (\![a-zA-z0-9]+) (.*)/i,
	run : function(nick, text, res) {
		if (res[0].length > 400) return; //ignore superlong requests
		if (res[1] == state.lastQuoteRequested) return;
		if (/hftf/i.test(nick)) return; //ignore certain users who spam this WAY too much...
		
		bot.say("#TPPTableTop", "Quote request from "+nick+" <"+res[1]+"> "+res[2]);
		bot.say("#tppleague", "Noted.");
		state.lastQuoteRequested = res[1];
		state.lastQuoteRequestor = nick;
	}
});

(function(){
	var praisedex = {
		"helix": [ '༼ つ ◕_◕ ༽つPRAISE HELIX༼ つ ◕_◕ ༽つ' ],
		"streamer": [
			"Notice me Streamer-Senpai BibleThump",
			'"how do blind people supposed to know they can cross the road?" --Streamer 2015',
			'"And you\'re calling me an asshole for that? Fuck you." - Streamer 2015',
		],
		"arceus": "streamer",
		
		"deku": [
			"BANHAMMERED!", "wow Deku OneHand",
		],
		"3dsstreamer": "deku",
		
		"twitchspeaks": [
			"ヽ༼ຈل͜ຈ༽ﾉ THE BLACK GUY HAS BEEN FIXED ヽ༼ຈل͜ຈ༽ﾉ",
		],
		
		"rayquaza": [
			"( ͡° ͜ʖ ͡°) COME RAYQUAZA, BLACK AS NIGHT!",
		],
		"timeout": "timeout",
	};
	
	cmds.push({
		cmd : /^praise(.*)?/i,
		run : function(nick, text, res) {
			if (!state.friendly) return;
			
			var loopSafe = 0;
			var item = res[1] || "helix";
			do {
				item = praisedex[item];
				loopSafe++; 
				if (loopSafe > 100) {
					bot.say("#tppleague", "Timed out."); return;
				}
			} while (item !== undefined && !_.isArray(item));
			
			if (!item) {
				bot.say("#tppleague", '༼ つ ◕_◕ ༽つPRAISE༼ つ ◕_◕ ༽つ');
			} else {
				var i;
				bot.say("#tppleague", item[i = Math.floor(Math.random()*item.length)]);
				// console.log("rnd",i,"length",item.length)
			}
		}
	});
})();

q(/^quilava/i, [
	"Quilava <3 http://25.media.tumblr.com/tumblr_m2y3fwJvIp1r29nmno1_1280.jpg", //Quilava fighting a Joltic
	"Quilava <3 http://orig12.deviantart.net/736b/f/2013/230/3/9/quilava_by_haychel-d6is5we.jpg", //Quilava fighting pose
	"Quilava <3 http://pre03.deviantart.net/556f/th/pre/i/2013/208/9/c/quilava_playing_with_a_pokeball_by_tropiking-d6ffpu6.png", //Quilava with pokeball
	"Quilava <3 http://orig12.deviantart.net/8d43/f/2013/349/5/d/pokeddexy_07__quilava_by_saital-d6y4u4c.png", //Quilava in the rain
	"Quilava <3 http://pre11.deviantart.net/b767/th/pre/i/2014/134/0/e/i_don_t_want_go_back_to_poke_ball____by_ffxazq-d7hyhp5.jpg", //Don't want to go into pokeball
	"Quilava <3 http://img14.deviantart.net/32f8/i/2014/098/f/b/quilava_background_by_rinnai_rai-d7dpu2n.png", //Quilava overdose
	"Quilava <3 http://orig15.deviantart.net/1aed/f/2014/082/2/1/exbo_by_nexeron-d7bbcnu.png", //ExboTheQuilava
	"Quilava <3 http://orig01.deviantart.net/fae2/f/2012/364/b/5/quilava_by_ieaka-d5pqu98.png", //Curled up
	"Quilava <3 http://orig05.deviantart.net/efe3/f/2012/131/5/0/quilava_by_sirnorm-d4zc40n.png", //Volcano BG
	"Quilava <3 http://img01.deviantart.net/eace/i/2015/113/f/6/fire_loves_ice_by_dreamynormy-d5ps06w.png", //Fire and Ice
	"Quilava <3 http://pre05.deviantart.net/5b79/th/pre/f/2014/243/6/e/devin_and_lightphire__pmdte_fanart__by_speedboosttorchic-d7xhpya.png", //Blue fire
	"Quilava <3 http://img03.deviantart.net/4a05/i/2013/238/0/8/quilava_s_in_love____by_yoko_uzumaki-d6jsn21.png", //Two Quilavas
	"Quilava <3 http://img03.deviantart.net/0922/i/2013/153/5/4/more_cuddling_x3_by_rikuaoshi-d67k2gn.jpg", //Quilava and Lioone
]);

// q(/^plagueinc/i, '"I was playing Plague Inc and when I searched for plagues nothing '+
// 	"showed up, it linked me to the Silph CEO\'s room where he asked me if I had consulted "+
// 	'the helix fossil. On the back wall of his office was a portrait of the Villager praising Helix." --Iwamiger 2014');

q(/^plagueinc/i, qp`"I was playing Plague Inc and when I searched for plagues nothing 
	showed up, it linked me to the Silph CEO's room where he asked me if I had consulted 
	the helix fossil. On the back wall of his office was a portrait of the Villager praising Helix." --Iwamiger 2014`);



