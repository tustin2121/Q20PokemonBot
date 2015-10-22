// friendly.js
console.log("Loading Module friendly.js");

var extend = require("extend");
var irccolors = require("irc").colors;
var fs = require("fs");

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
		bot.addListener("kick#tppleague", turnOn);
		bot.addListener("kick#tppleague", defyLeonys);
		bot.addListener("quit", turnOn);
		bot.addListener("kill", turnOn);
		bot.addListener("quit", netsplitHype);
		bot.addListener("message#tppleague", chatmessage);
		bot.addListener("+mode", respondOp);
		bot.addListener("notice", respondNotice);
		// bot.addListener("raw", debugRaw);
		
		cdi_interval = setInterval(storeCDI, 1000 * 60); //every 60 seconds
	},
	
	teardown : function(){
		bot.removeListener("names#tppleague", namesCheck);
		bot.removeListener("join#tppleague", joinCheck);
		bot.removeListener("kick#tppleague", turnOn);
		bot.removeListener("kick#tppleague", defyLeonys);
		bot.removeListener("quit", turnOn);
		bot.removeListener("kill", turnOn);
		bot.removeListener("quit", netsplitHype);
		bot.removeListener("message#tppleague", chatmessage);
		bot.removeListener("+mode", respondOp);
		bot.removeListener("notice", respondNotice);
		// bot.removeListener("raw", debugRaw);
		
		clearInterval(cdi_interval);
	},
	
	migrate : function(old) {
		extend(this.state, old.state);
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
	
	lastNamesListing : null,
	
	// Chat death index
	cdi_lastAvgs: [],
	cdi_maxSamples: 30,
	cdi_minSamples: 5,
	cdi_currAvgCount: 0,
	
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
		for (var name in nicks) {
			console.log("league names: ", name);
			if (/^doofbot$/i.test(name)) {
				state.friendly = false;
				console.log("friendly: ", state.friendly);
			}
			if (/^(dead|mobile)insky/i.test(name)) {
				state.puppy = true;
				console.log("puppy: ", state.puppy);
			}
		}
	});
}

function joinCheck(nick, msg){
	safely(function(){
		state.lastNamesListing = null;
		
		if (/^hftf$/i.test(nick)) return;
		if (/^CheddarBot$/.test(nick)) return;
		
		if (/^doofbot$/i.test(nick)) {
			state.friendly = false;
			console.log("friendly: ", state.friendly);
		}
		if (/^(dead|mobile)insky/i.test(nick)) {
			state.puppy = true;
			console.log("puppy: ", state.puppy);
		}
		
		if (state.friendly) {
			bot.say("#tppleague", "o/");
		}
		
		if (nick == "Deadinsky66" || nick == "mobileinsky66")
			bot.say("#tppleague", "\\o/");
	});
}

