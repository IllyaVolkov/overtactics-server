var loki = require('lokijs');
var dataStorage = require('../data/index');

var db = new loki('mock.json', {autosave: true, autosaveInterval: 5000, autoload: true, autoloadCallback: dbLoadCallback});
var heroes, skills, gameinstances;


function dbLoadCallback() {
    heroes = db.getCollection('heroes') || db.addCollection('heroes', { unique: ['id'] });
    skills = db.getCollection('skills') || db.addCollection('skills', { unique: ['id'] });
    gameinstances = db.getCollection('gameinstances') || db.addCollection('gameinstances', { unique: ['id'] });
    dataStorage.saveHeroes(heroes);
    dataStorage.saveSkills(skills);
};

function indexIo(socket) {
    const heroId = socket.userId = socket.handshake.query.heroId;

}

module.exports = indexIo;