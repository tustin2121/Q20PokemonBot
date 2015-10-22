// trainer.js
// Trainer for the Classifier

var sql = require("sqlite3");
var natural  = require("natural");

// var classifier = new natural.LogisticRegressionClassifier();
var classifier = new natural.BayesClassifier();

classifier.events.on('trainedWithDocument', function (obj) {
	if (obj.total - 1 == obj.index)
		console.log("Trained with", obj.total, "documents.");
});


// Phrases that don't need the database:
(function(){
	const CLASSID = "type";
	
	classifier.addDocument("is it a fire-type?", CLASSID);
	classifier.addDocument("is it a water type?", CLASSID);
	classifier.addDocument("is it flying type?", CLASSID);
	classifier.addDocument("is it fire typed?", CLASSID);
	
	classifier.addDocument("is it weak to fire?", CLASSID);
	classifier.addDocument("is it weak to flying?", CLASSID);
	classifier.addDocument("is it weak to ground-type moves?", CLASSID);
	classifier.addDocument("is it weak to psyhcic-type moves?", CLASSID);
	classifier.addDocument("are fire type moves super effective against it?", CLASSID);
	classifier.addDocument("is water super effective against it?", CLASSID);
	
	classifier.addDocument("does it resist fire?", CLASSID);
	classifier.addDocument("does it resist normal type moves?", CLASSID);
	classifier.addDocument("does it resist water?", CLASSID);
	classifier.addDocument("are fire type moves not very effective against it?", CLASSID);
	classifier.addDocument("is water not very effective against it?", CLASSID);
	
	classifier.addDocument("is it a pure type?", CLASSID);
	classifier.addDocument("is it pure water type?", CLASSID);
	classifier.addDocument("it it single typed?", CLASSID);
	classifier.addDocument("it it duel typed?", CLASSID);
	classifier.addDocument("does it have one type?", CLASSID);
	classifier.addDocument("does it have two types?", CLASSID);
	
	classifier.addDocument("normal", CLASSID);
	classifier.addDocument("fighting", CLASSID);
	classifier.addDocument("flying", CLASSID);
	classifier.addDocument("poison", CLASSID);
	classifier.addDocument("ground", CLASSID);
	classifier.addDocument("rock", CLASSID);
	classifier.addDocument("bug", CLASSID);
	classifier.addDocument("ghost", CLASSID);
	classifier.addDocument("steel", CLASSID);
	classifier.addDocument("fire", CLASSID);
	classifier.addDocument("water", CLASSID);
	classifier.addDocument("grass", CLASSID);
	classifier.addDocument("electric", CLASSID);
	classifier.addDocument("psychic", CLASSID);
	classifier.addDocument("ice", CLASSID);
	classifier.addDocument("dragon", CLASSID);
	classifier.addDocument("dark", CLASSID);
	classifier.addDocument("fairy", CLASSID);
	
	classifier.addDocument("super effective", CLASSID);
	classifier.addDocument("not very effective", CLASSID);
})();

(function(){
	const CLASSID = "color";
	
	classifier.addDocument("is it blue?", CLASSID);
	classifier.addDocument("is it green?", CLASSID);
	classifier.addDocument("is it red?", CLASSID);
	classifier.addDocument("is it orange?", CLASSID);
	
	classifier.addDocument("black", CLASSID);
	classifier.addDocument("blue", CLASSID);
	classifier.addDocument("brown", CLASSID);
	classifier.addDocument("gray", CLASSID);
	classifier.addDocument("gray", CLASSID);
	classifier.addDocument("green", CLASSID);
	classifier.addDocument("pink", CLASSID);
	classifier.addDocument("purple", CLASSID);
	classifier.addDocument("violet", CLASSID);
	classifier.addDocument("red", CLASSID);
	classifier.addDocument("white", CLASSID);
	classifier.addDocument("yellow", CLASSID);
})();

