// logging.js
// Log4js setup

const path = require('path');
const mkdirp = require('mkdirp');
const log4js = require('log4js');

try {
	mkdirp.sync(path.resolve(__dirname, '../logs/games'));
} catch (e) {}

log4js.configure({
	levels: {
	//	ALL:	{ value:Number.MIN_VALUE,	colour:'grey' },
		TRACE:	{ value:5000,				colour:'grey' },
		DEBUG:	{ value:10000,				colour:'blue' },
	//	INFO:	{ value:20000,				colour:'green' },
	//	WARN:	{ value:30000,				colour:'yellow' },
	//	ERROR:	{ value:40000,				colour:'red' },
	//	FATAL:	{ value:50000,				colour:'magenta' },
	//	MARK:	{ value:9007199254740992,	colour:'grey' },
	//	OFF:	{ value:Number.MAX_VALUE,	colour:'grey' },
	},
	appenders: {
		main: {
			type: 'file',
			filename: `logs/main.log`,
			maxLogSize: 8 * 1024 * 1024, //8 Mb
			backups: 10,
			compress: true,
			keepFileExt: true,
			layout: {
				type:'pattern',
				pattern: `%r [%5.5p:%c] %m`,
			},
		},
		games: {
			type: 'multiFile',
			base: 'logs/games/',
			property: 'logPath',
			extension: '.log',
			timeout: 1000 * 60 * 60, //1 hour timeout
			maxLogSize: 8 * 1024 * 1024, //8 Mb
			backups: 3,
			compress: true,
			
			layout: {
				type:'pattern',
				pattern: `%r [%5.5p] %m`,
			},
		},
		'game-errors': {
			type: 'logLevelFilter',
			appender: 'main',
			level: 'error',
		},
	},
	categories: {
		default: {
			appenders: ['main'],
			level: 'trace',
		},
		Game: {
			appenders: ['games', 'game-errors'],
			level: 'trace',
		},
	},
});

function getLogger(category) {
	const l4logger = log4js.getLogger(category);
	l4logger.logRaw = l4logger.log;
	l4logger.log = l4logger.info;
	return l4logger;
}
getLogger.forGame = ({ channel='[unknown]', gameId }={})=>{
	let now = new Date();
	let yyyy = now.getFullYear();
	let mm = ('00'+(now.getMonth()+1)).slice(-2);
	let dd = ('00'+(now.getDate())).slice(-2);
	
	let logPath = `${yyyy}-${mm}/${channel}/${yyyy}-${mm}-${dd}/${gameId}`;
	
	const l4logger = log4js.getLogger('Game');
	l4logger.logRaw = l4logger.log;
	l4logger.log = l4logger.info;
	l4logger.addContext('logPath', logPath);
	return l4logger;
};

getLogger.shutdown = ()=> {
	return new Promise((r, e)=>{ log4js.shutdown(r); });
};

module.exports = getLogger;
