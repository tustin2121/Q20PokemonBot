// logger.js
// For logging games in channels

var _	= require("underscore");
var util= require("util");
var fs  = require("fs");
var extend = require("extend");

const LOGDIR = "logs/";
const MAX_LOGS = 9;
function rotateLogs(filename, tries) {
	safely(function(){
		for (var i = MAX_LOGS; i > 0; i--) {
	        if (fs.existsSync(LOGDIR+filename+"."+(i-1)+".log"))
	            fs.renameSync(LOGDIR+filename+"."+(i-1)+".log", LOGDIR+filename+"."+(i)+".log");
	    }
	    // if (fs.existsSync(LOGDIR+filename+".log"))
    	fs.linkSync(LOGDIR+filename+".log", LOGDIR+filename+".0.log");
	}, function(){
		if (tries > 0) {
			console.error("FAILED TO ROTATE LOGS! Retrying ("+tries+") in 1 second!");
			setTimeout(function(){
		    	rotateLogs(filename, tries-1);
		    }, 1000);
		} else {
			console.error("FAILED TO ROTATE LOGS! Retires expired! No logs for the game "+filename+"!");
		}
	});
}

function Logger(filename) {
    if (!(this instanceof Logger))
        return new Logger(filename);
   	
    this.filename = LOGDIR+filename+".log";
    this.out = fs.createWriteStream(this.filename);
    
    setTimeout(function(){
    	rotateLogs(filename, 3);
    }, 0);
}
extend(Logger.prototype, {
    filename: null,
    out: null,
    
    log : function(str){
		this.out.write(str+"\n");
	},
	
	error : function(str){
		this.out.write(str+"\n");
	},
	
	ircError : function(msg) {
		this.out.write(msg+"\n");
	},
	
	close : function() {
	    this.out.end();
	    fs.unlinkSync(this.filename);
	},
	
	//////////// Channels ///////////////////
	joinedChannel : function(channel) {},
	partedChannel : function(channel) {},
	
	newPokemon : function() {
		this.out.write("-------------- NEW GAME ---------------\n");
	},
	updatePokemon : function(pkmn) {
		this.out.write(util.inspect(pkmn)+"\n");
	},
	
	lossPokemon : function() {
		this.out.write("-------------- GAME END ---------------\n");
	},
	winPokemon : function(winner) {
		this.out.write("WINNAR: "+winner+"\n");
		this.out.write("-------------- GAME END ---------------\n");
	},
	
	gamePaused : function(paused) {
		this.out.write("Mode +m has been set: "+paused+"\n");
	},
	gameTimedOut : function() {
		this.out.write("Game has timed out.\n");
	},
	
	/////////// Bans //////////////
	reportUserBanning : function(user, reason) {
		this.out.write("User "+user+" has been banned: "+ reason+"\n");
	},
	logBannedUser : function(from){
		this.out.write("User "+from+" found in banlist!\n");
	},
	
	
	/////////// Guess Inspection ////////////
	guessBegin: function(from, text) {
		this.out.write("-------------- Guess ---------------\n");
		this.out.write(from+" > "+text+"\n");
	},
	
	guessClassifications: function(data) {
		this.out.write(util.inspect(data)+"\n");
	},
	
	
	guessFnBegin: function(data) {
		// console.log(data.label);
	},
	
	guessFnDebug: function(fnName) {
		var args = _.toArray(arguments).slice(1);
		args.unshift("["+fnName+"]");
		this.out.write(args.join(" ")+"\n");
	},
	
	guessFnEnd: function(data, result) {
		// console.log(data.label);
	},
});

module.exports = Logger;
