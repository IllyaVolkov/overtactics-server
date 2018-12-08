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
    var gamestate = gamestates.data[0];
    var hasFreePlaces = gamestate.teamA.length < gamestate.playersInTeam
        || gamestate.teamB.length < gamestate.playersInTeam;

    if (hasFreePlaces) {
        socket.emit('onConnect', {success: true});
    } else {
        socket.emit('onConnect', {success: false});
        socket.disconnect();
    }
}

module.exports = indexIo;