(function(){
	const CLASSID = "habitat";
	
	classifier.addDocument("does it live in a cave?", CLASSID);
	classifier.addDocument("does it live in a forest?", CLASSID);
	classifier.addDocument("does it live on the grasslands?", CLASSID);
	classifier.addDocument("does it live in the plains?", CLASSID);
	classifier.addDocument("does it live on a savanna?", CLASSID);
	classifier.addDocument("is its habitat in the oceans?", CLASSID);
	classifier.addDocument("is its habitat in the mountains?", CLASSID);
	classifier.addDocument("does it live in an urban environment?", CLASSID);
	classifier.addDocument("does it live in the city?", CLASSID);
	classifier.addDocument("does it live in towns?", CLASSID);
	classifier.addDocument("does it live on rough terrain?", CLASSID);
	classifier.addDocument("does it live along the water's edge?", CLASSID);
	
	classifier.addDocument("woods", CLASSID);
	classifier.addDocument("rare", CLASSID);
	classifier.addDocument("sea", CLASSID);
	classifier.addDocument("salt water", CLASSID);
	classifier.addDocument("river", CLASSID);
	classifier.addDocument("stream", CLASSID);
	classifier.addDocument("lake", CLASSID);
	classifier.addDocument("fresh water", CLASSID);
})();

(function(){
	const CLASSID = "stats";
	
	classifier.addDocument("is its hp greater than 50?", CLASSID);
	classifier.addDocument("does it have more than 100 attack?", CLASSID);
	classifier.addDocument("does it have less than 75 special attack?", CLASSID);
	classifier.addDocument("is its stat total less than 500?", CLASSID);
	
	classifier.addDocument("hp", CLASSID);
	classifier.addDocument("hit points", CLASSID);
	classifier.addDocument("atk", CLASSID);
	classifier.addDocument("attack", CLASSID);
	classifier.addDocument("def", CLASSID);
	classifier.addDocument("defense", CLASSID);
	classifier.addDocument("spatk", CLASSID);
	classifier.addDocument("special attack", CLASSID);
	classifier.addDocument("spdef", CLASSID);
	classifier.addDocument("special defense", CLASSID);
	classifier.addDocument("spd", CLASSID);
	classifier.addDocument("speed", CLASSID);
	classifier.addDocument("total", CLASSID);
	classifier.addDocument("base stat total", CLASSID);
	classifier.addDocument("bst", CLASSID);
	classifier.addDocument("stats", CLASSID);
})();

(function(){
	const CLASSID = "body";
	
	classifier.addDocument("does it have wings?", CLASSID);
	classifier.addDocument("does it have legs?", CLASSID);
	classifier.addDocument("does it have feet?", CLASSID);
	classifier.addDocument("does it have hands?", CLASSID);
	classifier.addDocument("is it a quadraped?", CLASSID);
	classifier.addDocument("is it insectoid?", CLASSID);
	classifier.addDocument("does it have tentacles?", CLASSID);
	classifier.addDocument("does it have multiple bodies?", CLASSID);
	classifier.addDocument("does it have four legs?", CLASSID);
	classifier.addDocument("does it have a tail?", CLASSID);
	classifier.addDocument("does it have multiple heads?", CLASSID); //special handling? dutrio
	classifier.addDocument("does it own a tail?", CLASSID);
	classifier.addDocument("is it tailless?", CLASSID);
	classifier.addDocument("does it own arms?", CLASSID);
})();

(function(){
	const CLASSID = "evolution";
	
	classifier.addDocument("does it evolve?", CLASSID);
	classifier.addDocument("can it evolve?", CLASSID);
	classifier.addDocument("how many evolutions does it have?", CLASSID);
	classifier.addDocument("can it mega evolve?", CLASSID);
	classifier.addDocument("does it have a mega evolution?", CLASSID);
})();

