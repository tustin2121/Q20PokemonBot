// game.js
// for the Pokemon 20 Q Bot
console.log("Loading Module game.js");

var natural = require("natural");
var irc	= require("irc");
var info = require("./dbinfo");
var util = require("util");
var _	= require("underscore");

var inherits = require("inherits");
var extend = require("extend");
var EventEmitter = require("events").EventEmitter;

var Logger = require("./logger");

var classifier;
var tokenizer = new natural.WordTokenizer();
var strcomp = natural.JaroWinklerDistance;

const BANNED_CHANNELS = ["##tppleague#id", "#poketext", "#twitchplayspokemon"];
//const BANNED_CHANNELS = ["#twitchplayspokemon", "##tppleague#id", "#poketext"];
const LIMITED_CHANNELS = ["#tppleague", "#TPPTableTop"];

{
	natural.BayesClassifier.load("data/classifier.json", null, function(err, cl){
		if (err) throw err;
		classifier = cl;
	});
}

const GAME_TIMEOUT = 10; //number of minutes before a game times out on its own
const LIMITED_TIMEOUT = 1; //number of minutes before a limited channel may start a new game
const NOPERM_MSG = " Please PM me if you want to play 20 Questions by yourself, or /invite me to another channel to play there.";

const EXAMPLE_QUESTIONS = [
	"?is it Magikarp?", "?is it Lapras", "?is it Dux?",
	"?can it have sturdy", "?does it have the ability sand veil", "?could it have the ability volt absorb?",
	"?is it a fire type", "?is it weak to ice?", "?does it resist water?", "?is it dual typed",
	"?is it part of the eevee family?", "?is it in the ralts evolutionary line",
	"?can it learn flamethrower", "?can it learn Ice Beam?", "?does it learn trick room",
	"?is it taller than 2 meters", "?is it shorter than a house?", "?is it smaller than pikachu?",
	"?is it bigger than 5m?",
	"?is it a legendary", "?is it a fossil pokemon?",
	"?is it blue?", "?is it red", 
	"?can it evolve", "?can it mega evolve?",
	"?is it in the kanto pokedex?", "?is it in the national pokedex", "?is it in the fifth gen?",
//	"?is it heavier than 100kg", "?is it lighter than snorlax?",
//	"?is it part of the monster egg group?", "?is it in the flying egg group?",
//	"?can it mate with ditto?", "?can it make a baby with ditto?",
//	"?does it have wings?", "?does it have legs?", "is it tailless?",
];

