// dbinfo.js
// Info from the Database for the 20 question bot
console.log("Loading Module dbinfo.js");

var sql = require("sqlite3");
var util = require("util");


//The pokemon database
var db; // The opened database
var dbconfig = {
	langID : 9, //local language id == English
	versionGroup : 15, //version group id == X/Y
	
};

var info = {
	ready : false,
	
	numPokemon: null, //Number of loaded pokemon in the database
	
	pokeInfoTable: [], //holds size and weight info for fast lookup
	
	nameTable: [], //Table of Pokemon names for string lookup
	nameMatchTable: [ //Additional name matching regexes
		{ id: 29,	regex: /^(nidoran (female|girl)|(female|girl) nidoran)$/i, },
		{ id: 30,	regex: /^(nidorina|nidorina (female|girl)|(female|girl) nidorina)$/i, },
		{ id: 32,	regex: /^(nidoran (male|boy)|(male|boy) nidoran)$/i, },
		{ id: 33,	regex: /^(nidorino|nidorino (female|girl)|(female|girl) nidorino)$/i, },
		{ id: 83,	regex: /farfetch[e\']?d|dux/i, },
		{ id: 92,	regex: /^(gh?astle?y)$/i, }, 
		{ id: 122,	regex: /mr\.? ?mime/i, }, 
		{ id: 148,	regex: /^dragonair$/i, }, 
		{ id: 149,	regex: /^dragonite$/i, }, 
		{ id: 223,	regex: /porygon[ -]?(2|two)/i, },
		{ id: 250,	regex: /ho[ -]?oh/i, },
		{ id: 439,	regex: /mime ?jr\.?/i, }, 
		{ id: 474,	regex: /porygon[ -]?z/i, },
		{ id: 669,	regex: /flabebe/i, }, //accents!
		{ id: 396,  regex: /starly/i, },

		//TPP Mon
		{ id: 5,	regex: /^(abby)$/i, }, 
		{ id: 6,	regex: /^(tiger)$/i, }, 
		{ id: 18,	regex: /^(bird jesus|jesus)$/i, }, 
		{ id: 19,	regex: /^(jay leno)$/i, }, 
		{ id: 20,	regex: /^(digrat|ace)$/i, }, 
		{ id: 49,	regex: /^(atv)$/i, }, 
		{ id: 92,	regex: /^(rick gh?astly)$/i, }, 
		{ id: 106,	regex: /^(c3ko)$/i, }, 
		{ id: 131,	regex: /^(air)$/i, }, 
		{ id: 139,	regex: /^(lord )?helix$/i, }, 
		{ id: 141,	regex: /^(lord )?dome$/i, }, 
		{ id: 145,	regex: /^(archang(el|le) of justice|battery jesus)$/i, },
		{ id: 160,	regex: /^(laz[oe]rgat[oe]r)$/i, }, 
		{ id: 161,	regex: /^(admiral|adi)$/i, }, 
		{ id: 184,	regex: /^m4$/i, }, 
		{ id: 262,	regex: /^(mighty ?doge)$/i, }, 
		{ id: 270,	regex: /^(lotid)$/i, }, 
		{ id: 278,	regex: /^(bird ?cop)$/i, }, 
		{ id: 312,	regex: /^(c3|ccc)$/i, }, 
		{ id: 346,	regex: /^((lord )?root|potato)$/i, },
		{ id: 383,	regex: /^kenya+$/i, },	
		{ id: 402,  regex: /^de(le){1,} ?wo{2,}p$/i, },
		{ id: 403,	regex: /^(sunshine)$/i, },
		{ id: 407,	regex: /^(sunbrella)$/i, }, 
		{ id: 483,	regex: /^(dairy queen)$/i, },
		{ id: 535,	regex: /^(nonon)$/i, },
		// { id: 585,	regex: /^(5|five)$/i, },
		{ id: 595,	regex: /^(peter sparker|sparky)$/i, },
		{ id: 716,	regex: /^(deer god)$/i, },
	], 
	
	moveTable: [], //Table of Move names for string lookup
	moveMatchTable: [ //Additional move matching regexes
		{ id: 18,	regex: /whirl ?wind/i, },
		{ id: 38,	regex: /double[ -]?edge/i, },
		{ id: 41,	regex: /twin( ?n)?ee?dle/i, },
		{ id: 53,	regex: /flame ?thrower/i, },
		{ id: 108,	regex: /smoke ?scree?n/i, },
		{ id: 120,	regex: /self[ -]?d[ie]struct/i, },
		{ id: 135,	regex: /soft[ -]?boile?d?/i, },
		{ id: 189,	regex: /mud[ -]?slap/i, },
		{ id: 199,	regex: /lock[ -]?on/i, },
		{ id: 261,	regex: /will?[ -]?o[ -]?wh?isp/i, },
		{ id: 276,	regex: /super ?power/i, },
		{ id: 358,	regex: /wake[ -]?up ?slap/i, },
		{ id: 366,	regex: /tail ?wind/i, },
		{ id: 369,	regex: /u[ -]?turn/i, },
		{ id: 404,	regex: /x[ -]?(scis?sor|sicc?ors)/i, },
		{ id: 557,	regex: /v[ -]?create/i, },
		{ id: 567,	regex: /trick[ -]?or[ -]?treat/i, },
		{ id: 573,	regex: /freeze[ -]?dry/i, },
		{ id: 576,	regex: /topse?y[ -]?turve?y/i, },
		{ id: 588,	regex: /king\'?s ?sh(ie|ei)ld/i, },
		{ id: 608,	regex: /baby[ -]?doll ?eyes/i, },
		{ id: 612,	regex: /power[ -]?up ?punch/i, },
		{ id: 616,	regex: /land\'?s ?wrath/i, },
	], 
	
	abilityTable: [], //Table of ability names for string lookup
	abilityMatchTable: [ //Additional ability matching regexes
		// { id: 18,	regex: /whirl ?wind/i, },
	],
	
	legendaryTable: [
		144, 145, 146, 150, 151, 
		243, 244, 245, 249, 250, 251, 
		377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 
		480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 498, 492, 493,
		494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649, 
		716, 717, 718, 719, 720, 
	],
	fossilTable: [
		138, 139, 140, 141, 142,
		345, 346, 347, 348,
		408, 409, 410, 411, 
		564, 565, 566, 567, 
		696, 697, 698, 699, 
	],
	
	shapeTable: [ null, //Table of Shapes given more info
		{ desc: "Pokémon consisting of only a head", 			head: 1, legs: 0, arms: 0, tail: 0, wings: 0, bodies: 1},
		{ desc: "Pokémon with serpentine bodies", 				head: 1, legs: 0, arms: 0, tail: 0, wings: 0, bodies: 1},
		{ desc: "Pokémon with fins", 							head: 1, legs: 0, arms: 0, tail: 0, wings: 0, bodies: 1},
		{ desc: "Pokémon consisting of a head and arms", 		head: 1, legs: 0, arms: 2, tail: 0, wings: 0, bodies: 0},
		{ desc: "Pokémon consisting of a head and a base", 		head: 1, legs: 0, arms: 0, tail: 0, wings: 0, bodies: 1},
		{ desc: "Pokémon with a bipedal, tailed form", 			head: 1, legs: 2, arms: 0, tail: 1, wings: 0, bodies: 1},
		{ desc: "Pokémon consisting of a head and legs", 		head: 1, legs: 2, arms: 0, tail: 0, wings: 0, bodies: 0},
		{ desc: "Pokémon with a quadruped body", 				head: 1, legs: 4, arms: 0, tail: 0, wings: 0, bodies: 1},
		{ desc: "Pokémon with a single pair of wings", 			head: 1, legs: 0, arms: 0, tail: 0, wings: 2, bodies: 1},
		{ desc: "Pokémon with tentacles or a multiped body",	head: 1, legs: 8, arms: 0, tail: 0, wings: 0, bodies: 1},
		{ desc: "Pokémon consisting of multiple bodies", 		head: 1, legs: 0, arms: 0, tail: 0, wings: 0, bodies: 3},
		{ desc: "Pokémon with a bipedal, tailless form", 		head: 1, legs: 2, arms: 0, tail: 0, wings: 0, bodies: 1},
		{ desc: "Pokémon with two or more pairs of wings", 		head: 1, legs: 0, arms: 0, tail: 0, wings: 4, bodies: 1},
		{ desc: "Pokémon with an insectoid body", 				head: 1, legs: 6, arms: 0, tail: 0, wings: 0, bodies: 1},
	],
	
	typeTable: [ null, //Table of Types
		{ name: "Normal", 	regex: /^(norma?l?)$/i, },
		{ name: "Fighting", regex: /^(fight(ing)?|fite(ing)?)$/i, },
		{ name: "Flying", 	regex: /^(fly(ing)?)$/i, },
		{ name: "Poison", 	regex: /^(poison|posion)$/i, },
		{ name: "Ground", 	regex: /^(ground|grn?d)$/i, },
		{ name: "Rock", 	regex: /^(rock)$/i, },
		{ name: "Bug", 		regex: /^(bug)$/i, },
		{ name: "Ghost", 	regex: /^(ghost|goast|g[ao]hst)$/i, },
		{ name: "Steel", 	regex: /^(stee?l|steal)$/i, },
		{ name: "Fire", 	regex: /^(fire|frie)$/i, },
		{ name: "Water", 	regex: /^(water)$/i, },
		{ name: "Grass", 	regex: /^(grass?)$/i, },
		{ name: "Electric", regex: /^(electric|elec)$/i, },
		{ name: "Psychic", 	regex: /^(psychic|psy|psichic)$/i, },
		{ name: "Ice", 		regex: /^(ice)$/i, },
		{ name: "Dragon", 	regex: /^(dragon|dargon)$/i, },
		{ name: "Dark", 	regex: /^(dark|drak)$/i, },
		{ name: "Fairy", 	regex: /^(fairy|elf|fay)$/i, },
	],
	typeEffectTable: [],
	
	habitatTable: [ null, //Table of habitats
		{ name: "cave", 		regex: /caves?/i, },
		{ name: "forest", 		regex: /forests?|woods/i, },
		{ name: "grassland",	regex: /grass(lands?)?|plains|savanna/i, },
		{ name: "mountain", 	regex: /mountains?/i, },
		{ name: "rare", 		regex: /rare/i, },
		{ name: "rough terrain",regex: /rough terrains?/i, },
		{ name: "sea", 			regex: /seas?|oceans?|salt water/i, },
		{ name: "urban", 		regex: /urban|city|cities/i, },
		{ name: "water's edge", regex: /rivers?|streams?|lakes?|fresh water/i, },
	],
	
	colorTable: [ null, //Table of colors
		{name: "black", 	regex: /bla?c?k/i, },
		{name: "blue", 		regex: /blue?/i, },
		{name: "brown", 	regex: /bro?wn/i, },
		{name: "gray", 		regex: /gr[ea]y/i, },
		{name: "green", 	regex: /green|grn/i, },
		{name: "pink", 		regex: /pi?nk/i, },
		{name: "purple", 	regex: /purple|violet/i, },
		{name: "red", 		regex: /red/i, },
		{name: "white", 	regex: /white|wht/i, },
		{name: "yellow", 	regex: /yellow|ylw/i, },
	],
	
	pokedexTable: [ "National", "Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos" ],
	
	
	
	getPokemon : function(pid) {
		if (!info.ready) throw "Database not ready!";
		
		var pkmn = {};
		//console.log("Pokemon id! "+pid);
		
		db.get(
			"SELECT pokemon.species_id AS id, sname.name, pokemon.height, pokemon.weight "+
			"FROM pokemon "+
			"JOIN pokemon_species_names AS sname ON sname.pokemon_species_id = pokemon.species_id "+
			"WHERE pokemon.species_id = ? AND sname.local_language_id = ? AND pokemon.is_default;", pid, dbconfig.langID,
		function(err, row){
			if (err) throw err;
			pkmn.id = row.id;
			pkmn.name = row.name.replace(".", "");
			pkmn.height = row.height;
			pkmn.weight = row.weight;
		});
		
		db.get(
			"SELECT pokemon_species.evolution_chain_id as evo, "+
				"pokemon_species.color_id as color, "+
				"pokemon_species.shape_id as shape, "+
				"pokemon_species.habitat_id as habitat, "+
				"pokemon_species.forms_switchable as forms, "+
				"pokemon_species.gender_rate as gender, "+
				"pokemon_species.is_baby as baby "+
			"FROM pokemon_species "+
			"WHERE pokemon_species.id = ?;", pid,
		function(err, row){
			if (err) throw err;
			pkmn._evoChainId = row.evo;
			pkmn.color = row.color;
			pkmn.shape = row.shape;
			pkmn.habitat = row.habitat;
			pkmn.forms = row.forms;
			pkmn.gendertype = row.gender; //-1 == genderless
			pkmn.isBaby = row.baby;
			
			db.all(
				"SELECT sp.id, sname.name, sp.forms_switchable as forms "+
				"FROM pokemon_species as sp "+
				"JOIN pokemon_species_names as sname ON sp.id = sname.pokemon_species_id "+
				"WHERE sp.evolution_chain_id = ? AND sname.local_language_id = ? "+
				'ORDER BY sp."order";', row.evo, dbconfig.langID,
			function (err, rows){
				if (err) throw err;
				pkmn.evoLine = rows[0].id;
				pkmn.evoLength = rows.length;
				pkmn._possibleMega = (rows[rows.length-1].forms)? rows[rows.length-1].id : 0;
				
				if (pkmn._possibleMega) {
					db.get(
						"SELECT COUNT(*) as num "+
						"FROM pokemon_forms "+
						"JOIN pokemon ON pokemon.id = pokemon_forms.pokemon_id "+
						"WHERE pokemon.species_id = ? AND pokemon_forms.is_mega == 1;", pkmn._possibleMega,
					function (err, row) {
						if (err) throw err;
						pkmn.hasMegaEvo = row.num; //stores how many mega evolutions!
					});
				}
			});
			
			if (!pkmn.forms) {
				pkmn.type = [];
				
				db.each(
					"SELECT pokemon.id, pokemon_types.slot, types.id as type FROM pokemon "+
					"JOIN pokemon_types ON pokemon.id = pokemon_types.pokemon_id "+
					"JOIN types ON pokemon_types.type_id = types.id "+
					"WHERE pokemon.species_id = ?;", pid,
				function(err, row){
					if (err) throw err;
					pkmn.type[row.slot-1] = row.type;
				});
			} else {
				//Note: type are definite types, in the form: [slot1Type, slot2Type]
				//posTypes are possible types in a boolean array, in the form [canBeType1, canBeType2, canBeType3, ...]
				var type = [], posTypes = [];
				
				db.each(
					"SELECT pokemon.id, pokemon_types.slot, types.id as type FROM pokemon "+
					"JOIN pokemon_types ON pokemon.id = pokemon_types.pokemon_id "+
					"JOIN types ON pokemon_types.type_id = types.id "+
					"JOIN pokemon_forms ON pokemon_forms.pokemon_id = pokemon.id "+
					"WHERE pokemon_forms.is_mega == 0 AND pokemon.species_id = ?;", pid,
				function(err, row){
					if (err) throw err;
					//If the slot has a type already, but it's a different type
					if (type[row.slot-1] && type[row.slot-1] != row.type) {
						//Remove the type from the "definite types" and move it to the "possible types"
						posTypes[type[row.slot-1]] = true;
						posTypes[row.type] = true;
						type[row.slot-1] = -1;
					} else {
						type[row.slot-1] = row.type;
					}
				}, function(err, nrows){ //complete
					if (err) throw err;
					pkmn.type = type;
					pkmn.possibleTypes = posTypes;
				});
			}
			
			
			
			//TODO get egg groups (pokemon_egg_groups TABLE)
			
			//TODO get pokemon stats
			
		});

		pkmn.dexes = [];
		db.each(
			"SELECT pokedexes.region_id as region "+
			"FROM pokemon_dex_numbers "+
			"JOIN pokedexes ON pokemon_dex_numbers.pokedex_id = pokedexes.id "+
			"WHERE pokedexes.region_id != '' AND pokemon_dex_numbers.species_id = ?;", pid,
		function(err, row){
			if (err) throw err;
			pkmn.dexes[row.region] = true;
		});
		
		pkmn.abilities = [];
		db.each(
			"SELECT abilities.id, abilities.identifier FROM abilities "+
			"JOIN pokemon_abilities ON pokemon_abilities.ability_id == abilities.id "+
			"WHERE pokemon_abilities.pokemon_id = ?;", pid,
		function (err, row){
			if (err) throw err;
			pkmn.abilities.push(row);
		});
		
		pkmn.moves = [];
		db.each("SELECT moves.id, moves.identifier from pokemon "+
			"JOIN pokemon_moves ON pokemon.id = pokemon_moves.pokemon_id "+
			"JOIN moves ON pokemon_moves.move_id = moves.id "+
			"WHERE pokemon.species_id = ? AND pokemon_moves.version_group_id = 15;", pid,
		function (err, row){
			if (err) throw err;
			pkmn.moves.push(row);
		});
		
		return pkmn;
	},
	
	
	initDB : function() {
		// Start up!
		db = new sql.Database("data/veekun-pokedex.sqlite", sql.OPEN_READONLY, function(err){
			if (err) throw err;
			log("Connected to database.");
		});
		
		//Pull in some running information
		
		//Populate the pokemon name table and pokeInfoTable table
		db.each(
			"SELECT pokemon.species_id as id, pokemon.height, pokemon.weight, sname.name FROM pokemon "+
			"JOIN pokemon_species_names AS sname ON pokemon.species_id = sname.pokemon_species_id "+
			"WHERE sname.local_language_id = ? AND pokemon.is_default;", dbconfig.langID,
		function(err, row){
			if (err) throw err;
			info.nameTable[row.id] = row.name.toLowerCase();
			info.pokeInfoTable[row.id] = {
				height: row.height,
				weight: row.weight,
			};
		});
		
		//Populate the moves name table
		db.each(
			"SELECT moves.id, move_names.name FROM moves "+
			"JOIN move_names ON moves.id = move_names.move_id "+
			"WHERE move_names.local_language_id = ? AND moves.type_id < 1000;", dbconfig.langID,
		function(err, row){
			if (err) throw err;
			info.moveTable[row.id] = row.name.toLowerCase();
		});
		
		//Populate the ability name table
		db.each(
			"SELECT abilities.id, ability_names.name from abilities "+
			"JOIN ability_names ON ability_names.ability_id = abilities.id "+
			"WHERE ability_names.local_language_id = ? AND abilities.id < 1000;", dbconfig.langID,
		function(err, row){
			if (err) throw err;
			info.abilityTable[row.id] = row.name.toLowerCase();
		});
		
		//Populate the type effectiveness table
		db.each("SELECT type_efficacy.damage_type_id as atk, "+
			"type_efficacy.target_type_id as def, "+
			"type_efficacy.damage_factor as effect FROM type_efficacy;",
		function (err, row){
			if (err) throw err;
			if (!info.typeEffectTable[row.def])
				info.typeEffectTable[row.def] = [];
			info.typeEffectTable[row.def][row.atk] = row.effect / 100;
		});
		
		db.get("SELECT COUNT(DISTINCT species_id) AS num FROM pokemon;", function(err, row){
			if (err) throw err;
			//Returns a single row, with the number of pokemon in "num"
			info.numPokemon = row.num;
			log("There are "+info.numPokemon+" pokemon species loaded in this database.");
			info.ready = true;
		});
	},
	
	closeDB : function() {
		info.ready = false;
		db.close();
	},
};

module.exports = info;