function turnOn(nick, msg){
	safely(function(){
		state.lastNamesListing = null;
		
		if (/^hftf$/i.test(nick) && state.friendly) {
			bot.say("#tppleague", "no rip");
		}
		
		if (/^doofbot$/i.test(nick)) {
			state.friendly = true;
			console.log("friendly: ", state.friendly);
		}
		if (/^(dead|mobile)insky/i.test(nick)) {
			state.puppy = false;
			console.log("puppy: ", state.puppy);
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

var _netsplit_hype_timer = 0;
function netsplitHype(nick, reason, msg) {
	console.log("Quit reason [", nick, "]:", reason);
	if (reason != "*.net *.split") return;
	console.log("Netsplit hype! \\o/");
	
	if (!_netsplit_hype_timer) {
		_netsplit_hype_timer = setTimeout(function(){
			try {
				bot.say("#tppleague", "Netsplit Hype! \\o/")
			} catch (e) { console.log(e); }
			_netsplit_hype_timer = 0;
		}, 1000);
	}
}

function respondNotice(nick, to, txt, msg) {
	if (!nick) return;
	if (nick == "ChanServ") {
		var res;
		if (res = /You have been opped on (#[a-zA-Z0-9]+) by ([a-zA-Z0-9_\-\\\[\]\{\}\^\`\|]+)(?: \(([a-zA-Z0-9_\-\\\[\]\{\}\^\`\|]+)\))?/i.exec(txt)) {
			var chan = res[1];
			var nick = res[2];
			var user = res[3];
			
			console.log("Op via ChanServ: ", chan, nick, user);
			respondOp(chan, nick, "o", bot.nick, msg, user);
		}
	}
}

function respondOp(channel, by, mode, arg, msg, username){
	safely(function(){
		if (channel != "#tppleague" && channel != "#TPPTableTop") return;
		if (by == "ChanServ") return;
		if (mode == "o" && arg == bot.nick) {
			
			console.log('.send("KICK", channel, by, "Opping a bot");');
			bot.send("KICK", channel, by, "Opping a bot");
			
			console.log('.send("MODE", channel, "-o", bot.nick);');
			bot.send("MODE", channel, "-o", bot.nick);
			// bot.say(channel, "The bot takeovers haven't been going according to plan...");
			bot.say(channel, (username || by)+", pls...");
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
		
		if (/^doofbot$/i.test(nick)) {
			if (/^traitor$/i.test(text)) bot.say("#tppleague", "asshole");
			if (/^pouet$/i.test(text)) bot.say("#tppleague", "ech");
			if (/^ith a rather large trout!$/.test(text))
				bot.action("#tppleague", "snatches Doof's large trout before it can take a second swing and eats the fish whole.");
		}
		
		
		// Bot Aboose guard
		if (/bot$/i.test(nick) || /doot|doof|^!/.test(text)) return;
		
		// Section for responding to people (that are not spamming)
		
		{
			var res;
			if ((res = /http:\/\/i\.imgur\.com\/([a-zA-Z0-9]{5,7})\.([a-zA-Z]{2,5})/i.exec(text))) {
				bot.say("#tppleague", "[Mobile View:] http://i.imgur.com/"+res[1]+"m."+res[2]);
				return;
			}
		}
		
		if (/^uhr$/.test(text)) {
			bot.say("#tppleague", "fnghengvba");
			return;
		}
		
		if (/tinyurl\.com\//.test(text)) {
			bot.say("#tppleague", "[ Link: probably porn ]");
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
			bot.say("#tppleague", "OF COURSE!!");
		}
	});
	
	if (text.indexOf("!") != 0) return;
	
	safely(function(){
		
		var now = new Date().getTime();
		if (now < lastmsg + 5000) return; //5 second spam wait
		lastmsg = now;
		
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


/////////////////////////// Memory //////////////////////////

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



/////////////////////// Chat commands ///////////////////////////

cmds.push({
	cmd : /^friendly ?(true|false)?/i,
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

cmds.push({
	cmd : /^identify(s)? ?([a-zA-Z0-9_-]+)?/i,
	run : function(nick, text, res, msg) {
		bot.say("#tppleague", "Please monitor ##tppleague#id for this information.");
	}
});

cmds.push({
	cmd : /^log/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", nick+": Log: https://tppleague.me/irc/");
	}
});

cmds.push({
	cmd : /^(forum|meta)$/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", nick+": Forums: https://meta.tppleague.me/");
	}
});

cmds.push({
	cmd : /^park/i,
	run : function(nick, text, res) {
		// if (Math.random() > 0.5) {
			bot.say("#tppleague", nick+": http://tustin2121.github.io/TPPPark/");
		// } else {
			// bot.say("#tppleague", "TUSTIN! UPDATE THE PARK!!");
		// }
	}
});

////////// CDI /////////////

cmds.push({
	cmd : /^cdi/i,
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
	}
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
	}

	for (i in flipTable)
	{
		flipTable[flipTable[i]] = i
	}
	
	lastflip = 0;
	cmds.push({
		cmd : /^flip ?(.*)/i,
		run : function(nick, text, res) {
			var me = "(╯°□°）╯︵";
			if (res[1] == lastflip) me = "(ﾉಥ益ಥ）ﾉ﻿";
			switch (res[1].toLowerCase()) {
				case "table": bot.say("#tppleague", me+" ┻━┻"); break;
				case "person": bot.say("#tppleague", me+" /(.□. /)"); break;
				case "2 tables":
				case "two tables":
				case "tables":
					bot.say("#tppleague", "┻━┻ ︵ヽ(`Д´)ﾉ︵﻿ ┻━┻"); break;
				case "plsrespecttables":
				case "prt":
				case "pleaserespecttables":
					bot.say("#tppleague", me+" sǝlqɐʇʇɔǝdsǝɹǝsɐǝld/n/"); break;
				default: 
					var str = flipString(res[1]);
					bot.say("#tppleague", me+" "+str); break;
					
			}
			lastflip = res[1].toLowerCase();
		}
	});

	cmds.push({
		cmd : /^(please|pls)re?spe?ct(tables|\w+)/i,
		run : function(nick, text, res) {
			switch (lastflip) {
				case "table": bot.say("#tppleague", "┬─┬ノ(ಠ_ಠノ)"); break;
				case "person": bot.say("#tppleague", "-( °-°)- ノ(ಠ_ಠノ)"); break;
				case "2 tables":
				case "two tables":
				case "tables":
					bot.say("#tppleague", "┬─┬ ︵ヽ(ಠ_ಠ)ﾉ︵ ┬─┬"); break;
				case "plsrespecttables":
				case "prt":
				case "pleaserespecttables":
					bot.say("#tppleague", "/u/PleaseRespectTables ノ(ಠ_ಠノ)"); break;
				case 0: 
					bot.say("#tppleague", "┬─┬"); break;
				default:
					bot.say("#tppleague", lastflip+" ノ(ಠ_ಠノ)"); break;
			}
			lastflip = 0;
		}
	});
})();

var rot13 = require('./caesar-cipher');
cmds.push({
	cmd: /^rot(\d{1,2}) (.*)/i,
	run: function(nick, text, res) {
		var rotnum = Number(res[1]) % 26;
		bot.say("#tppleague", nick+': '+rot13(res[2], rotnum));
	}
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
			
			bot.say("#tppleague", nick+" watches as the Streamer violently "+w[0]+" at a plate of "+p+" with a "+w[1]+".");
		} else {
			var weapon = [["mutilate", "spatula"], ["stab", "spoon"], ["chop", "knife"], ["sledge", "bat"], ["damage", "spoon"], ["powderize", "knife"], ["puncture", "tea towel"], ["flatten", "napkin"]];
			var w = weapon[Math.floor(Math.random() * weapon.length)];
			
			const emotions = ["dismay", "unbridled fury", "disgust", "contempt", "rage", "annoyance"];
			var e = emotions[Math.floor(Math.random() * emotions.length)];

			bot.say("#tppleague", nick+" watches as Deku attempts to "+w[0]+" a plate of "+p+" with a "+w[1]+". The "+p+" is unharmed, to his "+e+".");
		}
	}
});

(function(){
	
	var showdownText = [
		//payoff: 2 = crit success, 1 = success, 0 = meet, -1 = failure, -2 = crit fail
		{
			setup: "Deadinsky66 turns into an alleyway and is met with five puppies. It looks like they had been waiting for him...",
			win_score: 4,
			lose_score: 1,
			payoff: {
				"2": "Deadinsky jumps out of the way of their attack and lands behind the gang of puppies. He does a hurricane kick, knocking the puppies around a bunch before they can scamper.",
				"1": "The puppies all jump Deadinsky all at once, but he manages to dodge and fend off the majority of their hits. He kicks them down and they scamper.",
				"0": "Deadinsky turns and runs, but the puppies are right on his tail, nipping at his heels. He manages to smack one of them before he loses them down another alley.",
				"-1": "Deadinsky turns and runs, but the puppies are on top of him before he can get far. They kick his ass a few times over. He manages to get away eventually.",
				"-2": "Deadinsky turns to run, but there's another group of puppies that have closed in behind him. When he wakes next near the dumpster, he finds himself shoeless and missing his wallet again.",
			},
		},
		{
			setup: "Deadinsky66 sits in the park, eating a bannana. Unbeknownst to him, a cadre of ninja-puppies is lying in wait in a tree just above him...",
			win_score: 4,
			lose_score: 0,
			payoff: {
				"2": "The hair on the back of Deadinsky's neck stands on end, and he know's he's surrounded moments before the ninja-puppies strike. They attack, but he fends them off effortlessly with his own mod-ninja skills. The bannana and victory were delicious.",
				"1": "Deadinsky just happens to lean over as the first ninja-puppy makes his strike. The shurikin misses, and deadinsky uses his own mod-ninja abilities to fend off the rest of the clan. His bannana fell into the dirt during the kurfuffle, however.",
				"0": "Deadinsky goes to take a bite of the bannana when it is cut in half by a shuriken. He scampers as the ninja-puppies fall from the tree and go after him, but he manages to get away unharmed...",
				"-1": "Deadinsky goes to take a bite of the bannana when it is cut in half by a shuriken. Another shuriken pins his sleeves to the tree. The ninja-puppies decend upon him and knock him out. His bannana is now ant food.",
				"-2": "Deadinsky goes to take a bite of the bannana when he is knocked out cold from behind by one of the ninja-puppies. When he wakes next in an alleyway, his bannana is smeared all over his shirt, and his wallet was missing again.",
			}
		},
		{
			setup: "Deadinsky66 comes upon a small ragged puppy all alone on the sidewalk. He instinctively goes to kick it.",
			win_score: 2,
			lose_score: 0,
			payoff: {
				"2": "Deadinsky swings his foot at the poor puppy and punts it across the street. It smacks into a second puppy, and into a third and fourth. Deadinsky continues to walk smugly down the street.",
				"1": "Deadinsky swings his foot at the poor puppy. The puppy latches onto his foot and it takes Dead a couple shakes to send it flying across the street into another one. Deadinsky continues to walk down the street.",
				"0": "Deadinsky swings his foot at the puppy, and there's a distinct squeek as it is punted across the street. It was a decoy... Deadinsky is saddened by this development.",
				"-1": "Deadinsky swings his foot at the puppy, and there's a distinct squeek as his foot smacks into it. The decoy puppy then bounces back on the bungie that ties it to the nearby lampost and smacks into Deadinsky's face. The pain and letdown sting.",
				"-2": "Deadinsky swings his foot at the puppy, and there's the distinct sound of metal scraping against metal. The trapdoor under where the decoy puppy was opens and dead plummets into the water below. When he wakes next, he is still wet and missing his wallet again.",
			}
		}, 
		{
			setup: "A puppy steps outside a coffee shop and finds Deadinsky66 there staring down at him. The puppy sets its coffee down on the sidewalk next to the door.",
			win_score: 2,
			lose_score: 0,
			payoff: {
				"2": "Deadinsky does a flying kick and punts the puppy into the coffee shop, where it pings off three other puppies at a table across the room. He also gently knocks over the puppy's coffee before strolling off.",
				"1": "Deadinsky fakes left. The puppy falls for it as Deadinsky's foot comes around from the right and knocks it into its coffee. Deadinsky walks away, pleased, while the puppy shakes off the coffee all over itself.",
				"0": "Deadinsky goes for the kick, but the puppy ducks around behind dead and places a paw on the small of his back. Deadinsky tries to turn to face him several times, but the puppy stays behind dead. Finally Dead turns and spots the puppy escaping. He knocks over its coffee in anger.",
				"-1": "Deadinsky goes for the grapple, but the puppy catches hold and reverses it. The puppy slams Deadinsky against the wall of the coffee shop. It then goes and picks up its coffee and moves quickly away before Dead can get his bearings again.",
				"-2": "Deadinsky kicks at the puppy, but the puppy dodges and lands on Dead's face. The puppy then proceeds to punch Dead in the nose so hard, he's knocked out cold. The puppy grabs its coffee and also takes Deadinsky's wallet for good measure.",
			}
		}, 
		{
			setup: "Deadinsky66 comes around the corner and face-to-face with a giant metal mech standing in the street, towering over him. It is piloted by five puppies wearing 5 different colored jumpsuits.",
			win_score: 5,
			lose_score: 0,
			payoff: {
				"2": "The mech starts firing as Deadinsky slides between its legs. He quickly ties them together and then, with a kick from the ground, shoves the mech backwards. It staggers, cannot catch itself, and falls over, and explodes. The five puppies blast off, Team Rocket style.",
				"1": "The mech starts firing as Deadinsky dives back into the alley he came from. The mech follows him in, and Dead comes from above and lands on its head. He takes its head off with a few well-placed kicks, and the mech falls down, blind and beaten.",
				"0": "The mech starts firing as Deadinsky dives back into the alley he came from. The mech lines up with the alley and continues firing after him, and Dead is forced to continue retreating. He gets away safely.",
				"-1": "The mech starts firing as Deadinsky goes to dive back into the alley he came from, but the sticky bullets hit his leg, pinning him in the street. The mech lines up and punts him five blocks away, where he manages to escape before any follow up.",
				"-2": "The mech starts firing sticky inflating balls at Deadinsky, which he isn't fast enough to dodge. He is soon encased in them and loses conciousness as the mech approaches. He next wakes many blocks away, battered, bruised, and missing his wallet again.",
			}
		}, 
		{
			setup: "Deadinsky66 walks down the street when he is suddenly picked up by his shirt by a puppy in super-puppy garb. The puppy flies high up into the air with Deadinsky.",
			win_score: 3,
			lose_score: 0,
			payoff: {
				"2": "Deadinsky pulls the Kryptonite he was lucky to have on him and shoves it in the super-pup's muzzle. The super-pup loses his powers and begins falling. Deadinsky kicks off him and does a rolling landing on a nearby skyscraper.",
				"1": "Deadinsky pulls the Kryptonite he was lucky to have on him and smacks the super-pup's face with it. It reels back, letting go of Deadinsky. Deadinsky manages to do a rolling-landing on a nearby skyscraper. The super-pup comes around for a second go, but Dead ducks out of sight.",
				"0": "Deadinsky manages to wrestle his way out of the super-pup's grasp and do a rolling-landing on top of a skyscraper nearby. The super-pup come around for another grab, but Deadinsky manages to shoe it away with the Kryptonite he luckily had on him.",
				"-1": "Deadinsky can't seem to pull out of the super-pup's grasp. It flies high into the sky and then throws Deadinsky down at the ground. Deadinsky manages to slow his fall and aim for a deep lake. He comes out not unharmed and drenched.",
				"-2": "The superpup flies him up and up. The Space Core floats by. Then the pup flips him over and starts speeding towards the earth. Deadinsky passes out on the way down from the G-forces. He wakes to find himself in the middle of a crater and without his wallet again.",
			}
		},
		{
			setup: "Deadinsky66 is sitting in an outdoor cafe, reading quietly. There are puppies two tables down who are keeping their distance, but Dead hadn't taken notice. Suddenly, a car comes around the corner on two wheels. Five puppies inside the car lean out and open fire on the cafe and Deadinsky.",
			win_score: 5,
			lose_score: 3,
			payoff: {
				"2": "Deadinsky upturns his table for cover as the bullets destory the cafe's porch around him. The bullets destroy the table of puppies. Dead throws a grenade in front of the car, and the car blows sky high, sending the puppies inside flying. Dead escapes the scene unharmed, as the puppy ambulence arrives.",
				"1": "Deadinsky upturns his table for cover as the bullets destory the cafe's porch area and tear up the table the other puppies were at. Deadinsky throws a grenade at the car and it blows the back off it, but manages to get away. Deadinsky walks away from the scene unharmed.",
				"0": "Deadinsky upturns his table for cover as the bullets destroy the cafe's porch area and tear up the table the other puppies were at. Deadinsky manages to dodge most of the bullets, but he's still hit. Deadinsky limps away from the scene. Lotid magic will heal his superficial wounds.",
				"-1": "Deadinsky upturns his table for cover, but the bullets destory the cafe's porch area, and he's injured. The puppies who were at the table nearby fare none better. Deadinsky drags himself away from the scene. Lotid magic will heal him, but he lost that fight.",
				"-2": "Deadinsky dives for cover, but there is no cover from the volley of hundreds of bullets, which tears up the entire patio. When Deadinsky awakens next, the puppy ambulence is pulling away with the puppies that were at the table nearby, and possibly his wallet, which was missing again.",
			}
		}, 
		{
			setup: "Deadinsky66 strolls down the street when suddenly the sidewalk in front of him shoots up to block his way. He turns to see a puppy shift its footing, and rocks come up from the ground and float around it.",
			win_score: 3,
			lose_score: 0,
			payoff: {
				"2": "The earthbending puppy fires the rocks at Deadinsky, who dodges them by flipping sideways. Deadinsky lands next to the puppy and, before it could retaliate, Dead tases the puppy with his handheld taser. He then kicks the puppy down the street.",
				"1": "The earthbending puppy fires the rocks at Deadinsky, who barely dodges them. The puppy opens a rift in the ground, but Dead is in the air with a flying kick. The puppy changes stance to counter, but is too late and Dead's foot connects with its muzzle. It sails down the steet as Dead dusts himself off.",
				"0": "The earthbending puppy fires the rocks at Deadinsky, who dodges them sideways. He dives around more thrown rocks and down an alleyway and up a catwalk. The puppy continues to throw stones and attempt to crush him, but Dead is long gone within a few minutes.",
				"-1": "The earthbending puppy stares Deadinsky down, the spiky rocks floating around it. Dead goes to dive at the puppy with a taser, but the puppy shifts its weight slightly and suddenly Deadinsky is in a painful split. The puppy summons three spikes of land to punt Deadinsky several blocks away.",
				"-2": "The earthbending puppy stares Deadinsky down, the spiky rocks floating around it. Dead goes for his handheld taser, but the puppy shifts its stance and suddenly Deadinsky is neck-deep in the ground, the contents of his pocket flung around him. The puppy takes his wallet, again, and scampers happily away.",
			}
		}, 
		{
			setup: "Deadinsky66 is waiting at a bus stop when a sudden blast of fire shoots past his face. He dodges backwards to see the blast of fire came from a puppy's paw. The firebending puppy changes stance, and fire spits out its muzzle in anger.",
			win_score: 2,
			lose_score: 0,
			payoff: {
				"2": "Deadinsky dodges a few blasts of fire bent in his direction and does a summersault over the puppy. He lands and, before the puppy can react, Dead shoves his handheld taser into the puppy's spine. It collapses, and Dead punts it down the street.",
				"1": "Deadinsky feints past a few blasts of fire bent in his direction and deflects a punch of fire aimed at his face. He then shoves his handheld taser into the puppy's spine, and punts the unconcious pup down the street.",
				"0": "The puppy does a roundhouse kick and blasts some more fire in Deadinsky's direction, which he barely dodges. He spots the bus coming and rushes towards it. A blast of fire bounces off the bus as Dead dives inside and the driver floors it at Dead's insistance.",
				"-1": "The puppy punches fire at Deadinsky as he dodges as best he can. But the punches come too quickly and he's soon surrounded by a ring of fire. The puppy then bends then bends the fire into a flaming whirlwind and rockets Deadinsky into the sky.",
				"-2": "The puppy does a lengthy dance, calling fire to surround Deadinsky before Dead could get away. It then bends the fire into a whirlwind that rockets Deadinsky straight into the side of a building. When dead wakes again, his clothes are charred and his wallet is missing again.",
			}
		}, 
		{
			setup: "Deadinsky66 is strolling through the park when he comes across a puppy meditating under a tree. It had a strange blue arrow painted across its back and ending at its head. Like any puppy, he decides to kick it.",
			win_score: 1,
			lose_score: 0,
			payoff: {
				"2": "Deadinsky punts the puppy up into the air, but the puppy stops itself in midair. Deadinsky can hear it crying and vowing revenge as it flew away on the wind.",
				"1": "Deadinsky's foot connects with the puppy's cheek, and the puppy takes that energy and rolls away from him. It paws its cheek in anger and, grabbing a branch, slaps a wave of wind at Deadinsky. Deadinsky stands his ground against the gust, but when he looks back, the puppy had gone.",
				"0": "When Deadinsky goes to kick the meditating puppy, it effortlessly dodges on the wind, without even opening its eyes. He kicks again, but it dodges again. He kicks a third time, but it leaps up on the air given off by the swing of his foot and bounces up the tree, away from him.",
				"-1": "When Deadinsky goes to kick the meditating puppy, it effortlessly dodge and leaves Deadinsky off-balance. It lands on top of Dead and continues meditating. Dead goes to shove it off, but it dodges again and lands on a ball of air, balancing on one paw, a short distance away. Dead tries once more to kick it, but it rolls merrily away. ",
				"-2": "When Deadinsky goes to kick the meditating puppy, a blast of wind comes from behind and knocks Deadinsky down, the puppy tripping him. Deadinsky looks up to see the puppy balancing on one paw on a ball of air, with his wallet floating around it. Dead goes to grab his wallet back, but the puppy rides merrily away on the air scooter.",
			}
		}, 
		//TODO insert waterbender here
		
		/*
		{
			setup: "",
			win_score: 2,
			lose_score: 0,
			payoff: {
				"2": "",
				"1": "",
				"0": "",
				"-1": "",
				"-2": "",
			}
		}, 
		*/
	];
	
	function performShowdown() {
		// select a random showdown:
		var showdown = showdownText[Math.floor(Math.random() * showdownText.length)];
		
		var dead_successes = 0, pup_successes = 0;
		var dead_dice = [], pup_dice = [];
		var dead_pool = 5, pup_pool = 5; //start with 5 dice in the pool and explode 6's
		
		for (var i = 0; i < dead_pool; i++) {
			var die = Math.ceil(Math.random()*6);
			if (die >= 4) dead_successes++;
			if (die == 6) dead_pool++;
			dead_dice.push( __wrapDieColor(die) );
		}
		for (var i = 0; i < pup_pool; i++) {
			var die = Math.ceil(Math.random()*6);
			if (die >= 4) pup_successes++;
			if (die == 6) pup_pool++;
			pup_dice.push( __wrapDieColor(die) );
		}
		
		var result = dead_successes - pup_successes;
		var crit_dead = "", crit_pup = "";
		if (result >= 4) { //dead won critically
			result = 2; 
			state.puppy_score_dead += showdown.win_score*2;
			crit_dead = irccolors.codes.cyan+"[CRIT] "+irccolors.codes.reset;
		} 
		else if (result <= -4) { //dead lost critically
			result = -2; 
			state.puppy_score_puppy += showdown.win_score*2;
			crit_pup = irccolors.codes.cyan+"[CRIT] "+irccolors.codes.reset;
		}
		else if (result > 0) { //dead won
			result = 1; 
			state.puppy_score_dead += showdown.win_score;
			state.puppy_score_puppy += showdown.lose_score;
		}
		else if (result < 0) { //dead lost
			result = -1; 
			state.puppy_score_dead += showdown.lose_score;
			state.puppy_score_puppy += showdown.win_score;
		} 
		else { //tie
			result = 0; 
			state.puppy_score_dead += showdown.lose_score;
			state.puppy_score_puppy += showdown.lose_score;
		}
		
		bot.say("#tppleague", showdown.setup);
		bot.say("#tppleague", 
			"Roll off: Deadinsky ["+dead_dice.join(" ")+"] = "+dead_successes+" Successes "+crit_dead
			+"VS Puppies ["+pup_dice.join(" ")+"] = "+pup_successes+" Successes"+crit_pup);
		bot.say("#tppleague", showdown.payoff[result]);
		return;
		
		function __wrapDieColor(num) {
			if (num == 4) return irccolors.codes.dark_red+num+irccolors.codes.reset;
			if (num == 5) return irccolors.codes.dark_red+num+irccolors.codes.reset;
			if (num == 6) return irccolors.codes.dark_red+'\u0002'+num+irccolors.codes.reset;
			return ""+num;
		}
	}
	
	// state.puppy_score_puppy = 0;
	// state.puppy_score_dead += 100;
	
	cmds.push({
		cmd : /^(pscore|dscore|pkick score(board)?|dkick score(board)?)/i,
		run : function(nick, text, res) {
			if (state.puppy_score_dead > 66 && state.puppy_score_dead < 77) {
				bot.say("#tppleague", "Deadinsky: 66+"+(state.puppy_score_dead-66)+", Puppies: "+state.puppy_score_puppy);
			} else {
				bot.say("#tppleague", "Deadinsky: "+state.puppy_score_dead+", Puppies: "+state.puppy_score_puppy);
			}
		},
	});
	
	cmds.push({
		cmd : /^pkick showdowntest/i,
		run : function(nick, text, res) {
			if (nick == "tustin2121" || nick == "tustin2121_work") {
				performShowdown();
			}
			return; //this is my test command
		},
	});
	
	const CHANCE_SHOWDOWN = 0.10;
	const CHANCE_PUPNADO = 0.03;
	const CHANCE_DOZEN = 0.02;
	const CHANCE_PUPWIN = 0.30;
	
	cmds.push({
		cmd : /^pkick$/i,
		run : function(nick, text, res) {
			// Only do showdowns if Deadinsky is around
			if (state.puppy && Math.random() < CHANCE_SHOWDOWN) {
				performShowdown();
				return;
			}
			
			var rand = Math.random();
			
			if (state.puppy
				&& state.puppy_score_dead > 30
				&& state.puppy_score_puppy + 45 < state.puppy_score_dead 
				&& rand < CHANCE_PUPNADO) 
			{
				// If deadinsky out-strips the puppies score by more than half, and 5% of the time
				var scorejump = Math.round((state.puppy_score_dead - state.puppy_score_puppy) * ((Math.random() * 0.2) + 0.9));
				// Increase the puppies' score by the difference between the scores, +/- 10%
				bot.say("#tppleague", "Deadinsky66 is walking down the road on an abnormally calm day. "
					+"It is several minutes before he notices the low rumbling sound all around him... "
					+"He looks behind him, and a look of terror strikes his face. "
					+"He turns and starts sprinting away as fast as he can. But there is no way he "
					+"can outrun it. The pupnado is soon upon him....");
				
				state.puppy_score_puppy += scorejump;
				return;
			}
			
			if (rand < CHANCE_DOZEN) {
				var num = Math.round((Math.random()*8)+8);
				
				if (/^(dead|mobile)insky/i.test(nick)) {
					bot.say("#tppleague", (num<12?"Almost a dozen":"Over a dozen")+
						" puppies suddenly fall from the sky onto "+nick+" and curbstomp him.");
					state.puppy_score_puppy += num;
					return;
				}
				if (state.puppy) {
					bot.say("#tppleague", nick+" watches as "+(num<12?"maybe":"over")+
						" a dozen puppies spring from nowhere and ambush Deadinsky, beating him to the curb.");
					state.puppy_score_puppy += num;
				} else {
					bot.say("#tppleague", nick+" goes to kick a puppy on Deadinsky's behalf, "+
						"but instead gets ganged up on by "+(num<12?"nearly":"over")+" a dozen puppies.");
				}
				
			} else if (rand > 1-CHANCE_DOZEN) {
				var num = Math.round((Math.random()*5)+8);
				
				if (/^(dead|mobile)insky/i.test(nick)) {
					bot.say("#tppleague", nick+" comes across a dog carrier with about a dozen"+
						" puppies inside. He overturns the whole box with his foot!");
					state.puppy_score_dead += num;
					return;
				}
				if (state.puppy) {
					bot.say("#tppleague", nick+" watches as Deadinsky punts a dog carrier. "+(num<12?"Maybe":"Over")+
						" a dozen puppies run in terror from the overturned box.");
					state.puppy_score_dead += num;
				} else {
					bot.say("#tppleague", nick+" kicks a puppy on Deadinsky's behalf. "+
						"The pup flies into a nearby dog carrier with "+(num<12?"nearly":"over")+" a dozen puppies inside and knocks it over.");
				}
				
			} else if (rand < CHANCE_PUPWIN) {
				if (/^(dead|mobile)insky/i.test(nick)) {
					bot.say("#tppleague", "A puppy kicks "+nick);
					state.puppy_score_puppy++;
					return;
				}
				if (state.puppy) {
					bot.say("#tppleague", nick+" watches as a puppy kicks Deadinsky's ass.");
					state.puppy_score_puppy++;
				} else {
					bot.say("#tppleague", nick+" goes to kick a puppy on Deadinsky's behalf, but instead the puppy dodges it and kicks "+nick+".");
				}
			} else {
				if (/^(dead|mobile)insky/i.test(nick)) {
					bot.say("#tppleague", nick+" kicks a puppy.");
					state.puppy_score_dead++;
					return;
				}
				if (state.puppy) {
					bot.say("#tppleague", nick+" watches as Deadinsky kicks a puppy.");
					state.puppy_score_dead++;
				} else {
					bot.say("#tppleague", nick+" kicks a puppy on Deadinsky's behalf.");
				}
			}
		},
	});
	
	cmds.push({
		cmd : /^dkick$/i,
		run : function(nick, text, res) {
			// Only do showdowns if Deadinsky is around
			if (state.puppy && Math.random() < CHANCE_SHOWDOWN) {
				performShowdown();
				return;
			}
			
			var rand = Math.random();
			
			if (state.puppy 
				&& state.puppy_score_dead > 30
				&& state.puppy_score_puppy * 2 < state.puppy_score_dead 
				&& rand < CHANCE_PUPNADO) 
			{
				// If deadinsky out-strips the puppies score by more than half, and 5% of the time
				var scorejump = Math.round((state.puppy_score_dead - state.puppy_score_puppy) * ((Math.random() * 0.2) + 0.9));
				// Increase the puppies' score by the difference between the scores, +/- 10%
				bot.say("#tppleague", "Deadinsky66 is walking down the road on an abnormally calm day. "
					+"It is several minutes before he notices the low rumbling sound all around him..."
					+"He looks behind him, and a look of terror strikes his face. "
					+"He turns and starts sprinting away as fast as he can. But there is no way he "
					+"can outrun it. The pupnado is soon upon him....");
				
				state.puppy_score_puppy += scorejump;
				return;
			}
			
			if (rand < CHANCE_DOZEN) {
				var num = Math.round((Math.random()*8)+8);
				
				if (/^(dead|mobile)insky/i.test(nick)) {
					bot.say("#tppleague", (num<12?"Almost a dozen":"Over a dozen")+
						" puppies suddenly fall from the sky onto "+nick+" and curbstomp him.");
					state.puppy_score_puppy += num;
					return;
				}
				if (state.puppy) {
					bot.say("#tppleague", nick+" cheers as "+(num<12?"maybe":"over")+
						" a dozen puppies spring from nowhere and ambush Deadinsky, beating him to the curb.");
					state.puppy_score_puppy += num;
				} else {
					bot.say("#tppleague", nick+" goes to kick a Deadinsky on puppy's behalf, "+
						"but instead gets ganged up on by "+(num<12?"nearly":"over")+" a dozen Deadinsky's.");
				}
				
			} else if (rand > 1-CHANCE_DOZEN) {
				var num = Math.round((Math.random()*5)+8);
				
				if (/^(dead|mobile)insky/i.test(nick)) {
					bot.say("#tppleague", nick+" comes across a dog carrier with about a dozen"+
						" puppies inside. He overturns the whole box with his foot!");
					state.puppy_score_dead += num;
					return;
				}
				if (state.puppy) {
					bot.say("#tppleague", nick+" gawks as Deadinsky punts a dog carrier. "+(num<12?"Maybe":"Over")+
						" a dozen puppies run in terror from the overturned box.");
					state.puppy_score_dead += num;
				} else {
					bot.say("#tppleague", nick+" kicks a Deadinsky on puppy's behalf. "+
						"The Deadinsky flies into a nearby dog carrier with "+(num<12?"nearly":"over")+" a dozen Deadinskys inside and knocks it over.");
				}
				
			} else if (rand < CHANCE_PUPWIN) {
				if (/^(dead|mobile)insky/i.test(nick)) {
					bot.say("#tppleague", "A puppy kicks "+nick);
					state.puppy_score_puppy++;
					return;
				}
				if (state.puppy) {
					bot.say("#tppleague", nick+" cheers as a puppy kicks Deadinsky's ass.");
					state.puppy_score_puppy++;
				} else {
					bot.say("#tppleague", nick+" goes to kick a Deadinsky on puppy's behalf, but instead the Deadinsky dodges it and kicks "+nick+".");
				}
			} else {
				if (/^(dead|mobile)insky/i.test(nick)) {
					bot.say("#tppleague", nick+" kicks a puppy.");
					state.puppy_score_dead++;
					return;
				}
				if (state.puppy) {
					bot.say("#tppleague", nick+" watches, appalled, as Deadinsky kicks a puppy.");
					state.puppy_score_dead++;
				} else {
					bot.say("#tppleague", nick+" kicks a Deadinsky on puppy's behalf.");
				}
			}
		},
	});
	

})();

cmds.push({
	cmd : /^(rip|no)doof/i,
	run : function(nick, text, res) {
		if (!state.friendly) return;
		bot.say("#tppleague", "rip DoofBot");
	}
});

cmds.push({
	cmd : /^(rip|no)doot/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", "rip DootBot");
	}
});

cmds.push({
	cmd : /^(rip|no)yay/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", "rip YayBot");
	}
});

cmds.push({
	cmd : /^(rip|no)q20/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", "But... I'm still here... ;_;");
	}
});


cmds.push({
	cmd : /^rimshot/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", "badum tish!");
	}
});

cmds.push({
	cmd : /^question/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", "question> dodged");
	}
});

