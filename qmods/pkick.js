//pkick.js
console.log("Loading Module pkick.js");

var extend = require("extend");
var irccolors = require("irc").colors;
var fs = require("fs");
var PersistedObject = require("persistable-object");
var _ = require("underscore");

module.exports = {
    setup : function() {
        bot.addListener("names#tppleague", namesCheck);
		bot.addListener("join#tppleague", joinCheck);
		bot.addListener("part#tppleague", partCheck);
		bot.addListener("kick#tppleague", partCheck);
		bot.addListener("quit", partCheck);
		bot.addListener("kill", partCheck);
		
		this.state.store = require("./save-proxy")("data/pkick.json");
    },
    
    teardown : function() {
        bot.removeListener("names#tppleague", namesCheck);
		bot.removeListener("join#tppleague", joinCheck);
		bot.removeListener("part#tppleague", partCheck);
		bot.removeListener("kick#tppleague", partCheck);
		bot.removeListener("quit", partCheck);
		bot.removeListener("kill", partCheck);
		
		this.state.store.forceSave();
    	this.state.store.dispose();
    	delete this.state.store;
    },
    
    migrate : function(old) {
        extend(this.state, old.state);
    },
    
    loadFile : function() {
    	this.state.store.dispose();
    	this.state.store = require("./save-proxy")("data/pkick.json");;
    },
    
    cmds : {},
};

var state = module.exports.state = {
    deadIsHere : false,
    store : null,
	// _score_puppy: 0,
	// _score_dead: 0,
	// _uranium : 0,
};


///////////////////////////////////////////////////////////////

const CHANNEL = "#tppleague";
const CHANCE_SHOWDOWN = 0.10;
const CHANCE_PUPNADO = 0.03;
const CHANCE_DOZEN = 0.02;
const CHANCE_PUPWIN = 0.30;
const CHANCE_URANIUM = 0.005;
const NAME_URANIUM = "Kikatanium";

////////////////////////// Callbacks /////////////////////////

function debugRaw(msg) {
	safely(function(){
		// console.log(msg);
		// analizeUser(msg);
	});
}

function namesCheck(nicks){
	safely(function(){
		//console.log(nicks);
		for (var name in nicks) {
			if (/^(dead|mobile)insky/i.test(name)) {
				state.deadIsHere = true;
				console.log("puppy: ", state.deadIsHere);
			}
		}
	});
}

function joinCheck(nick, msg){
	safely(function(){
		//console.log("DEBUG: joinCheck", nick, /^(dead|mobile)insky/i.test(nick));
		if (require("./friendly").state.modmode) return;
		if (/^(dead|mobile)insky/i.test(nick)) {
			state.deadIsHere = true;
			console.log("puppy: ", state.deadIsHere);
			
			// bot.say("#tppleague", "Breaking: The Puppy Nation is attempting Peace Talks with Deadinsky, but Deadinsky has not yet responded. More at 11.");
			// bot.say("#tppleague", "Breaking: Tensions are rising between the Puppy Nation and Deadinsky after the inadvertant reveal of Deadinsky's cloning machine. More at 11.");
			// bot.say("#tppleague", "Breaking: Puppy Nation Officials have claimed that Deadinsky is building WMKs (Weapons of Mass Kicking) and are calling for a declaration of war. More at 11.");
			// bot.say("#tppleague", "Breaking: Puppy Protesters outside capital hill oppose going to war with Deadinsky. \"He's only one man! He can't kick us all!\". More at 11.");
			var rand = Math.random();
			if (rand < CHANCE_URANIUM) {
				bot.say("#tppleague", `As ${nick} walks into the room, he accidentally steps on some ${NAME_URANIUM}. He pockets it.`);
				state.store.uranium++;
			}
			else if (rand < 0.45) {
				var str = nick+" walks into the room and ";
				var quote = [
					"a bucket falls on his head and two puppies fall down on it and smack it. They run off as Deadinsky gets his bearings.",
					"a cup of warm coffee flies across the room from a dense group of puppies and beans Deadinsky in the head.",
					"he steps on a rake with a bone attached to the end of it. It smacks him across the face.",
					"suddenly a whip creame pie smacks into his face. The puppies in the room scatter.",
					"a puppy swings from the ceiling, leaps off, and kicks him in the face, before running off.",
				];
				str += quote[Math.floor(Math.random()*quote.length)];
				bot.say("#tppleague", str);
				state.store.score_puppy += 1;
			}
			else {
				bot.say("#tppleague", "As "+nick+" walks into the room, the puppies in the area tense up and turn to face him.");
			}
			
		}
	});
}