function Game(channel) {
	if (!(this instanceof Game))
		return new Game(channel);
	EventEmitter.call(this);
	
	this.channel = channel;
	this.logger = null;
	
	//Attach methods as event listeners. These events are emitted by the irc bot through us
	var self = this;
	this.on("ping", function(){ self.ping(); });
	this.on("+mode", function(by, mode, arg){ self.modeChanged(mode, true); });
	this.on("-mode", function(by, mode, arg){ self.modeChanged(mode, false); });
	this.on("part", function(nick){ self.userLeft(nick); });
	this.on("quit", function(nick){ self.userLeft(nick); });
	this.on("requestedPkmn", function(id){ 
		if (typeof(id) != "number" || id > info.numPokemon+1 || id <= 0)
			return;
		self.forced = id; 
	});
	this.on("migrate", function(old){
		// This is called when reloading the Game module only
		this.gamepaused = old.gamepaused;
		if (old.pokemon == null) return; //no current game, don't bother
		this.pokemon = old.pokemon;
		this.localBanList = old.localBanList;
		this.maxQuestions = old.maxQuestions;
		this.questions = old.questions;
		this.askedQuestions = old.askedQuestions;
		this.repeatQuestions = old.repeatQuestions;
		this.mode_notypes = old.mode_notypes;
		this.time_start = old.time_start;
		this.time_lastguess = old.time_lastguess;
		this.time_end = old.time_end;
		this.lastStarter = old.lastStarter;
		this.forced = old.forced;
		this.logger = old.logger;
		console.log("Game for", this.channel, "has been migrated");
		if (this.logger)
			this.logger.log("Game for", this.channel, "has been migrated");
	});
	
	this.on("nick", function(oldn, newn){
		// console.log("Nick change:", self.channel, oldn, newn);
		if (self.lastStarter == oldn) {
			self.lastStarter = newn;
		}
	});
}
inherits(Game, EventEmitter);
Game.fn = Game.prototype;
extend(Game.prototype, {
	globalBanList: {},
	localBanList : null,
	
	channel: null,
	logger: null,
	
	say : function (txt){ //reimplemented in main.js due to scoping issues
		bot.say(this.channel, txt);
	}, 
	respond : function(to, question, answer){
		var qleft = "", qnum = "";
		if (this.maxQuestions > 0) {
			qleft = this.maxQuestions - this.questions;
			if (qleft < 5 || qleft % 10 == 0)
			{
				qleft = irc.colors.wrap("light_gray", " ["+(qleft) + " left]");
			}
			else
			{
				qleft = "";
			}
			qnum = "["+this.questions+"]";
		}
		
		var str;
		if (to == this.channel)
			str = irc.colors.wrap("light_gray", qnum + question);
		else
			str = irc.colors.wrap("light_gray", qnum + "["+to+"]: "+question);
		this.say(str + " > "+ answer + qleft);
	},
	
	maxQuestions : -1,
	questions: -1, //remaining questions
	
	askedQuestions : null, //hash of question fingerprint obj -> true
	repeatQuestions : null, //hash of usernames -> {last: last question, num: times repeted consecutively}
	
	forced: null,
	pokemon: null,
	
	//challenge modes:
	mode_notypes : null,
	
	gamepaused : false,
	
	time_start : 0,
	time_lastguess : 0,
	time_end: 0,
	lastStarter: "Q20Bot",
	
	banUser : function(from, reason) {
		if (from == this.channel) return; //don't ban user in his own private game
		if (this.logger)
			this.logger.reportUserBanning(from, reason);
		
		if (!this.localBanList) {
			this.localBanList = [];
		}
		this.localBanList.push(from);
		
		var gb = Game.fn.globalBanList[from];
		if (!gb) {
			gb = Game.fn.globalBanList[from] = { count:0, by:"Q20" };
		}
		gb.count++;
	},
	
	isBanned : function(from) {
		if (from == this.channel) return false; //don't ban user in his own private game
		if (!this.localBanList) return false;
		if (this.localBanList.indexOf(from) > -1) { return true; }
		if (/^TPPLDiscordBot$/i.test(from)) return true;
		if (/^hftf$/i.test(from)) return true;
		return false;
	},
	
	markQuestion : function(from, qsig, dontDeduct){
		var answered = this.askedQuestions[qsig];
		if (!dontDeduct)
			this.askedQuestions[qsig] = true;
		
		var repeat = this.repeatQuestions[from];
		if (!repeat) {
			repeat = this.repeatQuestions[from] = { last: null, num: 0, };
		}
		repeat.hasQuit = false; //asked a question, is playing again
		if (repeat.last == qsig) {
			repeat.num++;
			
			if (repeat.num > 2 && from != this.channel) {
				this.banUser(from, "Spamming the same question more than 3 times.");
				repeat.hasQuit = true;
				throw "User was Banned!";
			}
		} else {
			repeat.last = qsig; repeat.num = 0;
		}
		
		if (!dontDeduct && !answered) {
			this.questions++;
		}
		
		return answered;
	},
	
	parseMessage : function(from, text) {
		if (this.isBanned(from)) { 
			if (this.logger) 
				this.logger.logBannedUser(from); 
			else
				console.log("User",from,"found in banlist!");
			return;
		}
		
		if (/^(commands?|cmds?|examples?)$/i.test(text)) {
			if (BANNED_CHANNELS.indexOf(this.channel) > -1) return;
			if (this.pokemon == null) {
				this.say("To begin a new game, use '?start game'.");
			} else {
				this.say("To direct a question at me, start what your saying with a question mark (?).");
				this.say("Ask me a yes/no question about the pokemon I'm thinking of. I can respond to several queries, such as:");
				this.say("?is it a fire type, ?is it blue, ?can it learn Flamethrower, ?is it weak to ice");
			}
			return;
		}
		
		if (/^help$/i.test(text)) {
			//TODO message the asker a bunch of info, including commands, and start options
		}
		
		//if the game isn't started, check for a start command
		var res;
		if ((res = /^(?:begin|start|new) ?(?:game|pokemon)? ?\b(.*)/i.exec(text))) {
			// bot.notice(from, "Channels: "+BANNED_CHANNELS.join(","));
			// bot.notice(from, "Channel: "+this.channel);
			if (this.channel == "#tppleague" && require("./friendly").state.modmode) {
				// Mod Mode
				bot.notice(from, "I am currently being 'responsible' in this channel. Please go elsewhere to play the game.");
				return;
			}
			if (BANNED_CHANNELS.indexOf(this.channel) > -1) {
				// Blanket Ban
				bot.notice(from, "I do not have permission to start a game on this channel."+NOPERM_MSG);
				return;
			}
			if (LIMITED_CHANNELS.indexOf(this.channel) > -1) {
				const DENIED_MSG = "Permission to start game in this channel has been denied at this time."+NOPERM_MSG;
				var currMillis = new Date().getTime();
				if (this.time_end + (LIMITED_TIMEOUT*60*1000) > currMillis) {
					bot.notice(from, DENIED_MSG);
					return;
				}
				
				if (this.pokemon) {
					this.say("But this game isn't finished yet!");
					return;
				}
				var self = this;
				
				// Only registered users are allowed to start a game
				bot.whois(from, function(info){
					safely(function(){
						console.log("LIMITED CHANNEL Game Begun by: "+from+" == "+info.account);
						if (!info.account) {
							bot.notice(from, DENIED_MSG);
							return;
						}
						// if (info.account == self.lastStarter) {
						// 	bot.notice(from, DENIED_MSG);
						// 	return;
						// }
						if (info.account == "cyander" || info.account == "swi0009") {
							// Cyander spams FAR too much
							bot.notice(from, DENIED_MSG);
							return;
						}
						if (self.pokemon) {
							this.say("But this game isn't finished yet!");
						}
						// Permission granted
						self.lastStarter = info.account;
						self.startGame(res[1]);
					});
				});
				return;
			}
			
			if (!this.pokemon) {
				this.startGame(res[1]); 
				return;
			} else {
				this.say("But this game isn't finished yet!");
			}
		}
		if (BANNED_CHANNELS.indexOf(this.channel) > -1) { return; }
		if (!this.pokemon) return;
		
		if (/^\!(quit|exit|stop)/.test(text)) {
			this.quitRequested(from);
			return;
		}
		
		try {
			this.parseQuestion(from, text);
		} catch (e) {
			if (typeof e != "string") throw e; //rethrow non-string exceptions
		}
	},
	
	modeChanged : function(mode, isset) {
		//A mode is set on this channel, likely +m or -m
		switch (mode) {
			case "m":
				this.gamepaused = isset;
				if (this.logger)
					this.logger.gamePaused(isset);
				break;
		}
	},
	
	startGame : function(arg){
		this.logger = new Logger("GAME_"+this.channel);
		
		var params = {
			questions: 20,
			notypes: false,
		};
		if (arg) {
			var opts = arg.split(/\W/);
			for (var i = 0; i < opts.length; i++) {
				this.logger.log("opt: "+opts[i]);
				switch(true) {
					case (/^(unlimited|infinit[ey]|nolimit)$/.test(opts[i])):
						this.logger.log("opt: [unlimited] "+opts[i]);
						params.questions = -1;
						break;
					case (/^([0-9]+)$/.test(opts[i])):
						this.logger.log("opt: [number]", opts[i], opts[i], Math.min(100, Math.max(1, opts[i])));
						params.questions = Math.min(100, Math.max(10, opts[i] * 1));
						break;
					case (/^(notypes?|!types)$/.test(opts[i])):
						this.logger.log("opt: [notypes] "+opts[i]);
						params.notypes = true;
						break;
				}
			}
		}
		
		this.localBanList = [];
		//Push any global bans into the local list
		for (var gb in Game.fn.globalBanList) {
			if (Game.fn.globalBanList[gb].count > 2) {
				this.localBanList.push(gb);
				this.logger.reportUserBanning(gb, "Global ban list reports 3+ infringements.");
			}
		}
		
		this.askedQuestions = {};
		this.repeatQuestions = {};
		
		this.maxQuestions = params.questions;
		this.questions = 0;
		this.mode_notypes = params.notypes;
		
		this.time_start = this.time_lastguess = new Date().getTime();
		
		this.logger.newPokemon();
		if (!info.ready) {
			this.say("I cannot start a new game at this time. Please try again in a moment.");
		}
		
		var pid = Math.floor(Math.random() * info.numPokemon)+1;
		
		if (this.forced) {
			pid = this.forced;
			this.forced = null;
			this.say("This pokemon was requested.");
		}
		
		this.say(irc.colors.wrap("dark_blue", "I am thinking of a pokemon.") +" Try and guess it! Ask me yes or no question!");
		{
			var say = "Examples: ";
			var qids = [];
			for (var i = 0; i < 3;) {
				var id = Math.floor(Math.random()*EXAMPLE_QUESTIONS.length);
				if (qids[id]) continue;
				qids[id] = true;
				
				say += EXAMPLE_QUESTIONS[id] + ((i < 2)?", ":"");
				i++;
			}
			this.say(say);
		}{
			var str = "";
			if (this.maxQuestions > -1) {
				str += "You have only "+irc.colors.wrap("dark_green", this.maxQuestions+" questions")+" to guess it. ";
			}
			if (this.mode_notypes) {
				str += irc.colors.wrap("dark_red","You are not allowed to directly ask about types.");
			}
			
			if (str) this.say(str);
		}
		
		this.pokemon = info.getPokemon(pid);
		
		var pkmn = this.pokemon;
		var self = this;
		setTimeout( function(){ 
			if (self.logger)
				self.logger.updatePokemon(pkmn); }, 2000 );
		bot.emit("mon_update");
	},
	
	endGame : function(winner, silent) { //if winner == null, game is lost
		if (typeof winner == "string") {
			if (!silent)
				this.say(irc.colors.wrap("dark_green","The pokemon I was thinking of was "+this.pokemon.name+".") + " Congrats to "+
					irc.colors.wrap("dark_green", winner)+" for guessing correctly!");
			this.logger.winPokemon(winner);
		} else if (typeof winner == "number") {
			if (!silent) 
				switch (winner) {
					case -1:
						this.say(irc.colors.wrap("dark_red", "This game has been ended.")+" The pokemon I was thinking of was "+
						irc.colors.wrap("dark_red",this.pokemon.name+"."));
						break;
					case -2:
						this.say(irc.colors.wrap("dark_red","There are no more players playing.")+" The pokemon I was thinking of was "+
						irc.colors.wrap("dark_red",this.pokemon.name+"."));
						break;
				}
				
			this.logger.lossPokemon();
		} else {
			if (!silent)
				this.say(irc.colors.wrap("dark_red", "That is the final question.") + " The pokemon I was thinking of was "+
					irc.colors.wrap("dark_red",this.pokemon.name) +". Too bad you couldn't guess in time.")
			this.logger.lossPokemon();
		}
		
		//cleanup
		this.pokemon = null;
		this.localBanList = null;
		this.logger.close(); this.logger = null;
		
		this.time_start = this.time_lastguess = 0;
		this.time_end = new Date().getTime();
		bot.emit("mon_update");
	},
	
	quitRequested : function(nick, silent) {
		if (!this.repeatQuestions) return;
		var qreport = this.repeatQuestions[nick];
		if (qreport == null) {
			if (!_.size(this.repeatQuestions)) { //If no one has participated, end game
				this.endGame(-1);
			} else {
				//this.say(nick+": But you aren't participating to begin with...");
				// Ignore
			}
		} else {
			qreport.hasQuit = true;
			if (!silent) 
				this.say(nick+" has decided to quit this game.");
			
			if (!_(this.repeatQuestions).where({ hasQuit : false }).length) {
				this.endGame(-2);
			}
		}
	},
	userLeft : function(nick) {
		if (!this.repeatQuestions) return;
		var qreport = this.repeatQuestions[nick];
		if (qreport) {
			qreport.hasQuit = true;
		}
	},
	
	forceQuit : function(nick, action){
		if (this.pokemon) {
			if (nick == this.channel) {
				this.say("I will stop this game then. The pokemon was "+this.pokemon.name+".");
			} else {
				this.say("I'm sorry friends but I have been told to "+action+" by "+nick
					+". The pokemon was "+this.pokemon.name+"." );
			}
			
			//cleanup
			this.pokemon = null;
			this.localBanList = null;
			this.logger.close(); this.logger = null;
			
			this.time_start = this.time_lastguess = 0;
			this.time_end = new Date().getTime();
			bot.emit("mon_update");
		}
	},
	
	/** Timing function, count how many pings between guesses */
	ping : function() {
		var time_now = new Date().getTime();
		// console.log(time_now, " > ", this.time_lastguess, " = ", (time_now > this.time_lastguess + 1000*60*GAME_TIMEOUT));
		if (this.pokemon && time_now > this.time_lastguess + 1000*60*GAME_TIMEOUT) {
			this.logger.gameTimedOut();
			this.endGame(null, true); //silent quit
		}
	},
	
});

