// poketext.js
// The Release Watchman
console.log("Loading Module poketext.js");

var extend = require("extend");
var colors = require("irc").colors;

const PC_TIMEOUT = 1000 * 60 * 5; //five minutes
const ACTIVE_TIMEOUT = 1000 * 60 * 20; // twenty minutes
const WARN_ACTIVE_TIMEOUT = 1000 * 60 * 20; // twenty minutes

const DEBUG_REPORT =  ["#TPPTableTop"];
const NORMAL_REPORT = ["#twitchplayspokemon", "#TPPTableTop"];
const ALERT_REPORT  = ["#twitchplayspokemon", "#TPPTableTop", "#tppleague"];

var active_interval = 0;

module.exports = {
	setup : function() {
		bot.addListener("join#twitchplayspokemon", joinReport);
		
		bot.addListener("message#poketext", processPoketext);
		bot.addListener("join#poketext", joinPoketext);
		bot.addListener("part#poketext", partPoketext);
		bot.addListener("quit", partPoketext);
		bot.addListener("kill", partPoketext);
		
		active_interval = setInterval(checkActivity, 1000 * 60); //every 60 seconds
		
		bot.join("#poketext");
	},
	
	teardown : function(){
		bot.removeListener("join#twitchplayspokemon", joinReport);
		
		bot.removeListener("message#poketext", processPoketext);
		bot.removeListener("join#poketext", joinPoketext);
		bot.removeListener("part#poketext", partPoketext);
		bot.removeListener("quit", partPoketext);
		bot.removeListener("kill", partPoketext);
		
		clearInterval(active_interval);
	},
	
	migrate : function(old) {
		extend(this.state, old.state);
	},
}

var state = module.exports.state = {
	poketextJoined: false,
	lastActive: 0,
	lastActiveWarn: 0 ,
	nextActiveWarn: 0,
	lastPC: 0,
	pokeballs: 0,
	
	lastWildInfo : null,
};

///////////////////////////////////////////////////////////////////////////////////////////

function authenticate(nick, permittedCallback) {
	bot.whois(nick, function(info){
		console.log(info);
		if (info.account == "tustin2121" || info.account == "rctgamer3") {
			try {
				permittedCallback();
			} catch (e) {
				error(e);
			}
		}
	});
}

function checkActivity() {
	safely(function(){
		if (!state.poketextJoined) return;
		
		var currMillis = new Date().getTime();
		
		if (state.lastActive + ACTIVE_TIMEOUT < currMillis) {
			if (state.nextActiveWarn > currMillis) {
				return;
			}
			state.lastActiveWarn = currMillis;
			state.nextActiveWarn = currMillis + (state.lastActiveWarn - state.lastActive) * 2; //double the warn timeout
			
			// Get the number of minutes since last activity
			var minSince = Math.round((currMillis - state.lastActive) / (1000 * 60));
			if (minSince < 19) { return; } //Failsafe
			
			bot.say("#poketext", "Warning: rctgamer3 - It has been "+minSince+" minutes since POKETEXT has output.");
		}
	});
}


function joinReport(nick) {
	if (nick == bot.nick) {
		bot.action("#twitchplayspokemon", "sits in the corner, licks his pencil, and begins watching Poketext. Release Watch!");
	}
}


function joinPoketext(nick) {
	safely(function(){
		if (/POKETEXT/.test(nick)) {
			for (var i = 0; i < ALERT_REPORT.length; i++) {
				bot.say(ALERT_REPORT[i], "POKETEXT has come online. Resuming Release Watch.");
			}
			state.poketextJoined = true;
		}
	});
}

function partPoketext(nick) {
	safely(function(){
		if (/POKETEXT/.test(nick)) {
			for (var i = 0; i < ALERT_REPORT.length; i++) {
				bot.say(ALERT_REPORT[i], "Warning: POKETEXT is no longer online. Cannot continue Release Watch.");
			}
			
			bot.say("#poketext", "rctgamer3 : POKETEXT has quit.");
			state.poketextJoined = false;
		}
	});
}


function reportEvent(text, to) {
	for (var i = 0; i < to.length; i++) {
		if (currChans[to[i]]) {
			bot.say(to[i], "<POKETEXT> "+text);
		} else {
			console.log("Not joined to channel", to[i], "- Cannot report!");
		}
	}
}

