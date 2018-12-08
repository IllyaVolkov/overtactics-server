var loki = require('lokijs');
var dataStorage = require('../data/index');

var db = new loki('mock.json', {autosave: true, autosaveInterval: 5000, autoload: true, autoloadCallback: dbLoadCallback});
var heroes, skills, gamestates, players;


function dbLoadCallback() {
    heroes = db.getCollection('heroes') || db.addCollection('heroes', { unique: ['id'] });
    skills = db.getCollection('skills') || db.addCollection('skills', { unique: ['id'] });
    gamestates = db.getCollection('gamestates') || db.addCollection('gamestates', { unique: ['id'] });
    players = db.getCollection('players') || db.addCollection('players', { unique: ['id'] });
    dataStorage.saveHeroes(heroes);
    dataStorage.saveSkills(skills);
    dataStorage.saveGameStates(gamestates);
};

function indexIo(socket) {
    const gameId = socket.gameId = 1;
    const heroId = socket.userId = socket.handshake.query.heroId;

}

module.exports = indexIo;