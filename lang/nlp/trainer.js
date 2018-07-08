// lang/trainer.js
// The training document for the natural language processor

const fs = require('fs');
const natural = require('natural');

const cls = natural.LogisticRegressionClassifier();

const trainingSet = fs.readFileSync('training.set').split('\n').map(line=>{
	return line.split(' => ').map(x=>x.trim());
});

for (let doc of trainingSet) {
	cls.addDocument(...doc);
}
cls.train();

cls.save('classifier.json');