var cmds = [];
function processPoketext(nick, text, _msg) {
	safely(function(){
		// If I fuck up again and name a variable "nick" below, this saves it...
		if (!nick) nick = _msg.nick; 
		
		// Commands entrypoint
		if (text.indexOf("!") == 0) {
			authenticate(nick, function(){
				var res = null;
				var txt = text.substr(1);
				for (var i = 0; i < cmds.length; i++) {
					if ((res = cmds[i].cmd.exec(txt))) {
						cmds[i].run(nick, text, res);
						return;
					}
				}
			});
		}
		
		if (!/POKETEXT/.test(nick)) return;
		var currMillis = new Date().getTime();
		
		state.poketextJoined = true;
		state.nextActiveWarn = currMillis + ACTIVE_TIMEOUT;
		state.lastActiveWarn = state.lastActive = currMillis;
		
		{ // Wild Pokemon Tracking
			var res;
			if ((res = /Wild (\w+) appeared!(?: (?:.*)\[EnLvl: ?(\d+), EnGend: ([^\]]+)\])?/i.exec(text))) {
				state.lastWildInfo = {
					pkmn: res[1],
					lvl: res[2],
					gen: res[3],
				};
				return;
			}
			
			if ((res = /Gotcha! ([^ ]+) was caught!/i.exec(text))) {
				if (state.lastWildInfo.pkmn == res[1]) {
					
					res = /(\d+)d(\d+)h(\d+)m/i.exec(text);
					state.lastWildInfo.time = res[1]+"d "+res[2]+"h "+res[3]+"m";
					
					res = /used the (\w+) BALL/i.exec(text);
					state.lastWildInfo.ball = res[1];
				}
				return;
			}
			
			if ((res = /([^ ]+) was sent to BILL's PC/.exec(text))) {
				if (state.lastWildInfo) {
					var wi = state.lastWildInfo; 
					state.lastWildInfo = null;
					var pName = res[1];
					
					var rp = "[CATCH] ";
					if (wi.time) {
						rp += wi.time+" ";
					} else {
						res = /(\d+)d(\d+)h(\d+)m/i.exec(text);
						rp += res[1]+"d "+res[2]+"h "+res[3]+"m ";
					}
					
					rp += '\u0002\u000312';
					rp += "Caught a "+wi.gen+" Lv. "+wi.lvl+" "+wi.pkmn+"! ";
					rp += '\u000f';
					if (wi.pkmn == pName) {
						rp += "No nickname.";
					} else {
						rp += "nname: `"+pName+"`";
					}
					
					if (wi.ball) {
						rp += " [Ball: "+wi.ball+"]";
					}
					reportEvent(rp, NORMAL_REPORT);
				} else {
					reportEvent('\u0002'+colors.wrap("light_blue", text), NORMAL_REPORT);
				}
				return;
			}
		}
		
		
		// PC Usage!
		// if (/released outside/.test(text)) { //Release in Red
		if (/Release(d)? (ᵖᵐ|PkMn)|Bye, (.*)!/.test(text)) { //Release in Crystal
			// For some reason, the "bold" color puts an extraneous 16 at the start.
			reportEvent('\u0002'+colors.wrap("light_red", text), ALERT_REPORT);
			return;
		}
		//if (/was stored in|taken out\. Got/.test(text)) { //Withdraw, Deposit in Red
		if (/Stored ([\w\d]+)!|Got (?!away)([\w\d]+)!/.test(text)) { //Withdraw, Deposit in Crystal
			reportEvent(text, NORMAL_REPORT);
			return;
		}
		if (/Deposited|Withdrew/.test(text)) { //Withdraw, Deposit in Crystal
			reportEvent(text, DEBUG_REPORT);
			return;
		}
		if (/turned on the PC/.test(text)) { //PC is now on
			if (state.lastPC + PC_TIMEOUT < currMillis) {
				reportEvent(text, ALERT_REPORT);
			}
			state.lastPC = currMillis;
			return;	
		}
		
		// Name Selection!
		if (/are you ready?/.test(text)) {
			reportEvent(text, NORMAL_REPORT);
			return;
		}
		
		// Item/Pokemon Acquisition
		if (/recieved (.*)!/.test(text)) { //Given
			reportEvent(text, NORMAL_REPORT);
			return;
		}
		if (/phone number|registered (\w+)'s number/.test(text)) { //Phone numbers
			reportEvent(text, NORMAL_REPORT);
			return;
		}
		if (/in the \w+ POCKET/i.test(text)) { //Finding items
			reportEvent(text, DEBUG_REPORT);
			return;
		}
		if (/Threw away/i.test(text)) { //Tossing items
			reportEvent(text, DEBUG_REPORT);
			return;
		}
		if (/will be .\d+\./i.test(text)) { //Buying
			reportEvent(text, DEBUG_REPORT);
			return;
		}
		if (/Made (.*) hold|Took (.*) from/.test(text)) { //Held items
			reportEvent(text, DEBUG_REPORT);
			return;
		}
		if (/used the/i.test(text)) { //Using items in battle?
			reportEvent(text, DEBUG_REPORT);
			return;
		}
		
		
		if (/(blacked|whited) out/.test(text)) {
			reportEvent(text, NORMAL_REPORT);
			return;
		}
		if (/Ok, may I see your POK.MON?/i.test(text)) { // Healing
			reportEvent(text, DEBUG_REPORT);
			return;
		}
		
		
		// if (/was caught|was transferred to/.test(text)) {
		if (/was caught|sent to BILL's PC/.test(text)) {
			reportEvent('\u0002'+colors.wrap("light_blue", text), NORMAL_REPORT);
			return;
		}
		if (/New POK.DEX data will be added/.test(text)) {
			reportEvent('\u0002'+colors.wrap("light_blue", text), NORMAL_REPORT);
			return;
		}
		if (/MASTER ?BALL/i.test(text)) {
			reportEvent('\u0002'+colors.wrap("light_red", text), ALERT_REPORT);
			return;
		}
		if (/grew to level [\d]{2}/.test(text)) { //Level up
			reportEvent(text, DEBUG_REPORT);
			return;
		}
		if (/grew to level [\d]{3}/.test(text)) { //level 100! (and beyond?!)
			reportEvent('\u0002'+colors.wrap("light_blue", text), ALERT_REPORT);
			return;
		}
		if (/evolved into/.test(text)) {
			reportEvent(text, NORMAL_REPORT);
			return;
		}
		
		// if (/Wild ([A-Za-z0-9]+) appeared/.test(text)) {
		// 	reportEvent(colors.wrap("light_red", text), DEBUG_REPORT);
		// 	reportEvent(colors.wrap("bold", text), DEBUG_REPORT);
		// 	reportEvent(colors.wrap("bold", colors.wrap("light_red", text)), DEBUG_REPORT);
		// 	reportEvent('\u0002'+colors.wrap("light_red", text), DEBUG_REPORT);
		// 	return;
		// }
		// if (/gained [0-9]+ EXP. Points/.test(text)) {
		// 	reportEvent(text, DEBUG_REPORT);
		// 	return;
		// }
	});
}

cmds.push({
	cmd : /^(ping)/i,
	run : function(nick, text, res){
		bot.say("#poketext", "Pong:"
			+" poketextjoined="+state.poketextJoined
			+" lastActive="+state.lastActive
			+" lastPC="+state.lastPC
			+" lastWild="+(require("util").inspect(state.lastWildInfo)) 
		);
	},
});

cmds.push({
	cmd : /^reset/i,
	run : function(nick, text, res){
		var currMillis = new Date().getTime();
		
		state.poketextJoined = true;
		state.nextActiveWarn = currMillis + ACTIVE_TIMEOUT;
		state.lastActiveWarn = state.lastActive = currMillis;
		
		bot.say("#poketext", "Activity timeout reset.");
	},
});

cmds.push({
	cmd : /^(shh|ssh|quiet)/i,
	run : function(nick, text, res){
		state.poketextJoined = false;
		
		bot.say("#poketext", "Activity timeout warnings quieted until POKETEXT joins or speaks again.");
	},
});

cmds.push({
	cmd : /^forcehere/i,
	run : function(nick, text, res){
		state.poketextJoined = true;
		
		bot.say("#poketext", "Forcing 'POKETEXT is here' to true.");
	},
});