bot.on("module-reloaded", gameReloadListener);
function gameReloadListener(module){
	switch (module) {
		case "db": 
			info = require("./dbinfo");
			break;
		case "game":
			bot.removeListener("module-reloaded", gameReloadListener);
			break;
	}
}

Game.fn.parseQuestion = function(from, text) {
	if (this.gamepaused) {
		this.logger.gamePaused(this.gamepaused);
		return;
	}
	
	this.logger.guessBegin(from, text);
	if (!text) return; //ignore empty text
	if (this.pokemon.id === undefined || this.pokemon.name === undefined || this.pokemon.moves === undefined
		|| this.pokemon.abilities === undefined || this.pokemon.color === undefined) {
		// We don't yet have the answers to the questions on hand! Reply sarcastically.
		this.say("Wow there, "+from+", jumping the gun a bit, aren't you? I don't even have my pokedex open yet!");
		this.logger.error("Question presented too soon.");
		return;
	}
	
	var tokens = tokenizer.tokenize(text);
	if (!tokens || tokens.length == 0) return; //ignore empty tokens list
	var data = classifier.getClassifications(text);
	
	this.time_lastguess = new Date().getTime();
	
	{ //Massage the classifcations to give a more desirable ordering
		for (var i = 0; i < data.length; i++) {
			switch (data[i].label) {
				case "pokemon": data[i].value *= 0.9998; //shift the pokemon function back some
				case "type": data[i].value *= 0.9998; //shift the type function back some
			}
		}
		data.sort(function(x, y) { return y.value - x.value; }); //resort
	}
	
	this.logger.guessClassifications(data);
	
	var res;
	var scores = [];
	for (var i = 0; i < data.length; i++) {
		this.logger.guessFnBegin(data[i]);
		res = Game.fn.parseQuestionFunctions[data[i].label].call(this, from, text, tokens);
		this.logger.guessFnEnd(data[i], res);
		if (res) {
			// console.log(res.score, data[i].value);
			res.score *= data[i].value;
			scores.push(res);
			// if (typeof(res) == "string") {
			// 	//only grab the first error, since it should be the best
			// 	if (!bestErr) bestErr = res;
			// 	res = undefined;
			// 	continue;
			// }
			// break;
		}
	}
	
	if (scores.length == 0) {
		this.say("I'm sorry, "+from+", I was unable to understand that question.");
	} else {
		scores = _.sortBy(scores, function(x){ return -x.score; });
		this.logger.guessClassifications(scores);
		var top = scores[0];
		
		this.markQuestion(from, top.qid, top.nomark);
		if (!top.answer) { //no answer == error
			this.say(from+" : "+top.question);
		} else {
			this.respond(from, top.question, top.answer);
		}
		
		if (top.win) {
			this.endGame(from);
		} else {
			if (this.maxQuestions > 0 && this.questions >= this.maxQuestions) {
				this.endGame(null);
			}
		}
	}
};

/////////////////////////////////////////////////////////////////////////////////////

