// game.js
// for the Pokemon 20 Q Bot
console.log("Loading Module digigame.js");

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
const LIMITED_CHANNELS = ["#TPPTableTop"];

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
	"?is it Agumon?", "?is it Patamon", "?is it Gatomon?",
	"?is it Wargreymon?", "?is it Creepymon", "?is it Terriermon?",
	"?is it Renamon?", "?is it Veemon", "?is it Salamon?",
	"?is it Tentomon?",  "?is it Palmon?",  "?is it Wormmon?",
	"?is it Gabumon?",  "?is it Impmon?",  "?is it Digmon?",
	"?is it Gomamon?",  "?is it Angewomon?", "?is it Aegiochusmon?",
	"?is it Babydmon?", "?is it Babamon?", "?is it Gazimon?",
	"?is it Junomon?", "?is it Kenkimon?", "?is it Leomon?",
	// "?can it have sturdy", "?does it have the ability sand veil", "?could it have the ability volt absorb?",
	// "?is it a fire type", "?is it weak to ice?", "?does it resist water?", "?is it dual typed",
	// "?is it part of the eevee family?", "?is it in the ralts evolutionary line",
	// "?can it learn flamethrower", "?can it learn Ice Beam?", "?does it learn trick room",
	// "?is it taller than 2 meters", "?is it shorter than a house?", "?is it smaller than pikachu?",
	// "?is it bigger than 5m?",
	// "?is it a legendary", "?is it a fossil pokemon?",
	// "?is it blue?", "?is it red", 
	// "?can it evolve", "?can it mega evolve?",
	// "?is it in the kanto pokedex?", "?is it in the national pokedex", "?is it in the fifth gen?",
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
		
		this.time_start = this.time_lastguess = new Date().getTime();
		
		if (!info.ready) {
			this.say("I cannot start a new game at this time. Please try again in a moment.");
		}
		
		var pid = Math.floor(Math.random() * info.numPokemon)+1;
		
		this.say(irc.colors.wrap("dark_blue", "I am thinking of a digimon.") +" Try and guess it! Ask me yes or no question!");
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
			if (str) this.say(str);
		}
		
		this.pokemon = {};
		var self = this;
	},
	
	endGame : function(winner, silent) { //if winner == null, game is lost
		if (typeof winner == "string") {
			if (!silent)
				this.say(irc.colors.wrap("dark_green","The digimon I was thinking of was "+this.pokemon.name+".") + " Congrats to "+
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
				this.say("I will stop this game then.");
			} else {
				this.say("I'm sorry friends but I have been told to "+action+" by "+nick
					+"." );
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
	
	var tokens = tokenizer.tokenize(text);
	if (!tokens || tokens.length == 0) return; //ignore empty tokens list
	var data = classifier.getClassifications(text);
	
	this.time_lastguess = new Date().getTime();
	
	var res;
	var scores = [];
	res = Game.fn.parseQuestionFunctions["pokemon"].call(this, from, text, tokens);
	if (res) {
		// console.log(res.score, data[i].value);
		res.score *= data[0].value;
		scores.push(res);
		// if (typeof(res) == "string") {
		// 	//only grab the first error, since it should be the best
		// 	if (!bestErr) bestErr = res;
		// 	res = undefined;
		// 	continue;
		// }
		// break;
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
		
		var monname = unknownTokens.join(" ");
		var qid = "pkmn"+monname;
		
		var str = "Is it "+monname+"?";
		if (/mon$/i.test(monname.trim())) {
			if (/pok[eé]mon$/i.test(monname.trim())) 
			{
				return __result(qid, 100, str, "N-No, DIGIMON! Not Pokémon...");
			}
			
			var r = __result(qid, 1000, str, "Yes! Congratulations!");
			r.win = true;
			this.pokemon.name = monname;
			return r;
		} else {
			return __result(qid, 100, str, "No.");
		}
	},
	
}

module.exports = Game;