(function(){
	const CLASSID = "egg";
	
	classifier.addDocument("is it part of the monster egg group?", CLASSID);
	classifier.addDocument("is it in the flying egg group?", CLASSID);
	classifier.addDocument("is it in the human-like egg group?", CLASSID);
	
	classifier.addDocument("Monster", CLASSID);
	classifier.addDocument("Water 1", CLASSID);
	classifier.addDocument("Bug", CLASSID);
	classifier.addDocument("Flying", CLASSID);
	classifier.addDocument("Field", CLASSID);
	classifier.addDocument("Fairy", CLASSID);
	classifier.addDocument("Grass", CLASSID);
	classifier.addDocument("Human-Like", CLASSID);
	classifier.addDocument("Water 3", CLASSID);
	classifier.addDocument("Mineral", CLASSID);
	classifier.addDocument("Amorphous", CLASSID);
	classifier.addDocument("Water 2", CLASSID);
	classifier.addDocument("Ditto", CLASSID);
	classifier.addDocument("Dragon", CLASSID);
	classifier.addDocument("Undiscovered", CLASSID);
})();

(function(){
	const CLASSID = "mating";
	
	classifier.addDocument("can it mate with ditto?", CLASSID);
	classifier.addDocument("can it make an egg with vileplume?", CLASSID);
	classifier.addDocument("can it have sex with growlithe?", CLASSID);
	classifier.addDocument("can it make a baby with ditto?", CLASSID);
})();

(function(){
	const CLASSID = "booleans";
	
	classifier.addDocument("is it a fossil?", CLASSID);
	classifier.addDocument("is it a fossil pokemon?", CLASSID);
	classifier.addDocument("can it be revived from a fossil?", CLASSID);
	classifier.addDocument("is it a legendary?", CLASSID);
	classifier.addDocument("is it a legendary pokemon?", CLASSID);
	
})();

(function(){
	const CLASSID = "family";
	
	classifier.addDocument("is it part of the squirtle family?", CLASSID);
	classifier.addDocument("it is in the pikachu evolutionary line?", CLASSID);
	classifier.addDocument("is it part of the eevee family tree?", CLASSID);
})();

(function(){
	const CLASSID = "size";
	
	classifier.addDocument("is it taller than 5 meters?", CLASSID);
	classifier.addDocument("it is shorter than a human?", CLASSID);
	classifier.addDocument("is it as tall as a pikachu?", CLASSID);
	classifier.addDocument("is it smaller than 6.5m?", CLASSID);
	classifier.addDocument("is it bigger than a zigzagoon?", CLASSID);
	classifier.addDocument("is it the same height as a person?", CLASSID);
	classifier.addDocument("is it the same size as joltik?", CLASSID);
	
	classifier.addDocument("< 5m", CLASSID);
	classifier.addDocument(">2.5m", CLASSID);
	classifier.addDocument("= 1.4m", CLASSID);
})();

(function(){
	const CLASSID = "weight";
	
	classifier.addDocument("is it heavier than 5 kilograms?", CLASSID);
	classifier.addDocument("it is lighter than a human?", CLASSID);
	classifier.addDocument("is it as heavy as a pikachu?", CLASSID);
	classifier.addDocument("does it weigh less than 6.5m?", CLASSID);
	classifier.addDocument("does it weigh more than a zigzagoon?", CLASSID);
	classifier.addDocument("does it weigh as much as a snorlax?", CLASSID);
	classifier.addDocument("is it the same mass as pikachu?", CLASSID);
	classifier.addDocument("is it the same weight as a car?", CLASSID);
	
	classifier.addDocument("< 5kg", CLASSID);
	classifier.addDocument(">2.5kg", CLASSID);
	classifier.addDocument("= 1.4kg", CLASSID);
})();