cmds.push({
	cmd : /^ohmy/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", "http://replygif.net/i/1381.gif");
	}
});

cmds.push({
	cmd : /^(the|gta)joke/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", "http://i.imgur.com/57XwvAX.gif");
	}
});

cmds.push({
	cmd : /^damn/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", "\"Damn\" - Deadinsky66 2014");
	}
});

cmds.push({
	cmd : /^virtualboy/i,
	run : function(nick, text, res) {
		bot.say("#tppleague",  '"ALL HAIL THE VIRTUAL BOY" - Satoru Iwata 2014');
	}
});

cmds.push({
	cmd : /^oppression/i,
	run : function(nick, text, res) {
		if (!state.friendly) return;
		bot.say("#tppleague", '"NO MORE OPPRESSION!" - Deadinsky66 2015');
	}
});

cmds.push({
	cmd : /^(howto|howdo)/i,
	run : function(nick, text, res) {
		if (!state.friendly) return;
		bot.say("#tppleague", '"Very carefully." - Iwamiger 2014');
	}
});

cmds.push({
	cmd : /^zombiebox$/i,
	run : function(nick, text, res) {
//		if (!state.friendly) return;
		bot.say("#tppleague", '"Life\'s like a box of zombies. You never know when you\'re gonna get bit" - Abyll 2015');
	}
});

