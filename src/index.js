// index.js
// 

global.getLogger = require('./logging');

///////////////////////////////////////////////////////////////////////////////

const auth = require('../auth');

const Discord = require('discord.js');
const EventEmitter = require('events');

const LOGGER = getLogger('Bot');
const D_LOGGER = getLogger('Discord');

class Q20PokemonBot extends EventEmitter {
	constructor() {
		super();
		
		this.activeGames = {};
		
		this._dclient = new Discord.Client({
			disableEveryone: true,
			disabledEvents: [ //Events we compleately ignore
				'TYPING_START',
				'VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE',
			],
		});
		this._dclient.on('error', (e)=>D_LOGGER.error('Bot:', e));
		this._dclient.on('warn', (e)=>D_LOGGER.warn('Bot:', e));
		this._dclient.on('ready', ()=>{
			D_LOGGER.log('Connected to discord, ready.');
		});
		this._dclient.on('disconnect', (evt)=>{
			D_LOGGER.log(`Discord bot has disconnected with code ${evt.code}: ${evt.reason}. Reconnecting...`);
			this._dclient.destroy().then(()=>this._dclient.login(auth.token));
		});
		
		this._dclient.on('message', (msg)=>{
			if (msg.author.id === this._dclient.id) return; //Don't respond to our own messages
			this.routeMessage(msg);
		});
		
		this._dclient.login(auth.token);
	}
	
	/**
	 * Routes an incoming message to its proper handler.
	 * @param {Discord.Message} msg 
	 */
	routeMessage(msg) {
		let game = this.activeGames[msg.channel.id];
		if (game) return game.handleMessage(msg);
		
		// TODO handle starting a new game
		// TODO handle setting settings as requested by "moderator" roles (those with MANAGE_ROLES, MANAGE_GUILD, MANAGE_CHANNELS, or ADMINISTRATOR permissions)
	}
	
	/**
	 * Checks to see if the given user qualifies as a "Mod" on this server.
	 * @param {Discord.Guild} guild
	 * @param {Discord.User} user 
	 */
	isModUser(guild, user) {
		if (!guild || !user) return false;
		let member = guild.member(user);
		if (!member) return false;
		return member.highestRole.hasPermission(['MANAGE_GUILD', 'MANAGE_ROLES', 'MANAGE_CHANNELS'], false, true); //allow admin override
	}
}

global.BOT = new Q20PokemonBot();
