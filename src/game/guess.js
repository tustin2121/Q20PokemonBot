// game/guess.js
// The class which holds the logic of parsing and categorizing guesses

class Guess {
	/**
	 * @param {string} text - The relevant text of the guess
	 * @param {Discord.Message} msg - The message of this guess
	 */
	constructor(text, msg) {
		/** @type {string} The original text of the guess. */
		this.origText = text;
		/** @type {Discord.Message} The message which submitted this guess. */
		this.origMsg = msg;
		
		/** @type {Array<Category>} The liklihood of this guess being part of a given category. */
		this.categories = null;
		
		/** @type {string[]} The tokenized text of the guess. */
		this.tokens = null;
		/** @type {object[]} The meaning tokens of the text of the guess. */
		this.meaningTokens = null;
		/** @type {object} The number of each type of meaning token. */
		this.meaningScore = null;
		/** @type {object} The pokemon/move/ability/etc mentioned in this guess, if there was any. */
		this.subject = {
			pokemon: null,
			move: null,
			ability: null,
			type: null,
		};
		
		
	}
}

module.exports = { Guess };