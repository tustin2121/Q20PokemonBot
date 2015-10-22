// caesar-cipher.js
//

// Caesarian Shift

// This code was written by Tyler Akins and is placed in the public domain.
// It would be nice if this header remained intact.  http://rumkin.com


// Perform a Caesar cipher (ROT-N) encoding on the text
// encdec = -1 for decode, 1 for encode (kinda silly, but kept it like this
//    to be the same as the other encoders)
// text = the text to encode/decode
// inc = how far to shift the letters.
// key = the key to alter the alphabet
// alphabet = The alphabet to use if not A-Z
function Caesar(text, inc, key, alphabet)
{	
	var s = "", b, i, idx;
	
	if (typeof(alphabet) != 'string')
		alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	
	inc = inc * 1;
	
	key = MakeKeyedAlphabet(key, alphabet);
	
	for (i = 0; i < text.length; i++)
	{
		b = text.charAt(i);
		if ((idx = alphabet.indexOf(b)) >= 0)
		{
			idx = (idx + inc) % alphabet.length;
			b = key.charAt(idx);
		}
		else if ((idx = alphabet.indexOf(b.toUpperCase())) >= 0)
		{
			idx = (idx + inc) % alphabet.length;
			b = key.charAt(idx).toLowerCase();
		}
		s += b;
	}
	return s;
}
module.exports = Caesar;



// Returns an alphabet with a key in front.
// Passing the key of "Four. Score! And Seven Days Ago?"
// will return  "FOURSCEANDVYGBHIJKLMPQTWXZ"
// key = the letters to include in the beginning
// alphaet = the alphabet to use (if not A-Z)
function MakeKeyedAlphabet(key, alphabet)
{
	var out = "";

	if (typeof(alphabet) != 'string')
		alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	else
		alphabet = alphabet.toUpperCase();
		
	if (typeof(key) != 'string')
		return alphabet;
		
	key = key.toUpperCase() + alphabet;
	for (var i = 0; i < key.length; i ++)
	{
		if (out.indexOf(key.charAt(i)) < 0 && 
			 alphabet.indexOf(key.charAt(i)) >= 0)
		{
			out += key.charAt(i);
		}
	}
	
	return out;
}