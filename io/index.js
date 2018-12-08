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

function Player(xPos, yPos) {
    this.hero = null;
    this.xPos = xPos;
    this.yPos = yPos;
    this.damage = 0;
    this.points = 0;
}

function indexIo(socket) {
    var gamestate = gamestates.data[0];
    var hasFreePlaces = gamestate.teamA.length < gamestate.playersInTeam
        || gamestate.teamB.length < gamestate.playersInTeam;

    if (hasFreePlaces) {
        var isTeamA = gamestate.teamA.length < gamestate.playersInTeam;
        var playerXPos = isTeamA ? 0 : gamestate.xNum;
        var playerYPos = gamestate.teamA.length * 2;
        var player = new Player(playerXPos, playerYPos);

        gamestate.sockets.push(socket);
        player = players.insert(player);
        if (isTeamA) {
            gamestate.teamA.push(player.$loki);
        } else {
            gamestate.teamB.push(player.$loki);
        }
        gamestates.update(gamestate);
        socket.emit('onConnect', {success: true});

        socket.on('selectHero', ({heroId}) => {
            player.hero = heroId; // TODO: check for a valid id
            players.update(player);
            hasFreePlaces = gamestate.teamA.length < gamestate.playersInTeam || gamestate.teamB.length < gamestate.playersInTeam;
            var hasHeroes = players.data.reduce((accumulator, value) => {accumulator && !!value.hero}, true);

            if (!hasFreePlaces && hasHeroes) {
                gamestate.started = true;
                gamestates.update(gamestate);
                socket.emit('gameStart', {gameState: gamestate});
            }
        });

        socket.on('disconnect', () => {
            gamestate = gamestates.data[0];
            if (!gamestate.started) {
                if (isTeamA) {
                    gamestate.teamA = gamestate.teamA.filter(p => p.$loki !== player.$loki);
                } else {
                    gamestate.teamB = gamestate.teamB.filter(p => p.$loki !== player.$loki);
                }
                players.remove(player);
            } else {
                gamestate.started = false;
                gamestate.teamA = [];
                gamestate.teamB = [];
                gamestate.sockets.forEach(s => {s.disconnect()});
                gamestate.sockets = [];
                gamestates.update(gamestate);
                players.clear();
            }
        });
    } else {
        socket.emit('onConnect', {success: false});
        socket.disconnect();
    }
}

module.exports = indexIo;