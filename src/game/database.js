// game/database.js
// Interface between the Veekun database and the app.

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const DB_PATH = require.resolve('../../pokedex/pokedex/data/csv/');

function parseIfNumber(str) {
	let num = Number.parseInt(str, 10);
	if (Number.isNaN(num)) return str;
	return num;
}

function readDBTableToArray(file) {
	return new Promise((resolve, reject)=>{
		let keys = null;
		let table = new Array();
		
		const input = fs.createReadStream(path.join(DB_PATH, `${file}.csv`));
		input.on('error', reject);
		const rl = readline.createInterface({ 
			input, terminal: false, crlfDelay: Infinity,
		});
		rl.on('line', (line)=>{
			line = line.split(',');
			if (keys === null) { //Read header first
				keys = line;
			} else { //Then read data
				let obj = {};
				// Convert to object
				for (let i = 0; i < keys.length; i++) {
					obj[keys[i]] = parseIfNumber(line[i]);
				}
				table.push(obj);
			}
		});
		rl.on('close', ()=>{ resolve(table); });
	});
}

function readDBTableToMap(file, { primary, columns, filter, nameFile, extName }) {
	let p = new Promise((resolve, reject)=>{
		let keys = null;
		let table = new Map();
		
		const input = fs.createReadStream(path.join(DB_PATH, `${file}.csv`));
		input.on('error', reject);
		const rl = readline.createInterface({ 
			input, terminal: false, crlfDelay: Infinity,
		});
		rl.on('line', (line)=>{
			line = line.split(',');
			if (keys === null) { //Read header first
				keys = line;
				if (primary === undefined) primary = keys[0];
			} else { //Then read data
				let obj = {};
				// Convert to object
				for (let i = 0; i < keys.length; i++) {
					obj[keys[i]] = parseIfNumber(line[i]);
				}
				// Filter out unwanted rows
				if (typeof filter === 'function') {
					if (!filter(obj)) return; //skip this line
				}
				// Get the primary key
				let pKey = obj[primary];
				// Rename data in the row objects if desired
				if (columns) {
					for (let k of keys) {
						if (!columns[k]) delete obj[k];
						else if (typeof columns[k] === 'string') {
							obj[columns[k]] = obj[k];
							delete obj[k];
						}
					}
				}
				// Add the row to the table
				table.set(pKey, obj);
			}
		});
		rl.on('close', ()=>{ resolve(table); });
	});
	if (typeof nameFile === 'string') {
		p = p.then(async (map)=>{
			let nameTable = await readDBTableToMap(nameFile, { filter:(x)=>x.local_language_id===9 });
			for (let [id, obj] of map) {
				obj.name = nameTable[id].name;
			}
			return map;
		});
	}
	if (typeof extName === 'string') {
		p = p.then((map)=>{
			let extTable = require('./xdat/types');
			for (let [,obj] of map) {
				Object.assign(obj, extTable[obj.ident]);
			}
		});
	}
	return p;
}

// Initialize db data
const DATA = {};
const loadStatus = Promise.all([
	
	// Type table
	readDBTableToMap('types', { 
		nameFile: 'type_names',
		extName: 'types',
		filter: (x)=>x.id < 10000, 
		columns: {
			identifier: 'ident',
			generation_id: 'gen',
			name: 1,
		},
	}).then((table)=> DATA['types'] = table ),
	
	// Abilities table
	readDBTableToMap('abilities', { 
		nameFile: 'ability_names',
		filter: (x)=>x.is_main_series, 
		columns: {
			identifier: 'ident',
			generation_id: 'gen',
			name: 1,
		},
	}).then((table)=> DATA['abilities'] = table ),
	
	// Move table
	readDBTableToMap('moves', { 
		nameFile: 'move_names',
		filter: (x)=>x.is_main_series, 
		columns: {
			identifier: 'ident',
			generation_id: 'gen',
			// type_id: 1,
			name: 1,
		},
	}).then((table)=> DATA['abilities'] = table ),
	
	// Body shapes table
	readDBTableToMap('pokemon_shapes', { 
		nameFile: 'ability_names',
		filter: (x)=>x.is_main_series, 
		columns: {
			identifier: 'ident',
			generation_id: 'gen',
			name: 1,
		},
	}).then((table)=> DATA['shapes'] = table ),
	
	// Habitats table
	readDBTableToMap('pokemon_habitats', { 
		nameFile: 'pokemon_habitat_names',
		columns: {
			identifier: 'ident',
			name: 1,
		},
	}).then((table)=> DATA['habitats'] = table ),
	
	// Egg Group table
	readDBTableToMap('egg_groups', { 
		columns: {
			identifier: 'ident',
		},
	}).then((table)=> DATA['egg'] = table ),
	
	
]).then(async ()=>{
	// Pokemon Species table
	let mainTable = await readDBTableToMap('pokemon_species', { 
		nameFile: 'pokemon_species_names',
		columns: {
			identifier: 'ident',
			generation_id: 'gen',
			evolves_from_species_id: 'prevo',
			evolution_chain_id: 'family',
			color_id: 1,
			shape_id: 1,
			habitat_id: 1,
			is_baby: 1,
			forms_switchable: 1,
			order: 1,
			name: 1,
		},
	});
	{
		let table = await readDBTableToArray('pokemon_types');
		for (let row of table) {
			let pkmn = mainTable.get(row.pokemon_id);
			pkmn.types = (pkmn.types||[]);
			pkmn.types.push(DATA['types'][row.type_id].ident);
		}
	}{
		let table = await readDBTableToMap('pokemon', { 
			primary: 'species_id',
			filter: (x)=>x.is_default,
			columns: {
				identifier: 'ident',
				species_id: 1,
				height: 1,
				weight: 1,
			},
		});
		for (let row of table) {
			let pkmn = mainTable.get(row.species_id);
			pkmn.height = row.height;
			pkmn.weight = row.weight;
		}
	}{
		let table = await readDBTableToArray('pokemon_stats');
		for (let row of table) {
			let pkmn = mainTable.get(row.pokemon_id);
			pkmn.stats = (pkmn.stats||[]);
			pkmn.stats[row.stat_id] = row.base_stat;
		}
	}{
		let table = await readDBTableToArray('pokemon_moves');
		for (let row of table) {
			let pkmn = mainTable.get(row.pokemon_id);
			pkmn.moves = (pkmn.moves||[]);
			pkmn.moves.push(row.move_id);
		}
	}{
		let table = await readDBTableToArray('pokemon_abilities');
		for (let row of table) {
			let pkmn = mainTable.get(row.pokemon_id);
			pkmn.abilities = (pkmn.abilities||[]);
			pkmn.abilities.push(row.ability_id);
		}
	}{
		let table = await readDBTableToArray('pokemon_egg_groups');
		for (let row of table) {
			let pkmn = mainTable.get(row.species_id);
			pkmn.eggGroups = (pkmn.eggGroups||[]);
			pkmn.eggGroups.push(row.egg_group_id);
		}
	}
	DATA['pokemon'] = mainTable;
});

///////////////////////////////////////////////////////////////////////////////

/** The main class to interact with the Database. */
const Database = {
};

/** Information about a guessable pokemon. */
class Pokemon {
	
}

module.exports = Database;