function __findInTable(conglom, nameTable, matchTable) {
	var matches = [];
	var score = 0;
	conglom = conglom.toLowerCase();
	
	//search the extra regex list first
	if (matchTable) {
		for (var i = 0; i < matchTable.length; i++) {
			var match = matchTable[i];
			if (match.regex.test(conglom)) {
				return { id: match.id, score: 10 };
			}
		}
	}
	//Search through our list of names
	if (nameTable) {
		for (var i = 1; i < nameTable.length; i++) {
			if (nameTable[i].toLowerCase() == conglom) {
				return { id: i, score: 10 };
			} 
		}
		
		for (var i = 1; i < nameTable.length; i++) {
			if ((score = strcomp(nameTable[i].toLowerCase(), conglom)) > 0.95) {
				matches.push({ id: i, score: score });
			} 
		}
		
		if (matches.length == 0) return 0;
		matches = _.sortBy(matches, function(x){ return -x.score; });
		return matches[0];
	}
	return null;
}

function __findPokemon(self, conglom) {
	if (self.pokemon.name.toLowerCase() == conglom) {
		return { id: self.pokemon.id, score: 100 };
	} else {
		return __findInTable(conglom, info.nameTable, info.nameMatchTable);
	}
	return null;
}

function __result(qid, score, question, response) {
	return {
		score: score,
		question: question,
		answer: response, //if response is missing, it is an error message
		qid : qid,
		win: false,
		nomark : (response === undefined), //don't count errors against question count
	}
}

const IGNORE_WORDS_1 = /^(an?|the|i[stn]|(in)?to|can|does|could|are)$/i;