function partCheck(nick, msg){
	safely(function(){
		//console.log("DEBUG: partCheck", nick, /^(dead|mobile)insky/i.test(nick));
		if (/^(dead|mobile)insky/i.test(nick)) {
			state.deadIsHere = false;
			console.log("puppy: ", state.deadIsHere);
		}
	});
}

////////////////////////////////////////////////////////////////

var showdownText = [
	//payoff: 2 = crit success, 1 = success, 0 = meet, -1 = failure, -2 = crit fail
	{ //0
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
	{ //1
		setup: "Deadinsky66 sits in the park, eating a banana. Unbeknownst to him, a cadre of ninja-puppies is lying in wait in a tree just above him...",
		win_score: 4,
		lose_score: 0,
		payoff: {
			"2": "The hair on the back of Deadinsky's neck stands on end, and he know's he's surrounded moments before the ninja-puppies strike. They attack, but he fends them off effortlessly with his own mod-ninja skills. The banana and victory were delicious.",
			"1": "Deadinsky just happens to lean over as the first ninja-puppy makes his strike. The shurikin misses, and deadinsky uses his own mod-ninja abilities to fend off the rest of the clan. His banana fell into the dirt during the kurfuffle, however.",
			"0": "Deadinsky goes to take a bite of the banana when it is cut in half by a shuriken. He scampers as the ninja-puppies fall from the tree and go after him, but he manages to get away unharmed...",
			"-1": "Deadinsky goes to take a bite of the banana when it is cut in half by a shuriken. Another shuriken pins his sleeves to the tree. The ninja-puppies decend upon him and knock him out. His banana is now ant food.",
			"-2": "Deadinsky goes to take a bite of the banana when he is knocked out cold from behind by one of the ninja-puppies. When he wakes next in an alleyway, his banana is smeared all over his shirt, and his wallet was missing again.",
		}
	},
	{ //2
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
	{ //3
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
	{ //4
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
	{ //5
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
	{ //6
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
	{ //7
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
	{ //8
		setup: "Deadinsky66 is waiting at a bus stop when a sudden blast of fire shoots past his face. He dodges backwards to see the blast of fire came from a puppy's paw. The firebending puppy changes stance, and fire spits out its muzzle in anger.",
		win_score: 2,
		lose_score: 0,
		payoff: {
			"2": "Deadinsky dodges a few blasts of fire bent in his direction and does a summersault over the puppy. He lands and, before the puppy can react, Dead shoves his handheld taser into the puppy's spine. It collapses, and Dead punts it down the street.",
			"1": "Deadinsky feints past a few blasts of fire bent in his direction and deflects a punch of fire aimed at his face. He then shoves his handheld taser into the puppy's spine, and punts the unconcious pup down the street.",
			"0": "The puppy does a roundhouse kick and blasts some more fire in Deadinsky's direction, which he barely dodges. He spots the bus coming and rushes towards it. A blast of fire bounces off the bus as Dead dives inside and the driver floors it at Dead's insistance.",
			"-1": "The puppy punches fire at Deadinsky as he dodges as best he can. But the punches come too quickly and he's soon surrounded by a ring of fire. The puppy then bends the fire into a flaming whirlwind and rockets Deadinsky into the sky.",
			"-2": "The puppy does a lengthy dance, calling fire to surround Deadinsky before Dead could get away. It then bends the fire into a whirlwind that rockets Deadinsky straight into the side of a building. When dead wakes again, his clothes are charred and his wallet is missing again.",
		}
	}, 
	{ //9
		setup: "Deadinsky66 is strolling through the park when he comes across a puppy meditating under a tree. It had a strange blue arrow painted across its back and ending at its head. Like any puppy, he decides to kick it.",
		win_score: 1,
		lose_score: 0,
		payoff: {
			"2": "Deadinsky punts the puppy up into the air, but the puppy stops itself in midair. Deadinsky can hear it crying and vowing revenge as it flew away on the wind.",
			"1": "Deadinsky's foot connects with the puppy's cheek, and the puppy takes that energy and rolls away from him. It paws its cheek in anger and, grabbing a branch, slaps a wave of wind at Deadinsky. Deadinsky stands his ground against the gust, but when he looks back, the puppy had gone.",
			"0": "When Deadinsky goes to kick the meditating puppy, it effortlessly dodges on the wind, without even opening its eyes. He kicks again, but it dodges again. He kicks a third time, but it leaps up on the air given off by the swing of his foot and bounces up the tree, away from him.",
			"-1": "When Deadinsky goes to kick the meditating puppy, it effortlessly dodges and leaves Deadinsky off-balance. It lands on top of Dead and continues meditating. Dead goes to shove it off, but it dodges again and lands on a ball of air, balancing on one paw, a short distance away. Dead tries once more to kick it, but it rolls merrily away. ",
			"-2": "When Deadinsky goes to kick the meditating puppy, a blast of wind comes from behind and knocks Deadinsky down, the puppy tripping him. Deadinsky looks up to see the puppy balancing on one paw on a ball of air, with his wallet floating around it. Dead goes to grab his wallet back, but the puppy rides merrily away on the air scooter.",
		}
	}, 
	{ //10
		setup: "Deadinsky66 turns to walk across a bridge when he sees a puppy standing, staring him down, in the middle of the bridge. Deadinsky starts rushing up to kick it, and moments before his foot connects, the puppy bends some water out of river below.",
		win_score: 2,
		lose_score: 0,
		payoff: {
			"2": "Deadinsky was prepared for this, however, and what looked like a kick was actually the preperation for a summersault, which resulted in his handheld taser smacking the puppy across the spine. The water the puppy was bending from the river splashes down across the bridge. Dead proceeds to punt the puppy into the river.",
			"1": "Deadinsky reacts just soon enough to turn his kick into a dodge roll sideways around the puppy. The puppy follows him, water-whipping spots where he used to be. Dead just barely gets his handheld taser into the puppy's side, and a bunch of water that was aiming to grab him sloshes down on his head. He punts the puppy into the river.",
			"0": "Deadinsky reacts just soon enough to redirect his foot up over the puppy and its glob of water, and jump over the puppies attempts to water whip at his feet. He takes off running, zig-zag-dodging the icicle shards the puppy throws at him. He manages to duck around the corner and get away.",
			"-1": "Deadinsky doesn't quite react fast enough, and his kick gets absorbed into the floating glob of water the puppy controls. The momentum of the kick transfers through the bent water and smacks Dead sideways up over the railing of the beidge. He falls into the water and swims to shore quickly before the puppy could finish the whirlpool it was creating behind him.",
			"-2": "Deadinsky doesn't quite react fast enough, and his kick gets absorbed into the floating glob of water the puppy controls. The momentum of the kick transfers through the bent water and smacks Dead sideways into the railing of the bridge. He is pinned to the railing by a rain of icicles. When he wakes next, he find himself on the river's shoreline and his wallet is missing again.",
		}
	}, 
	{ //11
		setup: "Deadinsky66 walks through the center of town when he is stopped by 5 teenage puppies. As he watches, they perform strange movements with their arms and, with some background explosions, suddenly have color-coded suits and helmets on. They charge at Deadinsky.",
		win_score: 10,
		lose_score: 0,
		payoff: {
			"2": "Suddenly, a strange staff slams into the ground next to Deadinsky, and he's suddenly as tall as the buildings around him. He kicks all 5 puppies with ease and also a couple buildings as well before he returns to normal size.",
			"1": "Deadinsky faces them head on and begins flipping around them and smacking them against walls and trees. The puppies lose their suits inexplicably as they fall, and soon he is standing over all of them, gloating. Then he kicks them across the city center.",
			"0": "Deadinsky backflips away from them and begins running. They fly at him and perform martial arts moves, but before they can reach him, a squad of gray dudes looking vaguly like Deadinsky get between him and the puppies. They hold them off, and Dead gets away.",
			"-1": "Deadinsky turns to run, but the five puppies surround him quickly. He attempts to fend off their martial arts attacks, to no avail. Soon, they perform a power attack and Deadinsky falls over and inexplicable explosions erupt around him as the teenage puppies pose.",
			"-2": "Deadinsky turns to run, but finds his way blocked by a giant mech foot. The teenage puppies jump inprobably high into the mech and proceed to kick him clear across town. when he wakes again, he finds himself in a pile of rubble and his wallet missing again.",
		}
	}, 
	
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

function performShowdown(forcedNum) {
	// select a random showdown:
	var showdown = showdownText[Math.floor(Math.random() * showdownText.length)];
	if (forcedNum) { showdown = showdownText[forcedNum]; }
	
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
	if (result >= 3) { //dead won critically
		result = 2; 
		state.store.score_dead += showdown.win_score*2;
		crit_dead = irccolors.codes.cyan+"[CRIT] "+irccolors.codes.reset;
	} 
	else if (result <= -3) { //dead lost critically
		result = -2; 
		state.store.score_puppy += showdown.win_score*2;
		crit_pup = irccolors.codes.cyan+"[CRIT] "+irccolors.codes.reset;
	}
	else if (result > 0) { //dead won
		result = 1; 
		state.store.score_dead += showdown.win_score;
		state.store.score_puppy += showdown.lose_score;
	}
	else if (result < 0) { //dead lost
		result = -1; 
		state.store.score_dead += showdown.lose_score;
		state.store.score_puppy += showdown.win_score;
	} 
	else { //tie
		result = 0; 
		state.store.score_dead += showdown.lose_score;
		state.store.score_puppy += showdown.lose_score;
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

module.exports.cmds.performShowdown = performShowdown;

////////////////////////////////////////////////////////////////

function pscore(nick, text, res) {
	if (state.store.score_dead > 66 && state.store.score_dead < 77) {
		bot.say("#tppleague", `Deadinsky: 66+${state.store.score_dead-66}, Puppies: ${state.store.score_puppy}`);
	} else {
		bot.say("#tppleague", `Deadinsky: ${state.store.score_dead}, Puppies: ${state.store.score_puppy}`);
	}
}
module.exports.cmds.pscore = pscore;

function pkick(nick, text, res) {
	if (state.deadIsHere && (/^(dead|mobile)insky/i.test(nick)) && Math.random() < CHANCE_URANIUM) {
		bot.say("#tppleague", `${nick} finds some ${NAME_URANIUM} lying on the ground, and pockets it.`);
		state.store.uranium++;
		return;
	}
	
	// Only do showdowns if Deadinsky is around
	if (state.deadIsHere && Math.random() < CHANCE_SHOWDOWN) {
		performShowdown();
		return;
	}
	
	var rand = Math.random();
	
	if (state.deadIsHere
		&& state.store.score_dead > 30
		&& state.store.score_puppy + 45 < state.store.score_dead 
		&& rand < CHANCE_PUPNADO) 
	{
		// If deadinsky out-strips the puppies score by more than half, and 5% of the time
		var scorejump = Math.round((state.store.score_dead - state.store.score_puppy) * ((Math.random() * 0.2) + 0.9));
		// Increase the puppies' score by the difference between the scores, +/- 10%
		bot.say("#tppleague", "Deadinsky66 is walking down the road on an abnormally calm day. "
			+"It is several minutes before he notices the low rumbling sound all around him... "
			+"He looks behind him, and a look of terror strikes his face. "
			+"He turns and starts sprinting away as fast as he can. But there is no way he "
			+"can outrun it. The pupnado is soon upon him....");
		
		state.store.score_puppy += scorejump;
		return;
	}
	
	if (rand < CHANCE_DOZEN) {
		var num = Math.round((Math.random()*8)+8);
		
		if (/^(dead|mobile)insky/i.test(nick)) {
			bot.say("#tppleague", (num<12?"Almost a dozen":"Over a dozen")+
				" puppies suddenly fall from the sky onto "+nick+" and curbstomp him.");
			state.store.score_puppy += num;
			return;
		}
		if (state.deadIsHere) {
			bot.say("#tppleague", nick+" watches as "+(num<12?"maybe":"over")+
				" a dozen puppies spring from nowhere and ambush Deadinsky, beating him to the curb.");
			state.store.score_puppy += num;
		} else {
			bot.say("#tppleague", nick+" goes to kick a puppy on Deadinsky's behalf, "+
				"but instead gets ganged up on by "+(num<12?"nearly":"over")+" a dozen puppies.");
		}
		
	} else if (rand > 1-CHANCE_DOZEN) {
		var num = Math.round((Math.random()*5)+8);
		
		if (/^(dead|mobile)insky/i.test(nick)) {
			bot.say("#tppleague", nick+" comes across a dog carrier with about a dozen"+
				" puppies inside. He overturns the whole box with his foot!");
			state.store.score_dead += num;
			return;
		}
		if (state.deadIsHere) {
			bot.say("#tppleague", nick+" watches as Deadinsky punts a dog carrier. "+(num<12?"Maybe":"Over")+
				" a dozen puppies run in terror from the overturned box.");
			state.store.score_dead += num;
		} else {
			bot.say("#tppleague", nick+" kicks a puppy on Deadinsky's behalf. "+
				"The pup flies into a nearby dog carrier with "+(num<12?"nearly":"over")+" a dozen puppies inside and knocks it over.");
		}
		
	} else if (rand < CHANCE_PUPWIN) {
		if (/^(dead|mobile)insky/i.test(nick)) {
			bot.say("#tppleague", "A puppy kicks "+nick);
			state.store.score_puppy++;
			return;
		}
		if (state.deadIsHere) {
			bot.say("#tppleague", nick+" watches as a puppy kicks Deadinsky's ass.");
			state.store.score_puppy++;
		} else {
			bot.say("#tppleague", nick+" goes to kick a puppy on Deadinsky's behalf, but instead the puppy dodges it and kicks "+nick+".");
		}
	} else {
		if (/^(dead|mobile)insky/i.test(nick)) {
			bot.say("#tppleague", nick+" kicks a puppy.");
			state.store.score_dead++;
			return;
		}
		if (/^azum/i.test(nick) && Math.random() < 0.3) {
			if (state.deadIsHere) {
				bot.say("#tppleague", nick+" watches as Deadinsky accidentally voices a puppy while trying to kick it.");
				state.store.score_dead++;
			} else {
				bot.say("#tppleague", nick+" accidentally voices a puppy on Deadinsky's behalf.");
			}
			return;
		}
		if (state.deadIsHere) {
			bot.say("#tppleague", nick+" watches as Deadinsky kicks a puppy.");
			state.store.score_dead++;
		} else {
			bot.say("#tppleague", nick+" kicks a puppy on Deadinsky's behalf.");
		}
	}
}
module.exports.cmds.pkick = pkick;

function dkick(nick, text, res) {
	// Only do showdowns if Deadinsky is around
	if (state.deadIsHere && Math.random() < CHANCE_SHOWDOWN) {
		performShowdown();
		return;
	}
	
	var rand = Math.random();
	
	if (state.deadIsHere 
		&& state.store.score_dead > 30
		&& state.store.score_puppy * 2 < state.store.score_dead 
		&& rand < CHANCE_PUPNADO) 
	{
		// If deadinsky out-strips the puppies score by more than half, and 5% of the time
		var scorejump = Math.round((state.store.score_dead - state.store.score_puppy) * ((Math.random() * 0.2) + 0.9));
		// Increase the puppies' score by the difference between the scores, +/- 10%
		bot.say("#tppleague", "Deadinsky66 is walking down the road on an abnormally calm day. "
			+"It is several minutes before he notices the low rumbling sound all around him..."
			+"He looks behind him, and a look of terror strikes his face. "
			+"He turns and starts sprinting away as fast as he can. But there is no way he "
			+"can outrun it. The pupnado is soon upon him....");
		
		state.store.score_puppy += scorejump;
		return;
	}
	
	if (rand < CHANCE_DOZEN) {
		var num = Math.round((Math.random()*8)+8);
		
		if (/^(dead|mobile)insky/i.test(nick)) {
			bot.say("#tppleague", (num<12?"Almost a dozen":"Over a dozen")+
				" puppies suddenly fall from the sky onto "+nick+" and curbstomp him.");
			state.store.score_puppy += num;
			return;
		}
		if (state.deadIsHere) {
			bot.say("#tppleague", nick+" cheers as "+(num<12?"maybe":"over")+
				" a dozen puppies spring from nowhere and ambush Deadinsky, beating him to the curb.");
			state.store.score_puppy += num;
		} else {
			bot.say("#tppleague", nick+" goes to kick a Deadinsky on puppy's behalf, "+
				"but instead gets ganged up on by "+(num<12?"nearly":"over")+" a dozen Deadinsky's.");
		}
		
	} else if (rand > 1-CHANCE_DOZEN) {
		var num = Math.round((Math.random()*5)+8);
		
		if (/^(dead|mobile)insky/i.test(nick)) {
			bot.say("#tppleague", nick+" comes across a dog carrier with about a dozen"+
				" puppies inside. He overturns the whole box with his foot!");
			state.store.score_dead += num;
			return;
		}
		if (state.deadIsHere) {
			bot.say("#tppleague", nick+" gawks as Deadinsky punts a dog carrier. "+(num<12?"Maybe":"Over")+
				" a dozen puppies run in terror from the overturned box.");
			state.store.score_dead += num;
		} else {
			bot.say("#tppleague", nick+" kicks a Deadinsky on puppy's behalf. "+
				"The Deadinsky flies into a nearby dog carrier with "+(num<12?"nearly":"over")+" a dozen Deadinskys inside and knocks it over.");
		}
		
	} else if (rand < CHANCE_PUPWIN) {
		if (/^(dead|mobile)insky/i.test(nick)) {
			bot.say("#tppleague", "A puppy kicks "+nick);
			state.store.score_puppy++;
			return;
		}
		if (state.deadIsHere) {
			bot.say("#tppleague", nick+" cheers as a puppy kicks Deadinsky's ass.");
			state.store.score_puppy++;
		} else {
			bot.say("#tppleague", nick+" goes to kick a Deadinsky on puppy's behalf, but instead the Deadinsky dodges it and kicks "+nick+".");
		}
	} else {
		if (/^(dead|mobile)insky/i.test(nick)) {
			bot.say("#tppleague", nick+" kicks a puppy.");
			state.store.score_dead++;
			return;
		}
		if (/^azum/i.test(nick) && Math.random() < 0.3) {
			if (state.deadIsHere) {
				bot.say("#tppleague", nick+" watches as Deadinsky accidentally voices a puppy while trying to kick it.");
				state.store.score_dead++;
			} else {
				bot.say("#tppleague", nick+" accidentally voices a Deadinsky on puppy's behalf.");
			}
			return;
		}
		if (state.deadIsHere) {
			bot.say("#tppleague", nick+" watches, appalled, as Deadinsky kicks a puppy.");
			state.store.score_dead++;
		} else {
			bot.say("#tppleague", nick+" kicks a Deadinsky on puppy's behalf.");
		}
	}
}
module.exports.cmds.dkick = dkick;