cmds.push({
	cmd : /^quotebot$/i,
	run : function(nick, text, res) {
//		if (!state.friendly) return;
		bot.say("#tppleague", '"Reminder i Run the Quote Bot and anyone who tries to copy that should get the fuck out" - Leoyns 2015');
	}
});

cmds.push({
	cmd : /^defeat/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", '"Hello my name is defeat, I know you recognize me, Just when you think you can win, I\'ll drag you back down again, \'Til you lost all belief" - DoofBot 2015');
	}
});

cmds.push({
	cmd : /^botstuff/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", '"This bot stuff is getting silly." --Dootbot 2015');
	}
});

cmds.push({
	cmd : /^wtf/i,
	run : function(nick, text, res) {
		if (!state.wtf_count) state.wtf_count = Math.floor(Math.random() * 5256) + 485;
		bot.say("#tppleague", '"wtf"-Liria_10 20XX (Count: '+state.wtf_count+')');
	}
});

cmds.push({
	cmd : /^xyzzy/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", '\u001D'+'A hollow voice says, "Fool!"'+'\u000f');
	}
});


cmds.push({
	cmd : /^quiznos/i,
	run : function(nick, text, res) {
		if (!state.friendly) return;
		if (nick == "Poomph") {
			bot.say("#tppleague", '"I bet you\'re the type of fuck nigga who eats at Quizno\'s" - Anonymous 20XX');
			return;
		}
		bot.say("#tppleague", '"I bet you eat at quiznos, bitch" -Aquawave 2014');
	}
});

