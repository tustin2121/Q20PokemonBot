// debug-console.js
// For debugging to the console, when webkit isn't available.

var _	= require("underscore");
var util= require("util");

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
	
	lossPokemon : function() {
		console.log("-------------- GAME END ---------------");
	},
	winPokemon : function(winner) {
		console.log("WINNAR:", winner);
		console.log("-------------- GAME END ---------------");
	},
	
	gamePaused : function(paused) {
		console.log("Mode +m has been set:", paused);
	},
	gameTimedOut : function() {
		console.log("Game has timed out.");
	},
	
	/////////// Bans //////////////
	reportUserBanning : function(user, reason) {
		console.log("User", user, "has been banned:", reason);
	},
	logBannedUser : function(from){
		console.log("User",from,"found in banlist!");
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
		// console.log(data.label);
	},
	
	guessFnDebug: function(fnName) {
		var args = _.toArray(arguments).slice(1);
		args.unshift("["+fnName+"]");
		console.log.apply(console, args);
	},
	
	guessFnEnd: function(data, result) {
		// console.log(data.label);
	},
};