Game.fn.parseQuestionFunctions = {
	
	"pokemon" : function(from, text, tokens) {
		var self = this;
		
		var unknownTokens = [];
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (!token) continue;
			if (IGNORE_WORDS_1.test(token)) continue;
			
			unknownTokens.push(token);
		}
		
		var res = __findPokemon(this, unknownTokens.join(" "));
		this.logger.guessFnDebug("pkmnfunc", "res =", res);
		if (res) { res.score *= unknownTokens.length; }
		
		if (!res && unknownTokens.length > 1) {
			for (var i = 0; i < unknownTokens.length; i++) {
				res = __findPokemon(this, unknownTokens[i]);
				if (res) break;
			}
			this.logger.guessFnDebug("pkmnfunc", "res2 =", util.inspect(res));
		}
		
		if (res) {
			var qid = "pkmn"+res.id;
			
			var str = "Is it "+(info.nameTable[res.id])+"?";
			if (res.id == this.pokemon.id) {
				var r = __result(qid, 1000, str, "Yes! Congratulations!");
				r.win = true;
				return r;
			} else {
				return __result(qid, res.score, str, "No.");
			}
		}
		return false;
	},
	
	
	"move" : function(from, text, tokens) {
		var self = this;
		
		var confidence = 0;
		var unknownTokens = [];
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (!token) continue;
			if (IGNORE_WORDS_1.test(token)) continue;
			if (/^(learn|know|move|tm)$/i.test(token)) { confidence++; continue; }
			
			unknownTokens.push(token);
		}
		
		var res = __findMove(unknownTokens.join(" "));
		this.logger.guessFnDebug("movefunc", "res =", res);
		if (res) { res.score *= unknownTokens.length; }
		
		// Can't find a proper move, look for bigrams
		if (res == 0 && unknownTokens.length > 2) {
			var ngrams = natural.NGrams.bigrams(unknownTokens);
			for (var i = 0; i < ngrams.length; i++) {
				res = __findMove(ngrams[i].join(" "));
				if (res) { 
					res.score *= ngrams[i].length;
					break;
				}
			}
			this.logger.guessFnDebug("movefunc", "res2 =", res);
		}
		
		// Can't find a proper move still, look for single words
		if (!res && unknownTokens.length > 1) {
			for (var i = 0; i < unknownTokens.length; i++) {
				res = __findMove(unknownTokens[i]);
				if (res) break;
			}
			this.logger.guessFnDebug("movefunc", "res3 =", res);
		}
		if (res) {
			var qid = "move"+res.id;
			
			var str = "Can it learn the move \""+(info.moveTable[res.id])+"\"?";
			for (var i = 0; i < this.pokemon.moves.length; i++) {
				if (res.id == this.pokemon.moves[i].id) {
					return __result(qid, res.score, str, "Yes");
				}
			}
			return __result(qid, res.score, str, "No");
		} else {
			//confidence = was this even my question?			
			return __result("move?", confidence, "I don't know any moves called \""+unknownTokens.join(" ")+"\"");
		}
		return false;
		
		
		function __findMove(conglom){
			return __findInTable(conglom, info.moveTable, info.moveMatchTable);
		}
	},
	
	
	"ability" : function(from, text, tokens) {
		var self = this;
		
		var confidence = 0;
		var unknownTokens = [];
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (!token) continue;
			if (IGNORE_WORDS_1.test(token)) continue;
			if (/^(have|ability)$/i.test(token)) { confidence++; continue; }
			
			unknownTokens.push(token);
		}
		
		var res = __findAbility(unknownTokens.join(" "));
		this.logger.guessFnDebug("abilityfunc", "res =", res);
		if (res) { res.score *= unknownTokens.length; }
		
		// Can't find a proper move, look for bigrams
		if (!res && unknownTokens.length > 2) {
			var ngrams = natural.NGrams.bigrams(unknownTokens);
			for (var i = 0; i < ngrams.length; i++) {
				res = __findAbility(ngrams[i].join(" "));
				if (res) { 
					res.score *= ngrams[i].length;
					break;
				}
			}
			this.logger.guessFnDebug("abilityfunc", "res2 =", res);
		}
		
		// Can't find a proper move still, look for single words
		if (!res && unknownTokens.length > 1) {
			for (var i = 0; i < unknownTokens.length; i++) {
				res = __findAbility(unknownTokens[i]);
				if (res) break;
			}
			this.logger.guessFnDebug("abilityfunc", "res3 =", res);
		}
		if (res) {
			var qid = "abil"+res.id;
			
			var str = "Can it have the ability \""+(info.abilityTable[res.id])+"\"?";
			for (var i = 0; i < this.pokemon.abilities.length; i++) {
				if (res.id == this.pokemon.abilities[i].id) {
					return __result(qid, res.score, str, "Yes");
				}
			}
			return __result(qid, res.score, str, "No");
		} else {
			//confidence = was this even my question?
			return __result("abil?", confidence, "I don't know any abilities called \""+unknownTokens.join(" ")+"\"");
		}
		return false;
		
		
		function __findAbility(conglom){
			return __findInTable(conglom, info.abilityTable, info.abilityMatchTable);
		}
	},
	
	
	"type" : function(from, text, tokens) {
		var self = this;
		
		var singletype = 0;
		var dualtype = 0;
		var typeeffect = 0;
		var describedType = 0;
		var confidence = 0;
		
		parseloop:
		for (var i = 0; i < tokens.length; i++) 
		{
			var token = tokens[i];
			if (!token) continue parseloop; //skip empty words
			if (IGNORE_WORDS_1.test(token)) continue parseloop; //skip unimportant words
			if (/^(type[ds]?|have|moves?|against)$/i.test(token)) continue parseloop;
			
			if (/^(egg)$/i.test(token)) return false; //egg groups should be ignored by this function
			
			if (/^(resist|strong)$/i.test(token)) {
				typeeffect--; continue;
			} else if (/^(weak)$/i.test(token)) {
				typeeffect++;  continue;
			} else if (/^(effect[ia]ve)$/i.test(token)) {
				if (i-2 >= 0 && tokens[i-1] == "very" && tokens[i-2] == "not") {
					typeeffect -= 4;
				} else
				if (i-1 >= 0 && (tokens[i-1] == "super" || tokens[i-1] == "very")) {
					typeeffect += 2;
				} else {
					typeeffect += 1;
				}
				continue;
			} else if (/^(pure|single|one)$/.test(token)) {
				singletype++;  continue;
			} else if (/^(du[ea]l|duo|two)$/.test(token)) {
				dualtype++;  continue;
			} else {
				//Search through our list of types
				for (var j = 1; j < info.typeTable.length; j++) {
					if (info.typeTable[j].regex.test(token)) {
						describedType = j;
						continue parseloop;
					} 
				}
			}
			
			confidence++; //count unknown words
		}
		
		this.logger.guessFnDebug("typefunc", describedType, typeeffect, singletype, dualtype);
		
		//number of known words over number of words
		confidence = ((tokens.length - confidence) / tokens.length) * 5.0; //0.5
		
		if (singletype && !describedType) {
			var score = __result("typesingle", confidence, "", "");
			
			if (self.mode_notypes) {
				score.question = "You are not allowed to ask a question about typing in this challenge mode.";
				score.nomark = true;
				return score;
			}
			
			score.question = "Is it a single type?";
			if (this.pokemon.id == 493) //arceus
				score.answer = "HAHAHAHAHAHAHAHAHAHA!!";
			else if (this.pokemon.type.length == 1)
				score.answer = "Yes";
			else
				score.answer = "No";
			return score;
		}
		
		if (dualtype && !describedType) {
			var score = __result("typedual", confidence, "", "");
		
			if (self.mode_notypes) {
				score.question = "You are not allowed to ask a question about typing in this challenge mode.";
				score.nomark = true;
				return score;
			}
			
			score.question = "Is it a dual type?";
			if (this.pokemon.id == 493) //arceus
				score.answer = "Nah";
			else if (this.pokemon.type.length == 2)
				score.answer = "Yes";
			else
				score.answer = "No";
			return score;
		}
		
		
		if (describedType == 0) return false;
		var score = __result("type"+describedType+typeeffect, confidence, "", "");
		
		if (self.mode_notypes) {
			score.question = "You are not allowed to ask a question about typing in this challenge mode.";
			score.nomark = true;
			return score;
		}

		//If asking only for type
		if (typeeffect == 0) {
			
			score.question = "Is it a "+info.typeTable[describedType].name+"-Type?";
			
			if (this.pokemon.id == 493) { //arceus
				score.answer = "Sometimes";
			} else
			if (this.pokemon.type[0] == describedType ||
				this.pokemon.type[1] == describedType) 
			{
				score.answer = "Yes";
			}
			else if ((this.pokemon.type[0] < 0 || this.pokemon.type[1] < 0) &&
				(this.pokemon.possibleTypes[describedType])) 
			{
				score.answer = "Sometimes";
			}
			else { 
				score.answer = "No";
			}
			return score;
		}
		
		var possibleType = false;
		var effval = 1.0;
		if (this.pokemon.type[0] > 0)
			effval *= info.typeEffectTable[this.pokemon.type[0]][describedType];
		else
			possibleType = true;
		
		if (this.pokemon.type.length > 1)
			if (this.pokemon.type[1] > 0)
				effval *= info.typeEffectTable[this.pokemon.type[1]][describedType];
			else
				possibleType = true;
		
		score.question = "";
		if (typeeffect > 0) score.question += "Is it weak to ";
		else if (typeeffect < 0) score.question += "Does it resist ";
		score.question += info.typeTable[describedType].name + "-Type?";
		
		this.logger.guessFnDebug("typefunc", score.question, possibleType, typeeffect, effval);
		
		if (this.pokemon.id == 493) { //arceus
			score.answer = "Sometimes";
		} else
		if (!possibleType) {
			//can give a definite answer
			if ((typeeffect > 0 && effval > 1.0) || (typeeffect < 0 && effval < 1.0)) {
				if (effval == 0) 
					score.answer = "It is Immune";
				else 
					score.answer = "Yes";
			} else { 
				score.answer = "No";
			}
		} else {
			//Check possible types
			var supere = 0, resist = 0, neutral = 0, immune = 0;
			for (var i = 0; i < this.pokemon.possibleTypes.length; i++) {
				if (this.pokemon.possibleTypes[i]) {
					if (info.typeEffectTable[i][describedType] < 1.0)
						resist++;
					else if (info.typeEffectTable[i][describedType] > 1.0)
						supere++;
					else if (info.typeEffectTable[i][describedType] == 0)
						immune++;
					else
						neutral++;
				}
			}
			if (effval == 0) { immune = 16; }
			if (effval > 1.0) { resist = 0; supere += neutral; } //superE cancels the resists
			if (effval < 1.0) { supere = 0; resist += neutral; } //resist cancels the superEs
			
			if (supere != 0 && (resist != 0 || immune != 0)) {
				score.answer = "Sometimes";
			} else if ((typeeffect > 0 && supere > resist) || (typeeffect < 0 && supere < resist)
				|| (typeeffect == 0 && immune > 0)) {
				score.answer = "Yes";
			} else {
				score.answer = "No";
			}
		}
		return score;
		
		/*
		function __markQuestionChallenge(from, qid) {
			if (!self.mode_notypes) {
				self.markQuestion(from, qid);
				return;
			}
			
			self.markQuestion(from, qid, true);
			self.say(from+": You are not allowed to ask a question about typing in this challenge mode.");
			
			throw "Violated challenge parameters"; //stop processing this question
		}*/
	},
	
	
	"color" : function(from, text, tokens) {
		var self = this;
		
		var unknownTokens = [];
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (!token) continue;
			if (IGNORE_WORDS_1.test(token)) continue;
			
			unknownTokens.push(token);
		}
		
		for (var i = 0; i < unknownTokens.length; i++) {
			var res = __findColor(unknownTokens[i]);
			if (res > 0) break;
		}
		this.logger.guessFnDebug("colorfunc", "res =", res);
		
		var confidence = 1 / unknownTokens.length;
		
		if (res > 0) {
			var qid = "color"+res;
			
			var str = "Is it "+(info.colorTable[res].name)+"?";
			if (this.pokemon.color == res)
				return __result(qid, confidence, str, "Yes");
			else
				return __result(qid, confidence, str, "No");
		}
		return false;

		
		function __findColor(conglom){
			//search the regex list
			for (var i = 0; i < info.colorTable.length; i++) {
				var match = info.colorTable[i];
				if (match && match.regex.test(conglom)) {
					return i;
				}
			}
			return 0;
		}
	},
	
	
	"evolution" : function(from, text, tokens) {
		var self = this;
		
		var confidence = 0;
		
		var has = 0;
		var mega = 0;
		
		var branch = 0;
		var stone = 0;
		var trade = 0;
		for (var i = 0; i < tokens.length; i++) 
		{
			var token = tokens[i];
			if (!token) continue; //skip empty words
			if (IGNORE_WORDS_1.test(token)) continue; //skip unimportant words
			if (/^(type[ds]?|have|moves?|against)$/i.test(token)) continue;
			
			if (/^(evolve|evolutions?)$/i.test(token)) { has++; continue; }
			if (/^(mega)$/i.test(token)) { mega++; continue; }
			
			if (/^(branch)$/i.test(token)) { branch++; continue; }
			if (/^(stone|fire|water|sun)$/i.test(token)) { stone++; continue; }
			if (/^(trade)$/i.test(token)) { trade++; continue; }
			
			confidence++;
		}
		
		confidence = ((tokens.length - confidence) / tokens.length);
		
		if (mega) {
			var q = "Does it have a mega evolution?";
			//TODO
			if (this.pokemon.hasMegaEvo) {
				return __result("mega", confidence, q, "Yes (as of ORAS).");
			} else {
				return __result("mega", confidence, q, "No (as of ORAS).");
			}
		}
		if (has) {
			var q = "Does it evolve?";
			if (this.pokemon.evoLength < 2) {
				return __result("evo", confidence, q, "No.");
			}
			else {
				if (this.pokemon.evoLine == this.pokemon.id) {
					return __result("evo", confidence, q, "Yes, it will evolve.");
				} else {
					return __result("evo", confidence, q, "Yes, it has evolved.");
				}
			}
		}
		if (branch | stone | trade) {
			return __result("evostone", confidence, "I don't know anything about types of evolution yet, sorry.");
		}
		return false;
	},
	
	
	"family" : function(from, text, tokens) {
		var self = this;
		
		var isfamily = false;
		var unknownTokens = [];
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (!token) continue;
			if (IGNORE_WORDS_1.test(token)) continue;
			if (/^(part|of)$/.test(token)) continue;
			if (/^(family|evolution(ary)?|tree|line)$/.test(token)) {
				isfamily = true;
				continue;
			} 
			
			unknownTokens.push(token);
		}
		
		if (!isfamily) return false;
		
		var res = __findPokemon(this, unknownTokens.join(" "));
		this.logger.guessFnDebug("familyfunc", "res =", res);
		if (res) { res.score *= unknownTokens.length; }
		
		if (!res && unknownTokens.length > 1) {
			for (var i = 0; i < unknownTokens.length; i++) {
				res = __findPokemon(this, unknownTokens[i]);
				if (res) break;
			}
			this.logger.guessFnDebug("familyfunc", "res2 =", res);
		}
		
		if (res) {
			var qid = "family"+res;
			
			var str = "Is it part of the "+(info.nameTable[res.id])+" family?";
			if (res.id == this.pokemon.evoLine) {
				return __result(qid, res.score, str, "Yes.");
			} else {
				return __result(qid, res.score, str, "No.");
			}
		}
		return false;
	},
	
	
	"pokedex" : function(from, text, tokens) {
		var self = this;
		
		var isThisQuestion = false;
		var pokedex = -1;
		var generation = -1;
		
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (!token) continue;
			if (IGNORE_WORDS_1.test(token)) continue;
			if (/^(in)$/i.test(token)) continue;
			if (/^(generation|gen|poke(dex)?)$/i.test(token)) {
				isThisQuestion = true;
				continue;
			} 
			if (/^(1st|1|first)$/i.test(token))  { generation = 1; continue; }
			if (/^(2nd|2|second)$/i.test(token)) { generation = 2; continue; }
			if (/^(3rd|3|third)$/i.test(token))  { generation = 3; continue; }
			if (/^(4th|4|fourth)$/i.test(token)) { generation = 4; continue; }
			if (/^(5th|5|fifth)$/i.test(token))  { generation = 5; continue; }
			if (/^(6th|6|sixth)$/i.test(token))  { generation = 6; continue; }
			
			if (/^(national)$/i.test(token)) { pokedex = 0; isThisQuestion = true; continue; }
			if (/^(kanto)$/i.test(token)) { pokedex = 1; isThisQuestion = true; continue; }
			if (/^(johto)$/i.test(token)) { pokedex = 2; isThisQuestion = true; continue; }
			if (/^(hoenn)$/i.test(token)) { pokedex = 3; isThisQuestion = true; continue; }
			if (/^(sinnoh)$/i.test(token)){ pokedex = 4; isThisQuestion = true; continue; }
			if (/^(unova)$/i.test(token)) { pokedex = 5; isThisQuestion = true; continue; }
			if (/^(kalos)$/i.test(token)) { pokedex = 6; isThisQuestion = true; continue; }
		}
		
		this.logger.guessFnDebug("pokedexfunc", isThisQuestion, pokedex, generation);
		if (!isThisQuestion) return false;
		
		if (pokedex > -1) {
			var qid = "pokedex"+pokedex;
			
			var str = "Is it in "+(pokedex > 3 ? "a ":"the ")+(info.pokedexTable[pokedex])+" pokedex?";
			if (pokedex == 0) {
				var s = __result(qid, 1, str, "...Obviously.");
				s.nomark = true;
				return s;
			} else if (this.pokemon.dexes[pokedex]) {
				return __result(qid, 1, str, "Yes.");
			} else {
				return __result(qid, 1, str, "No.");
			}
		}
		
		if (generation > -1) {
			var qid = "generation"+generation;
			
			var isyes = false;
			var str = "Is it a ";
			switch (generation) {
				case 1: 
					str += "first";
					isyes = (this.pokemon.id >=   1 && this.pokemon.id <= 151);
					break;
				case 2: 
					str += "second";
					isyes = (this.pokemon.id >= 152 && this.pokemon.id <= 251);
					break;
				case 3: 
					str += "third";
					isyes = (this.pokemon.id >= 252 && this.pokemon.id <= 386);
					break;
				case 4: 
					str += "fourth";
					isyes = (this.pokemon.id >= 387 && this.pokemon.id <= 493);
					break;
				case 5: 
					str += "fifth";
					isyes = (this.pokemon.id >= 494 && this.pokemon.id <= 649);
					break;
				case 6: 
					str += "sixth";
					isyes = (this.pokemon.id >= 650 && this.pokemon.id <= 720);
					break;
			}
			str += " generation pokemon?";
			return __result(qid, 10, str, (isyes)?"Yes.":"No.");
		}
	},
	
	
	"booleans" : function(from, text, tokens) {
		var self = this;
		
		var fossil = false;
		var legendary = false;
		
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (!token) continue;
			if (IGNORE_WORDS_1.test(token)) continue;
			if (/^(from)$/.test(token)) continue;
			if (/^(legendary)$/.test(token)) {
				legendary = true;
				continue;
			} 
			if (/^(revived|fossil)$/.test(token)) {
				fossil = true;
				continue;
			} 
		}
		
		if (legendary) {
			var str = "Is it a legendary pokemon?";
			var isyes = false;
			for (var i = 0; i < info.legendaryTable.length; i++) {
				if (this.pokemon.id == info.legendaryTable[i]) {
					isyes = true; break;
				}
			}
			if (isyes)
				return __result("legendary", 10, str, "Yes.");
			else
				return __result("legendary", 10, str, "No.");
		}
		
		if (fossil) {
			var str = "Is it a fossil pokemon?";
			var isyes = false;
			for (var i = 0; i < info.fossilTable.length; i++) {
				if (this.pokemon.id == info.fossilTable[i]) {
					isyes = true; break;
				}
			}
			if (isyes)
				return __result("fossil", 10, str, "Yes.");
			else
				return __result("fossil", 10, str, "No.");
		}
	},
	
	
	"size" : function(from, text, tokens) {
		var self = this;
		
		function _retokenize(text) {
			if (!this.retokenizer)  {
				this.retokenizer = new natural.TreebankWordTokenizer();
			}
			return this.retokenizer.tokenize(text);
		}
		
		//retokenize due to number literals
		tokens = _retokenize(text);
		
		var isThisQuestion = false;
		var wrongScaleErr = false;
		var sizeLiteral = -1;
		var sizeCompareWord = "as";
		var sizeCompare = 0;
		var unknownTokens = [];
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (!token) continue;
			if (IGNORE_WORDS_1.test(token)) continue;
			if (/^[?.,!]+$/.test(token)) continue;
			
			if (/^(as)$/.test(token)) { sizeCompare *= 0; sizeCompareWord = "as"; continue; }
			if (/^(th[ae]n)$/.test(token)) { sizeCompare *= 2; sizeCompareWord = "than"; continue; }
			if (/^(meters?|m|h(ei|ie)ght|size)$/.test(token)) { isThisQuestion = true; continue; }
			if (/^(same)$/.test(token)) { sizeCompare = 0; continue; }
			if (/^(taller|tall|bigger|big|\>)$/.test(token)) { isThisQuestion = true; sizeCompare++; continue; }
			if (/^(shorter|short|smaller|small|\<)$/.test(token)) { isThisQuestion = true; sizeCompare--; continue; }
			
			if (/['"]|\b(inch|inches|feet|foot|centimeters|cm)\b/.test(token)) {
				wrongScaleErr = true;
				continue;
			}
			
			var res;
			if ((res = /^([\>|\<|\=]?)([0-9]+(?:\.[0-9]+)?)(m|meters?)?$/.exec(token))) {
				sizeLiteral = res[2] * 10;
				isThisQuestion |= !!res[3];
				switch (res[1]) {
					case ">" : sizeCompare++; break;
					case "<" : sizeCompare--; break;
					case "=" : sizeCompare = 0; break;
				}
				continue;
			}
			
			unknownTokens.push(token);
		}
		
		this.logger.guessFnDebug("sizefunc", "comp=",sizeCompare, "lit=",sizeLiteral, "wrong=", wrongScaleErr, "ukn=", unknownTokens);
		
		if (!isThisQuestion) return false;
		
		if (sizeLiteral > 0) {
			var qid = "sizecomp"+sizeCompare+sizeLiteral+wrongScaleErr;
			if (wrongScaleErr) {
				return __result(qid, 1, "I only work in meters for height comparisons.");
			}
			
			//testing against a literal number
			var isyes = false;
			var say = "Is it ";
			if (sizeCompare > 0) {
				say += "taller than "+(sizeLiteral / 10)+"m?";
				isyes = (this.pokemon.height > sizeLiteral);
			} else if (sizeCompare < 0) {
				say += "shorter than "+(sizeLiteral / 10)+"m?";
				isyes = (this.pokemon.height < sizeLiteral);
			} else {
				say += (sizeLiteral / 10)+"m tall?";
				isyes = (this.pokemon.height == sizeLiteral);
			}
			
			return __result(qid, 10, say, (isyes)?"Yes.":"No.");
		}
		
		if (unknownTokens.length > 0) {
			var size = __findSizeOf(this, unknownTokens.join(" "));
			if (size) {
				var qid = "sizecomp"+sizeCompare+size.name;
				
				var isyes = false;
				var say = "Is it ";
				if (sizeCompare > 0) {
					say += "taller than "+size.name+" (~"+(size.size / 10)+"m)?";
					isyes = (this.pokemon.height > size.size);
				} else if (sizeCompare < 0) {
					say += "shorter than "+size.name+" (~"+(size.size / 10)+"m)?";
					isyes = (this.pokemon.height < size.size);
				} else {
					say += "the same size as "+size.name+" (~"+(size.size / 10)+"m)?";
					isyes = (this.pokemon.height == size.size);
				}
				
				return __result(qid, 5, say, (isyes)?"Yes.":"No.");
			}
			
			
			//// Try pokemon now
			
			var res = __findPokemon(this, unknownTokens.join(" "));
			this.logger.guessFnDebug("sizefunc", "res =", res);
			
			if (!res && unknownTokens.length > 1) {
				for (var i = 0; i < unknownTokens.length; i++) {
					res = __findPokemon(this, unknownTokens[i]);
					if (res) break;
				}
				this.logger.guessFnDebug("sizefunc", "res2 =", res);
			}
			
			if (res) {
				var qid = "sizecomp"+sizeCompare+res.id;
				
				//testing against a pokemon
				var isyes = false;
				var say = "Is it ";
				if (sizeCompare > 0) {
					say += "taller than "+(info.nameTable[res.id])+"?";
					isyes = (this.pokemon.height > info.pokeInfoTable[res.id].height);
				} else if (sizeCompare < 0) {
					say += "shorter than "+(info.nameTable[res.id])+"?";
					isyes = (this.pokemon.height < info.pokeInfoTable[res.id].height);
				} else {
					say += "the same size as "+(info.nameTable[res.id])+"?";
					isyes = (this.pokemon.height == info.pokeInfoTable[res.id].height);
				}
				
				return __result(qid, res.score, say, (isyes)?"Yes.":"No.");
			} else {
				return __result("sizecomp?", 0.5, "I don't know the size of '"+unknownTokens.join(" ")+"'.");
			}
		}
		return __result("sizecomp?", 0.5, "I didn't quite understand that size comparison question.");
		
		
		function __findSizeOf(self, conglom) {
			switch (true) {
				case (/hum[ao]n|person|trainer|man|woman|boy|girl/i.test(conglom)):
					return { name: "an average person", size: 16 };
				case (/house|home/i.test(conglom)):
					return { name: "a 2-story house", size: 76 };
				case (/bread(box)?|loaf/.test(conglom)):
					return { name: "a breadbox", size: 3 };
				case (/penis/.test(conglom)):
					return { name: "your penis", size: 0.1 };
			}
			return null;
		}
	},
	
	
	"weight" : function(from, text, tokens) {
		var self = this;
		
		function _retokenize(text) {
			if (!this.retokenizer)  {
				this.retokenizer = new natural.TreebankWordTokenizer();
			}
			return this.retokenizer.tokenize(text);
		}
		
		//retokenize due to number literals
		tokens = _retokenize(text);
		
		var isThisQuestion = false;
		var wrongScaleErr = false;
		var sizeLiteral = -1;
		var sizeCompareWord = "as";
		var sizeCompare = 0;
		var unknownTokens = [];
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (!token) continue;
			if (IGNORE_WORDS_1.test(token)) continue;
			if (/^[?.,!]+$/.test(token)) continue;
			if (/^(much)$/.test(token)) continue;
			
			if (/^(as)$/.test(token)) { sizeCompare *= 0; sizeCompareWord = "as"; continue; }
			if (/^(th[ae]n)$/.test(token)) { sizeCompare *= 2; sizeCompareWord = "than"; continue; }
			if (/^(kilo(gram)?s?|kg|w(ei|ie)gh|mass)$/.test(token)) { isThisQuestion = true; continue; }
			if (/^(same)$/.test(token)) { sizeCompare = 0; continue; }
			if (/^(heavier|heavy|more|\>)$/.test(token)) { isThisQuestion = true; sizeCompare++; continue; }
			if (/^(lighter|light|less|\<)$/.test(token)) { isThisQuestion = true; sizeCompare--; continue; }
			
			if (/\b(lbs|lb|pounds|grams)\b/.test(token)) {
				wrongScaleErr = true;
				continue;
			}
			
			var res;
			if ((res = /^([\>|\<|\=]?)([0-9]+(?:\.[0-9]+)?)(kg|kilos?|kilograms?)?$/.exec(token))) {
				sizeLiteral = res[2] * 10;
				isThisQuestion |= !!res[3];
				switch (res[1]) {
					case ">" : sizeCompare++; break;
					case "<" : sizeCompare--; break;
					case "=" : sizeCompare = 0; break;
				}
				continue;
			}
			
			unknownTokens.push(token);
		}
		
		this.logger.guessFnDebug("weightfunc", "comp=",sizeCompare, "lit=",sizeLiteral, "wrong=", wrongScaleErr, "ukn=", unknownTokens);
		
		if (!isThisQuestion) return false;
		
		if (sizeLiteral > 0) {
			var qid = "weightcomp"+sizeCompare+sizeLiteral+wrongScaleErr;
			if (wrongScaleErr) {
				return __result(qid, 1, "I only work in kilograms for weight comparisons.");
			}
			
			//testing against a literal number
			var isyes = false;
			var say = "Is it ";
			if (sizeCompare > 0) {
				say += "heavier than "+(sizeLiteral / 10)+"kg?";
				isyes = (this.pokemon.weight > sizeLiteral);
			} else if (sizeCompare < 0) {
				say += "lighter than "+(sizeLiteral / 10)+"kg?";
				isyes = (this.pokemon.weight < sizeLiteral);
			} else {
				say = "Does it weigh "+ (sizeLiteral / 10)+"kg?";
				isyes = (this.pokemon.weight == sizeLiteral);
			}
			
			return __result(qid, 5, say, (isyes)?"Yes.":"No.");
		}
		
		if (unknownTokens.length > 0) {
			var size = __findSizeOf(this, unknownTokens.join(" "));
			if (size) {
				var qid = "weightcomp"+sizeCompare+size.name;
				
				var isyes = false;
				var say = "Is it ";
				if (sizeCompare > 0) {
					say += "heavier than "+size.name+" (~"+(size.size / 10)+"kg)?";
					isyes = (this.pokemon.weight > size.size);
				} else if (sizeCompare < 0) {
					say += "lighter than "+size.name+" (~"+(size.size / 10)+"kg)?";
					isyes = (this.pokemon.weight < size.size);
				} else {
					say = "Does it weight the same as "+size.name+" (~"+(size.size / 10)+"kg)?";
					isyes = (this.pokemon.weight == size.size);
				}
				
				return __result(qid, 5, say, (isyes)?"Yes.":"No.");
			}
			
			
			//// Try pokemon now
			
			var res = __findPokemon(this, unknownTokens.join(" "));
			this.logger.guessFnDebug("weightfunc", "res =", res);
			
			if (!res && unknownTokens.length > 1) {
				for (var i = 0; i < unknownTokens.length; i++) {
					res = __findPokemon(this, unknownTokens[i]);
					if (res) break;
				}
				this.logger.guessFnDebug("weightfunc", "res2 =", res);
			}
			
			if (res) {
				var qid = "weightcomp"+sizeCompare+res.id;
				
				//testing against a pokemon
				var isyes = false;
				var say = "Is it ";
				if (sizeCompare > 0) {
					say += "heavier than "+(info.nameTable[res.id])+"?";
					isyes = (this.pokemon.weight > info.pokeInfoTable[res.id].weight);
				} else if (sizeCompare < 0) {
					say += "lighter than "+(info.nameTable[res.id])+"?";
					isyes = (this.pokemon.weight < info.pokeInfoTable[res.id].weight);
				} else {
					say = "Does it weight the same as "+(info.nameTable[res.id])+"?";
					isyes = (this.pokemon.weight == info.pokeInfoTable[res.id].weight);
				}
				
				return __result(qid, res.score, say, (isyes)?"Yes.":"No.");
			} else {
				return __result("weightcomp?", 0.5, "I don't know the weight of '"+unknownTokens.join(" ")+"'.");
			}
		}
		return __result("weightcomp?", 0.5, "I didn't quite understand that weight comparison question.");
		
		
		function __findSizeOf(self, conglom) {
			switch (true) {
				case (/hum[ao]n|person|trainer|man|woman|boy|girl/i.test(conglom)):
					return { name: "an average person", size: 66 };
				case (/car|vehicle|truck|van/i.test(conglom)):
					return { name: "a car", size: 1800 };
				case (/bread(box)?|loaf/.test(conglom)):
					return { name: "breadbox", size: 3 };
			}
			return null;
		}
	},
	
	
	"habitat" : function(from, text, tokens) {
		return false;//"The habitat parsing function hasn't been implemented yet.";
		
		var self = this;
		
		var ishabitat = false;
		var unknownTokens = [];
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (!token) continue;
			if (IGNORE_WORDS_1.test(token)) continue;
			if (/^(does|along|in|around)$/.test(token)) continue;
			if (/^(live|habitat)$/.test(token)) {
				ishabitat = true;
				continue;
			} 
			
			unknownTokens.push(token);
		}
		
		if (!ishabitat) return false;
	},
	
	"stats" : function(from, text, tokens) {
		return false;//"The stats parsing function hasn't been implemented yet.";
	},
	
	"body" : function(from, text, tokens) {
		return false;//"The body parsing function hasn't been implemented yet.";
	},
	
	"egg" : function(from, text, tokens) {
		return false;//"The egg parsing function hasn't been implemented yet.";
	},
	
	"mating" : function(from, text, tokens) {
		return false;//"The mating parsing function hasn't been implemented yet.";
	},
	
}

module.exports = Game;