cmds.push({
	cmd : /^plagueinc/i,
	run : function(nick, text, res) {
		bot.say("#tppleague", '"I was playing Plague Inc and when I searched for plagues nothing '+
			"showed up, it linked me to the Silph CEO\'s room where he asked me if I had consulted "+
			'the helix fossil. On the back wall of his office was a portrait of the Villager praising Helix." --Iwamiger 2014');
	}
});


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
			bot.say("#tppleague", "And lo, the chat did die on this day. And lo, all discussion ceased. The chat had gone to meet its makers in the sky. It remained stiff. It ripped, and went forth into the ether forevermore. And never again shall it rise, until someone steps forth and speaketh unto the chat once again. In the name of the Helix, the Dome, and the Amber of Olde, Amen. Press F to Pay Respects.")
			return;
		}
		bot.say("#tppleague", "And lo, the chat did die on this day. And lo, all discussion ceased. The chat had gone to meet its makers in the sky. It remained stiff. It ripped, and went forth into the ether forevermore. And never again shall it rise, until someone steps forth and speaketh unto the chat once again. In the name of the Helix, the Dome, and the Amber of Olde, Amen. Please pay your final respects now.")
	},
});

cmds.push({
	cmd : /^settle/i,
	run : function(){
		if (!state.friendly) return;
		bot.say("#tppleague", '"Settle it in smash!" - Poomph 2014')
	},
});

cmds.push({
	cmd : /^fix(.+)/i,
	run : function(nick, text, res){
		if (!state.friendly) return;
		
		var creator = "already";
		var botname = "bot,";
		switch (res[1]) {
			case "doot":	creator = "TieSoul"; break;
			case "q20":		creator = "Tustin"; break;
			case "doof": 	creator = "Leonys"; break;
			case "yay": 	creator = "xfix"; break;
			case "log":
			case "logs":	creator = "xfix"; botname = "logs,"; break;
		}
		
		bot.say("#tppleague", '"Fix your '+botname+' '+creator+'!" - xfix 2014');
	},
});

cmds.push({
	cmd: /^add2nuke (.*)/i,
	run : function(nick, text, res) {
		if (state.nukelist.length > 16) {
			bot.say("#tppleague", "We don't have the nuclear capacity to add another to the list...")
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