(function(){
	const CLASSID = "pokedex";
	
	classifier.addDocument("is it in the first generation?", CLASSID);
	classifier.addDocument("is it third gen?", CLASSID);
	classifier.addDocument("is it in the kalos pokedex?", CLASSID);
	classifier.addDocument("is it in the unova pokedex?", CLASSID);
	
	classifier.addDocument("first gen", CLASSID);
	classifier.addDocument("1st generation", CLASSID);
	classifier.addDocument("second gen", CLASSID);
	classifier.addDocument("2nd generation", CLASSID);
	classifier.addDocument("third generation", CLASSID);
	classifier.addDocument("3rd gen", CLASSID);
	classifier.addDocument("fourth generation", CLASSID);
	classifier.addDocument("4th gen", CLASSID);
	classifier.addDocument("fifth generation", CLASSID);
	classifier.addDocument("5th generation", CLASSID);
	classifier.addDocument("sixth gen", CLASSID);
	classifier.addDocument("6th gen", CLASSID);
	
	classifier.addDocument("kanto", CLASSID);
	classifier.addDocument("johto", CLASSID);
	classifier.addDocument("hoenn", CLASSID);
	classifier.addDocument("sinnoh", CLASSID);
	classifier.addDocument("unova", CLASSID);
	classifier.addDocument("kalos", CLASSID);
	// classifier.addDocument("unova extended", CLASSID);
	// classifier.addDocument("sinnoh expanded", CLASSID);
	// classifier.addDocument("universal pokedex", CLASSID);
})();

classifier.train();


////////////////////////////////////////////////////////////////////////
// Phrases from the database:

var dbconfig = {
	langID : 9, //local language id == English
	versionGroup : 15, //version group id == X/Y
	
};
var db = new sql.Database("veekun-pokedex.sqlite", sql.OPEN_READONLY, function(err){
	if (err) throw err;
	console.log("Connected to database.");
});

(function(){ // Ability Names
	const CLASSID = "ability";
	
	classifier.addDocument("does it have sturdy?", CLASSID);
	classifier.addDocument("can it have limber?", CLASSID);
	classifier.addDocument("does it have the ability sand veil?", CLASSID);
	classifier.addDocument("can it have the ability static?", CLASSID);
	classifier.addDocument("could it have the ability volt absorb?", CLASSID);
	classifier.addDocument("does it have the ability oblivious?", CLASSID);
	/*
	db.each(
		"SELECT abilities.id, ability_names.name from abilities "+
		"JOIN ability_names ON ability_names.ability_id = abilities.id "+
		"WHERE ability_names.local_language_id = ? AND abilities.id < 1000;", dbconfig.langID,
	function(err, row){
		if (err) throw err;
		classifier.addDocument(row.name, CLASSID);
	},
	function(err, nrows){ //complete
		if (err) throw err;
		classifier.train();
	}); */
})();

(function(){ // Move Names
	const CLASSID = "move";
	
	classifier.addDocument("can it learn the move quick attack?", CLASSID);
	classifier.addDocument("does it learn flamethrower?", CLASSID);
	classifier.addDocument("does it know the move fire blast?", CLASSID);
	classifier.addDocument("can it know trick room?", CLASSID);
	classifier.addDocument("can it learn the tm grass knot?", CLASSID);
	/*
	db.each(
		"SELECT moves.id, move_names.name FROM moves "+
		"JOIN move_names ON moves.id = move_names.move_id "+
		"WHERE move_names.local_language_id = ? AND moves.type_id < 1000;", dbconfig.langID,
	function(err, row){
		if (err) throw err;
		classifier.addDocument("can it learn "+row.name, CLASSID);
	},
	function(err, nrows){ //complete
		if (err) throw err;
		classifier.train();
	}); */
})();

(function(){ // Pokemon Names
	const CLASSID = "pokemon";
	
	classifier.addDocument("is it Pikachu?", CLASSID);
	classifier.addDocument("is it Helix?", CLASSID);
	classifier.addDocument("is it Dux?", CLASSID);
	classifier.addDocument("is it Lazorgator?", CLASSID);
	/*
	db.each(
		"SELECT pokemon.species_id as id, sname.name FROM pokemon "+
		"JOIN pokemon_species_names AS sname ON pokemon.species_id = sname.pokemon_species_id "+
		"WHERE sname.local_language_id = ? AND pokemon.is_default;", dbconfig.langID,
	function(err, row){
		if (err) throw err;
		classifier.addDocument(row.name, CLASSID);
	},
	function(err, nrows){ //complete
		if (err) throw err;
		classifier.train();
	}); */
})();

classifier.train();

db.close(function(){
	console.log("Database now closed.");
	
	classifier.save("classifier.json", function(err){
		if (err) throw err;
		console.log("Classifier Saved!");
	});
});

