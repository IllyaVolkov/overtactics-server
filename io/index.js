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

function Player(xPos, yPos, socket, team) {
    this.hero = null;
    this.xPos = xPos;
    this.yPos = yPos;
    this.damage = 0;
    this.points = 0;
    this.turn = false;
    this.socket = socket;
    this.team = team;
}

function indexIo(io, socket) {
    var gamestate = gamestates.data[0];
    var hasFreePlaces = gamestate.teamA.length < gamestate.playersInTeam
        || gamestate.teamB.length < gamestate.playersInTeam;

    if (hasFreePlaces) {
        var isTeamA = gamestate.teamA.length < gamestate.playersInTeam;
        var playerXPos = isTeamA ? 0 : gamestate.xNum;
        var playerYPos = gamestate.teamA.length * 2;
        var player = new Player(playerXPos, playerYPos, socket.id, isTeamA ? 'A' : 'B');

        player = players.insert(player);
        if (isTeamA) {
            gamestate.teamA.push(player.$loki);
        } else {
            gamestate.teamB.push(player.$loki);
        }
        gamestates.update(gamestate);

        socket.emit('onConnect', {success: true});

        socket.once('selectHero', ({heroId}) => {
            player.hero = heroId; // TODO: check for a valid id
            players.update(player);
            hasFreePlaces = gamestate.teamA.length < gamestate.playersInTeam || gamestate.teamB.length < gamestate.playersInTeam;
            var playesIds = [...gamestate.teamA, ...gamestate.teamB];
            var playersInGame = players.data.filter((data) => playesIds.some(el => el === data.$loki));
            var hasHeroes = playersInGame.reduce((accumulator, value) => accumulator && !!value.hero, true);

            if (!hasFreePlaces && hasHeroes) {
                gamestate.started = true;
                gamestates.update(gamestate);

                // Prefetch players data
                var data = gamestates.data[0];
                var playersdata = players.data;
                data.teamA = playersdata.filter((p) => data.teamA.some(el => el === p.$loki));
                data.teamB = playersdata.filter((p) => data.teamB.some(el => el === p.$loki));
                var activePlayer = data.teamA[0];
                activePlayer.turn = true;
                players.update(activePlayer);

                players.data.forEach(p => {
                    io.to(p.socket).emit('gameStart', {
                        gameState: data,
                        player: p
                    });
                });
            }
        });

        socket.on('disconnect', () => {
            gamestate = gamestates.data[0];
            if (!gamestate.started) {
                if (isTeamA) {
                    gamestate.teamA = gamestate.teamA.filter(p => p !== player.$loki);
                } else {
                    gamestate.teamB = gamestate.teamB.filter(p => p !== player.$loki);
                }
                gamestates.update(gamestate);
                players.remove(player);
            } else {
                gamestate.started = false;
                gamestate.teamA = [];
                gamestate.teamB = [];
                gamestates.update(gamestate);
                players.data.forEach(p => {io.to(p.socket).emit('gameAborted')});
                players.clear();
            }
        });
    } else {
        socket.emit('onConnect', {success: false});
        socket.disconnect();
    }
}

module.exports = indexIo;