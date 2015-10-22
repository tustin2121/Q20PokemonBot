// debug-webkit.js
// For debugging to a webkit window

var _	= require("underscore");



module.exports = {
	log : function(str){
		console.log(str);
	},
	
	error : function(str){
		console.error(str);
	},
	
	ircError : function(msg) {
		console.log(msg);
	},
	
	//////////// Channels ///////////////////
	joinedChannel : function(channel) {},
	partedChannel : function(channel) {},
	
	newPokemon : function() {
		console.log("-------------- NEW GAME ---------------");
	},
	updatePokemon : function(pkmn) {
		console.log(util.inspect(pkmn));
	},
	
	winPokemon : function(winner) {
		console.log("WINNAR:", winner);
		console.log("-------------- GAME END ---------------");
	},
	
	logBannedUser : function(from){
		console.log("User",from,"found in banlist!");
	},
	
	gamePaused : function(paused){
		console.log("Mode +m has been set:", paused);
	},
	gameTimedOut : function() {
		console.log("Game has timed out.");
	},
	
	
	/////////// Guess Inspection ////////////
	guessBegin: function(from, text) {
		console.log("-------------- Guess ---------------");
		console.log(from, ">", text);
	},
	
	guessClassifications: function(data) {
		console.log(util.inspect(data));
	},
	
	
	guessFnBegin: function(data) {
		console.log(data.label);
	},
	
	guessFnDebug: function(fnName) {
		var args = _.toArray(arguments).slice(1);
		args.push("["+fnName+"]");
		console.log.apply(console, args);
	},
	
	guessFnEnd: function(data, result) {
		console.log(data.label);
	},
};