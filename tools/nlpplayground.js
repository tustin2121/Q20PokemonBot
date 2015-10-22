//
//

var natural  = require("natural");
var readline = require('readline');
var util     = require("util");


var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


var classifier = new natural.LogisticRegressionClassifier();//BayesClassifier();
{
	classifier.addDocument("is it blue?", "color");
	classifier.addDocument("is it green?", "color");
	classifier.addDocument("is it red?", "color");
	classifier.addDocument("is it orange?", "color");
	
	classifier.addDocument("does it have sturdy?", "ability");
	classifier.addDocument("can it have limber?", "ability");
	classifier.addDocument("does it have the ability sand veil?", "ability");
	classifier.addDocument("can it have the ability static?", "ability");
	classifier.addDocument("could it have the ability volt absorb?", "ability");
	classifier.addDocument("does it have the ability oblivious?", "ability");
	
	classifier.addDocument("is it a fire-type?", "have type");
	classifier.addDocument("is it a water-type?", "have type");
	classifier.addDocument("is it flying type?", "have type");
	classifier.addDocument("is it fire typed?", "have type");
	
	classifier.addDocument("is it weak to fire?", "weak type");
	classifier.addDocument("is it weak to flying?", "weak type");
	classifier.addDocument("is it weak to ground?", "weak type");
	classifier.addDocument("is it weak to ground-type moves?", "weak type");
	classifier.addDocument("is it weak to psyhcic-type moves?", "weak type");
	
	classifier.addDocument("does it resist fire?", "resist type");
	classifier.addDocument("does it resist psychic?", "resist type");
	classifier.addDocument("does it resist normal type moves?", "resist type");
	classifier.addDocument("does it resist water?", "resist type");
	
	classifier.train();
	
	
	classifier.addDocument("red", "color");
	classifier.addDocument("orange", "color");
	classifier.addDocument("yellow", "color");
	classifier.addDocument("green", "color");
	classifier.addDocument("blue", "color");
	classifier.addDocument("purple", "color");
	classifier.addDocument("violet", "color");
	classifier.addDocument("grey", "color");
	classifier.addDocument("gray", "color");
	
	classifier.train();
}






rl.setPrompt("> ", 2);
rl.on("line", function(cmd){
	console.log(classifier.getClassifications(cmd));
	
	
	
	
	console.log();
	rl.prompt();
});

rl.on('SIGINT', function() {
	rl.close();
	process.exit(0);
});

rl.prompt();